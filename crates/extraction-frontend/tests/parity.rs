//! FR-098 "Cross-frontend parity": the `cases.json` record, the
//! `records-and-scalars` comparison against `node src/compiler/cli.mjs
//! compile`, and the projection's own properties.
//!
//! The shared case is authored in both dialects. Under the documented
//! FR-098 projection, its normalized serializations are byte-identical.

use std::fs;
use std::path::{Path, PathBuf};

mod common;
#[path = "parity/mod.rs"]
mod parity;

use agent_ix_extraction_frontend::{lift, LiftOutcome};
use common::{fixture, module_roots, read_json, run_node, workspace_dir};
use ix_trace_rs::trace;
use parity::{has_member, identities, project, projected_bytes, SHARED_PREFIX};
use proptest::prelude::*;
use serde_json::Value;

const CASES: &str = "test/fixtures/compiler/shared/cases.json";
const SHARED_CASE: &str = "records-and-scalars";

fn cases() -> Value {
    read_json(&workspace_dir().join(CASES))
}

/// One `cases.json` row: (id, typespec source, spec-bundle source, reason).
type CaseRow = (String, Option<String>, Option<String>, Option<String>);

/// The cases of `cases.json`.
fn case_rows() -> Vec<CaseRow> {
    cases()["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .map(|c| {
            let source = |dialect: &str| {
                c["sources"]
                    .get(dialect)
                    .and_then(Value::as_str)
                    .map(str::to_string)
            };
            (
                c["id"].as_str().expect("id").to_string(),
                source("typespec"),
                source("spec-bundle"),
                c.get("reason").and_then(Value::as_str).map(str::to_string),
            )
        })
        .collect()
}

#[trace("TC-1290", "FR-098-AC-6")]
#[test]
fn tc_1290_cases_json_names_both_sources_for_records_and_scalars_and_a_scalar_reason_for_the_rest()
{
    let rows = case_rows();
    let two_dialect: Vec<&str> = rows
        .iter()
        .filter(|(_, ts, sb, _)| ts.is_some() && sb.is_some())
        .map(|(id, ..)| id.as_str())
        .collect();
    assert_eq!(two_dialect, [SHARED_CASE], "exactly one two-dialect case");
    for (id, ts, sb, reason) in &rows {
        assert!(ts.is_some(), "{id}: no typespec source");
        if id == SHARED_CASE {
            assert_eq!(
                sb.as_deref(),
                Some("shared/spec-bundle/records-and-scalars")
            );
            continue;
        }
        assert!(sb.is_none(), "{id}: spec-bundle is not null");
        let reason = reason
            .as_deref()
            .unwrap_or_else(|| panic!("{id}: no reason"));
        assert!(reason.contains("scalar"), "{id}: {reason}");
        if id == "enums-and-unions" {
            assert!(reason.contains("union"), "{id}: {reason}");
        }
    }
}

/// The FR-098 record of the three single-dialect cases, while the shared
/// case names both source trees.
#[trace("TC-1290", "FR-098-AC-6")]
#[test]
fn tc_1290_the_three_existing_cases_are_single_dialect_with_a_scalar_reason_and_the_shared_case_names_its_trees(
) {
    let rows = case_rows();
    assert_eq!(rows.len(), 4);
    for (id, ts, sb, reason) in &rows {
        assert!(ts.is_some(), "{id}: no typespec source");
        if id == SHARED_CASE {
            assert_eq!(
                sb.as_deref(),
                Some("shared/spec-bundle/records-and-scalars"),
                "{id}: spec-bundle source"
            );
            assert!(reason.is_none(), "{id}: unexpected reason: {reason:?}");
            for tree in [
                "shared/typespec/records-and-scalars/types/main.tsp",
                "shared/spec-bundle/records-and-scalars/spec/functional/FR-001-note.md",
            ] {
                assert!(
                    workspace_dir()
                        .join("test/fixtures/compiler")
                        .join(tree)
                        .is_file(),
                    "{tree}"
                );
            }
            continue;
        }
        assert!(sb.is_none(), "{id}: spec-bundle is not null");
        let reason = reason
            .as_deref()
            .unwrap_or_else(|| panic!("{id}: no reason"));
        assert!(reason.contains("scalar"), "{id}: {reason}");
        if id == "enums-and-unions" {
            assert!(reason.contains("union"), "{id}: {reason}");
        }
    }
}

/// `node src/compiler/cli.mjs compile` over the TypeSpec half, as JSON.
/// `Err` names `node` when it cannot be started.
fn compile_typespec(package: &Path, out: &Path) -> Result<Value, String> {
    let run = run_node(
        &[
            "src/compiler/cli.mjs",
            "compile",
            "--package",
            &package.to_string_lossy(),
            "--entrypoint",
            "types/main.tsp",
            "--out",
            &out.to_string_lossy(),
        ],
        &[],
        None,
    )?;
    if run.status != 0 {
        return Err(format!("compile exited {}: {}", run.status, run.stderr));
    }
    Ok(read_json(out))
}

