//! The corpus's patch dialect: RFC 6902 plus the declared `x-repeat` extension.
//!
//! `spec/functional/FR-035`: "`ops` SHALL be an RFC 6902 patch extended with one
//! declared operation, `x-repeat`, which appends `count` copies of a template
//! with the copy index substituted", and `conformance/schema/corpus-case.schema.json`
//! fixes its members as `path`, `count` and `template`.

use crate::diag::split;
use crate::json::{to_canonical_string, Json};

/// A patch that could not be applied.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PatchError {
    /// What went wrong.
    pub message: String,
}

fn fail<T>(message: impl Into<String>) -> Result<T, PatchError> {
    Err(PatchError {
        message: message.into(),
    })
}

/// Applies an ordered patch to a document.
pub fn apply(document: &Json, ops: &[Json]) -> Result<Json, PatchError> {
    let mut current = document.clone();
    for op in ops {
        current = apply_one(current, op)?;
    }
    Ok(current)
}

fn apply_one(document: Json, op: &Json) -> Result<Json, PatchError> {
    let name = match op.get("op").and_then(Json::as_str) {
        Some(name) => name,
        None => return fail("a patch operation names no op"),
    };
    let path = op.get("path").and_then(Json::as_str).unwrap_or("");
    let mut document = document;
    match name {
        "test" => {
            let found = resolve(&document, path).ok_or_else(|| PatchError {
                message: format!("a test op addresses {path}, which the document does not carry"),
            })?;
            let expected = op.get("value").unwrap_or(&Json::Null);
            if to_canonical_string(found) != to_canonical_string(expected) {
                return fail(format!("a test op at {path} did not hold"));
            }
            Ok(document)
        }
        "add" => {
            let value = op.get("value").cloned().unwrap_or(Json::Null);
            insert(&mut document, path, value)?;
            Ok(document)
        }
        "replace" => {
            if resolve(&document, path).is_none() {
                return fail(format!("a replace op addresses {path}, which is absent"));
            }
            let value = op.get("value").cloned().unwrap_or(Json::Null);
            set(&mut document, path, value)?;
            Ok(document)
        }
        "remove" => {
            remove(&mut document, path)?;
            Ok(document)
        }
        "copy" => {
            let from = op.get("from").and_then(Json::as_str).unwrap_or("");
            let value = resolve(&document, from)
                .ok_or_else(|| PatchError {
                    message: format!("a copy op reads {from}, which is absent"),
                })?
                .clone();
            insert(&mut document, path, value)?;
            Ok(document)
        }
        "move" => {
            let from = op.get("from").and_then(Json::as_str).unwrap_or("");
            let value = resolve(&document, from)
                .ok_or_else(|| PatchError {
                    message: format!("a move op reads {from}, which is absent"),
                })?
                .clone();
            remove(&mut document, from)?;
            insert(&mut document, path, value)?;
            Ok(document)
        }
        "x-repeat" => {
            let count = match op.get("count").and_then(Json::as_i64) {
                Some(count) if (1..=512).contains(&count) => count as usize,
                _ => return fail("an x-repeat op carries a count between 1 and 512"),
            };
            let template = op.get("template").cloned().unwrap_or(Json::Null);
            for copy in 0..count {
                let value = substitute(&template, copy);
                insert(&mut document, path, value)?;
            }
            Ok(document)
        }
        other => fail(format!("the patch dialect does not carry the op {other}")),
    }
}

/// Replaces `$i` with the copy index and `$n` with its successor, everywhere a
/// string appears in the template.
fn substitute(template: &Json, copy: usize) -> Json {
    match template {
        Json::Str(text) => Json::Str(
            text.replace("$i", &copy.to_string())
                .replace("$n", &(copy + 1).to_string()),
        ),
        Json::Array(items) => {
            Json::Array(items.iter().map(|item| substitute(item, copy)).collect())
        }
        Json::Object(members) => Json::Object(
            members
                .iter()
                .map(|(name, value)| {
                    (
                        name.replace("$i", &copy.to_string())
                            .replace("$n", &(copy + 1).to_string()),
                        substitute(value, copy),
                    )
                })
                .collect(),
        ),
        other => other.clone(),
    }
}

/// The node a pointer addresses.
pub fn resolve<'a>(document: &'a Json, pointer: &str) -> Option<&'a Json> {
    let mut current = document;
    for part in split(pointer) {
        current = match current {
            Json::Object(_) => current.get(&part)?,
            Json::Array(items) => items.get(part.parse::<usize>().ok()?)?,
            _ => return None,
        };
    }
    Some(current)
}

fn resolve_mut<'a>(document: &'a mut Json, tokens: &[String]) -> Option<&'a mut Json> {
    let mut current = document;
    for part in tokens {
        current = match current {
            Json::Object(members) => {
                let position = members.iter().rposition(|(name, _)| name == part)?;
                &mut members.get_mut(position)?.1
            }
            Json::Array(items) => {
                let at = part.parse::<usize>().ok()?;
                items.get_mut(at)?
            }
            _ => return None,
        };
    }
    Some(current)
}

