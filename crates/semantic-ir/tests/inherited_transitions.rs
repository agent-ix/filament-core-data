// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! Transition reference lookup across state-machine supertypes (FR-142).

use agent_ix_semantic_ir::{
    decide,
    json::{parse, Json},
    ResultState,
};

const BASE: &str =
    include_str!("../../../fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json");
const SPAN: &str = r#"{"endColumn":20,"endLine":40,"path":"spec/functional/SM-001-order-lifecycle.md","sourceIdentity":"ix://agent-ix/orders/spec","startColumn":1,"startLine":40}"#;
const ORIGIN_SPAN: &str = r#"{"source":{"path":"spec/functional/SM-001-order-lifecycle.md","sourceIdentity":"ix://agent-ix/orders/spec","startColumn":1,"startLine":40}}"#;
const ORIGIN: &str = r#"{"generated":{"generatorIdentity":"ix://test/orders/reader-fixture","generatorVersion":"1.0.0","inputIdentities":["ix://test/orders/source"]}}"#;

fn document(target: &str, trigger: &str) -> Json {
    with_guard(target, trigger, None)
}

fn with_guard(target: &str, trigger: &str, guard: Option<&str>) -> Json {
    let guard = guard.map_or(String::new(), |id| format!(r#""guard":"{id}","#));
    let mut ir = parse(BASE).expect("constructs fixture is JSON");
    let child = format!(
        r#"{{
        "identity":"ix://agent-ix/orders/SM-Express", "displayName":"ExpressLifecycle",
        "kind":{{"module":"agent-ix/spec-objects-business","name":"state_machine"}},
        "roles":["business:state_machine"], "origin":{ORIGIN},
        "constraints":[], "extensions":[], "unknownPolicy":"reject",
        "supertypes":["ix://agent-ix/orders/SM-001"],
        "states":[{{"identity":"ix://agent-ix/orders/state/SM-Express-expedited","name":"expedited","origin":{ORIGIN}}}],
        "operations":[{{"identity":"ix://agent-ix/orders/SM-Express/expedite","name":"expedite","params":[],"pre":[],"post":[],"origin":{ORIGIN}}}],
        "transitions":[
            {{"identity":"ix://agent-ix/orders/transition/SM-Express-expedite",
              "from":"ix://agent-ix/orders/state/SM-001-placed",
              "to":"ix://agent-ix/orders/state/SM-Express-expedited",
              "trigger":"ix://agent-ix/orders/SM-Express/expedite","emits":[],"origin":{ORIGIN}}},
            {{"identity":"ix://agent-ix/orders/transition/SM-Express-advance",
              "from":"ix://agent-ix/orders/state/SM-Express-expedited",
              "to":"ix://agent-ix/orders/state/SM-001-shipped",
              "trigger":"ix://agent-ix/orders/SM-001/advance","emits":[],"origin":{ORIGIN}}}
        ]
    }}"#
    );
    let grandchild = format!(
        r#"{{
        "identity":"ix://agent-ix/orders/SM-Urgent", "displayName":"UrgentLifecycle",
        "kind":{{"module":"agent-ix/spec-objects-business","name":"state_machine"}},
        "roles":["business:state_machine"], "origin":{ORIGIN},
        "constraints":[], "extensions":[], "unknownPolicy":"reject",
        "supertypes":["ix://agent-ix/orders/SM-Express"],
        "clauses":[{{"clauseId":"urgent_own","identity":"ix://agent-ix/orders/clause/SM-Urgent-own","language":"ocl","origin":{ORIGIN_SPAN},"sourceSpan":{SPAN},"text":"context UrgentLifecycle inv urgent_own: true"}}],
        "states":[{{"identity":"ix://agent-ix/orders/state/SM-Urgent-done","name":"done","origin":{ORIGIN}}}],
        "operations":[{{"identity":"ix://agent-ix/orders/SM-Urgent/finish","name":"finish","params":[],"pre":[],"post":[],"origin":{ORIGIN}}}],
        "transitions":[{{"identity":"ix://agent-ix/orders/transition/SM-Urgent-finish",
            "from":"ix://agent-ix/orders/state/SM-001-placed",
            {guard}"to":"{target}", "trigger":"{trigger}","emits":[],"origin":{ORIGIN}}}]
    }}"#
    );
    let Json::Object(ref mut members) = ir else {
        unreachable!()
    };
    let Json::Array(types) = &mut members
        .iter_mut()
        .find(|(name, _)| name == "types")
        .unwrap()
        .1
    else {
        unreachable!()
    };
    types.push(parse(&child).expect("child fixture is JSON"));
    types.push(parse(&grandchild).expect("grandchild fixture is JSON"));
    Json::Object(vec![("ir".into(), ir)])
}

