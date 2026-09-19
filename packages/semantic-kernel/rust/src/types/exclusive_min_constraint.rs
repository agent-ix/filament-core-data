//! ExclusiveMinConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `ExclusiveMinConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/ExclusiveMinConstraint/field/keyword",
        name: "keyword",
        rust_name: "keyword",
        type_ref: "ix://agent-ix/semantic-core/type/ExclusiveMinConstraintKeyword",
        rust_type: "crate::ExclusiveMinConstraintKeyword",
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
                path: "packages/semantic-core/generated/json-schema/ExclusiveMinConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/ExclusiveMinConstraint/field/value",
        name: "value",
        rust_name: "value",
        type_ref: "ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue",
        rust_type: "crate::ExclusiveMinConstraintValue",
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
                path: "packages/semantic-core/generated/json-schema/ExclusiveMinConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// ExclusiveMinConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ExclusiveMinConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraint/field/keyword.
    pub keyword: crate::ExclusiveMinConstraintKeyword,
    /// value
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraint/field/value.
    pub value: crate::ExclusiveMinConstraintValue,
}

/// The deserialization shape of `ExclusiveMinConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ExclusiveMinConstraintWire {
    keyword: crate::ExclusiveMinConstraintKeyword,
    value: crate::ExclusiveMinConstraintValue,
}

impl ExclusiveMinConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::ExclusiveMinConstraintKeyword,
        value: crate::ExclusiveMinConstraintValue,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { keyword, value })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for ExclusiveMinConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = ExclusiveMinConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword, wire.value).map_err(serde::de::Error::custom)
    }
}
