//! Leaf
//!
//! Semantic identity: ix://agent-ix/conformance/type/Leaf.

use serde::{Deserialize, Serialize};

/// The fields of `Leaf`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[crate::identity::FieldMeta {
    identity: "ix://agent-ix/conformance/field/leaf-id",
    name: "id",
    rust_name: "id",
    type_ref: "ix://agent-ix/conformance/type/Text",
    rust_type: "crate::Text",
    row: "field:single/non-null/required",
    presence: "required",
    nullable: false,
    multiplicity: crate::identity::MultiplicityMeta {
        lower: 1,
        upper: Some(1),
        ordered: Some(false),
        unique: Some(false),
    },
    unit: None,
    default_kind: "none",
    default_value: None,
    origin: crate::identity::OriginMeta {
        source: Some(crate::identity::SourceLocusMeta {
            source_identity: "ix://agent-ix/filament-core-data/source/typespec",
            path: "model/leaf.tsp",
            start_line: 2,
            start_column: 1,
            end_line: None,
            end_column: None,
        }),
        generated: None,
    },
}];

/// Leaf
///
/// Semantic identity: ix://agent-ix/conformance/type/Leaf.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Leaf {
    /// leaf-id
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/leaf-id.
    pub id: crate::Text,
}

/// The deserialization shape of `Leaf`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LeafWire {
    id: crate::Text,
}

impl Leaf {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(id: crate::Text) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { id })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for Leaf {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = LeafWire::deserialize(deserializer)?;
        Self::try_new(wire.id).map_err(serde::de::Error::custom)
    }
}
