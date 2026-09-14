// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! The committed wire-level evidence of Plan-017 Task-149, read by every test
//! that measures it.
//!
//! This module reads; it never writes. The one sanctioned writer of
//! `fixtures/baseline-1-2/static-bundle-a.json`, its eight one-axis adverse
//! mutations, the declared document set, the declared permutation set and the
//! committed goldens is the ignored test in `tests/golden_writer.rs`, run
//! explicitly and never by a gate (Plan-017: "goldens are cut once, and no test
//! rewrites one").
//!
//! Two declarations live beside the goldens rather than in this source, because
//! NFR-036 measures over a **declared** population and a **declared**
//! permutation set: `golden/declared-documents.json` names the digested
//! documents of the admitted bundle and where each one sits in the bundle, and
//! `golden/permutation-set.json` names the insertion orders TC-1651 pairs its
//! runs over.

#![allow(dead_code)]

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use agent_ix_baseline_producer::{
    canonical_digest, canonical_json, ArrayDeclarations, ArrayDisposition, CanonicalPolicy,
    ConfigurationDocument, NumericResourceLimit, Refusal, StaticProducerBundle,
};
use serde_json::{Map, Value};

/// The fixture directory of this baseline, relative to the crate manifest.
pub const FIXTURE_DIRECTORY: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/baseline-1-2");

/// The published schema of the static bundle's wire form.
pub const SCHEMA_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../schema/baseline/v1/static-bundle.schema.json"
);

/// The admitted static bundle fixture.
pub const GOOD_FIXTURE: &str = "static-bundle-a.json";

/// The eight one-axis adverse fixtures, in axis order.
pub const ADVERSE_FIXTURES: [&str; 8] = [
    "adverse/01-missing-identities.json",
    "adverse/02-digest-domain-substituted.json",
    "adverse/03-revision-namespace-substituted.json",
    "adverse/04-export-foreign-cross-bound.json",
    "adverse/05-endpoint-role-multiplicity-lost.json",
    "adverse/06-component-provenance-absent.json",
    "adverse/07-stale-correspondence-selection.json",
    "adverse/08-inventory-incomplete.json",
];

/// One fixture path under `fixtures/baseline-1-2/`.
pub fn fixture_path(name: &str) -> PathBuf {
    Path::new(FIXTURE_DIRECTORY).join(name)
}

/// The bytes of one committed fixture.
pub fn fixture_bytes(name: &str) -> Vec<u8> {
    std::fs::read(fixture_path(name))
        .unwrap_or_else(|error| panic!("{name} is committed and readable: {error}"))
}

/// One committed fixture as a JSON document.
pub fn fixture_document(name: &str) -> Value {
    serde_json::from_slice(&fixture_bytes(name))
        .unwrap_or_else(|error| panic!("{name} is a JSON document: {error}"))
}

/// The good fixture, admitted through the one admission entry point.
pub fn admitted_good_fixture() -> Value {
    let admitted = StaticProducerBundle::admit_json(&fixture_bytes(GOOD_FIXTURE))
        .unwrap_or_else(|refusal| panic!("{GOOD_FIXTURE} is admitted: {refusal}"));
    serde_json::to_value(&admitted).expect("an admitted static bundle serializes")
}

/// The canonicalization policy the fixture's own configuration document declares.
///
/// Read from the fixture rather than authored here: FR-118 takes every numeric
/// limit from the configuration document, so a test that supplied its own limit
/// would measure a policy the admitted bundle does not carry.
pub fn fixture_policy() -> CanonicalPolicy {
    let document = fixture_document(GOOD_FIXTURE);
    let configuration: ConfigurationDocument =
        serde_json::from_value(document["configuration"].clone())
            .expect("the fixture carries a configuration document");
    CanonicalPolicy::from_configuration(&configuration)
        .expect("the fixture's configuration declares its numeric resource limit")
}

/// The declared numeric resource limit of the fixture's configuration document.
pub fn fixture_numeric_limit() -> NumericResourceLimit {
    fixture_policy().numeric_resource_limit
}

/// One entry of the declared digested-document set.
#[derive(Debug, Clone)]
pub struct DeclaredDocument {
    /// The document's declared name, which is also its golden file stem.
    pub name: String,
    /// The member path of the document inside the admitted bundle.
    pub path: Vec<String>,
}

impl DeclaredDocument {
    /// This document's golden file name under `fixtures/baseline-1-2/golden/`.
    pub fn golden_file(&self) -> String {
        format!("golden/{}.canonical-json.txt", self.name)
    }

    /// Resolves this document out of one bundle document.
    pub fn resolve(&self, bundle: &Value) -> Value {
        let mut cursor = bundle;
        for segment in &self.path {
            cursor = match segment.parse::<usize>() {
                Ok(index) => cursor
                    .get(index)
                    .unwrap_or_else(|| panic!("{} resolves member {segment}", self.name)),
                Err(_) => cursor
                    .get(segment)
                    .unwrap_or_else(|| panic!("{} resolves member {segment}", self.name)),
            };
        }
        cursor.clone()
    }
}

