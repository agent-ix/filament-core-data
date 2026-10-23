// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

use agent_ix_semantic_ir::{decide, json::parse};

const CONFIG_TIME: &str =
    include_str!("../../../fixtures/semantic/v1/clock-units/config-time.json");

#[test]
fn tc_1844_config_time_and_scaled_units_are_admitted() {
    let bundle = parse(&format!(r#"{{"ir":{CONFIG_TIME}}}"#)).expect("authored fixture is JSON");
    let verdict = decide(&bundle);
    let diagnostics: Vec<_> = verdict
        .diagnostics
        .iter()
        .map(|diagnostic| {
            (
                diagnostic.code,
                diagnostic.pointer.as_str(),
                diagnostic.message.as_str(),
            )
        })
        .collect();
    assert!(diagnostics.is_empty(), "FR-146-AC-3: {diagnostics:?}");
}

#[test]
fn config_without_dimension_unit_members_preserves_reader_admission() {
    let mut document = parse(CONFIG_TIME).expect("authored fixture is JSON");
    let agent_ix_semantic_ir::json::Json::Object(members) = &mut document else {
        panic!("fixture must be an object");
    };
    members.retain(|(name, _)| name != "dimensions" && name != "units");
    let bundle = agent_ix_semantic_ir::json::Json::Object(vec![("ir".to_owned(), document)]);
    assert!(decide(&bundle).diagnostics.is_empty());
}

#[test]
fn tc_1845_units_refuse_unresolved_references_and_invalid_scales() {
    for (before, after, code, pointer) in [
        (
            "\"target\": \"ix://acme/config/unit/s\"",
            "\"target\": \"ix://acme/config/unit/Unknown\"",
            "UNRESOLVED_UNIT_REF",
            "/ir/units/1/target",
        ),
        (
            "\"scale\": \"1/1000\"",
            "\"scale\": \"0\"",
            "INVALID_UNIT_GRAPH",
            "/ir/units/1/scale",
        ),
        (
            "\"scale\": \"1/1000\"",
            "\"scale\": \"2/4\"",
            "INVALID_OPERAND",
            "/ir/units/1/scale",
        ),
        (
            "\"scale\": \"1/1000\"",
            "\"scale\": \"170141183460469231731687303715884105728\"",
            "INTEGER_OUTSIDE_I128",
            "/ir/units/1/scale",
        ),
    ] {
        assert!(
            CONFIG_TIME.contains(before),
            "mutation must change the fixture"
        );
        let changed = CONFIG_TIME.replacen(before, after, 1);
        let bundle = parse(&format!(r#"{{"ir":{changed}}}"#)).expect("mutated JSON");
        let observed: Vec<_> = decide(&bundle)
            .diagnostics
            .into_iter()
            .map(|d| (d.code.to_owned(), d.pointer))
            .collect();
        assert_eq!(
            observed,
            vec![(format!("agent-ix.semantic-ir.{code}"), pointer.to_owned())]
        );
    }
}

const CONFIG_CLOCK: &str =
    include_str!("../../../fixtures/semantic/v1/clock-units/config-clock.json");

#[test]
fn tc_1842_clock_field_has_no_declared_scalar_node() {
    let bundle = parse(&format!(r#"{{"ir":{CONFIG_CLOCK}}}"#)).expect("authored Clock fixture");
    assert!(decide(&bundle).diagnostics.is_empty());
}

#[test]
fn tc_1843_clock_shape_refuses_each_forbidden_member_once() {
    for (before, after, member) in [
        ("\"lower\": 1", "\"lower\": 3", "multiplicity"),
        (
            "\"presence\": \"required\"",
            "\"presence\": \"optional\"",
            "presence",
        ),
        ("\"nullable\": false", "\"nullable\": true", "nullable"),
        (
            "\"defaultKind\": \"none\"",
            "\"defaultKind\": \"semantic\"",
            "defaultKind",
        ),
        (
            "\"defaultKind\": \"none\"",
            "\"defaultKind\": \"none\", \"defaultValue\": 0",
            "defaultValue",
        ),
        (
            "\"defaultKind\": \"none\"",
            "\"defaultKind\": \"none\", \"textProfile\": \"unicode\"",
            "textProfile",
        ),
        ("\"defaultKind\": \"none\"", "\"defaultKind\": \"none\", \"unit\": \"ms\"", "unit"),
        ("\"defaultKind\": \"none\"", "\"defaultKind\": \"none\", \"decimal\": {\"precision\": 4, \"scale\": 2}", "decimal"),
        ("\"defaultKind\": \"none\"", "\"defaultKind\": \"none\", \"constraints\": [{\"identity\":\"ix://acme/config/Config/x/min\",\"keyword\":\"min\",\"operands\":{\"value\":\"0\"},\"appliesTo\":\"ix://acme/config/Config/x\",\"diagnosticCode\":\"ix://acme/config/MIN\",\"origin\":{\"generated\":{\"generatorIdentity\":\"ix://acme/config/case-author\",\"generatorVersion\":\"1.0.0\",\"inputIdentities\":[\"ix://acme/config/source\"]}}}]", "constraints"),
    ] {
        assert!(CONFIG_CLOCK.contains(before));
        let changed = CONFIG_CLOCK.replacen(before, after, 1);
        let bundle = parse(&format!(r#"{{"ir":{changed}}}"#)).expect("Clock mutation JSON");
        let observed: Vec<_> = decide(&bundle)
            .diagnostics
            .into_iter()
            .map(|d| (d.code, d.pointer))
            .collect();
        assert_eq!(
            observed,
            vec![(
                "agent-ix.semantic-ir.INVALID_CLOCK_FIELD",
                format!("/ir/types/0/fields/0/{member}")
            )],
            "{member}"
        );
    }
}

#[test]
fn tc_1844_through_1846_public_reader_has_exact_shared_graph_verdicts() {
    let cases = parse(include_str!(
        "../../../fixtures/semantic/v1/clock-units/graph-cases.json"
    ))
    .expect("authored raw graph cases");
    for case in cases.as_array().expect("case array") {
        let name = case
            .get("name")
            .and_then(agent_ix_semantic_ir::json::Json::as_str)
            .expect("case name");
        let document = case.get("document").expect("raw semantic document").clone();
        let bundle = agent_ix_semantic_ir::json::Json::Object(vec![("ir".to_owned(), document)]);
        let mut observed: Vec<_> = decide(&bundle)
            .diagnostics
            .into_iter()
            .map(|d| (d.code.to_owned(), d.pointer))
            .collect();
        let mut expected: Vec<_> = case
            .get("expected")
            .and_then(agent_ix_semantic_ir::json::Json::as_array)
            .expect("expected set")
            .iter()
            .map(|d| {
                (
                    d.get("code")
                        .and_then(agent_ix_semantic_ir::json::Json::as_str)
                        .expect("code")
                        .to_owned(),
                    d.get("pointer")
                        .and_then(agent_ix_semantic_ir::json::Json::as_str)
                        .expect("pointer")
                        .to_owned(),
                )
            })
            .collect();
        observed.sort();
        expected.sort();
        assert_eq!(observed, expected, "{name}");
    }
}

fn set_member(
    node: &mut agent_ix_semantic_ir::json::Json,
    name: &str,
    value: agent_ix_semantic_ir::json::Json,
) {
    let agent_ix_semantic_ir::json::Json::Object(members) = node else {
        panic!("authored object");
    };
    if let Some((_, prior)) = members.iter_mut().find(|(key, _)| key == name) {
        *prior = value;
    } else {
        members.push((name.to_owned(), value));
    }
}

#[test]
fn tc_1843_clock_nonfield_positions_have_their_own_exact_code() {
    use agent_ix_semantic_ir::json::Json;
    for (kind, member) in [
        ("alias", "target"),
        ("reference", "target"),
        ("sequence", "items"),
        ("map", "values"),
    ] {
        let mut document = parse(CONFIG_CLOCK).expect("raw clock fixture");
        let mut node = document
            .get("types")
            .and_then(Json::as_array)
            .expect("types")[0]
            .clone();
        let Json::Object(members) = &mut node else {
            panic!("authored type")
        };
        members.retain(|(key, _)| key != "fields");
        set_member(&mut node, "kind", Json::Str(kind.to_owned()));
        set_member(
            &mut node,
            member,
            Json::Str("ix://quire/native/Clock".to_owned()),
        );
        set_member(&mut document, "types", Json::Array(vec![node]));
        let bundle = Json::Object(vec![("ir".to_owned(), document)]);
        let observed: Vec<_> = decide(&bundle)
            .diagnostics
            .into_iter()
            .map(|d| (d.code, d.pointer))
            .collect();
        assert_eq!(
            observed,
            vec![(
                "agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD",
                format!("/ir/types/0/{member}")
            )],
            "{kind}"
        );
    }
}
