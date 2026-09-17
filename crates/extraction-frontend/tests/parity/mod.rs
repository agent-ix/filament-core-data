//! The FR-098 parity projection (decision D6): what of an IR document the
//! two frontends are compared on.
//!
//! `project` keeps `types[]` only; drops every `origin` member at every
//! node; drops the top-level `source`, `package`, `extensions` and
//! `occurrences`; drops every `extensions` member at every node; rewrites
//! every identity prefix `ix://<pkg>/` to `ix://shared/`, where `<pkg>` is
//! the document's `package.identity`; and sorts every node list by
//! `identity` under code-point comparison; and materializes absent
//! `relationships`, `operations`, and `clauses` node lists as empty arrays.
//! Nothing else is touched: a member one frontend emits and the other omits
//! stays a difference, except that absent record `relationships`,
//! `operations`, and `clauses` are deliberately equivalent to empty lists.
//!
//! The spec-bundle frontend identifies an object-type artifact by its
//! artifact id and lowers it to the construct its object type names
//! (FR-143); the TypeSpec frontend identifies a model by its declared name
//! and lowers it to a `record`. The projection compares the two on the
//! record shape they share: every identity segment naming an artifact id is
//! rewritten to the slug of that type's `displayName`, a record-shaped
//! construct `kind` is compared as `record`, and the construct members are
//! dropped.
#![allow(dead_code)]

use agent_ix_extraction_frontend::canonical_bytes;
use serde_json::{Map, Value};

/// The prefix every identity is rewritten to.
pub const SHARED_PREFIX: &str = "ix://shared/";

/// The record-shaped construct kinds, compared as `record`.
const RECORD_SHAPED: [&str; 9] = [
    "entity",
    "value_object",
    "nested_entity",
    "aggregate_root",
    "event",
    "state_machine",
    "process",
    "repository",
    "domain",
];

/// The construct members the projection drops.
const CONSTRUCT_MEMBERS: [&str; 9] = [
    "identityFields",
    "owner",
    "members",
    "occurrenceField",
    "states",
    "transitions",
    "steps",
    "persists",
    "vocabulary",
];

/// The node lists the projection sorts by `identity`.
const NODE_LISTS: [&str; 8] = [
    "types",
    "fields",
    "variants",
    "constraints",
    "relationships",
    "operations",
    "clauses",
    "params",
];

/// The projection of `document` (FR-098 "Cross-frontend parity").
pub fn project(document: &Value) -> Value {
    let package = document
        .get("package")
        .and_then(|p| p.get("identity"))
        .and_then(Value::as_str)
        .map(|p| format!("ix://{p}/"));
    let types = document
        .get("types")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));
    let renames = artifact_names(&types);
    let projected = strip(&types, package.as_deref(), &renames);
    let mut out = Map::new();
    out.insert("types".to_string(), projected);
    let mut out = Value::Object(out);
    sort_lists(&mut out);
    out
}

/// `normalized` of the projection, as bytes (FR-098 "Cross-frontend
/// parity": compared byte for byte after `agent_ix_semantic_ir::normalize::normalized`).
pub fn projected_bytes(document: &Value) -> Vec<u8> {
    canonical_bytes(&project(document))
}

