//! Root
//!
//! Semantic identity: ix://agent-ix/conformance/type/Root.

use serde::{Deserialize, Serialize};

/// The fields of `Root`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/root-name",
        name: "name",
        rust_name: "name",
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
                path: "model/root.tsp",
                start_line: 2,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/root-node",
        name: "node",
        rust_name: "node",
        type_ref: "ix://agent-ix/conformance/type/NodeRef",
        rust_type: "crate::NodeRef",
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
                path: "model/root.tsp",
                start_line: 3,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// Root
///
/// Semantic identity: ix://agent-ix/conformance/type/Root.
///
/// Roles: agent-ix:entity, agent-ix:aggregate.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Root {
    /// root-name
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/root-name.
    pub name: crate::Text,
    /// root-node
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/root-node.
    pub node: crate::NodeRef,
}

/// The deserialization shape of `Root`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RootWire {
    name: crate::Text,
    node: crate::NodeRef,
}

impl Root {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        name: crate::Text,
        node: crate::NodeRef,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { name, node })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for Root {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = RootWire::deserialize(deserializer)?;
        Self::try_new(wire.name, wire.node).map_err(serde::de::Error::custom)
    }
}
