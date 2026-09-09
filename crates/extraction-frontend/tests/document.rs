//! FR-097 "Validation at lift time" and "Canonical form": the assembled
//! document, the reader's verdict, the node-list order, and the bytes the
//! reader's `normalized` and FR-050's `normalizeIr` agree on. Nothing here
//! reads the environment except to shell to `node` and `cargo`.

use std::fs;
use std::path::PathBuf;
use std::process::Command;

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, WireCode};
use agent_ix_extraction_frontend::write::OutputPaths;
use agent_ix_extraction_frontend::{
    assemble, canonical_bytes, emit, extract, lower_bundle, provenance_record, resolve,
    sort_node_lists, Bundle, Envelope, LiftOutcome, Limits, ModuleManifest, CONTRACT_VERSION,
};
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::normalize::normalized;
use agent_ix_semantic_ir::{decide, ResultState};
use common::{
    bundle_fixtures, business_module, collator_order, edge_vocabulary, lift_fixture, normalize_ir,
    positive_lifts, workspace_dir,
};
use ix_trace_rs::trace;
use proptest::prelude::*;
use serde_json::{json, Value};

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn with_code(diagnostics: &[Diagnostic], code: Code) -> Vec<&Diagnostic> {
    diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

/// The in-memory pipeline up to the assembled document, for fault
/// injection before the reader.
fn assembled(name: &str) -> (Value, agent_ix_extraction_frontend::Provenance) {
    let roots = [business_module(), edge_vocabulary()];
    let root_refs: Vec<&std::path::Path> = roots.iter().map(PathBuf::as_path).collect();
    let bundle = Bundle::load(&common::fixture(name), &root_refs).expect("loads");
    let modules: Vec<ModuleManifest> = roots
        .iter()
        .map(|root| {
            let bytes = fs::read(root.join("manifest.yaml")).expect("manifest");
            let dir = root
                .file_name()
                .expect("dir")
                .to_string_lossy()
                .into_owned();
            ModuleManifest::from_bundle(&bundle, &dir, bytes).expect("loaded")
        })
        .collect();
    let provenance = provenance_record(&bundle, &modules).expect("provenance");
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let lowered = lower_bundle(
        &bundle,
        &extractions,
        &resolutions,
        &Limits::declared().expect("limits"),
        &provenance.frontend.version,
    );
    assert!(
        !extractions.diagnostics.iter().any(|d| d.blocking)
            && !lowered.diagnostics.iter().any(|d| d.blocking),
        "{name} lifts unblocked"
    );
    let envelope = Envelope::new(&bundle, &modules);
    (assemble(&envelope, &lowered.types), provenance)
}

fn written_bytes(outcome: &LiftOutcome) -> &[u8] {
    match outcome {
        LiftOutcome::Written { document, .. } => document,
        other => panic!("not written: {other:?}"),
    }
}

/// Every identity-keyed list of `document` with its pointer, in document
/// order.
fn node_lists(document: &Value) -> Vec<(String, Vec<String>)> {
    fn identities(list: &Value) -> Vec<String> {
        list.as_array()
            .map(|items| {
                items
                    .iter()
                    .map(|i| i["identity"].as_str().unwrap_or("").to_string())
                    .collect()
            })
            .unwrap_or_default()
    }
    let mut out = vec![("/types".to_string(), identities(&document["types"]))];
    for (i, definition) in document["types"]
        .as_array()
        .expect("types")
        .iter()
        .enumerate()
    {
        for list in [
            "fields",
            "variants",
            "constraints",
            "relationships",
            "operations",
            "clauses",
            "extensions",
        ] {
            if let Some(items) = definition.get(list) {
                out.push((format!("/types/{i}/{list}"), identities(items)));
            }
        }
        for (f, field) in definition["fields"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or(&[])
            .iter()
            .enumerate()
        {
            out.push((
                format!("/types/{i}/fields/{f}/extensions"),
                identities(&field["extensions"]),
            ));
        }
        for (o, operation) in definition["operations"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or(&[])
            .iter()
            .enumerate()
        {
            out.push((
                format!("/types/{i}/operations/{o}/params"),
                identities(&operation["params"]),
            ));
        }
    }
    out.push((
        "/occurrences".to_string(),
        identities(&document["occurrences"]),
    ));
    out.push((
        "/extensions".to_string(),
        identities(&document["extensions"]),
    ));
    out
}

/// `strings` sorted by FR-050's `byCodePoint` in node under `LC_ALL=locale`.
fn code_point_order(strings: &[String], locale: &str) -> Vec<String> {
    let script = "const fs=require('fs');const list=JSON.parse(fs.readFileSync(0,'utf8'));\
        const by=(l,r)=>l<r?-1:l>r?1:0;\
        process.stdout.write(JSON.stringify([...list].sort(by)));";
    let input = serde_json::to_vec(strings).expect("json");
    let out = Command::new("node")
        .args(["-e", script])
        .env("LC_ALL", locale)
        .env("LANG", locale)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .and_then(|mut child| {
            use std::io::Write;
            child.stdin.take().expect("stdin").write_all(&input)?;
            child.wait_with_output()
        })
        .expect("`node` runs");
    assert!(out.status.success());
    serde_json::from_slice(&out.stdout).expect("json list")
}

fn is_code_point_sorted(list: &[String]) -> bool {
    list.windows(2).all(|w| w[0].as_bytes() <= w[1].as_bytes())
}

#[trace("TC-1273", "FR-097-AC-1")]
#[trace("TC-1273", "FR-097-CON-1")]
#[test]
fn tc_1273_the_manifest_names_semantic_ir_by_path_and_no_jsonschema_and_the_reader_crate_is_unchanged(
) {
    let manifest = fs::read_to_string(crate_dir().join("Cargo.toml")).expect("Cargo.toml");
    let dependencies = manifest
        .split("[dependencies]")
        .nth(1)
        .expect("[dependencies]")
        .split("\n[")
        .next()
        .expect("section");
    assert!(
        dependencies.contains("agent-ix-semantic-ir = { path = \"../semantic-ir\" }"),
        "{dependencies}"
    );
    let code_lines: Vec<&str> = manifest
        .lines()
        .filter(|l| !l.trim_start().starts_with('#'))
        .collect();
    assert!(
        !code_lines.iter().any(|l| l.contains("jsonschema")),
        "{code_lines:?}"
    );
    let tree = Command::new(env!("CARGO"))
        .args([
            "tree",
            "--locked",
            "--offline",
            "-e",
            "normal",
            "-p",
            "agent-ix-extraction-frontend",
        ])
        .current_dir(workspace_dir())
        .output()
        .expect("spawn cargo tree");
    assert!(
        tree.status.success(),
        "{}",
        String::from_utf8_lossy(&tree.stderr)
    );
    let tree = String::from_utf8_lossy(&tree.stdout);
    // FR-097-AC-1: no direct `jsonschema` edge. The pinned engine
    // (`quire-rs`, read-only) links it for its own frontmatter schemas, so
    // the tree lists it two levels down; what the frontend controls, and
    // what FR-097 "SHALL NOT link" fixes, is the direct edge (CR-036-4).
    let direct: Vec<&str> = tree
        .lines()
        .filter(|l| l.starts_with("├── ") || l.starts_with("└── "))
        .collect();
    assert!(
        !direct.iter().any(|l| l.contains("jsonschema")),
        "a direct jsonschema edge: {direct:?}"
    );
    assert!(
        direct.iter().any(|l| l.contains("agent-ix-semantic-ir")),
        "{direct:?}"
    );
    let via_engine = tree
        .lines()
        .filter(|l| l.contains("jsonschema"))
        .all(|l| l.starts_with("│   "));
    assert!(
        via_engine,
        "jsonschema reaches the tree only under quire-rs:\n{tree}"
    );
    // `crates/semantic-ir` is byte-unchanged: nothing pending in the tree,
    // and nothing on this branch against `main` (NFR-032).
    let status = Command::new("git")
        .args(["status", "--porcelain", "--", "crates/semantic-ir"])
        .current_dir(workspace_dir())
        .output()
        .expect("spawn git");
    assert_eq!(String::from_utf8_lossy(&status.stdout).trim(), "");
    let main = Command::new("git")
        .args(["rev-parse", "--verify", "--quiet", "main"])
        .current_dir(workspace_dir())
        .output()
        .expect("spawn git");
    if main.status.success() {
        let diff = Command::new("git")
            .args(["diff", "--stat", "main...HEAD", "--", "crates/semantic-ir"])
            .current_dir(workspace_dir())
            .output()
            .expect("spawn git");
        assert_eq!(
            String::from_utf8_lossy(&diff.stdout).trim(),
            "",
            "crates/semantic-ir differs from main"
        );
    }
}

#[trace("TC-1274", "FR-097-AC-2")]
#[test]
fn tc_1274_a_document_missing_unknown_policy_yields_one_invalid_ir_at_the_type_and_writes_only_diagnostics(
) {
    let (mut document, provenance) = assembled("config-version-table");
    let types = document["types"].as_array_mut().expect("types");
    let index = types
        .iter()
        .position(|t| t["displayName"] == "ConfigVersion")
        .expect("ConfigVersion");
    types[index]
        .as_object_mut()
        .expect("object")
        .remove("unknownPolicy")
        .expect("was present");
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = OutputPaths::new(&dir.path().join("semantic-ir.json"), None, None);
    let outcome = emit(&paths, document, Vec::new(), &provenance);
    let LiftOutcome::Blocked { diagnostics } = &outcome else {
        panic!("not blocked: {outcome:?}");
    };
    let invalid = with_code(diagnostics, Code::InvalidIr);
    assert_eq!(invalid.len(), 1, "{diagnostics:?}");
    assert_eq!(diagnostics.len(), 1, "nothing else: {diagnostics:?}");
    assert!(invalid[0].blocking);
    let pointer = format!("/ir/types/{index}");
    assert!(
        invalid[0].message.contains(&pointer),
        "{} names {pointer}",
        invalid[0].message
    );
    assert_eq!(invalid[0].causes.len(), 1);
    assert_eq!(
        invalid[0].causes[0].code,
        WireCode::Reader("agent-ix.semantic-ir.SCHEMA_VIOLATION".to_string())
    );
    assert_eq!(
        common::entries(dir.path()),
        ["semantic-ir.json.diagnostics.json"],
        "only the diagnostics sidecar"
    );
    assert!(!paths.document.exists());
    assert!(!paths.fingerprint.exists());
    assert!(!paths.provenance.exists());
    // The sidecar carries that one diagnostic.
    let sidecar: Value =
        serde_json::from_slice(&fs::read(&paths.diagnostics).expect("read")).expect("json");
    assert_eq!(sidecar.as_array().map(Vec::len), Some(1));
    assert_eq!(
        sidecar[0]["code"],
        "agent-ix.extraction-frontend.INVALID_IR"
    );
}

#[trace("TC-1275", "FR-097-AC-3")]
#[test]
fn tc_1275_written_bytes_equal_decide_normalized_and_reproduce_under_a_second_normalized() {
    let (_dir, request, outcome) = lift_fixture("config-version-table");
    let bytes = written_bytes(&outcome);
    let on_disk = fs::read(&request.out).expect("read <out>");
    assert_eq!(on_disk, bytes, "the outcome carries the written bytes");
    let text = std::str::from_utf8(bytes).expect("utf-8");
    let parsed = parse_json(&format!("{{\"ir\":{text}}}")).expect("parses");
    let verdict = decide(&parsed);
    assert_eq!(verdict.result_state, ResultState::Success);
    assert_eq!(
        verdict.normalized.as_bytes(),
        bytes,
        "bytes == decide(...).normalized"
    );
    assert_eq!(
        normalized(&parsed).as_bytes(),
        bytes,
        "normalized again reproduces them"
    );
    // The same value through this crate's own call.
    let value: Value = serde_json::from_slice(bytes).expect("json");
    assert_eq!(canonical_bytes(&value), bytes);
    assert_eq!(value["contractVersion"], CONTRACT_VERSION);
    // Golden equality (FR-098) lands with Task-136; compare when present.
    let golden = common::fixture("config-version-table/expected/semantic-ir.json");
    if golden.is_file() {
        assert_eq!(fs::read(&golden).expect("golden"), bytes);
    }
}

/// A random node with a random identity and, when `nested`, random
/// identity-keyed child lists.
fn node(nested: bool) -> impl Strategy<Value = Value> {
    let identity = "[a-zA-Z0-9/:_-]{0,12}";
    let leaf = |list: &'static str| {
        proptest::collection::vec(
            "[a-zA-Z0-9/:_-]{0,12}".prop_map(|i| json!({ "identity": i })),
            0..4,
        )
        .prop_map(move |items| (list, Value::Array(items)))
    };
    let field = (
        "[a-zA-Z0-9/:_-]{0,12}",
        proptest::collection::vec(
            "[a-zA-Z0-9/:_-]{0,12}".prop_map(|i| json!({ "identity": i })),
            0..3,
        ),
    )
        .prop_map(
            |(identity, extensions)| json!({ "identity": identity, "extensions": extensions }),
        );
    let operation = (
        "[a-zA-Z0-9/:_-]{0,12}",
        proptest::collection::vec(field.clone(), 0..3),
    )
        .prop_map(|(identity, params)| json!({ "identity": identity, "params": params }));
    (
        identity,
        proptest::collection::vec(field, 0..4),
        proptest::collection::vec(operation, 0..3),
        leaf("variants"),
        leaf("constraints"),
        leaf("relationships"),
        leaf("clauses"),
        leaf("extensions"),
    )
        .prop_map(move |(identity, fields, operations, v, c, r, cl, e)| {
            let mut node = json!({ "identity": identity });
            if nested {
                node["fields"] = Value::Array(fields);
                node["operations"] = Value::Array(operations);
                for (list, items) in [v, c, r, cl, e] {
                    node[list] = items;
                }
            }
            node
        })
}

fn document_strategy() -> impl Strategy<Value = Value> {
    (
        proptest::collection::vec(node(true), 0..5),
        proptest::collection::vec(node(false), 0..3),
        proptest::collection::vec(node(false), 0..3),
    )
        .prop_map(|(types, occurrences, extensions)| {
            json!({
                "contractVersion": "1.1.0",
                "types": types,
                "occurrences": occurrences,
                "extensions": extensions,
            })
        })
}

#[trace("TC-1276", "FR-097-AC-4")]
#[test]
fn tc_1276_every_node_list_is_identity_sorted_by_code_point_and_two_collators_agree_on_the_emitted_order(
) {
    proptest!(ProptestConfig::with_cases(128), |(mut document in document_strategy())| {
        let before: Vec<(String, Vec<String>)> = node_lists(&document);
        sort_node_lists(&mut document);
        let after = node_lists(&document);
        prop_assert_eq!(before.len(), after.len());
        for (pointer, list) in &after {
            prop_assert!(is_code_point_sorted(list), "{pointer}: {list:?}");
        }
        // A permutation, never a loss: the multiset of every identity in
        // every list is unchanged (list pointers shift as their parents move).
        let multiset = |lists: &[(String, Vec<String>)]| {
            let mut all: Vec<String> = lists.iter().flat_map(|(_, l)| l.clone()).collect();
            all.sort();
            all
        };
        prop_assert_eq!(multiset(&before), multiset(&after));
        // Idempotent.
        let mut again = document.clone();
        sort_node_lists(&mut again);
        prop_assert_eq!(again, document);
    });

    // The emitted order is the code-point order FR-050's canonicalizer
    // produces, computed in `node` under two `LC_ALL` values, so no locale
    // could have produced a different document (FR-097-AC-4). An
    // `Intl.Collator` is not the reference: a collator compares letters
    // case-insensitively at its primary level and orders `Ordering` before
    // `OrderLifecycle`, where code point puts `L` before `i`; the witness
    // that the two orders differ on the emitted lists is asserted below.
    let mut checked = 0;
    let mut collator_disagreed = false;
    for (name, _dir, _request, outcome) in positive_lifts() {
        let document: Value = serde_json::from_slice(written_bytes(&outcome)).expect("json");
        for (pointer, list) in node_lists(&document) {
            assert!(is_code_point_sorted(&list), "{name} {pointer}: {list:?}");
            if list.len() < 2 {
                continue;
            }
            for locale in ["en_US.UTF-8", "de_DE.UTF-8"] {
                assert_eq!(
                    code_point_order(&list, locale),
                    list,
                    "{name} {pointer} under LC_ALL={locale}"
                );
                checked += 1;
            }
            for locale in ["en", "de"] {
                if collator_order(&list, locale) != list {
                    collator_disagreed = true;
                }
            }
        }
    }
    assert!(checked > 0, "at least one multi-node list was compared");
    assert!(
        collator_disagreed,
        "Intl.Collator agreed with code point on every emitted list: FR-097-AC-4's reason for byCodePoint would be moot"
    );
}

#[trace("TC-1277", "FR-097-AC-5")]
#[test]
fn tc_1277_normalize_ir_is_the_identity_on_every_emitted_document() {
    let lifts = positive_lifts();
    assert!(!lifts.is_empty());
    for (name, _dir, request, outcome) in &lifts {
        let bytes = fs::read(&request.out).expect("read");
        assert_eq!(&bytes, written_bytes(outcome));
        assert_eq!(
            normalize_ir(&bytes),
            bytes,
            "{name}: normalizeIr moved a byte"
        );
    }
}

#[trace("TC-1284", "FR-097-AC-12")]
#[test]
fn tc_1284_decide_is_success_with_zero_diagnostics_for_every_positive_fixture_from_the_verdict_and_again_over_the_bytes(
) {
    for (name, _dir, request, outcome) in positive_lifts() {
        let LiftOutcome::Written {
            diagnostics,
            result_state,
            ..
        } = &outcome
        else {
            unreachable!()
        };
        assert_eq!(*result_state, ResultState::Success, "{name}");
        assert!(with_code(diagnostics, Code::InvalidIr).is_empty(), "{name}");
        let text = fs::read_to_string(&request.out).expect("read");
        let verdict = decide(&parse_json(&format!("{{\"ir\":{text}}}")).expect("parses"));
        assert_eq!(verdict.result_state, ResultState::Success, "{name}");
        let codes: Vec<String> = verdict
            .diagnostics
            .iter()
            .map(|d| format!("{} at {}", d.code, d.pointer))
            .collect();
        assert_eq!(codes, Vec::<String>::new(), "{name}");
    }
}

#[trace("TC-1342", "FR-097-AC-15")]
#[test]
fn tc_1342_a_contains_b_and_b_contains_a_refuses_at_lift_time_with_composite_cycle_in_causes_0() {
    let (dir, request, outcome) = lift_fixture("negatives/INVALID_IR");
    let LiftOutcome::Blocked { diagnostics } = &outcome else {
        panic!("not blocked: {outcome:?}");
    };
    let invalid = with_code(diagnostics, Code::InvalidIr);
    assert_eq!(invalid.len(), 1, "{diagnostics:?}");
    assert_eq!(
        diagnostics.len(),
        1,
        "the frontend itself found nothing wrong: {diagnostics:?}"
    );
    assert!(invalid[0].blocking);
    assert!(invalid[0].locus.is_none());
    assert_eq!(invalid[0].causes.len(), 1);
    assert_eq!(
        invalid[0].causes[0].code,
        WireCode::Reader("agent-ix.semantic-ir.COMPOSITE_CYCLE".to_string())
    );
    assert!(
        invalid[0].message.contains("COMPOSITE_CYCLE"),
        "{}",
        invalid[0].message
    );
    assert!(!request.out.exists(), "no document");
    assert_eq!(
        common::entries(dir.path()),
        ["semantic-ir.json.diagnostics.json"]
    );
    // Both edges lowered as composite: the cycle is the reader's finding
    // over a document the frontend considered complete.
    let (document, _) = assembled("negatives/INVALID_IR");
    let composite: Vec<&Value> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .flat_map(|t| {
            t["relationships"]
                .as_array()
                .map(Vec::as_slice)
                .unwrap_or(&[])
        })
        .filter(|r| r["composite"] == true && r["verb"] == "contains")
        .collect();
    assert_eq!(composite.len(), 2, "{document}");
}

#[trace("TC-1336", "FR-097-CON-2")]
#[trace("TC-1336", "FR-097-CON-3")]
#[test]
fn tc_1336_no_serde_json_serializer_under_src_and_the_document_write_is_dominated_by_a_success_verdict(
) {
    let src = crate_dir().join("src");
    let mut files: Vec<PathBuf> = fs::read_dir(&src)
        .expect("src")
        .map(|e| e.expect("entry").path())
        .filter(|p| p.extension().is_some_and(|e| e == "rs"))
        .collect();
    files.sort();
    let mut fs_sites = Vec::new();
    let mut valid_document_constructors = Vec::new();
    for file in &files {
        let name = file
            .file_name()
            .expect("name")
            .to_string_lossy()
            .into_owned();
        let text = fs::read_to_string(file).expect("read");
        for forbidden in [
            "serde_json::to_string",
            "serde_json::to_vec",
            "serde_json::to_writer",
            "to_string_pretty",
            "to_vec_pretty",
            "to_writer_pretty",
        ] {
            assert!(!text.contains(forbidden), "{name} calls {forbidden}");
        }
        if text.contains("std::fs") || text.contains("fs::") {
            fs_sites.push(name.clone());
        }
        if text.contains("ValidDocument {") {
            valid_document_constructors.push(name.clone());
        }
    }
    assert_eq!(fs_sites, ["write.rs"], "std::fs appears only in write.rs");
    // `<out>` is written only from a `ValidDocument`, which only
    // `validate` (a success verdict) constructs.
    assert_eq!(valid_document_constructors, ["validate.rs"]);
    let validate = fs::read_to_string(src.join("validate.rs")).expect("validate.rs");
    let constructor_at = validate
        .find("Ok(ValidDocument {")
        .expect("the one constructor");
    let refusal_at = validate
        .find("return Err(diagnostics);")
        .expect("the reader's refusal");
    assert!(
        refusal_at < constructor_at,
        "the reader refuses before the document is constructed"
    );
    let write = fs::read_to_string(src.join("write.rs")).expect("write.rs");
    assert_eq!(
        write.matches("document.bytes()").count(),
        1,
        "one site hands the document bytes to the file system"
    );
    let bytes_at = write.find("document.bytes()").expect("site");
    let arm_at = write
        .find("if let Emission::Document {")
        .expect("the success arm");
    assert!(arm_at < bytes_at, "the site sits inside the success arm");
    let normalized_sites: Vec<String> = files
        .iter()
        .filter(|f| {
            fs::read_to_string(f)
                .expect("read")
                .lines()
                .filter(|l| !l.trim_start().starts_with("//"))
                .any(|l| l.contains("normalized("))
        })
        .map(|f| f.file_name().expect("name").to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        normalized_sites,
        ["canonical.rs"],
        "the one `normalized` call"
    );
    // Every fixture bundle's lift either writes a reader-accepted document
    // or writes none: no path writes `<out>` on a refused verdict.
    for name in bundle_fixtures() {
        let (_dir, request, outcome) = lift_fixture(&name);
        match outcome {
            LiftOutcome::Written { result_state, .. } => {
                assert_eq!(result_state, ResultState::Success, "{name}");
                assert!(request.out.exists());
            }
            LiftOutcome::Blocked { .. } | LiftOutcome::Refused(_) => {
                assert!(
                    !request.out.exists(),
                    "{name} wrote a document while blocked"
                );
            }
        }
    }
}
