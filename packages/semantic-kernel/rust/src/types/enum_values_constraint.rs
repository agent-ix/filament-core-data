//! EnumValuesConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `EnumValuesConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/EnumValuesConstraint/keyword",
        name: "keyword",
        rust_name: "keyword",
        type_ref: "ix://agent-ix/semantic-core/EnumValuesConstraintKeyword",
        rust_type: "crate::EnumValuesConstraintKeyword",
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
                path: "packages/semantic-core/generated/json-schema/EnumValuesConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/EnumValuesConstraint/values",
        name: "values",
        rust_name: "values",
        type_ref: "ix://agent-ix/semantic-core/EnumValuesConstraintValues",
        rust_type: "Vec<crate::EnumValuesConstraintValues>",
        row: "field:collection/non-null/required",
        presence: "required",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 1,
            upper: None,
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/EnumValuesConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// EnumValuesConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct EnumValuesConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraint/keyword.
    pub keyword: crate::EnumValuesConstraintKeyword,
    /// values
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraint/values.
    pub values: Vec<crate::EnumValuesConstraintValues>,
}

/// The deserialization shape of `EnumValuesConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EnumValuesConstraintWire {
    keyword: crate::EnumValuesConstraintKeyword,
    values: Vec<crate::EnumValuesConstraintValues>,
}

impl EnumValuesConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::EnumValuesConstraintKeyword,
        values: Vec<crate::EnumValuesConstraintValues>,
    ) -> Result<Self, crate::support::ValidationError> {
        {
            let items = &values;
            if items.len() < 1usize {
                return Err(crate::support::ValidationError::new(
                    "ix://agent-ix/semantic-core/EnumValuesConstraint/values",
                    "multiplicity.lower",
                    "values",
                    "1",
                ));
            }
        }
        Ok(Self { keyword, values })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for EnumValuesConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = EnumValuesConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword, wire.values).map_err(serde::de::Error::custom)
    }
}
