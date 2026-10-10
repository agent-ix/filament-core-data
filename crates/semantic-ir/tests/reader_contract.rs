// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! Package revision and unused construct admission (FR-050, FR-142).

use agent_ix_semantic_ir::{
    decide,
    json::{parse, to_canonical_string},
    ResultState,
};

const K2_BOUNDARY: &str =
    include_str!("../../../fixtures/semantic/v1/reader-contract/k2-boundary.json");

fn diagnostics(document: &str) -> Vec<(&'static str, String)> {
    decide(&parse(&format!(r#"{{"ir":{document}}}"#)).expect("valid JSON"))
        .diagnostics
        .into_iter()
        .map(|diagnostic| (diagnostic.code, diagnostic.pointer))
        .collect()
}

/// Trace: FR-142-AC-15
#[test]
fn admits_unused_population_meaning_independently_of_revision_or_kind_name() {
    let document = K2_BOUNDARY.replace("\"version\": \"1\"", "\"version\": \"1.0.0\"");
    assert!(diagnostics(&document).is_empty());
    assert!(diagnostics(
        &document.replace("\"name\": \"population\"", "\"name\": \"unused_kind\"")
    )
    .is_empty());
}

/// Trace: FR-050-AC-16, FR-142-AC-15
#[test]
fn admits_authored_revision_one_and_unused_population_with_timestamp_binding() {
    let bundle = parse(&format!(r#"{{"ir":{K2_BOUNDARY}}}"#)).expect("K2 boundary bytes");
    let verdict = decide(&bundle);
    assert_eq!(verdict.result_state, ResultState::Success);
    assert!(verdict.diagnostics.is_empty());
    let normalized = parse(&verdict.normalized).expect("normalized IR");
    assert_eq!(
        normalized
            .get("package")
            .unwrap()
            .get("version")
            .unwrap()
            .as_str(),
        Some("1")
    );
    assert_eq!(
        normalized
            .get("source")
            .unwrap()
            .get("version")
            .unwrap()
            .as_str(),
        Some("1")
    );
    assert_eq!(
        to_canonical_string(normalized.get("constructs").unwrap()),
        to_canonical_string(bundle.get("ir").unwrap().get("constructs").unwrap())
    );
    let instant = normalized.get("types").unwrap().at(0).unwrap();
    assert_eq!(
        instant.get("identity").unwrap().as_str(),
        Some("ix://test/orders/Instant")
    );
    assert_eq!(
        instant.get("target").unwrap().as_str(),
        Some("ix://quire/native/Timestamp")
    );
    // The occurrence-field rule still follows Instant to the native scalar.
    assert_eq!(
        diagnostics(&K2_BOUNDARY.replace("native/Timestamp", "native/Integer")),
        vec![(
            "agent-ix.semantic-ir.INVALID_OCCURRENCE_FIELD",
            "/ir/types/1/occurrenceField".into(),
        )]
    );
}

/// Trace: FR-050-AC-16
#[test]
fn revision_admission_preserves_canonical_strings_and_refuses_other_spellings() {
    for revision in ["0", "1", "9007199254740993", "1.2.3", "1.2.3-rc.1+build"] {
        assert!(
            diagnostics(&K2_BOUNDARY.replace(
                "\"version\": \"1\"",
                &format!("\"version\": \"{revision}\"")
            ))
            .is_empty(),
            "{revision}"
        );
    }
    for revision in ["", "01", "-1", "1.0", "1 ", "1\\n", "1e0", "v1"] {
        let document = K2_BOUNDARY.replace(
            "\"version\": \"1\"",
            &format!("\"version\": \"{revision}\""),
        );
        assert_eq!(
            diagnostics(&document),
            vec![
                (
                    "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                    "/ir/package/version".into()
                ),
                (
                    "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                    "/ir/source/version".into()
                ),
            ],
            "{revision}"
        );
    }
    assert_eq!(
        diagnostics(&K2_BOUNDARY.replace("\"version\": \"1\"", "\"version\": 1")),
        vec![
            (
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/package/version".into()
            ),
            (
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/source/version".into()
            ),
        ]
    );
    assert_eq!(
        diagnostics(
            &K2_BOUNDARY.replace("\"moduleVersion\": \"1.0.0\"", "\"moduleVersion\": \"1\"")
        ),
        vec![
            (
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/constructs/0/moduleVersion".into()
            ),
            (
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/constructs/1/moduleVersion".into()
            ),
        ]
    );
}

/// Trace: FR-142-AC-15
#[test]
fn unused_declarations_still_refuse_broken_shapes_duplicates_and_dangling_kinds() {
    for (document, pointers) in [
        (
            K2_BOUNDARY.replace("\"shape\": \"namespace\"", "\"shape\": \"unsupported\""),
            vec!["/ir/constructs/1/construct/shape"],
        ),
        (
            K2_BOUNDARY.replace("\"name\": \"population\"", "\"name\": \"happened\""),
            vec!["/ir/constructs/1/kind"],
        ),
        (
            K2_BOUNDARY.replacen("\"name\": \"happened\"", "\"name\": \"missing\"", 1),
            vec!["/ir/constructs/0/kind", "/ir/types/1/kind"],
        ),
    ] {
        assert_eq!(
            diagnostics(&document),
            pointers
                .into_iter()
                .map(|pointer| ("agent-ix.semantic-ir.SCHEMA_VIOLATION", pointer.into()))
                .collect::<Vec<_>>()
        );
    }
}

/// Trace: FR-142-AC-9, FR-142-AC-15
#[test]
fn refuses_unused_kinds_outside_the_recognized_population_meaning() {
    for meaning in [
        "quire.meaning.model.event-type/v1",
        "quire.meaning.model.unrecognized/v1",
        "quire.meaning.model.population/v2",
    ] {
        let document = K2_BOUNDARY
            .replace("\"name\": \"population\"", "\"name\": \"ledger\"")
            .replace("quire.meaning.model.population/v1", meaning);
        assert_eq!(
            diagnostics(&document),
            vec![(
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/constructs/1/kind".into()
            )],
            "{meaning}"
        );
    }
}
