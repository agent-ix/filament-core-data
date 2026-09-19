//! NonEmptyConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/NonEmptyConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `NonEmptyConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[crate::identity::FieldMeta {
    identity: "ix://agent-ix/semantic-core/type/NonEmptyConstraint/field/keyword",
    name: "keyword",
    rust_name: "keyword",
    type_ref: "ix://agent-ix/semantic-core/type/NonEmptyConstraintKeyword",
    rust_type: "crate::NonEmptyConstraintKeyword",
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
            path: "packages/semantic-core/generated/json-schema/NonEmptyConstraint.json",
            start_line: 1,
            start_column: 1,
            end_line: None,
            end_column: None,
        }),
        generated: None,
    },
}];

/// NonEmptyConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/type/NonEmptyConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct NonEmptyConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/NonEmptyConstraint/field/keyword.
    pub keyword: crate::NonEmptyConstraintKeyword,
}

/// The deserialization shape of `NonEmptyConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NonEmptyConstraintWire {
    keyword: crate::NonEmptyConstraintKeyword,
}

impl NonEmptyConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::NonEmptyConstraintKeyword,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { keyword })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for NonEmptyConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = NonEmptyConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword).map_err(serde::de::Error::custom)
    }
}
