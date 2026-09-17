//! The IR 2.0.0 document this frontend assembles: the FR-095 envelope around
//! the FR-093/FR-094 definitions, with every node list in FR-097's order.
//!
//! [`assemble`] is a pure function of the envelope and the lowered
//! definitions; the reader ([`crate::validate`]) decides the result and
//! [`crate::canonical`] gives it its bytes. `multiplicity`, `presence` and
//! `nullable` are already present on every field and parameter
//! ([`crate::lower::Field`] carries all three), so the reader's
//! materialization adds no member.

use serde_json::{Map, Value};

use agent_ix_semantic_ir::json::to_canonical_string;

use crate::bundle::Construct;
use crate::canonical::sort_node_lists;
use crate::envelope::Envelope;
use crate::lower::TypeDefinition;

/// The one `contractVersion` this frontend emits.
pub const CONTRACT_VERSION: &str = "2.0.0";

/// `{contractVersion, source, package, types, occurrences, extensions,
/// constructs}` over `envelope`, `types` and the construct kinds they use,
/// every node list sorted by identity and `constructs` in the given order.
///
/// # Errors
///
/// A construct declaration whose reader rendering is not JSON `serde_json`
/// reads back.
pub fn assemble(
    envelope: &Envelope,
    types: &[TypeDefinition],
    constructs: &[Construct],
) -> Result<Value, serde_json::Error> {
    let mut members = Map::new();
    members.insert(
        "contractVersion".to_string(),
        Value::String(CONTRACT_VERSION.to_string()),
    );
    members.insert("source".to_string(), to_value(&envelope.source));
    members.insert("package".to_string(), to_value(&envelope.package));
    members.insert(
        "types".to_string(),
        Value::Array(types.iter().map(to_value).collect()),
    );
    members.insert(
        "occurrences".to_string(),
        Value::Array(envelope.occurrences.clone()),
    );
    members.insert(
        "extensions".to_string(),
        Value::Array(envelope.extensions.clone()),
    );
    members.insert(
        "constructs".to_string(),
        Value::Array(
            constructs
                .iter()
                .map(construct_entry)
                .collect::<Result<_, _>>()?,
        ),
    );
    let mut document = Value::Object(members);
    sort_node_lists(&mut document);
    Ok(document)
}

/// `serde_json::to_value` over a node this crate defines. Every emitted
/// struct derives `Serialize` with plain members, so the conversion cannot
/// fail; a failure would be a defect in this crate's own types and is
/// surfaced as `null`, which the reader refuses.
fn to_value<T: serde::Serialize>(node: &T) -> Value {
    serde_json::to_value(node).unwrap_or(Value::Null)
}

/// `semantic-ir.schema.json#/$defs/construct`: one `constructs` entry. The
/// declaration is the reader's own rendering of it, so the table carries
/// exactly what the reader reads back.
fn construct_entry(construct: &Construct) -> Result<Value, serde_json::Error> {
    let declaration = serde_json::from_str(&to_canonical_string(&construct.declaration.to_json()))?;
    let mut entry = Map::new();
    entry.insert("kind".to_string(), to_value(&construct.kind));
    entry.insert(
        "moduleVersion".to_string(),
        Value::String(construct.module_version.clone()),
    );
    entry.insert(
        "manifestDigest".to_string(),
        Value::String(construct.manifest_digest.clone()),
    );
    entry.insert("construct".to_string(), declaration);
    Ok(Value::Object(entry))
}