/// The spec-bundle half, lifted.
fn lift_spec_bundle(bundle: &Path, out_dir: &Path) -> Value {
    let request = agent_ix_extraction_frontend::LiftRequest {
        bundle_root: bundle.to_path_buf(),
        module_roots: module_roots(),
        out: out_dir.join("semantic-ir.json"),
        diagnostics: None,
        provenance: None,
    };
    let outcome = lift(&request);
    assert!(
        matches!(outcome, LiftOutcome::Written { .. }),
        "{}: {outcome:?}",
        bundle.display()
    );
    read_json(&request.out)
}

fn shared_dir(dialect: &str) -> PathBuf {
    workspace_dir()
        .join("test/fixtures/compiler/shared")
        .join(dialect)
        .join(SHARED_CASE)
}

/// The first node at which two projections differ, named by its path of
/// identities, so a failure names the node and not a byte offset.
fn first_differing_node(a: &Value, b: &Value, path: &str, out: &mut Vec<String>) {
    match (a, b) {
        (Value::Object(x), Value::Object(y)) => {
            let keys: std::collections::BTreeSet<&String> = x.keys().chain(y.keys()).collect();
            for key in keys {
                match (x.get(key), y.get(key)) {
                    (Some(l), Some(r)) => first_differing_node(l, r, &format!("{path}/{key}"), out),
                    (Some(_), None) => out.push(format!("{path}/{key}: spec-bundle only")),
                    (None, Some(_)) => out.push(format!("{path}/{key}: typespec only")),
                    (None, None) => {}
                }
            }
        }
        (Value::Array(x), Value::Array(y)) => {
            let id = |v: &Value| {
                v.get("identity")
                    .and_then(Value::as_str)
                    .map(str::to_string)
            };
            let by_id = |items: &[Value]| -> Vec<(Option<String>, Value)> {
                items.iter().map(|v| (id(v), v.clone())).collect()
            };
            let (xs, ys) = (by_id(x), by_id(y));
            if xs.iter().all(|(i, _)| i.is_some()) && ys.iter().all(|(i, _)| i.is_some()) {
                let ids: std::collections::BTreeSet<&Option<String>> =
                    xs.iter().chain(&ys).map(|(i, _)| i).collect();
                for i in ids {
                    let l = xs.iter().find(|(j, _)| j == i).map(|(_, v)| v);
                    let r = ys.iter().find(|(j, _)| j == i).map(|(_, v)| v);
                    let name = format!("{path}[{}]", i.as_deref().unwrap_or("?"));
                    match (l, r) {
                        (Some(l), Some(r)) => first_differing_node(l, r, &name, out),
                        (Some(_), None) => out.push(format!("{name}: spec-bundle only")),
                        (None, Some(_)) => out.push(format!("{name}: typespec only")),
                        (None, None) => {}
                    }
                }
            } else if x != y {
                out.push(format!("{path}: {x:?} != {y:?}"));
            }
        }
        _ => {
            if a != b {
                out.push(format!("{path}: {a} != {b}"));
            }
        }
    }
}

#[trace("TC-1291", "FR-098-AC-7")]
#[test]
fn tc_1291_projected_spec_bundle_lift_equals_projected_node_compile_byte_for_byte() {
    let scratch = tempfile::tempdir().expect("tempdir");
    let typespec = compile_typespec(&shared_dir("typespec"), &scratch.path().join("ts.json"))
        .unwrap_or_else(|e| panic!("{e}"));
    let spec_bundle = lift_spec_bundle(&shared_dir("spec-bundle"), scratch.path());
    let (a, b) = (projected_bytes(&spec_bundle), projected_bytes(&typespec));
    if a != b {
        let mut nodes = Vec::new();
        first_differing_node(&project(&spec_bundle), &project(&typespec), "", &mut nodes);
        panic!(
            "the projections differ at {} node(s):\n{}",
            nodes.len(),
            nodes.join("\n")
        );
    }
}

