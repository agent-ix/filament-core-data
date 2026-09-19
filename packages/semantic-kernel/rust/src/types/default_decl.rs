//! DefaultDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/DefaultDecl.

use serde::{Deserialize, Serialize};

/// The fields of `DefaultDecl`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/DefaultDecl/field/kind",
        name: "kind",
        rust_name: "kind",
        type_ref: "ix://agent-ix/semantic-core/type/DefaultKind",
        rust_type: "crate::DefaultKind",
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
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/DefaultDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/DefaultDecl/field/value",
        name: "value",
        rust_name: "value",
        type_ref: "ix://agent-ix/semantic-core/type/DefaultDeclValue",
        rust_type: "Option<crate::DefaultDeclValue>",
        row: "field:single/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: Some(1),
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/DefaultDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// DefaultDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/type/DefaultDecl.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct DefaultDecl {
    /// kind
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DefaultDecl/field/kind.
    pub kind: crate::DefaultKind,
    /// value
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DefaultDecl/field/value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<crate::DefaultDeclValue>,
}

/// The deserialization shape of `DefaultDecl`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DefaultDeclWire {
    kind: crate::DefaultKind,
    #[serde(default)]
    value: Option<crate::DefaultDeclValue>,
}

impl DefaultDecl {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        kind: crate::DefaultKind,
        value: Option<crate::DefaultDeclValue>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { kind, value })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for DefaultDecl {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = DefaultDeclWire::deserialize(deserializer)?;
        Self::try_new(wire.kind, wire.value).map_err(serde::de::Error::custom)
    }
}
