//! The corpus comparison form of an IR document.
//!
//! `spec/functional/FR-036` fixes it: "a `1.1.0` document materializes
//! `multiplicity`, `presence`, and `nullable` on every field and operation
//! parameter, and a `1.0.0` document gains no member", serialized in
//! `agent-ix-conformance-jcs-v1`.
//!
//! `spec/functional/FR-027` fixes the derivation each materialized member takes:
//! "`required` → `1..1`, `optional` → `0..1`" for an absent multiplicity, and
//! "`presence` as `required` when `multiplicity.lower` is at least 1 and
//! `optional` when it is 0" the other way.

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
    if ir.get("contractVersion").and_then(Json::as_str) != Some("1.1.0") {
        return to_canonical_string(ir);
    }
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

fn materialize_field(field: &Json) -> Json {
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
    let presence = if lower >= 1 { "required" } else { "optional" };
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
}