/// Trace: FR-142-AC-16
/// Provenance: AGE-2239, QSL TC-235 M19 run 1.
#[test]
fn subtype_transition_resolves_own_and_inherited_states_and_operations() {
    let verdict = decide(&document(
        "ix://agent-ix/orders/state/SM-Urgent-done",
        "ix://agent-ix/orders/SM-001/advance",
    ));
    assert_eq!(verdict.result_state, ResultState::Success);
    assert!(verdict.diagnostics.is_empty());
}

/// Trace: FR-142-AC-4, FR-142-AC-16
/// Provenance: AGE-2239.
#[test]
fn subtype_transition_refuses_state_and_trigger_absent_from_all_ancestors() {
    let verdict = decide(&document(
        "ix://agent-ix/orders/state/Missing",
        "ix://agent-ix/orders/operation/Missing",
    ));
    assert_eq!(verdict.result_state, ResultState::Invalid);
    assert_eq!(
        verdict
            .diagnostics
            .iter()
            .map(|d| (d.code, d.pointer.as_str()))
            .collect::<Vec<_>>(),
        [
            (
                "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF",
                "/ir/types/25/transitions/0/to"
            ),
            (
                "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF",
                "/ir/types/25/transitions/0/trigger"
            ),
        ]
    );
}

fn guard_verdict(guard: &str) -> agent_ix_semantic_ir::Verdict {
    decide(&with_guard(
        "ix://agent-ix/orders/state/SM-Urgent-done",
        "ix://agent-ix/orders/SM-001/advance",
        Some(guard),
    ))
}

fn assert_guard_dangling(guard: &str) {
    let verdict = guard_verdict(guard);
    assert_eq!(verdict.result_state, ResultState::Invalid);
    assert_eq!(
        verdict
            .diagnostics
            .iter()
            .map(|d| (d.code, d.pointer.as_str()))
            .collect::<Vec<_>>(),
        [(
            "agent-ix.semantic-ir.DANGLING_CLAUSE_REF",
            "/ir/types/25/transitions/0/guard"
        )]
    );
}

/// Trace: FR-142-AC-16
/// Provenance: QSL TC-235 M19 run 7, FR-208-AC-12.
#[test]
fn subtype_transition_guard_resolves_clause_of_a_supertype() {
    // `can_ship` is declared on SM-001, two levels above UrgentLifecycle.
    let verdict = guard_verdict("can_ship");
    assert_eq!(verdict.result_state, ResultState::Success);
    assert!(verdict.diagnostics.is_empty());
}

/// Trace: FR-142-AC-16
#[test]
fn subtype_transition_guard_resolves_clause_of_its_own_type() {
    let verdict = guard_verdict("urgent_own");
    assert_eq!(verdict.result_state, ResultState::Success);
    assert!(verdict.diagnostics.is_empty());
}

/// Trace: FR-142-AC-16
#[test]
fn subtype_transition_guard_naming_no_clause_is_dangling() {
    assert_guard_dangling("nowhere");
}

/// Trace: FR-142-AC-16
#[test]
fn subtype_transition_guard_naming_clause_of_unrelated_type_is_dangling() {
    // `capped` is declared on an unrelated type of the fixture.
    assert_guard_dangling("capped");
}
