// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! FR-154 "Map types" (QSL-1169): a map type definition declares `keys`, a
//! scalar key type, and `bound`, the entry-count bound. The QSpec vectors
//! PM-01 to PM-34 (`proposals/checked-package-v2/map-type-vectors.json`,
//! `package_map_types`) are carried in `fixtures/semantic/v1/map-keys-bound`
//! as patches over the semantic IR projection of their base, each with the
//! FCD code and pointer its QSpec intake code maps to.

use agent_ix_semantic_ir::decide;
use agent_ix_semantic_ir::json::{parse, Json};

const BASE: &str = include_str!("../../../fixtures/semantic/v1/map-keys-bound/map-keys-bound.json");
const CASES: &str = include_str!("../../../fixtures/semantic/v1/map-keys-bound/cases.json");

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

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_the_base_map_document_is_admitted() {
    assert_eq!(observed(base()), Vec::<(String, String)>::new());
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_every_map_type_vector_has_its_recorded_rust_verdict() {
    let cases = parse(CASES).expect("cases are JSON");
    let list = cases.get("cases").and_then(Json::as_array).expect("cases");
    assert_eq!(list.len(), 34, "PM-01 to PM-34");
    for case in list {
        let id = case.get("id").and_then(Json::as_str).expect("id");
        let expected: Vec<(String, String)> = case
            .get("rust")
            .and_then(Json::as_array)
            .unwrap_or_else(|| panic!("{id}: no rust expectation"))
            .iter()
            .map(|entry| {
                (
                    entry.get("code").and_then(Json::as_str).expect("code").to_owned(),
                    entry.get("pointer").and_then(Json::as_str).expect("pointer").to_owned(),
                )
            })
            .collect();
        assert_eq!(observed(mutated(case)), expected, "{id}");
    }
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_a_map_with_neither_keys_nor_bound_is_admitted_unchanged() {
    let mut ir = base();
    remove(&mut ir, "/types/13/keys");
    remove(&mut ir, "/types/13/bound");
    assert_eq!(observed(ir), Vec::<(String, String)>::new());
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_a_scalar_key_through_an_alias_chain_is_admitted() {
    for key in [
        "ix://quire/native/Boolean",
        "ix://quire/native/Float64",
        "ix://quire/native/UUID",
        "ix://quire/native/Timestamp",
        "ix://quire/native/Bytes",
        "ix://quire/native/Duration",
        "ix://quire/native/JsonObject",
        "ix://quire/native/String",
        "ix://acme/maps/Key",
    ] {
        let mut ir = base();
        set(&mut ir, "/types/13/keys", Json::Str(key.to_owned()));
        assert_eq!(observed(ir), Vec::<(String, String)>::new(), "{key}");
    }
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_a_key_that_reaches_a_clock_or_rational_through_an_alias_is_refused() {
    let mut ir = base();
    set(&mut ir, "/types/6/target", Json::Str("ix://quire/native/Rational".to_owned()));
    set(&mut ir, "/types/13/keys", Json::Str("ix://acme/maps/Key".to_owned()));
    assert_eq!(
        observed(ir),
        vec![(
            "agent-ix.semantic-ir.INVALID_MAP_KEY".to_owned(),
            "/ir/types/13/keys".to_owned()
        )]
    );
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_keys_or_bound_without_the_other_is_a_schema_violation() {
    for member in ["keys", "bound"] {
        let mut ir = base();
        remove(&mut ir, &format!("/types/13/{member}"));
        assert_eq!(
            observed(ir),
            vec![(
                "agent-ix.semantic-ir.SCHEMA_VIOLATION".to_owned(),
                "/ir/types/13".to_owned()
            )],
            "{member}"
        );
    }
}

/// Tracing: TC-234
/// ACs: FR-154-AC-48
#[test]
fn tc_234_keys_on_a_non_map_kind_is_a_schema_violation() {
    let mut ir = base();
    set(&mut ir, "/types/9/keys", Json::Str("ix://quire/native/Text".to_owned()));
    assert_eq!(
        observed(ir),
        vec![(
            "agent-ix.semantic-ir.SCHEMA_VIOLATION".to_owned(),
            "/ir/types/9/keys".to_owned()
        )]
    );
}
