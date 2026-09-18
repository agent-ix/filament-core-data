//! FR-097 "Canonical form": the one node-list order and the one serializer.
//!
//! Every byte this crate writes is produced by
//! `agent_ix_semantic_ir::normalize::normalized` over `{"ir": <value>}`
//! ([`canonical_bytes`]); no `serde_json` serializer, canonicalizer, member
//! ordering or number formatter lives here or anywhere under `src/`
//! (FR-097-CON-2). The reader's `Json` value is built structurally from the
//! assembled `serde_json::Value` ([`reader_json`]), so the reader decides and
//! serializes the same tree the frontend assembled.
//!
//! [`sort_node_lists`] orders every identity-keyed set by `identity` under a
//! code-point comparison — the set FR-050's `normalizeIr` declares
//! (`IDENTITY_SETS` of `src/compiler/ir/normalize.mjs`), so that
//! `normalizeIr` of the written document is the identity on its bytes
//! (FR-097-AC-5). FR-097 lists the type-level lists and `params`; the
//! extension lists of a field and of a parameter, `occurrences` and the
//! top-level `extensions` are sets under FR-050 as well, and are sorted
//! here for the same reason (reported with Task-134 as an FR-097 gap).

use agent_ix_semantic_ir::json::Json;
use agent_ix_semantic_ir::normalize::normalized;
use serde_json::Value;

/// The member of the input bundle the reader decides.
pub const IR_MEMBER: &str = "ir";
/// The identity-keyed lists of one `typeDefinition`, in FR-097's order.
pub const TYPE_LISTS: [&str; 7] = [
    "fields",
    "variants",
    "constraints",
    "relationships",
    "operations",
    "clauses",
    "extensions",
];

/// The `identity` of a node as the order reads it: an absent or non-string
/// identity sorts as the empty string, the way FR-050's canonicalizer reads
/// it.
fn identity_of(node: &Value) -> &str {
    node.get("identity").and_then(Value::as_str).unwrap_or("")
}

/// Sort `list` by `identity` under code-point comparison; stable, so two
/// nodes of one identity keep their assembled order (the reader refuses
/// such a document as `DUPLICATE_IDENTITY`).
fn sort_by_identity(list: &mut Value) {
    if let Some(items) = list.as_array_mut() {
        items.sort_by(|a, b| identity_of(a).as_bytes().cmp(identity_of(b).as_bytes()));
    }
}

/// Sort one field or parameter's `extensions`.
fn sort_field(field: &mut Value) {
    if let Some(extensions) = field.get_mut("extensions") {
        sort_by_identity(extensions);
    }
}

/// Sort every identity-keyed set of `document` in place (FR-097 "Canonical
/// form"): `types`; within each type `fields`, `variants`, `constraints`,
/// `relationships`, `operations`, `clauses` and `extensions`; within each
/// field its `extensions`; within each operation `params` and each
/// parameter's `extensions`; `occurrences`; and the top-level `extensions`.
pub fn sort_node_lists(document: &mut Value) {
    if let Some(types) = document.get_mut("types") {
        if let Some(definitions) = types.as_array_mut() {
            for definition in definitions.iter_mut() {
                for list in TYPE_LISTS {
                    if let Some(items) = definition.get_mut(list) {
                        sort_by_identity(items);
                    }
                }
                if let Some(fields) = definition.get_mut("fields").and_then(Value::as_array_mut) {
                    fields.iter_mut().for_each(sort_field);
                }
                if let Some(operations) = definition
                    .get_mut("operations")
                    .and_then(Value::as_array_mut)
                {
                    for operation in operations.iter_mut() {
                        if let Some(params) = operation.get_mut("params") {
                            sort_by_identity(params);
                            if let Some(params) = params.as_array_mut() {
                                params.iter_mut().for_each(sort_field);
                            }
                        }
                    }
                }
            }
        }
        sort_by_identity(types);
    }
    for list in ["occurrences", "extensions"] {
        if let Some(items) = document.get_mut(list) {
            sort_by_identity(items);
        }
    }
}

/// The reader's value of `value`, built member by member: the same tree,
/// with every number carried as its JSON lexeme for the reader's own
/// ECMAScript formatter to render.
pub fn reader_json(value: &Value) -> Json {
    match value {
        Value::Null => Json::Null,
        Value::Bool(b) => Json::Bool(*b),
        Value::Number(n) => Json::Number(n.to_string()),
        Value::String(s) => Json::Str(s.clone()),
        Value::Array(items) => Json::Array(items.iter().map(reader_json).collect()),
        Value::Object(members) => Json::Object(
            members
                .iter()
                .map(|(name, member)| (name.clone(), reader_json(member)))
                .collect(),
        ),
    }
}

/// `{"ir": <value>}`: the input bundle the reader decides and normalizes.
pub fn bundle_of(value: &Value) -> Json {
    Json::Object(vec![(IR_MEMBER.to_string(), reader_json(value))])
}

/// The bytes of `value` in the reader's canonical form: exactly
/// `agent_ix_semantic_ir::normalize::normalized(&{"ir": value})`
/// (FR-097-CON-2). A document declaring contract `2.0.0` has `nullable`
/// materialized as a literal boolean on every field and parameter by that
/// call, which the frontend has already done, so the call adds no member;
/// `multiplicity` and `presence` are never derived from one another, and a
/// sidecar declares no contract and is canonicalized as it is.
pub fn canonical_bytes(value: &Value) -> Vec<u8> {
    normalized(&bundle_of(value)).into_bytes()
}
