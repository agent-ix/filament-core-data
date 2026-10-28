// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! FR-147: tuple value types and union variant payloads, decided over the
//! shared vectors in `fixtures/semantic/v1/tuple-union`.

use agent_ix_semantic_ir::compat::{classify, Classification};
use agent_ix_semantic_ir::decide;
use agent_ix_semantic_ir::json::{parse, Json};
use agent_ix_semantic_ir::normalize::normalized;

const BASE: &str = include_str!("../../../fixtures/semantic/v1/tuple-union/tuple-union.json");
const CASES: &str = include_str!("../../../fixtures/semantic/v1/tuple-union/cases.json");

fn bundle(ir: Json) -> Json {
    Json::Object(vec![("ir".to_owned(), ir)])
}

/// The child of `node` named by one JSON pointer segment.
fn step<'a>(node: &'a mut Json, key: &str) -> &'a mut Json {
    match node {
        Json::Object(members) => {
            &mut members
                .iter_mut()
                .find(|(name, _)| name == key)
                .unwrap_or_else(|| panic!("no member {key}"))
                .1
        }
        Json::Array(items) => &mut items[key.parse::<usize>().expect("array index")],
        _ => panic!("cannot step into {key}"),
    }
}

fn set(root: &mut Json, pointer: &str, value: Json) {
    let keys: Vec<&str> = pointer.split('/').skip(1).collect();
    let (last, parents) = keys.split_last().expect("pointer");
    let mut node = root;
    for key in parents {
        node = step(node, key);
    }
    match node {
        Json::Object(members) => match members.iter_mut().find(|(name, _)| name == last) {
            Some(slot) => slot.1 = value,
            None => members.push(((*last).to_owned(), value)),
        },
        Json::Array(items) => items[last.parse::<usize>().expect("index")] = value,
        _ => panic!("cannot set {last}"),
    }
}

fn remove(root: &mut Json, pointer: &str) {
    let keys: Vec<&str> = pointer.split('/').skip(1).collect();
    let (last, parents) = keys.split_last().expect("pointer");
    let mut node = root;
    for key in parents {
        node = step(node, key);
    }
    match node {
        Json::Object(members) => members.retain(|(name, _)| name != last),
        _ => panic!("cannot remove {last}"),
    }
}

fn observed(ir: Json) -> Vec<(String, String)> {
    decide(&bundle(ir))
        .diagnostics
        .into_iter()
        .map(|d| (d.code.to_owned(), d.pointer))
        .collect()
}

fn base() -> Json {
    parse(BASE).expect("authored fixture is JSON")
}

fn mutated(case: &Json) -> Json {
    let mut ir = base();
    for pair in case.get("set").and_then(Json::as_array).unwrap_or(&[]) {
        let pointer = pair.at(0).and_then(Json::as_str).expect("pointer");
        set(&mut ir, pointer, pair.at(1).expect("value").clone());
    }
    for pointer in case.get("remove").and_then(Json::as_array).unwrap_or(&[]) {
        remove(&mut ir, pointer.as_str().expect("pointer"));
    }
    ir
}

#[test]
fn tc_1872_the_tuple_and_union_document_is_admitted() {
    // FR-147-AC-1: exact reader assertions below.
    assert_eq!(observed(base()), Vec::<(String, String)>::new());
}

#[test]
fn tc_1885_every_shared_vector_has_its_recorded_rust_verdict() {
    // FR-147-AC-14, FR-147-AC-3 to FR-147-AC-6, FR-147-AC-8.
    let cases = parse(CASES).expect("cases are JSON");
    for case in cases.get("cases").and_then(Json::as_array).expect("cases") {
        let id = case.get("id").and_then(Json::as_str).expect("id");
        let expected: Vec<(String, String)> = case
            .get("rust")
            .and_then(Json::as_array)
            .unwrap_or_else(|| panic!("{id}: no rust expectation"))
            .iter()
            .map(|entry| {
                (
                    entry
                        .get("code")
                        .and_then(Json::as_str)
                        .expect("code")
                        .to_owned(),
                    entry
                        .get("pointer")
                        .and_then(Json::as_str)
                        .expect("pointer")
                        .to_owned(),
                )
            })
            .collect();
        assert_eq!(observed(mutated(case)), expected, "{id}");
    }
}

