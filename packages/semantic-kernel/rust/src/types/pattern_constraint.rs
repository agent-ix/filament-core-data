//! PatternConstraint
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint.

use serde::{Deserialize, Serialize};

/// The fields of `PatternConstraint`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/PatternConstraint/field/keyword",
        name: "keyword",
        rust_name: "keyword",
        type_ref: "ix://agent-ix/semantic-core/type/PatternConstraintKeyword",
        rust_type: "crate::PatternConstraintKeyword",
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
                path: "packages/semantic-core/generated/json-schema/PatternConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/PatternConstraint/field/regex",
        name: "regex",
        rust_name: "regex",
        type_ref: "ix://agent-ix/semantic-core/type/PatternConstraintRegex",
        rust_type: "crate::PatternConstraintRegex",
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
                path: "packages/semantic-core/generated/json-schema/PatternConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/PatternConstraint/field/dialect",
        name: "dialect",
        rust_name: "dialect",
        type_ref: "ix://agent-ix/semantic-core/type/PatternConstraintDialect",
        rust_type: "crate::PatternConstraintDialect",
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
                path: "packages/semantic-core/generated/json-schema/PatternConstraint.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// PatternConstraint
///
/// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct PatternConstraint {
    /// keyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint/field/keyword.
    pub keyword: crate::PatternConstraintKeyword,
    /// regex
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint/field/regex.
    pub regex: crate::PatternConstraintRegex,
    /// dialect
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint/field/dialect.
    pub dialect: crate::PatternConstraintDialect,
}

/// The deserialization shape of `PatternConstraint`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PatternConstraintWire {
    keyword: crate::PatternConstraintKeyword,
    regex: crate::PatternConstraintRegex,
    dialect: crate::PatternConstraintDialect,
}

impl PatternConstraint {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        keyword: crate::PatternConstraintKeyword,
        regex: crate::PatternConstraintRegex,
        dialect: crate::PatternConstraintDialect,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            keyword,
            regex,
            dialect,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for PatternConstraint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = PatternConstraintWire::deserialize(deserializer)?;
        Self::try_new(wire.keyword, wire.regex, wire.dialect).map_err(serde::de::Error::custom)
    }
}
