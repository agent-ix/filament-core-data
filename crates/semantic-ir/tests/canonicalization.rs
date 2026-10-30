// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

use agent_ix_semantic_ir::json::{parse, to_canonical_string, Json};
use agent_ix_semantic_ir::schema;

/// Trace: FR-145-AC-3, FR-145-AC-7, FR-145-CON-3, TC-1827.
#[test]
fn shared_supplementary_plane_golden_uses_utf16_order_without_digest() {
    let golden = parse(include_str!(
        "../../../test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json"
    ))
    .expect("shared golden JSON");
    assert_eq!(
        golden.get("algorithm").and_then(|value| value.as_str()),
        Some("rfc8785-v1")
    );
    assert!(golden.get("digest").is_none());
    let input = golden.get("input").expect("shared golden input");
    let expected = golden
        .get("expectedBytes")
        .and_then(|value| value.as_str())
        .expect("shared golden expected bytes");
    assert_eq!(to_canonical_string(input), expected);
}

/// Trace: FR-145-AC-2, TC-1831.
#[test]
fn reader_accepts_only_the_algorithm_descriptor() {
    let positive = parse(include_str!(
        "../../../fixtures/semantic/v1/positive/semantic-ir-v1-1.json"
    ))
    .expect("positive Semantic IR fixture");
    let bundle = |ir| Json::Object(vec![("ir".to_owned(), ir)]);
    assert!(schema::decide(&bundle(positive.clone())).is_empty());

    for (descriptor, offending_member) in [
        (Json::Object(vec![]), "algorithm"),
        (
            Json::Object(vec![(
                "algorithm".to_owned(),
                Json::Str("unknown-v1".to_owned()),
            )]),
            "algorithm",
        ),
        (
            Json::Object(vec![
                ("algorithm".to_owned(), Json::Str("rfc8785-v1".to_owned())),
                ("digest".to_owned(), Json::Str("sha256-jcs".to_owned())),
            ]),
            "digest",
        ),
        (
            Json::Object(vec![
                ("algorithm".to_owned(), Json::Str("rfc8785-v1".to_owned())),
                ("extra".to_owned(), Json::Bool(true)),
            ]),
            "extra",
        ),
    ] {
        let mut ir = positive.clone();
        let Json::Object(ref mut members) = ir else {
            panic!("positive fixture is an object");
        };
        let (_, current) = members
            .iter_mut()
            .find(|(name, _)| name == "canonicalization")
            .expect("positive fixture has canonicalization");
        *current = descriptor;
        let diagnostics = schema::decide(&bundle(ir));
        assert!(
            diagnostics.iter().any(|diagnostic| {
                diagnostic.pointer.starts_with("/ir/canonicalization")
                    && (diagnostic.pointer.contains(offending_member)
                        || diagnostic.message.contains(offending_member))
            }),
            "expected a located refusal for {offending_member}, got {diagnostics:?}"
        );
    }

    let Json::Object(ref members) = positive else {
        panic!("positive fixture is an object");
    };
    let without_descriptor = Json::Object(
        members
            .iter()
            .filter(|(name, _)| name != "canonicalization")
            .cloned()
            .collect(),
    );
    let diagnostics = schema::decide(&bundle(without_descriptor));
    assert!(
        diagnostics.iter().any(|diagnostic| {
            diagnostic.pointer.starts_with("/ir") && diagnostic.message.contains("canonicalization")
        }),
        "expected a located missing-descriptor refusal, got {diagnostics:?}"
    );
}
