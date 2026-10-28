//! FR-147 "Spec-bundle extraction": an enumeration's `Payload` column lowers
//! to `Variant.payloadType`, and a tuple artifact's `## Positions` table
//! lowers to a type with ordered `positions`. The tuple object type is
//! declared by a scratch copy of the `fixture-domain` module, so no committed
//! fixture or inventory changes.

use std::fs;
use std::path::{Path, PathBuf};

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, WireCode};
use agent_ix_extraction_frontend::{
    extract, is_blocked, lift, lower_bundle, resolve, Bundle, LiftOutcome, LiftRequest, Limits,
    Lowered,
};
use agent_ix_semantic_ir::ResultState;
use ix_trace_rs::trace;
use serde_json::Value;

const PACKAGE: &str = "ix://agent-ix/docs-service";

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures")
        .join(name)
}

fn copy_tree(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("mkdir");
    for entry in fs::read_dir(from).expect("read_dir") {
        let entry = entry.expect("entry");
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), &target).expect("copy");
        }
    }
}

/// `fixture-domain` plus the `tuple_value_type` object type, as QSpec's
/// domain module declares it.
fn tuple_module(scratch: &Path) -> PathBuf {
    let root = scratch.join("module");
    copy_tree(&fixture("modules/fixture-domain"), &root);
    let manifest = root.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let text = text.replace(
        "  - population\n  imports: {}",
        "  - population\n  - tuple_value_type\n  imports: {}",
    );
    let mut text = text;
    text.push_str(
        "- name: tuple_value_type\n  roles: [aggregate-member]\n  construct:\n    identity: none\n    shape: tuple\n    members: {positions: required, fields: forbidden}\n    rules: []\n    meaning: quire.meaning.model.tuple-value-type/v1\n  allowed_links:\n    references: [enumeration]\n  data_schema:\n    schema: schemas/Enumeration.json\n  body_extraction:\n    yield_pattern:\n      match:\n        id:\n          from: frontmatter_field\n          path: [id]\n          regex: ^([A-Za-z][A-Za-z0-9_-]*)$\n          required: true\n        title:\n          from: frontmatter_field\n          path: [title]\n          required: true\n        type:\n          from: frontmatter_field\n          path: [type]\n          required: true\n",
    );
    fs::write(&manifest, text).expect("manifest write");
    root
}

const SPEC: &str = "---\ntype: master-requirements\nname: docs-service\norg: agent-ix\ntitle: \"Master Requirements Specification\"\n---\n# Master Requirements Specification\n";

fn tuple_doc(id: &str, title: &str, rows: &[&str]) -> String {
    let mut text = format!(
        "---\nid: {id}\ntitle: {title}\nobject: tuple_value_type\ntype: tuple_value_type\n---\n\n# {id}\n\n## Positions\n\n| Position | Type |\n|---|---|\n"
    );
    for row in rows {
        text.push_str(row);
        text.push('\n');
    }
    text
}

fn enum_doc(id: &str, values: &[&str], payloads: &[&str]) -> String {
    let mut text = format!(
        "---\nid: {id}\ntitle: {id}\nobject: enumeration\ntype: enumeration\n---\n\n# {id}\n\n## Values\n\n| Value | Description |\n|---|---|\n"
    );
    for row in values {
        text.push_str(row);
        text.push('\n');
    }
    if !payloads.is_empty() {
        text.push_str("\n## Payloads\n\n| Value | Payload |\n|---|---|\n");
        for row in payloads {
            text.push_str(row);
            text.push('\n');
        }
    }
    text
}

struct Bundle3 {
    _scratch: tempfile::TempDir,
    root: PathBuf,
    module: PathBuf,
}

/// A scratch bundle holding `documents` (path, text) and the tuple module.
fn bundle(documents: &[(&str, String)]) -> Bundle3 {
    let scratch = tempfile::tempdir().expect("tempdir");
    let module = tuple_module(scratch.path());
    let root = scratch.path().join("bundle");
    fs::create_dir_all(root.join("spec/functional")).expect("mkdir");
    fs::write(root.join("spec/spec.md"), SPEC).expect("spec");
    for (path, text) in documents {
        fs::write(root.join("spec/functional").join(path), text).expect("document");
    }
    Bundle3 {
        _scratch: scratch,
        root,
        module,
    }
}

