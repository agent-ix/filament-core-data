//! The corpus comparison form of an IR document.
//!
//! `spec/functional/FR-036` fixes it: "a document materializes `nullable` as
//! a literal boolean on every field and operation parameter, gating on no
//! field of the document; `multiplicity` and `presence` are schema-required
//! and independently authored, so neither is ever materialized from the
//! other, and a well-formed `2.0.0` document — whose schema already requires
//! both on every field — gains no member beyond `nullable`", serialized in
//! `agent-ix-conformance-jcs-v1`.
//!
//! Materialization below is unconditional on `contractVersion`: `normalized`
//! runs on every bundle, including one the schema layer already rejected
//! (a version other than `2.0.0`, a missing `contractVersion`, or no
//! `contractVersion` field at all), because the harness compares the string
//! unconditionally too and must never panic on a schema-invalid document.
//! A field missing `multiplicity` or `presence` is a reader-level refusal
//! (`MISSING_MULTIPLICITY`), not something this module defaults; it stays
//! absent in `normalized` rather than gaining an invented value. Every helper
//! below is defensive against a missing or wrongly shaped member instead of
//! gating behavior on the version.

use crate::json::{to_canonical_string, Json};

/// The normalized serialization of the bundle's IR document.
///
/// It is produced for every case, including one the schema layer has already
/// decided invalid, because the harness compares the string unconditionally.
pub fn normalized(bundle: &Json) -> String {
    let ir = match bundle.get("ir") {
        Some(ir) => ir,
        None => return to_canonical_string(&Json::Null),
    };
    to_canonical_string(&materialize_ir(ir))
}

fn materialize_ir(ir: &Json) -> Json {
    let members = match ir.as_object() {
        Some(members) => members,
        None => return ir.clone(),
    };
    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len());
    for (name, value) in members {
        if name == "types" {
            out.push((name.clone(), materialize_types(value)));
        } else {
            out.push((name.clone(), value.clone()));
        }
    }
    Json::Object(out)
}

fn materialize_types(types: &Json) -> Json {
    let items = match types.as_array() {
        Some(items) => items,
        None => return types.clone(),
    };
    Json::Array(items.iter().map(materialize_type).collect())
}

fn materialize_type(definition: &Json) -> Json {
    let members = match definition.as_object() {
        Some(members) => members,
        None => return definition.clone(),
    };
    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len());
    for (name, value) in members {
        match name.as_str() {
            "fields" => out.push((name.clone(), materialize_field_array(value))),
            "operations" => out.push((name.clone(), materialize_operations(value))),
            _ => out.push((name.clone(), value.clone())),
        }
    }
    Json::Object(out)
}

fn materialize_operations(operations: &Json) -> Json {
    let items = match operations.as_array() {
        Some(items) => items,
        None => return operations.clone(),
    };
    Json::Array(
        items
            .iter()
            .map(|operation| {
                let members = match operation.as_object() {
                    Some(members) => members,
                    None => return operation.clone(),
                };
                let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len());
                for (name, value) in members {
                    if name == "params" {
                        out.push((name.clone(), materialize_field_array(value)));
                    } else {
                        out.push((name.clone(), value.clone()));
                    }
                }
                Json::Object(out)
            })
            .collect(),
    )
}

fn materialize_field_array(fields: &Json) -> Json {
    let items = match fields.as_array() {
        Some(items) => items,
        None => return fields.clone(),
    };
    Json::Array(items.iter().map(materialize_field).collect())
}

/// Materializes `nullable` as a literal boolean. `multiplicity` and
/// `presence` are schema-required and independently authored, so neither is
/// ever derived from the other, or from anything, here; whatever shape (or
/// absence) a field carries for either passes through unchanged.
fn materialize_field(field: &Json) -> Json {
    let members = match field.as_object() {
        Some(members) => members,
        None => return field.clone(),
    };
    let nullable = truthy(field.get("nullable"));

    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len() + 1);
    for (name, value) in members {
        if name == "nullable" {
            continue;
        }
        out.push((name.clone(), value.clone()));
    }
    out.push(("nullable".to_string(), Json::Bool(nullable)));
    Json::Object(out)
}

/// ECMAScript truthiness, which is what "coerced to a boolean" names.
fn truthy(value: Option<&Json>) -> bool {
    match value {
        None | Some(Json::Null) => false,
        Some(Json::Bool(value)) => *value,
        Some(Json::Number(lexeme)) => match lexeme.parse::<f64>() {
            Ok(number) => number != 0.0 && !number.is_nan(),
            Err(_) => false,
        },
        Some(Json::Str(text)) => !text.is_empty(),
        Some(_) => true,
    }
}

#[cfg(test)]
mod tests {
    use super::normalized;
    use crate::json::parse;

    #[test]
    fn tc_1378_preserves_authored_presence_disagreeing_with_multiplicity() {
        let bundle = parse(
            r#"{"ir":{"contractVersion":"2.0.0","types":[{"kind":"record","fields":[{"name":"a","presence":"optional","multiplicity":{"lower":1,"upper":1}}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(
            normalized(&bundle),
            r#"{"contractVersion":"2.0.0","types":[{"fields":[{"multiplicity":{"lower":1,"upper":1},"name":"a","nullable":false,"presence":"optional"}],"kind":"record"}]}"#
        );
    }

    /// `multiplicity` and `presence` are schema-required and independently
    /// authored; a field missing one is a reader-level refusal
    /// (`MISSING_MULTIPLICITY`), not something `normalized` defaults, so it
    /// stays absent rather than gaining an invented value.
    #[test]
    fn tc_1378_never_derives_multiplicity_from_presence() {
        let bundle = parse(
            r#"{"ir":{"contractVersion":"2.0.0","types":[{"kind":"record","fields":[{"name":"a","presence":"required"}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(
            normalized(&bundle),
            r#"{"contractVersion":"2.0.0","types":[{"fields":[{"name":"a","nullable":false,"presence":"required"}],"kind":"record"}]}"#
        );
    }

    /// A `2.0.0` document of one field whose members are spliced in.
    fn one_field(presence: &str, nullable: &str, default_kind: &str) -> String {
        let bundle = parse(&format!(
            r#"{{"ir":{{"contractVersion":"2.0.0","types":[{{"kind":"record","fields":[{{"name":"a","multiplicity":{{"lower":0,"upper":1}},"presence":"{presence}","nullable":{nullable},"defaultKind":"{default_kind}"}}]}}]}}}}"#
        ))
        .expect("a well-formed document");
        normalized(&bundle)
    }

    #[test]
    fn tc_1378_each_of_presence_nullable_and_default_kind_moves_only_itself() {
        let base = one_field("required", "false", "none");
        // Nothing is derived: a lower bound of 0 leaves `required` authored.
        assert_eq!(
            base,
            r#"{"contractVersion":"2.0.0","types":[{"fields":[{"defaultKind":"none","multiplicity":{"lower":0,"upper":1},"name":"a","nullable":false,"presence":"required"}],"kind":"record"}]}"#
        );
        let cases = [
            (
                one_field("optional", "false", "none"),
                r#""presence":"required""#,
                r#""presence":"optional""#,
            ),
            (
                one_field("required", "true", "none"),
                r#""nullable":false"#,
                r#""nullable":true"#,
            ),
            (
                one_field("required", "false", "semantic"),
                r#""defaultKind":"none""#,
                r#""defaultKind":"semantic""#,
            ),
        ];
        for (changed, from, to) in cases {
            assert_ne!(changed, base, "{to}");
            assert_eq!(
                changed,
                base.replacen(from, to, 1),
                "{to} moved another member"
            );
        }
    }
}
