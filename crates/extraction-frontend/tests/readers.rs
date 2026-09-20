//! The reader checks FR-092, FR-093, FR-094 and FR-095 defer to the written
//! document: every emitted positive fixture passes `agent_ix_semantic_ir::decide`
//! and the FR-050 node reader with none of the codes each requirement
//! names. Nothing here reads the environment except to shell to `node`.

use std::fs;

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, WireCode};
use agent_ix_extraction_frontend::LiftOutcome;
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::{decide, ResultState};
use common::{inspect, positive_lifts};
use ix_trace_rs::trace;
use serde_json::Value;

/// The reader codes over the written document of `request`, from both
/// readers: `<code> at <pointer>` from `decide`, and the FR-050 reader's
/// `code` values from `inspect --json`.
fn reader_codes(out: &std::path::Path) -> (Vec<String>, Vec<String>) {
    let text = fs::read_to_string(out).expect("read");
    let verdict = decide(&parse_json(&format!("{{\"ir\":{text}}}")).expect("parses"));
    let rust: Vec<String> = verdict
        .diagnostics
        .iter()
        .map(|d| format!("{} at {}", d.code, d.pointer))
        .collect();
    let (_, summary) = inspect(out);
    let node: Vec<String> = summary["diagnostics"]
        .as_array()
        .expect("diagnostics")
        .iter()
        .map(|d| {
            d["code"]
                .as_str()
                .map(str::to_string)
                .unwrap_or_else(|| d.to_string())
        })
        .collect();
    (rust, node)
}

fn assert_none_of(name: &str, codes: &[String], forbidden: &[&str]) {
    for code in codes {
        for suffix in forbidden {
            assert!(!code.contains(suffix), "{name}: the reader raised {code}");
        }
    }
}

#[trace("TC-1219", "FR-092-AC-10")]
#[test]
fn tc_1219_neither_reader_raises_unresolved_type_ref_over_any_emitted_document() {
    for (name, _dir, request, _) in positive_lifts() {
        let (rust, node) = reader_codes(&request.out);
        assert_none_of(&name, &rust, &["UNRESOLVED_TYPE_REF"]);
        assert_none_of(&name, &node, &["UNRESOLVED_TYPE_REF"]);
        // Every typeRef names either a declared identity or a kernel scalar
        // (gap 1 of FCD #199/#200: a kernel scalar mints no package node,
        // its `typeRef` is `ix://quire/native/<Name>` over the closed
        // FR-032 set instead).
        let document: Value =
            serde_json::from_slice(&fs::read(&request.out).expect("read")).expect("json");
        let declared: Vec<&str> = document["types"]
            .as_array()
            .expect("types")
            .iter()
            .filter_map(|t| t["identity"].as_str())
            .collect();
        let is_native = |type_ref: &str| {
            type_ref
                .strip_prefix("ix://quire/native/")
                .is_some_and(|name| {
                    agent_ix_extraction_frontend::KernelScalar::from_name(name).is_some()
                })
        };
        for definition in document["types"].as_array().expect("types") {
            let fields = definition["fields"]
                .as_array()
                .map(Vec::as_slice)
                .unwrap_or(&[]);
            let params = definition["operations"]
                .as_array()
                .map(Vec::as_slice)
                .unwrap_or(&[])
                .iter()
                .flat_map(|o| o["params"].as_array().map(Vec::as_slice).unwrap_or(&[]));
            for field in fields.iter().chain(params) {
                let type_ref = field["typeRef"].as_str().expect("typeRef");
                assert!(
                    is_native(type_ref) || declared.contains(&type_ref),
                    "{name}: {type_ref} is neither declared nor a kernel scalar"
                );
            }
        }
    }
}

#[trace("TC-1230", "FR-093-AC-11")]
#[test]
fn tc_1230_every_emitted_document_passes_both_readers_with_zero_semantic_ir_diagnostics() {
    let lifts = positive_lifts();
    assert!(lifts.len() >= 4);
    for (name, _dir, request, outcome) in &lifts {
        let (rust, node) = reader_codes(&request.out);
        assert_eq!(rust, Vec::<String>::new(), "{name}: decide");
        assert_eq!(node, Vec::<String>::new(), "{name}: inspect");
        let LiftOutcome::Written { result_state, .. } = outcome else {
            unreachable!()
        };
        assert_eq!(*result_state, ResultState::Success, "{name}");
    }
}

#[trace("TC-1245", "FR-094-AC-15")]
#[test]
fn tc_1245_neither_reader_raises_a_relationship_clause_or_span_code_over_any_emitted_document() {
    let forbidden = [
        "UNRESOLVED_RELATIONSHIP_TARGET",
        "UNKNOWN_EDGE_CATEGORY",
        "COMPOSITE_CYCLE",
        "DANGLING_CLAUSE_REF",
        "MISSING_SOURCE_SPAN",
    ];
    let mut with_edges = 0;
    for (name, _dir, request, _) in positive_lifts() {
        let (rust, node) = reader_codes(&request.out);
        assert_none_of(&name, &rust, &forbidden);
        assert_none_of(&name, &node, &forbidden);
        let document: Value =
            serde_json::from_slice(&fs::read(&request.out).expect("read")).expect("json");
        if document["types"]
            .as_array()
            .expect("types")
            .iter()
            .any(|t| t["relationships"].as_array().is_some_and(|r| !r.is_empty()))
        {
            with_edges += 1;
        }
    }
    assert!(
        with_edges > 0,
        "at least one emitted document carries a relationship"
    );
}

#[trace("TC-1258", "FR-095-AC-13")]
#[test]
fn tc_1258_the_emitted_envelope_of_every_positive_fixture_passes_decide_at_lift_time_with_zero_invalid_ir(
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
        assert!(
            !diagnostics
                .iter()
                .any(|d| d.code == WireCode::Registry(Code::InvalidIr)),
            "{name}: {diagnostics:?}"
        );
        let document: Value =
            serde_json::from_slice(&fs::read(&request.out).expect("read")).expect("json");
        assert_eq!(document["contractVersion"], "2.0.0", "{name}");
        assert_eq!(document["source"]["dialect"], "spec-bundle", "{name}");
        assert!(document["source"]["identity"]
            .as_str()
            .is_some_and(|i| i.starts_with("ix://") && i.ends_with("/spec")));
        assert_eq!(document["occurrences"], Value::Array(Vec::new()));
        assert_eq!(document["extensions"], Value::Array(Vec::new()));
        assert_eq!(
            document["package"]["profileVersions"],
            Value::Array(Vec::new())
        );
        assert_eq!(
            document["package"]["mappingVersions"],
            Value::Array(vec![Value::String("1.0.0".to_string())])
        );
        let (rust, _) = reader_codes(&request.out);
        assert_eq!(rust, Vec::<String>::new(), "{name}");
    }
}
