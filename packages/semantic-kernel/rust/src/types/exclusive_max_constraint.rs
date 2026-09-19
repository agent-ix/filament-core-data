//! ExclusiveMaxConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `ExclusiveMaxConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/ExclusiveMaxConstraint/keyword",
        name: "keyword",
        rust_name: "keyword",
        type_ref: "ix://agent-ix/semantic-core/ExclusiveMaxConstraintKeyword",
        rust_type: "crate::ExclusiveMaxConstraintKeyword",
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
                path: "packages/semantic-core/generated/json-schema/ExclusiveMaxConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/ExclusiveMaxConstraint/value",
        name: "value",
        rust_name: "value",
        type_ref: "ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue",
        rust_type: "crate::ExclusiveMaxConstraintValue",
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
                path: "packages/semantic-core/generated/json-schema/ExclusiveMaxConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// ExclusiveMaxConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ExclusiveMaxConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraint/keyword.
    pub keyword: crate::ExclusiveMaxConstraintKeyword,
    /// value
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraint/value.
    pub value: crate::ExclusiveMaxConstraintValue,
}

/// The deserialization shape of `ExclusiveMaxConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ExclusiveMaxConstraintWire {
    keyword: crate::ExclusiveMaxConstraintKeyword,
    value: crate::ExclusiveMaxConstraintValue,
}

impl ExclusiveMaxConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::ExclusiveMaxConstraintKeyword,
        value: crate::ExclusiveMaxConstraintValue,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { keyword, value })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for ExclusiveMaxConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = ExclusiveMaxConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword, wire.value).map_err(serde::de::Error::custom)
    }
}