/// The declared digested-document set, read from beside the goldens.
pub fn declared_documents() -> Vec<DeclaredDocument> {
    let declaration = fixture_document("golden/declared-documents.json");
    declaration["documents"]
        .as_array()
        .expect("the declaration carries a documents array")
        .iter()
        .map(|entry| DeclaredDocument {
            name: entry["name"]
                .as_str()
                .expect("a declared document carries a name")
                .to_owned(),
            path: entry["path"]
                .as_array()
                .expect("a declared document carries a member path")
                .iter()
                .map(|segment| {
                    segment
                        .as_str()
                        .expect("a member path segment is a string")
                        .to_owned()
                })
                .collect(),
        })
        .collect()
}

/// The canonical byte string of one digested document.
///
/// The document's own `digest` member is excluded, which is the FR-118-CON-4
/// self-digest exclusion the producer applies; nothing else is removed.
pub fn digest_input_bytes(document: &Value, policy: &CanonicalPolicy) -> Result<String, Refusal> {
    canonical_json(&without_own_digest(document), policy)
}

/// The canonical digest of one digested document, over its digest input bytes.
pub fn digest_value(document: &Value, policy: &CanonicalPolicy) -> Result<String, Refusal> {
    canonical_digest(&without_own_digest(document), policy).map(|selection| selection.value)
}

/// One document with its own top-level `digest` member removed.
pub fn without_own_digest(document: &Value) -> Value {
    let mut document = document.clone();
    if let Some(object) = document.as_object_mut() {
        object.remove("digest");
    }
    document
}

/// One declared insertion-order permutation.
#[derive(Debug, Clone)]
pub struct DeclaredPermutation {
    /// The permutation's declared name.
    pub name: String,
    /// How object member order is permuted.
    pub key_order: String,
    /// How set-array member order is permuted.
    pub set_order: String,
    /// The seed a seeded order uses.
    pub seed: u64,
}

/// The declared insertion-order permutation set, read from beside the goldens.
pub fn declared_permutations() -> Vec<DeclaredPermutation> {
    let declaration = fixture_document("golden/permutation-set.json");
    declaration["permutations"]
        .as_array()
        .expect("the declaration carries a permutations array")
        .iter()
        .map(|entry| DeclaredPermutation {
            name: entry["name"]
                .as_str()
                .expect("a permutation carries a name")
                .to_owned(),
            key_order: entry["keyOrder"]
                .as_str()
                .expect("a permutation declares a key order")
                .to_owned(),
            set_order: entry["setOrder"]
                .as_str()
                .expect("a permutation declares a set order")
                .to_owned(),
            seed: entry["seed"].as_u64().unwrap_or(0),
        })
        .collect()
}

/// Emits one document as JSON text with its member order permuted as declared.
///
/// The permutation is applied to the **text**, because that is where an
/// insertion order is observable at all: a parsed document has already lost the
/// order its members arrived in, so permuting a parsed value would measure
/// nothing (EC-179).
pub fn permuted_text(
    document: &Value,
    permutation: &DeclaredPermutation,
    declarations: &ArrayDeclarations,
) -> String {
    let mut text = String::new();
    write_permuted(document, None, permutation, declarations, &mut text);
    text
}

fn write_permuted(
    value: &Value,
    member: Option<&str>,
    permutation: &DeclaredPermutation,
    declarations: &ArrayDeclarations,
    output: &mut String,
) {
    match value {
        Value::Object(members) => {
            let mut keys: Vec<&String> = members.keys().collect();
            reorder(&mut keys, &permutation.key_order, permutation.seed);
            output.push('{');
            for (position, key) in keys.iter().enumerate() {
                if position > 0 {
                    output.push(',');
                }
                output.push_str(&serde_json::to_string(key).expect("a key serializes"));
                output.push(':');
                write_permuted(
                    &members[key.as_str()],
                    Some(key),
                    permutation,
                    declarations,
                    output,
                );
            }
            output.push('}');
        }
        Value::Array(items) => {
            let mut order: Vec<usize> = (0..items.len()).collect();
            // Only a declared set array may be reordered: permuting a
            // semantic-order array is TC-1655's measurement, in which the digest
            // must change, and it is not part of the insertion-order set.
            if member
                .is_some_and(|member| declarations.disposition(member) == ArrayDisposition::Set)
            {
                reorder(&mut order, &permutation.set_order, permutation.seed);
            }
            output.push('[');
            for (position, index) in order.iter().enumerate() {
                if position > 0 {
                    output.push(',');
                }
                write_permuted(&items[*index], None, permutation, declarations, output);
            }
            output.push(']');
        }
        other => output.push_str(&serde_json::to_string(other).expect("a scalar serializes")),
    }
}