/// `value` without `origin` and `extensions` members at any depth and with
/// every `<package>` prefix rewritten in every string.
fn strip(value: &Value, package: Option<&str>, renames: &[(String, String)]) -> Value {
    match value {
        Value::Object(members) => {
            let construct = members
                .get("kind")
                .and_then(Value::as_str)
                .is_some_and(|kind| RECORD_SHAPED.contains(&kind));
            let mut stripped: Map<String, Value> = members
                .iter()
                .filter(|(key, _)| key.as_str() != "origin" && key.as_str() != "extensions")
                .filter(|(key, _)| !(construct && CONSTRUCT_MEMBERS.contains(&key.as_str())))
                .map(|(key, member)| (key.clone(), strip(member, package, renames)))
                .collect();
            if construct {
                stripped.insert("kind".to_string(), Value::String("record".to_string()));
            }
            // The IR permits these record members to be omitted. The
            // parity projection deliberately compares absence and `[]` as
            // equivalent for the three empty node lists.
            if stripped.get("kind").and_then(Value::as_str) == Some("record") {
                for key in ["relationships", "operations", "clauses"] {
                    stripped
                        .entry(key.to_string())
                        .or_insert_with(|| Value::Array(Vec::new()));
                }
            }
            Value::Object(stripped)
        }
        Value::Array(items) => {
            Value::Array(items.iter().map(|v| strip(v, package, renames)).collect())
        }
        Value::String(s) => Value::String(match package {
            Some(prefix) if s.starts_with(prefix) => {
                format!("{SHARED_PREFIX}{}", renamed(&s[prefix.len()..], renames))
            }
            _ => s.clone(),
        }),
        other => other.clone(),
    }
}

/// `(artifact id, slug of displayName)` for every record-shaped construct
/// whose identity tail is not its declared name.
fn artifact_names(types: &Value) -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = types
        .as_array()
        .into_iter()
        .flatten()
        .filter(|t| {
            t["kind"]
                .as_str()
                .is_some_and(|kind| RECORD_SHAPED.contains(&kind))
        })
        .filter_map(|t| {
            let tail = t["identity"].as_str()?.rsplit_once("/type/")?.1;
            let name =
                agent_ix_extraction_frontend::identity::slug(t["displayName"].as_str()?).ok()?;
            (tail != name).then(|| (tail.to_string(), name))
        })
        .collect();
    // The longest id first, so no id is rewritten inside a longer one.
    out.sort_by_key(|rename| std::cmp::Reverse(rename.0.len()));
    out
}

/// `<segment>/<tail>` with a leading artifact id of the tail rewritten to
/// the declared name: the id is the whole tail, or is followed by `-` (a
/// node of the type) or an upper-case letter (a constrained-field alias).
fn renamed(path: &str, renames: &[(String, String)]) -> String {
    let Some((segment, tail)) = path.split_once('/') else {
        return path.to_string();
    };
    for (id, name) in renames {
        if let Some(rest) = tail.strip_prefix(id.as_str()) {
            if rest.is_empty()
                || rest.starts_with('-')
                || rest.starts_with(|c: char| c.is_ascii_uppercase())
            {
                return format!("{segment}/{name}{rest}");
            }
        }
    }
    path.to_string()
}

/// Sort every node list under `value` by `identity`, code point order,
/// recursively.
fn sort_lists(value: &mut Value) {
    match value {
        Value::Object(members) => {
            for (key, member) in members.iter_mut() {
                if NODE_LISTS.contains(&key.as_str()) {
                    if let Value::Array(items) = member {
                        items.sort_by(|a, b| {
                            let id = |v: &Value| {
                                v.get("identity")
                                    .and_then(Value::as_str)
                                    .unwrap_or_default()
                                    .as_bytes()
                                    .to_vec()
                            };
                            id(a).cmp(&id(b))
                        });
                    }
                }
                sort_lists(member);
            }
        }
        Value::Array(items) => items.iter_mut().for_each(sort_lists),
        _ => {}
    }
}

/// Whether any member named `key` exists at any depth of `value`.
pub fn has_member(value: &Value, key: &str) -> bool {
    match value {
        Value::Object(members) => {
            members.contains_key(key) || members.values().any(|v| has_member(v, key))
        }
        Value::Array(items) => items.iter().any(|v| has_member(v, key)),
        _ => false,
    }
}

/// Every `identity` value at any depth of `value`.
pub fn identities(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::Object(members) => {
            if let Some(id) = members.get("identity").and_then(Value::as_str) {
                out.push(id.to_string());
            }
            members.values().for_each(|v| identities(v, out));
        }
        Value::Array(items) => items.iter().for_each(|v| identities(v, out)),
        _ => {}
    }
}
