// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! The optional Boolean `symmetric` member of a population (QSpec FR-381,
//! QSL FR-150, QSL-871). Absent means false.

use agent_ix_semantic_ir::{decide, json::parse};

const POSITIVE: &str =
    include_str!("../../../fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json");

const EXTENT: &str = "\"extent\": \"open\",";
const SCHEMA_VIOLATION: &str = "agent-ix.semantic-ir.SCHEMA_VIOLATION";

/// `(pointer, code)` of every diagnostic for the fixture with `extra` added to
/// its population.
fn diagnostics(extra: &str) -> Vec<(String, &'static str)> {
    assert_eq!(POSITIVE.matches(EXTENT).count(), 1);
    let document = POSITIVE.replace(EXTENT, &format!("{EXTENT}{extra}"));
    decide(&parse(&format!(r#"{{"ir":{document}}}"#)).expect("valid JSON"))
        .diagnostics
        .into_iter()
        .map(|located| (located.pointer, located.code))
        .collect()
}

#[test]
fn admits_a_population_without_symmetric() {
    assert!(diagnostics("").is_empty());
}

#[test]
fn admits_symmetric_true_and_false() {
    assert!(diagnostics("\"symmetric\": true,").is_empty());
    assert!(diagnostics("\"symmetric\": false,").is_empty());
}

#[test]
fn refuses_a_non_boolean_symmetric() {
    for value in ["\"yes\"", "1", "null"] {
        let found = diagnostics(&format!("\"symmetric\": {value},"));
        assert_eq!(
            found,
            vec![("/ir/populations/0/symmetric".to_string(), SCHEMA_VIOLATION)],
            "{value}"
        );
    }
}

#[test]
fn still_refuses_an_unknown_population_member() {
    let found = diagnostics("\"transitive\": true,");
    assert_eq!(
        found,
        vec![("/ir/populations/0".to_string(), SCHEMA_VIOLATION)]
    );
}
