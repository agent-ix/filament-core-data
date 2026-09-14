//! MinConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/MinConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `MinConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/MinConstraint/field/keyword",
        name: "keyword",
        rust_name: "keyword",
        type_ref: "ix://agent-ix/semantic-core/type/MinConstraintKeyword",
        rust_type: "crate::MinConstraintKeyword",
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
                path: "packages/semantic-core/generated/json-schema/MinConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/MinConstraint/field/value",
        name: "value",
        rust_name: "value",
        type_ref: "ix://agent-ix/semantic-core/type/MinConstraintValue",
        rust_type: "crate::MinConstraintValue",
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
                path: "packages/semantic-core/generated/json-schema/MinConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// MinConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct MinConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraint/field/keyword.
    pub keyword: crate::MinConstraintKeyword,
    /// value
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraint/field/value.
    pub value: crate::MinConstraintValue,
}

/// The deserialization shape of `MinConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MinConstraintWire {
    keyword: crate::MinConstraintKeyword,
    value: crate::MinConstraintValue,
}

impl MinConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::MinConstraintKeyword,
        value: crate::MinConstraintValue,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { keyword, value })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for MinConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = MinConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword, wire.value).map_err(serde::de::Error::custom)
    }
}
