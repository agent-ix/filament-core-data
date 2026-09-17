//! The IR v1.1 document this frontend assembles: the FR-095 envelope around
//! the FR-093/FR-094 definitions, with every node list in FR-097's order.
//!
//! [`assemble`] is a pure function of the envelope and the lowered
//! definitions; the reader ([`crate::validate`]) decides the result and
//! [`crate::canonical`] gives it its bytes. `multiplicity`, `presence` and
//! `nullable` are already present on every field and parameter
//! ([`crate::lower::Field`] carries all three), so the reader's
//! materialization adds no member.

use serde_json::{Map, Value};

use crate::canonical::sort_node_lists;
use crate::envelope::Envelope;
use crate::lower::TypeDefinition;

/// The one `contractVersion` this frontend emits.
pub const CONTRACT_VERSION: &str = "1.2.0";

/// `{contractVersion, source, package, types, occurrences, extensions}` over
/// `envelope` and `types`, every node list sorted by identity.
pub fn assemble(envelope: &Envelope, types: &[TypeDefinition]) -> Value {
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
    let mut document = Value::Object(members);
    sort_node_lists(&mut document);
    document
}

/// `serde_json::to_value` over a node this crate defines. Every emitted
/// struct derives `Serialize` with plain members, so the conversion cannot
/// fail; a failure would be a defect in this crate's own types and is
/// surfaced as `null`, which the reader refuses.
fn to_value<T: serde::Serialize>(node: &T) -> Value {
    serde_json::to_value(node).unwrap_or(Value::Null)
}
