// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

use agent_ix_semantic_ir::{decide, json::parse};

const CONFIG_TIME: &str =
    include_str!("../../../fixtures/semantic/v1/clock-units/config-time.json");

#[test]
fn tc_1844_config_time_and_scaled_units_are_admitted() {
    // FR-146-AC-3: exact reader assertions below.
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
    // FR-146-AC-4, FR-146-AC-5: exact reader assertions below.
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
    // FR-146-AC-2: exact reader assertions below.
    for (before, after, member) in [
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
                "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
                format!("/ir/types/0/fields/0/{member}")
            )],
            "{member}"
        );
    }
}

#[test]
fn tc_1844_through_1846_public_reader_has_exact_shared_graph_verdicts() {
    // FR-146-AC-3, FR-146-AC-4, FR-146-AC-5: exact reader assertions below.
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
fn tc_1843_clock_multiplicity_and_presence_follow_every_member() {
    // FR-146-AC-2, FR-146-AC-16: exact reader assertions below.
    for (before, after) in [
        ("\"presence\": \"required\"", "\"presence\": \"optional\""),
        ("\"upper\": 1", "\"upper\": 3"),
        ("\"ordered\": false", "\"ordered\": true"),
        ("\"unique\": false", "\"unique\": true"),
    ] {
        assert!(CONFIG_CLOCK.contains(before));
        let changed = CONFIG_CLOCK.replacen(before, after, 1);
        let bundle = parse(&format!(r#"{{"ir":{changed}}}"#)).expect("Clock mutation JSON");
        assert_eq!(decide(&bundle).diagnostics.len(), 0, "{after}");
    }
    let changed = CONFIG_CLOCK.replacen("\"lower\": 1", "\"lower\": 3", 1);
    let bundle = parse(&format!(r#"{{"ir":{changed}}}"#)).expect("Clock mutation JSON");
    let observed: Vec<_> = decide(&bundle)
        .diagnostics
        .into_iter()
        .map(|d| (d.code, d.pointer))
        .collect();
    assert_eq!(
        observed,
        vec![(
            "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
            "/ir/types/0/fields/0/multiplicity/upper".to_string()
        )]
    );
}

#[test]
fn tc_1843_alias_typed_clock_member_carries_only_its_own_shape_code() {
    // FR-146-AC-2: a member typed by an alias that reaches Clock is a clock member.
    use agent_ix_semantic_ir::json::Json;
    let mut document = parse(CONFIG_CLOCK).expect("raw clock fixture");
    let mut alias = document
        .get("types")
        .and_then(Json::as_array)
        .expect("types")[0]
        .clone();
    let Json::Object(members) = &mut alias else {
        panic!("authored type")
    };
    members.retain(|(key, _)| key != "fields");
    set_member(
        &mut alias,
        "identity",
        Json::Str("ix://acme/config/Stopwatch".to_owned()),
    );
    set_member(&mut alias, "kind", Json::Str("alias".to_owned()));
    set_member(
        &mut alias,
        "target",
        Json::Str("ix://quire/native/Clock".to_owned()),
    );
    let mut record = document
        .get("types")
        .and_then(Json::as_array)
        .expect("types")[0]
        .clone();
    let Json::Object(fields) = &mut record else {
        panic!("authored type")
    };
    let Some((_, Json::Array(list))) = fields.iter_mut().find(|(key, _)| key == "fields") else {
        panic!("fields")
    };
    set_member(
        &mut list[0],
        "typeRef",
        Json::Str("ix://acme/config/Stopwatch".to_owned()),
    );
    set_member(&mut list[0], "unit", Json::Str("ms".to_owned()));
    set_member(
        &mut list[0],
        "textProfile",
        Json::Str("anything".to_owned()),
    );
    set_member(&mut document, "types", Json::Array(vec![record, alias]));
    let bundle = Json::Object(vec![("ir".to_owned(), document)]);
    let mut observed: Vec<_> = decide(&bundle)
        .diagnostics
        .into_iter()
        .map(|d| (d.code, d.pointer))
        .collect();
    observed.sort();
    assert_eq!(
        observed,
        vec![
            (
                "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
                "/ir/types/0/fields/0/textProfile".to_string()
            ),
            (
                "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
                "/ir/types/0/fields/0/unit".to_string()
            ),
        ]
    );
}

#[test]
fn tc_1843_clock_nonfield_positions_are_admitted() {
    // FR-146-AC-2: exact reader assertions below.
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
        assert_eq!(decide(&bundle).diagnostics.len(), 0, "{kind}");
    }
}

#[test]
fn tc_1842_through_1852_public_reader_has_exact_clock_quantity_verdicts() {
    // FR-146-AC-2, FR-146-AC-6, FR-146-AC-9: exact reader assertions below.
    let cases = parse(include_str!(
        "../../../fixtures/semantic/v1/clock-units/clock-cases.json"
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

#[test]
fn tc_1843_clock_in_other_identity_members_keeps_each_members_own_rule() {
    // FR-146 "Clock members": supertypes, a relationship end and a frame entry apply their own
    // resolution rule to the Clock identity and raise no FR-146 code.
    let observe = |changed: &str| -> Vec<(String, String)> {
        let bundle = parse(&format!(r#"{{"ir":{changed}}}"#)).expect("Clock mutation JSON");
        decide(&bundle)
            .diagnostics
            .into_iter()
            .map(|d| (d.code.to_owned(), d.pointer))
            .collect()
    };
    let with = |member: &str| {
        CONFIG_CLOCK.replacen(
            "\"unknownPolicy\": \"reject\"",
            &format!("\"unknownPolicy\": \"reject\", {member}"),
            1,
        )
    };
    let end = |type_ref: &str| {
        format!(
            "{{\"multiplicity\":{{\"lower\":0,\"ordered\":false,\"unique\":false}},\"type\":\"{type_ref}\"}}"
        )
    };
    assert_eq!(
        observe(&with("\"supertypes\": [\"ix://quire/native/Clock\"]")),
        vec![(
            "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF".to_owned(),
            "/ir/types/0/supertypes/0".to_owned()
        )]
    );
    let relationship = with(&format!(
        "\"relationships\": [{{\"category\":\"structural\",\"composite\":false,\"direction\":\"source-to-target\",\"identity\":\"ix://acme/config/Config/link\",\"origin\":{{\"generated\":{{\"generatorIdentity\":\"ix://acme/config/case-author\",\"generatorVersion\":\"1.0.0\",\"inputIdentities\":[\"ix://acme/config/source\"]}}}},\"sourceEnd\":{},\"targetEnd\":{}}}]",
        end("ix://acme/config/Config").replacen("{", "{\"role\":\"owner\",", 1),
        end("ix://quire/native/Clock")
    ));
    assert_eq!(
        observe(&relationship),
        vec![(
            "agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET".to_owned(),
            "/ir/types/0/relationships/0/targetEnd/type".to_owned()
        )]
    );
}
