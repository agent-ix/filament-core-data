//! The FR-086 Rust crate's decision path.
//!
//! `serde_json` hands the golden document's instance to the generated crate's
//! own `Deserialize`, which routes through each type's `try_new` constructor,
//! and the value that comes back is serialized by the crate's own `Serialize`.
//! That round trip is the wire form this emitter answers with. Nothing here
//! decides anything itself: there is no second check, no canonicalization and
//! no comparison in this crate.
//!
//! It links nothing under `conformance/` (FR-090-CON-4) and reads no clock and
//! no environment variable (FR-090-CON-11). The golden corpus directory is
//! resolved from this file's own compile-time path.

use agent_ix_semantic_kernel as kernel;
use serde::Serialize;
use serde_json::{json, Value};

/// One answer: the decision and, when the value was admitted, its wire form.
fn decide<T>(instance: &Value) -> (String, Option<Value>)
where
    T: serde::de::DeserializeOwned + Serialize,
{
    match serde_json::from_value::<T>(instance.clone()) {
        Ok(value) => match serde_json::to_value(&value) {
            Ok(wire) => ("success".to_owned(), Some(wire)),
            Err(_) => ("invalid".to_owned(), None),
        },
        Err(_) => ("invalid".to_owned(), None),
    }
}

/// Routes one golden document to the generated type its declaration names.
fn answer(declaration: &str, instance: &Value) -> Option<(String, Option<Value>)> {
    Some(match declaration {
        "ClauseLanguage" => decide::<kernel::ClauseLanguage>(instance),
        "ClauseRef" => decide::<kernel::ClauseRef>(instance),
        "ConstraintDecl" => decide::<kernel::ConstraintDecl>(instance),
        "ConstraintKeyword" => decide::<kernel::ConstraintKeyword>(instance),
        "DecimalPolicy" => decide::<kernel::DecimalPolicy>(instance),
        "DefaultDecl" => decide::<kernel::DefaultDecl>(instance),
        "DefaultKind" => decide::<kernel::DefaultKind>(instance),
        "EdgeCategory" => decide::<kernel::EdgeCategory>(instance),
        "EnumValue" => decide::<kernel::EnumValue>(instance),
        "EnumValuesConstraint" => decide::<kernel::EnumValuesConstraint>(instance),
        "ExclusiveMaxConstraint" => decide::<kernel::ExclusiveMaxConstraint>(instance),
        "ExclusiveMinConstraint" => decide::<kernel::ExclusiveMinConstraint>(instance),
        "FieldDecl" => decide::<kernel::FieldDecl>(instance),
        "FormatConstraint" => decide::<kernel::FormatConstraint>(instance),
        "Identifier" => decide::<kernel::Identifier>(instance),
        "KernelScalar" => decide::<kernel::KernelScalar>(instance),
        "MaxConstraint" => decide::<kernel::MaxConstraint>(instance),
        "MaxLengthConstraint" => decide::<kernel::MaxLengthConstraint>(instance),
        "MinConstraint" => decide::<kernel::MinConstraint>(instance),
        "MinLengthConstraint" => decide::<kernel::MinLengthConstraint>(instance),
        "Multiplicity" => decide::<kernel::Multiplicity>(instance),
        "NonEmptyConstraint" => decide::<kernel::NonEmptyConstraint>(instance),
        "OperationDecl" => decide::<kernel::OperationDecl>(instance),
        "PatternConstraint" => decide::<kernel::PatternConstraint>(instance),
        "RelationDecl" => decide::<kernel::RelationDecl>(instance),
        "SemanticId" => decide::<kernel::SemanticId>(instance),
        "SourceLocus" => decide::<kernel::SourceLocus>(instance),
        "TypeRef" => decide::<kernel::TypeRef>(instance),
        "UniqueConstraint" => decide::<kernel::UniqueConstraint>(instance),
        "UnitSymbol" => decide::<kernel::UnitSymbol>(instance),
        _ => return None,
    })
}

fn fate(document: &Value) -> String {
    let sealed = document["unknownPolicy"] == json!("reject");
    if !sealed {
        return "not-applicable".to_owned();
    }
    if !exercised(document) {
        return "not-exercised".to_owned();
    }
    "rejected".to_owned()
}

fn exercised(document: &Value) -> bool {
    document["properties"]
        .as_array()
        .map(|rows| rows.iter().any(|row| row == &json!("unknown-member-states")))
        .unwrap_or(false)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let golden = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("golden");
    let mut paths: Vec<_> = std::fs::read_dir(&golden)?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.extension().map(|ext| ext == "json").unwrap_or(false))
        .collect();
    paths.sort();

    let mut out: Vec<Value> = Vec::new();
    for path in paths {
        let document: Value = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
        let id = document["id"].clone();
        let declaration = document["declaration"].as_str().unwrap_or_default();
        match answer(declaration, &document["instance"]) {
            None => out.push(json!({ "id": id, "resultState": "undecided" })),
            Some((state, wire)) => {
                if state == "success" {
                    let wire = wire.unwrap_or(Value::Null);
                    let retained = exercised(&document)
                        && document["instance"]
                            .as_object()
                            .zip(wire.as_object())
                            .map(|(given, written)| {
                                given.keys().any(|key| written.contains_key(key.as_str()))
                                    && given.len() == written.len()
                            })
                            .unwrap_or(false);
                    let unknown_fate = if exercised(&document) {
                        if retained { "preserved" } else { "dropped" }.to_owned()
                    } else {
                        fate(&document)
                    };
                    out.push(json!({
                        "id": id,
                        "resultState": "success",
                        "wire": wire,
                        "unknownFate": unknown_fate,
                    }));
                } else {
                    out.push(json!({
                        "id": id,
                        "resultState": "invalid",
                        "unknownFate": if exercised(&document) {
                            "rejected".to_owned()
                        } else {
                            fate(&document)
                        },
                    }));
                }
            }
        }
    }
    println!("{}", serde_json::to_string_pretty(&out)?);
    Ok(())
}
