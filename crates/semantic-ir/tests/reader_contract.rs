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
const PACKAGE_BASE: &str = include_str!("../../../conformance/bases/package-2-0.json");

/// Trace: FR-035-AC-1
#[test]
fn selected_graph_export_resolves_relationship_target() {
    let target = "ix://agent-ix/conformance/type/Node";
    let selected = "ix://agent-ix/kernel/Text";
    let at = PACKAGE_BASE
        .find("\"targetEnd\": {")
        .expect("relationship target");
    let (prefix, suffix) = PACKAGE_BASE.split_at(at);
    let input = format!("{prefix}{}", suffix.replacen(target, selected, 1));
    let bundle = parse(&input).expect("package base");
    assert!(decide(&bundle).diagnostics.is_empty());

    let graph_at = input.find("\"packageGraph\": {").expect("selected graph");
    let (prefix, suffix) = input.split_at(graph_at);
    let missing = format!(
        "{prefix}{}",
        suffix.replacen(selected, "ix://agent-ix/kernel/Other", 1)
    );
    let verdict = decide(&parse(&missing).expect("missing selected export"));
    assert!(verdict
        .diagnostics
        .iter()
        .any(|row| { row.code == "agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET" }));
}

/// Trace: FR-035-AC-1
#[test]
fn selected_graph_rejects_missing_root_and_descending_imports() {
    let graph_at = PACKAGE_BASE
        .find("\"packageGraph\": {")
        .expect("selected graph");
    let (prefix, suffix) = PACKAGE_BASE.split_at(graph_at);
    for changed in [
        suffix.replacen(
            "\"rootPackage\": \"agent-ix/conformance\"",
            "\"rootPackage\": \"agent-ix/absent\"",
            1,
        ),
        suffix.replacen(
            "\"imports\": [\"agent-ix/kernel\"]",
            "\"imports\": [\"agent-ix/kernel\", \"agent-ix/alpha\"]",
            1,
        ),
    ] {
        let input = format!("{prefix}{changed}");
        let verdict = decide(&parse(&input).expect("changed selected graph"));
        assert!(verdict.diagnostics.iter().any(|row| {
            row.code == "agent-ix.semantic-ir.SCHEMA_VIOLATION"
                && row.pointer.starts_with("/packageGraph/")
        }));
    }
}

fn diagnostics(document: &str) -> Vec<(&'static str, String)> {
    decide(&parse(&format!(r#"{{"ir":{document}}}"#)).expect("valid JSON"))
        .diagnostics
        .into_iter()
        .map(|diagnostic| (diagnostic.code, diagnostic.pointer))
        .collect()
}

/// Trace: FR-142-AC-3
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
            "/ir/types/2/occurrenceField".into(),
        )]
    );
}

/// Trace: FR-142-AC-15
#[test]
fn construct_alias_target_must_resolve_to_a_document_or_native_type() {
    let diagnostics = diagnostics(
        &K2_BOUNDARY.replace("ix://quire/native/Timestamp", "ix://test/orders/Missing"),
    );
    assert!(diagnostics.contains(&(
        "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF",
        "/ir/types/0/target".into(),
    )));
}

/// Trace: FR-142-AC-15
#[test]
fn construct_alias_target_does_not_accept_a_field_that_resolves_to_native() {
    let document = K2_BOUNDARY
        .replace(
            "\"target\": \"ix://quire/native/Timestamp\"",
            "\"target\": \"ix://test/orders/OrderPlaced/occurred_at\"",
        )
        .replace(
            "\"typeRef\": \"ix://test/orders/InstantAlias\"",
            "\"typeRef\": \"ix://quire/native/Timestamp\"",
        );
    assert!(diagnostics(&document).contains(&(
        "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF",
        "/ir/types/0/target".into(),
    )));
}

/// Trace: FR-142-AC-15
#[test]
fn construct_alias_cycles_are_reported_by_the_alias_rule() {
    let document = K2_BOUNDARY.replace(
        "\"target\": \"ix://test/orders/Instant\"",
        "\"target\": \"ix://test/orders/InstantAlias\"",
    );
    assert!(diagnostics(&document).contains(&(
        "agent-ix.semantic-ir.ALIAS_CYCLE",
        "/ir/types/1/target".into(),
    )));
}

/// Trace: FR-142-AC-15
#[test]
fn non_alias_construct_shapes_still_forbid_the_target_member() {
    let document = K2_BOUNDARY.replace(
        "\"identity\": \"ix://test/orders/OrderPlaced\"",
        "\"identity\": \"ix://test/orders/OrderPlaced\", \"target\": \"ix://test/orders/Instant\"",
    );
    assert!(diagnostics(&document).contains(&(
        "agent-ix.semantic-ir.SCHEMA_VIOLATION",
        "/ir/types/2/target".into(),
    )));
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
            (
                "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "/ir/constructs/2/moduleVersion".into()
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
            vec!["/ir/constructs/0/kind", "/ir/types/2/kind"],
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