fn reorder<T>(items: &mut [T], order: &str, seed: u64) {
    match order {
        "declared" => {}
        "reverse" => items.reverse(),
        "rotate" => {
            if !items.is_empty() {
                items.rotate_left(1);
            }
        }
        "seeded" => {
            // A deterministic, dependency-free permutation: a fixed linear
            // congruential sequence drives one Fisher-Yates pass, so the same
            // seed is the same order on every run, process and host.
            let mut state = seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
            for index in (1..items.len()).rev() {
                state = state
                    .wrapping_mul(6_364_136_223_846_793_005)
                    .wrapping_add(1_442_695_040_888_963_407);
                let pick = usize::try_from(state >> 33).unwrap_or(0) % (index + 1);
                items.swap(index, pick);
            }
        }
        other => panic!("{other} is not a declared member order"),
    }
}

/// Emits one document as JSON text with one semantic-order array reversed.
///
/// The member path names the array; every other member keeps its declared order.
pub fn text_with_reversed_array(document: &Value, path: &[String]) -> String {
    let mut mutated = document.clone();
    let target = resolve_mut(&mut mutated, path);
    if let Value::Array(items) = target {
        items.reverse();
    } else {
        panic!("the member path does not name an array");
    }
    serde_json::to_string(&mutated).expect("a document serializes")
}

fn resolve_mut<'value>(document: &'value mut Value, path: &[String]) -> &'value mut Value {
    let mut cursor = document;
    for segment in path {
        cursor = match segment.parse::<usize>() {
            Ok(index) => cursor
                .get_mut(index)
                .unwrap_or_else(|| panic!("member {segment} resolves")),
            Err(_) => cursor
                .get_mut(segment.as_str())
                .unwrap_or_else(|| panic!("member {segment} resolves")),
        };
    }
    cursor
}

/// Every array of one document, as a member path, its member name, and its length.
pub fn arrays_of(document: &Value) -> Vec<(Vec<String>, String, usize)> {
    let mut found = Vec::new();
    collect_arrays(document, &mut Vec::new(), None, &mut found);
    found
}

fn collect_arrays(
    value: &Value,
    path: &mut Vec<String>,
    member: Option<&str>,
    found: &mut Vec<(Vec<String>, String, usize)>,
) {
    match value {
        Value::Object(members) => {
            for (key, member_value) in members {
                path.push(key.clone());
                collect_arrays(member_value, path, Some(key), found);
                path.pop();
            }
        }
        Value::Array(items) => {
            found.push((
                path.clone(),
                member.unwrap_or_default().to_owned(),
                items.len(),
            ));
            for (index, item) in items.iter().enumerate() {
                path.push(index.to_string());
                collect_arrays(item, path, None, found);
                path.pop();
            }
        }
        _ => {}
    }
}

/// Every member path at which two JSON documents differ.
///
/// A member present in one document and absent from the other is reported at its
/// own path; a changed scalar is reported at its path; a changed array length is
/// reported at the array's path. This is the one-axis proof's oracle: an adverse
/// fixture whose changed-member set reaches outside the set its axis owns is
/// testing two axes and is a fixture defect.
pub fn changed_members(left: &Value, right: &Value) -> BTreeSet<String> {
    let mut changed = BTreeSet::new();
    diff(left, right, &mut String::new(), &mut changed);
    changed
}

fn diff(left: &Value, right: &Value, path: &mut String, changed: &mut BTreeSet<String>) {
    match (left, right) {
        (Value::Object(left_members), Value::Object(right_members)) => {
            let keys: BTreeSet<&String> = left_members.keys().chain(right_members.keys()).collect();
            for key in keys {
                let restore = path.len();
                path.push('/');
                path.push_str(key);
                match (left_members.get(key), right_members.get(key)) {
                    (Some(left_value), Some(right_value)) => {
                        diff(left_value, right_value, path, changed);
                    }
                    _ => {
                        changed.insert(path.clone());
                    }
                }
                path.truncate(restore);
            }
        }
        (Value::Array(left_items), Value::Array(right_items)) => {
            if left_items.len() != right_items.len() {
                changed.insert(path.clone());
                return;
            }
            for (index, (left_item, right_item)) in
                left_items.iter().zip(right_items.iter()).enumerate()
            {
                let restore = path.len();
                path.push('/');
                path.push_str(&index.to_string());
                diff(left_item, right_item, path, changed);
                path.truncate(restore);
            }
        }
        (left_value, right_value) => {
            if left_value != right_value {
                changed.insert(path.clone());
            }
        }
    }
}

/// The array declarations of this baseline, as the producer declares them.
pub fn array_declarations() -> ArrayDeclarations {
    ArrayDeclarations::baseline()
}

/// Reads one committed golden byte string.
pub fn golden_bytes(name: &str) -> String {
    let path = fixture_path(name);
    String::from_utf8(
        std::fs::read(&path).unwrap_or_else(|error| panic!("{name} is committed: {error}")),
    )
    .unwrap_or_else(|error| panic!("{name} is Unicode: {error}"))
}

/// One JSON object, in the member order given.
pub fn object(members: Vec<(&str, Value)>) -> Value {
    let mut map = Map::new();
    for (key, value) in members {
        map.insert(key.to_owned(), value);
    }
    Value::Object(map)
}
