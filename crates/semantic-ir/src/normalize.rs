//! The corpus comparison form of an IR document.
//!
//! `spec/functional/FR-036` fixes it (fcd#179: restated for contract `2.0.0`,
//! the only contract left, in place of the deleted `1.0.0`/`1.1.0` split):
//! "a `2.0.0` document materializes `multiplicity`, `presence`, and
//! `nullable` on every field and operation parameter that lacks one, with
//! `presence` kept exactly as authored rather than derived (FR-106), so a
//! well-formed `2.0.0` document — whose schema already requires all three on
//! every field — gains no member", serialized in `agent-ix-conformance-jcs-v1`.
//!
//! `spec/functional/FR-027` fixes the derivation each materialized member takes
//! for a document that lacks one: "`required` → `1..1`, `optional` → `0..1`"
//! for an absent multiplicity, and "`presence` as `required` when
//! `multiplicity.lower` is at least 1 and `optional` when it is 0" the other
//! way.
//!
//! `matches!(version, Some("1.1.0" | "2.0.0"))` below still matches a
//! schema-bypassing `1.1.0`-tagged document defensively: `normalized` runs on
//! every case, including one the schema layer already rejected, and must
//! never panic on a legacy-shaped document a corpus case might still supply.

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
    let version = ir.get("contractVersion").and_then(Json::as_str);
    if !matches!(version, Some("1.1.0" | "2.0.0")) {
        return to_canonical_string(ir);
    }
    to_canonical_string(&materialize_ir(ir, version == Some("2.0.0")))
}

fn materialize_ir(ir: &Json, authored_presence: bool) -> Json {
    let members = match ir.as_object() {
        Some(members) => members,
        None => return ir.clone(),
    };
    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len());
    for (name, value) in members {
        if name == "types" {
            out.push((name.clone(), materialize_types(value, authored_presence)));
        } else {
            out.push((name.clone(), value.clone()));
        }
    }
    Json::Object(out)
}

fn materialize_types(types: &Json, authored_presence: bool) -> Json {
    let items = match types.as_array() {
        Some(items) => items,
        None => return types.clone(),
    };
    Json::Array(
        items
            .iter()
            .map(|item| materialize_type(item, authored_presence))
            .collect(),
    )
}

fn materialize_type(definition: &Json, authored_presence: bool) -> Json {
    let members = match definition.as_object() {
        Some(members) => members,
        None => return definition.clone(),
    };
    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len());
    for (name, value) in members {
        match name.as_str() {
            "fields" => out.push((
                name.clone(),
                materialize_field_array(value, authored_presence),
            )),
            "operations" => out.push((
                name.clone(),
                materialize_operations(value, authored_presence),
            )),
            _ => out.push((name.clone(), value.clone())),
        }
    }
    Json::Object(out)
}

fn materialize_operations(operations: &Json, authored_presence: bool) -> Json {
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
                        out.push((
                            name.clone(),
                            materialize_field_array(value, authored_presence),
                        ));
                    } else {
                        out.push((name.clone(), value.clone()));
                    }
                }
                Json::Object(out)
            })
            .collect(),
    )
}

fn materialize_field_array(fields: &Json, authored_presence: bool) -> Json {
    let items = match fields.as_array() {
        Some(items) => items,
        None => return fields.clone(),
    };
    Json::Array(
        items
            .iter()
            .map(|field| materialize_field(field, authored_presence))
            .collect(),
    )
}

fn materialize_field(field: &Json, authored_presence: bool) -> Json {
    let members = match field.as_object() {
        Some(members) => members,
        None => return field.clone(),
    };
    let multiplicity = match field.get("multiplicity") {
        Some(multiplicity) if multiplicity.as_object().is_some() => multiplicity.clone(),
        _ => derived_multiplicity(field),
    };
    let lower = multiplicity
        .get("lower")
        .and_then(Json::as_i64)
        .unwrap_or(0);
    let presence = if authored_presence {
        field
            .get("presence")
            .and_then(Json::as_str)
            .unwrap_or("optional")
    } else if lower >= 1 {
        "required"
    } else {
        "optional"
    };
    let nullable = truthy(field.get("nullable"));

    let mut out: Vec<(String, Json)> = Vec::with_capacity(members.len() + 3);
    for (name, value) in members {
        match name.as_str() {
            "multiplicity" | "presence" | "nullable" => {}
            _ => out.push((name.clone(), value.clone())),
        }
    }
    out.push(("multiplicity".to_string(), multiplicity));
    out.push(("presence".to_string(), Json::Str(presence.to_string())));
    out.push(("nullable".to_string(), Json::Bool(nullable)));
    Json::Object(out)
}

fn derived_multiplicity(field: &Json) -> Json {
    let lower = if field.get("presence").and_then(Json::as_str) == Some("required") {
        "1"
    } else {
        "0"
    };
    Json::Object(vec![
        ("lower".to_string(), Json::Number(lower.to_string())),
        ("upper".to_string(), Json::Number("1".to_string())),
    ])
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

    /// fcd#179 deleted contracts `1.0.0` and `1.1.0`; no valid corpus case is
    /// tagged either again. This test and the next one keep exercising
    /// `normalized`'s two non-`2.0.0` branches directly, bypassing schema
    /// validation the way `normalized` itself must tolerate (it runs even on
    /// a bundle the schema layer already rejected, per its own doc comment),
    /// rather than leaving `matches!(version, Some("1.1.0" | "2.0.0"))`'s
    /// `"1.1.0"` arm with no test reaching it.
    #[test]
    fn tc_700_materializes_a_1_1_0_field() {
        let bundle = parse(
            r#"{"ir":{"contractVersion":"1.1.0","types":[{"kind":"record","fields":[{"name":"a","presence":"optional"}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(
            normalized(&bundle),
            r#"{"contractVersion":"1.1.0","types":[{"fields":[{"multiplicity":{"lower":0,"upper":1},"name":"a","nullable":false,"presence":"optional"}],"kind":"record"}]}"#
        );
    }

    /// A `contractVersion` outside the `matches!` arm entirely (neither
    /// `1.1.0` nor `2.0.0`) takes `normalized`'s other defensive branch: the
    /// raw canonical form, unmaterialized.
    #[test]
    fn tc_700_adds_no_member_to_a_1_0_0_document() {
        let bundle = parse(
            r#"{"ir":{"contractVersion":"1.0.0","types":[{"kind":"record","fields":[{"name":"a","presence":"required"}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(
            normalized(&bundle),
            r#"{"contractVersion":"1.0.0","types":[{"fields":[{"name":"a","presence":"required"}],"kind":"record"}]}"#
        );
    }

    #[test]
    fn tc_1378_preserves_authored_presence_in_a_1_2_0_field() {
        let bundle = parse(
            r#"{"ir":{"contractVersion":"2.0.0","types":[{"kind":"record","fields":[{"name":"a","presence":"optional","multiplicity":{"lower":1,"upper":1}}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(
            normalized(&bundle),
            r#"{"contractVersion":"2.0.0","types":[{"fields":[{"multiplicity":{"lower":1,"upper":1},"name":"a","nullable":false,"presence":"optional"}],"kind":"record"}]}"#
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