fn lowered(bundle: &Bundle3) -> Lowered {
    let edges = fixture("modules/fixture-edges");
    let modules: Vec<&Path> = vec![bundle.module.as_path(), edges.as_path()];
    let loaded = Bundle::load(&bundle.root, &modules).expect("bundle loads");
    let extractions = extract(&loaded);
    let resolutions = resolve(&loaded, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    lower_bundle(&loaded, &extractions, &resolutions, &limits)
}

fn types_json(lowered: &Lowered) -> Vec<Value> {
    lowered
        .types
        .iter()
        .map(|t| serde_json::to_value(t).expect("serialises"))
        .collect()
}

fn type_named<'a>(types: &'a [Value], identity: &str) -> &'a Value {
    types
        .iter()
        .find(|t| t["identity"] == identity)
        .unwrap_or_else(|| panic!("no type {identity}"))
}

fn with_code(lowered: &Lowered, code: Code) -> Vec<&Diagnostic> {
    lowered
        .diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

fn documents() -> Vec<(&'static str, String)> {
    vec![
        (
            "Pair.md",
            tuple_doc("Pair", "Pair", &["| p0 | Boolean |", "| p1 | Integer |"]),
        ),
        (
            "Shape.md",
            enum_doc(
                "Shape",
                &[
                    "| Both | A pair |",
                    "| Empty | Nothing |",
                    "| Flag | A flag |",
                ],
                &["| Both | Pair |", "| Flag | Boolean |"],
            ),
        ),
        (
            "Status.md",
            enum_doc(
                "Status",
                &["| draft | Not yet published |", "| live | Published |"],
                &[],
            ),
        ),
    ]
}

#[trace("TC-1883", "FR-147-AC-12")]
#[test]
fn tc_1883_a_payload_column_lowers_to_payload_type_and_an_empty_cell_to_none() {
    let lowered = lowered(&bundle(&documents()));
    assert!(
        !is_blocked(&lowered.diagnostics),
        "{:?}",
        lowered.diagnostics
    );
    let types = types_json(&lowered);
    let shape = type_named(&types, &format!("{PACKAGE}/Shape"));
    let variants = shape["variants"].as_array().expect("variants");
    let by_name = |name: &str| {
        variants
            .iter()
            .find(|v| v["name"] == name)
            .unwrap_or_else(|| panic!("no variant {name}"))
    };
    assert_eq!(by_name("Both")["payloadType"], format!("{PACKAGE}/Pair"));
    assert_eq!(by_name("Flag")["payloadType"], "ix://quire/native/Boolean");
    assert!(
        by_name("Empty").get("payloadType").is_none(),
        "a nullary case writes no payloadType member"
    );
    // A table without the column lowers exactly as before.
    let status = type_named(&types, &format!("{PACKAGE}/Status"));
    for variant in status["variants"].as_array().expect("variants") {
        assert!(variant.get("payloadType").is_none(), "{variant}");
    }
}

#[trace("TC-1883", "FR-147-AC-12")]
#[test]
fn tc_1883_an_unresolved_payload_token_is_one_blocking_diagnostic_at_its_row() {
    let mut docs = documents();
    docs[1].1 = enum_doc(
        "Shape",
        &["| Both | A pair |", "| Empty | Nothing |"],
        &["| Both | NoSuchType |"],
    );
    let lowered = lowered(&bundle(&docs));
    let found = with_code(&lowered, Code::UnresolvedTypeToken);
    assert_eq!(found.len(), 1, "{:?}", lowered.diagnostics);
    let locus = found[0].locus.as_ref().expect("a located diagnostic");
    assert_eq!(locus.path, "spec/functional/Shape.md");
    assert_eq!(locus.start_line, 21, "the Both payload row");
    assert!(found[0].blocking);
    assert!(is_blocked(&lowered.diagnostics));
}

#[trace("TC-1884", "FR-147-AC-13")]
#[test]
fn tc_1884_a_tuple_lowers_to_ordered_positions_at_their_rows() {
    let lowered = lowered(&bundle(&documents()));
    assert!(
        !is_blocked(&lowered.diagnostics),
        "{:?}",
        lowered.diagnostics
    );
    let types = types_json(&lowered);
    let pair = type_named(&types, &format!("{PACKAGE}/Pair"));
    let positions = pair["positions"].as_array().expect("positions");
    assert_eq!(positions.len(), 2);
    assert_eq!(positions[0]["identity"], format!("{PACKAGE}/Pair/p0"));
    assert_eq!(positions[0]["typeRef"], "ix://quire/native/Boolean");
    assert_eq!(positions[1]["identity"], format!("{PACKAGE}/Pair/p1"));
    assert_eq!(positions[1]["typeRef"], "ix://quire/native/Integer");
    assert_eq!(positions[0]["origin"]["source"]["startLine"], 14);
    assert_eq!(positions[1]["origin"]["source"]["startLine"], 15);
    assert_eq!(
        pair["kind"],
        serde_json::json!({"module": "fixture/domain", "name": "tuple_value_type"})
    );
    assert!(pair.get("fields").is_none());
}

#[trace("TC-1884", "FR-147-AC-13")]
#[test]
fn tc_1884_a_tuple_with_no_row_or_an_unnameable_id_is_not_lowered() {
    let mut docs = documents();
    docs[0].1 = tuple_doc("Pair", "Pair", &[]);
    let empty = lowered(&bundle(&docs));
    let found = with_code(&empty, Code::ArtifactNotLowered);
    assert!(
        found
            .iter()
            .any(|d| d.blocking && d.message.contains("Positions")),
        "{:?}",
        empty.diagnostics
    );

    let mut docs = documents();
    docs[0] = (
        "Pair-One.md",
        tuple_doc("Pair-One", "PairOne", &["| p0 | Integer |"]),
    );
    docs[1].1 = enum_doc("Shape", &["| Empty | Nothing |"], &[]);
    let named = lowered(&bundle(&docs));
    let found = with_code(&named, Code::ArtifactNotLowered);
    assert!(
        found
            .iter()
            .any(|d| d.blocking && d.message.contains("tuple name")),
        "{:?}",
        named.diagnostics
    );
}

#[trace("TC-1884", "FR-147-AC-13")]
#[test]
fn tc_1884_a_lifted_tuple_document_is_admitted_and_written_identically_twice() {
    let built = bundle(&documents());
    let edges = fixture("modules/fixture-edges");
    let mut written = Vec::new();
    for _ in 0..2 {
        let out = tempfile::tempdir().expect("tempdir");
        let outcome = lift(&LiftRequest {
            bundle_root: built.root.clone(),
            module_roots: vec![built.module.clone(), edges.clone()],
            out: out.path().join("semantic-ir.json"),
            diagnostics: None,
        });
        let LiftOutcome::Written {
            result_state,
            document,
            diagnostics,
        } = outcome
        else {
            panic!("the lift wrote no document: {outcome:?}");
        };
        assert!(
            matches!(result_state, ResultState::Success),
            "the reader decided {result_state:?}: {diagnostics:?}"
        );
        written.push(document);
    }
    assert_eq!(written[0], written[1]);
}

#[trace("TC-1883", "FR-147-AC-12")]
#[test]
fn tc_1883_a_payload_row_binding_no_value_is_not_lowered_at_its_row() {
    let mut docs = documents();
    docs[1].1 = enum_doc(
        "Shape",
        &["| Empty | Nothing |"],
        &[
            "| Both | Boolean |",
            "| Empty | Boolean |",
            "| Empty | Integer |",
        ],
    );
    let stray = lowered(&bundle(&docs));
    let found = with_code(&stray, Code::ArtifactNotLowered);
    let lines: Vec<usize> = found
        .iter()
        .filter(|d| d.blocking)
        .filter_map(|d| d.locus.as_ref().map(|l| l.start_line))
        .collect();
    assert_eq!(lines, vec![20, 22], "{:?}", stray.diagnostics);
}