/// The half of TC-1291 that holds today: the TypeSpec half compiles and
/// the spec-bundle half lifts, both project to `ix://shared/` identities
/// only, and the test names `node` when it is absent.
#[trace("TC-1291", "FR-098-AC-7")]
#[test]
fn tc_1291_both_halves_of_the_shared_case_project_and_an_absent_node_is_named() {
    let scratch = tempfile::tempdir().expect("tempdir");
    let typespec = compile_typespec(&shared_dir("typespec"), &scratch.path().join("ts.json"))
        .unwrap_or_else(|e| panic!("{e}"));
    let spec_bundle = lift_spec_bundle(&shared_dir("spec-bundle"), scratch.path());
    for (label, document) in [("typespec", &typespec), ("spec-bundle", &spec_bundle)] {
        let projected = project(document);
        let mut ids = Vec::new();
        identities(&projected, &mut ids);
        assert!(!ids.is_empty(), "{label}");
        assert!(
            ids.iter().all(|i| i.starts_with(SHARED_PREFIX)),
            "{label}: {ids:?}"
        );
        // No scalar alias is minted for a kernel scalar reference (gap 1 of
        // FCD #199/#200): every field's `typeRef` names the kernel scalar
        // directly, so `types` mints no `scalar`-kind node at all, and both
        // dialects reference the same kernel native identities.
        assert!(
            !projected["types"]
                .as_array()
                .expect("types")
                .iter()
                .any(|t| t["kind"] == "scalar"),
            "{label}: no scalar alias node is minted"
        );
        let mut type_refs: Vec<&str> = Vec::new();
        for record in projected["types"].as_array().expect("types") {
            for field in record["fields"].as_array().into_iter().flatten() {
                if let Some(t) = field["typeRef"].as_str() {
                    type_refs.push(t);
                }
            }
        }
        type_refs.sort_unstable();
        type_refs.dedup();
        assert_eq!(
            type_refs,
            [
                "ix://quire/native/Boolean",
                "ix://quire/native/Integer",
                "ix://quire/native/String",
                "ix://quire/native/Timestamp"
            ],
            "{label}"
        );
    }
    // Absent node: the failure names `node`.
    let empty = tempfile::tempdir().expect("tempdir");
    let error = run_node(
        &["src/compiler/cli.mjs", "compile"],
        &[],
        Some(&empty.path().to_string_lossy()),
    )
    .err()
    .expect("node is absent from an empty PATH");
    assert!(error.contains("node"), "{error}");
}

/// A random permutation of every node list of `document`, and a random
/// `origin`/`extensions` planted at a random node, for the property.
fn shuffled(document: &Value, seed: &[usize]) -> Value {
    fn walk(value: &mut Value, seed: &[usize], depth: &mut usize) {
        match value {
            Value::Object(members) => {
                let i = *depth;
                *depth += 1;
                // Walk the members that were there, then plant the two the
                // projection drops (never walking into what was planted).
                for (key, member) in members.iter_mut() {
                    if key != "origin" && key != "extensions" {
                        walk(member, seed, depth);
                    }
                }
                members.insert(
                    "origin".to_string(),
                    serde_json::json!({"generated": {"generatorIdentity": format!("ix://x/y/{i}")}}),
                );
                members.insert(
                    "extensions".to_string(),
                    serde_json::json!([{"identity": format!("ix://x/y/ext/{i}")}]),
                );
            }
            Value::Array(items) => {
                // Only a node list (every item carries an `identity`) is
                // order-free under the projection; `roles`, `pre`/`post` and
                // operand lists keep their authored order.
                let node_list =
                    !items.is_empty() && items.iter().all(|v| v.get("identity").is_some());
                if node_list {
                    let k = seed[*depth % seed.len()] % items.len();
                    items.rotate_left(k);
                }
                for item in items.iter_mut() {
                    walk(item, seed, depth);
                }
            }
            _ => {}
        }
    }
    let mut out = document.clone();
    let mut depth = 0;
    walk(&mut out, seed, &mut depth);
    out
}

#[trace("TC-1344", "FR-098-AC-12")]
#[test]
fn tc_1344_project_yields_types_only_no_origin_or_extensions_shared_identities_and_is_idempotent() {
    let golden = read_json(&fixture("config-version-table/expected/semantic-ir.json"));
    let projected = project(&golden);
    assert_eq!(
        projected
            .as_object()
            .expect("object")
            .keys()
            .collect::<Vec<_>>(),
        ["types"]
    );
    assert!(!has_member(&projected, "origin"));
    assert!(!has_member(&projected, "extensions"));
    let mut ids = Vec::new();
    identities(&projected, &mut ids);
    // Gap 1 of FCD #199/#200 stopped minting an alias node per scalar-typed
    // field reference (a field's `typeRef` now names the kernel scalar
    // directly), so this real fixture mints fewer identities than before
    // that landed; the floor is a sanity check that the fixture is still
    // substantial, not a pinned count.
    assert!(ids.len() >= 15, "{}", ids.len());
    assert!(ids.iter().all(|i| i.starts_with(SHARED_PREFIX)), "{ids:?}");
    assert_eq!(project(&projected), projected, "idempotent");
    assert_eq!(projected_bytes(&projected), projected_bytes(&golden));

    // Property: the projection is invariant under any permutation of the
    // node lists and any planted origin/extensions, and idempotent.
    let baseline = projected_bytes(&golden);
    proptest!(ProptestConfig::with_cases(64), |(seed in proptest::collection::vec(0usize..97, 1..8))| {
        let varied = shuffled(&golden, &seed);
        prop_assert_eq!(projected_bytes(&varied), baseline.clone());
        let once = project(&varied);
        prop_assert_eq!(project(&once), once);
    });
    // The prefix rewrite reads `package.identity`: a document without one
    // keeps its identities.
    let mut without = golden.clone();
    without.as_object_mut().expect("object").remove("package");
    let mut kept = Vec::new();
    identities(&project(&without), &mut kept);
    assert!(kept
        .iter()
        .all(|i| i.starts_with("ix://agent-ix/config-service/")));
    let _ = fs::metadata(fixture("config-version-table"));
}