#[test]
fn tc_1880_positions_keep_their_authored_order_in_the_normalized_form() {
    // FR-147-AC-9: exact reader assertions below.
    let text = normalized(&bundle(base()));
    let first = text.find("Pair/p0").expect("p0");
    let second = text.find("Pair/p1").expect("p1");
    assert!(first < second);
    assert_eq!(
        normalized(&bundle(parse(&text).expect("normalized is JSON"))),
        text
    );
}

#[test]
fn tc_1880_a_tuple_of_eleven_positions_keeps_p10_after_p9() {
    // FR-147-AC-9: exact reader assertions below.
    let origin = r#"{"generated":{"generatorIdentity":"ix://acme/shapes/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://acme/shapes/source"]}}"#;
    let positions: Vec<String> = (0..11)
        .map(|i| {
            format!(
                r#"{{"identity":"ix://acme/shapes/Swap/p{i}","typeRef":"ix://acme/shapes/Integer","origin":{origin}}}"#
            )
        })
        .collect();
    let mut ir = base();
    set(
        &mut ir,
        "/types/3/positions",
        parse(&format!("[{}]", positions.join(","))).expect("positions"),
    );
    assert_eq!(observed(ir.clone()), Vec::<(String, String)>::new());
    let text = normalized(&bundle(ir));
    let p2 = text.find("Swap/p2\"").expect("p2");
    let p9 = text.find("Swap/p9\"").expect("p9");
    let p10 = text.find("Swap/p10\"").expect("p10");
    assert!(p2 < p9 && p9 < p10, "positions were re-sorted");
}

const ORIGIN: &str = r#"{"generated":{"generatorIdentity":"ix://acme/shapes/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://acme/shapes/source"]}}"#;

/// The `Pair` positions over `types`, as `positions` JSON.
fn pair_positions(types: &[&str]) -> Json {
    let items: Vec<String> = types
        .iter()
        .enumerate()
        .map(|(i, type_ref)| {
            format!(
                r#"{{"identity":"ix://acme/shapes/Pair/p{i}","typeRef":"ix://acme/shapes/{type_ref}","origin":{ORIGIN}}}"#
            )
        })
        .collect();
    parse(&format!("[{}]", items.join(","))).expect("positions")
}

fn classified(after: Json) -> Classification {
    classify(&bundle(base()), &bundle(after), true, true)
}

#[test]
fn tc_1881_a_changed_tuple_or_payload_is_breaking_and_an_origin_change_is_a_patch() {
    // FR-147-AC-10: exact classifier assertions below.
    assert_eq!(classified(base()), Classification::Patch);

    let mut origin = base();
    set(
        &mut origin,
        "/types/2/positions/0/origin/generated/generatorVersion",
        Json::Str("2.0.0".to_owned()),
    );
    assert_eq!(classified(origin), Classification::Patch);

    for (label, types) in [
        ("swapped", vec!["Integer", "Boolean"]),
        ("retyped", vec!["Boolean", "Boolean"]),
        ("longer", vec!["Boolean", "Integer", "Integer"]),
        ("shorter", vec!["Boolean"]),
    ] {
        let mut after = base();
        set(&mut after, "/types/2/positions", pair_positions(&types));
        assert_eq!(classified(after), Classification::Breaking, "{label}");
    }

    let mut gained = base();
    set(
        &mut gained,
        "/types/4/variants/1/payloadType",
        Json::Str("ix://acme/shapes/Integer".to_owned()),
    );
    assert_eq!(
        classified(gained),
        Classification::Breaking,
        "gained payload"
    );
    let mut lost = base();
    remove(&mut lost, "/types/4/variants/0/payloadType");
    assert_eq!(classified(lost), Classification::Breaking, "lost payload");
    let mut changed = base();
    set(
        &mut changed,
        "/types/4/variants/0/payloadType",
        Json::Str("ix://acme/shapes/Swap".to_owned()),
    );
    assert_eq!(
        classified(changed),
        Classification::Breaking,
        "changed payload"
    );
}
