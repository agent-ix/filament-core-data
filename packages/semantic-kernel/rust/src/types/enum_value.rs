//! EnumValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/EnumValue.

use serde::{Deserialize, Serialize};

/// The fields of `EnumValue`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/EnumValue/field/value",
        name: "value",
        rust_name: "value",
        type_ref: "ix://agent-ix/semantic-core/type/Identifier",
        rust_type: "crate::Identifier",
        row: "field:single/non-null/required",
        presence: "required",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 1,
            upper: Some(1),
            ordered: None,
            unique: None,
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/EnumValue.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/EnumValue/field/doc",
        name: "doc",
        rust_name: "doc",
        type_ref: "ix://agent-ix/semantic-core/type/EnumValueDoc",
        rust_type: "Option<crate::EnumValueDoc>",
        row: "field:single/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: Some(1),
            ordered: None,
            unique: None,
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/EnumValue.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// EnumValue
///
/// Semantic identity: ix://agent-ix/semantic-core/type/EnumValue.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct EnumValue {
    /// value
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValue/field/value.
    pub value: crate::Identifier,
    /// doc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValue/field/doc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc: Option<crate::EnumValueDoc>,
}

/// The deserialization shape of `EnumValue`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EnumValueWire {
    value: crate::Identifier,
    #[serde(default)]
    doc: Option<crate::EnumValueDoc>,
}

impl EnumValue {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        value: crate::Identifier,
        doc: Option<crate::EnumValueDoc>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { value, doc })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for EnumValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = EnumValueWire::deserialize(deserializer)?;
        Self::try_new(wire.value, wire.doc).map_err(serde::de::Error::custom)
    }
}