fn insert(document: &mut Json, pointer: &str, value: Json) -> Result<(), PatchError> {
    let tokens = split(pointer);
    let (last, parents) = match tokens.split_last() {
        Some(parts) => parts,
        None => {
            *document = value;
            return Ok(());
        }
    };
    let parent = match resolve_mut(document, parents) {
        Some(parent) => parent,
        None => {
            return fail(format!(
                "a patch op addresses {pointer}, whose parent is absent"
            ))
        }
    };
    match parent {
        Json::Object(members) => {
            match members.iter().rposition(|(name, _)| name == last) {
                Some(position) => {
                    if let Some(slot) = members.get_mut(position) {
                        slot.1 = value;
                    }
                }
                None => members.push((last.clone(), value)),
            }
            Ok(())
        }
        Json::Array(items) => {
            if last == "-" {
                items.push(value);
                return Ok(());
            }
            match last.parse::<usize>() {
                Ok(at) if at <= items.len() => {
                    items.insert(at, value);
                    Ok(())
                }
                _ => fail(format!(
                    "a patch op addresses {pointer}, which is past the array"
                )),
            }
        }
        _ => fail(format!(
            "a patch op addresses {pointer}, whose parent is a scalar"
        )),
    }
}

/// Replaces the value a pointer addresses, keeping the member's position.
fn set(document: &mut Json, pointer: &str, value: Json) -> Result<(), PatchError> {
    let tokens = split(pointer);
    match resolve_mut(document, &tokens) {
        Some(slot) => {
            *slot = value;
            Ok(())
        }
        None => fail(format!("a replace op addresses {pointer}, which is absent")),
    }
}

fn remove(document: &mut Json, pointer: &str) -> Result<(), PatchError> {
    let tokens = split(pointer);
    let (last, parents) = match tokens.split_last() {
        Some(parts) => parts,
        None => return fail("a patch op removes the whole document"),
    };
    let parent = match resolve_mut(document, parents) {
        Some(parent) => parent,
        None => {
            return fail(format!(
                "a patch op addresses {pointer}, whose parent is absent"
            ))
        }
    };
    match parent {
        Json::Object(members) => match members.iter().rposition(|(name, _)| name == last) {
            Some(position) => {
                members.remove(position);
                Ok(())
            }
            None => fail(format!("a patch op removes {pointer}, which is absent")),
        },
        Json::Array(items) => match last.parse::<usize>() {
            Ok(at) if at < items.len() => {
                items.remove(at);
                Ok(())
            }
            _ => fail(format!(
                "a patch op removes {pointer}, which is past the array"
            )),
        },
        _ => fail(format!(
            "a patch op addresses {pointer}, whose parent is a scalar"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::parse;

    #[test]
    fn tc_699_applies_the_rfc_6902_op_set() {
        let base = parse(r#"{"a":[1,2],"b":{"c":"x"}}"#).expect("a well-formed document");
        let ops = parse(
            r#"[{"op":"test","path":"/b/c","value":"x"},
                {"op":"replace","path":"/b/c","value":"y"},
                {"op":"add","path":"/a/-","value":3},
                {"op":"copy","from":"/b/c","path":"/d"},
                {"op":"move","from":"/d","path":"/e"},
                {"op":"remove","path":"/a/0"}]"#,
        )
        .expect("a well-formed patch");
        let patched = apply(&base, ops.as_array().unwrap_or(&[])).expect("the patch applies");
        assert_eq!(
            to_canonical_string(&patched),
            r#"{"a":[2,3],"b":{"c":"y"},"e":"y"}"#
        );
    }

    #[test]
    fn tc_699_x_repeat_substitutes_the_copy_index_and_its_successor() {
        let base = parse(r#"{"t":[]}"#).expect("a well-formed document");
        let ops = parse(
            r#"[{"op":"x-repeat","path":"/t/-","count":3,"template":{"id":"L$i","to":"L$n"}}]"#,
        )
        .expect("a well-formed patch");
        let patched = apply(&base, ops.as_array().unwrap_or(&[])).expect("the patch applies");
        assert_eq!(
            to_canonical_string(&patched),
            r#"{"t":[{"id":"L0","to":"L1"},{"id":"L1","to":"L2"},{"id":"L2","to":"L3"}]}"#
        );
    }

    #[test]
    fn tc_699_a_failing_test_op_fails_the_patch() {
        let base = parse(r#"{"a":1}"#).expect("a well-formed document");
        let ops = parse(r#"[{"op":"test","path":"/a","value":2}]"#).expect("a well-formed patch");
        assert!(apply(&base, ops.as_array().unwrap_or(&[])).is_err());
    }
}
