//! Multiplicity
//!
//! Semantic identity: ix://agent-ix/semantic-core/Multiplicity.

use serde::{Deserialize, Serialize};

/// The fields of `Multiplicity`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/Multiplicity/lower",
        name: "lower",
        rust_name: "lower",
        type_ref: "ix://agent-ix/semantic-core/MultiplicityLower",
        rust_type: "crate::MultiplicityLower",
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
                path: "packages/semantic-core/generated/json-schema/Multiplicity.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/Multiplicity/upper",
        name: "upper",
        rust_name: "upper",
        type_ref: "ix://agent-ix/semantic-core/MultiplicityUpper",
        rust_type: "Option<crate::MultiplicityUpper>",
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
                path: "packages/semantic-core/generated/json-schema/Multiplicity.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/Multiplicity/ordered",
        name: "ordered",
        rust_name: "ordered",
        type_ref: "ix://agent-ix/semantic-core/MultiplicityOrdered",
        rust_type: "crate::MultiplicityOrdered",
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
                path: "packages/semantic-core/generated/json-schema/Multiplicity.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/Multiplicity/unique",
        name: "unique",
        rust_name: "unique",
        type_ref: "ix://agent-ix/semantic-core/MultiplicityUnique",
        rust_type: "crate::MultiplicityUnique",
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
                path: "packages/semantic-core/generated/json-schema/Multiplicity.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// Multiplicity
///
/// Semantic identity: ix://agent-ix/semantic-core/Multiplicity.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Multiplicity {
    /// lower
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Multiplicity/lower.
    pub lower: crate::MultiplicityLower,
    /// upper
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Multiplicity/upper.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upper: Option<crate::MultiplicityUpper>,
    /// ordered
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Multiplicity/ordered.
    pub ordered: crate::MultiplicityOrdered,
    /// unique
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Multiplicity/unique.
    pub unique: crate::MultiplicityUnique,
}

/// The deserialization shape of `Multiplicity`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MultiplicityWire {
    lower: crate::MultiplicityLower,
    #[serde(default)]
    upper: Option<crate::MultiplicityUpper>,
    ordered: crate::MultiplicityOrdered,
    unique: crate::MultiplicityUnique,
}

impl Multiplicity {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        lower: crate::MultiplicityLower,
        upper: Option<crate::MultiplicityUpper>,
        ordered: crate::MultiplicityOrdered,
        unique: crate::MultiplicityUnique,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            lower,
            upper,
            ordered,
            unique,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for Multiplicity {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = MultiplicityWire::deserialize(deserializer)?;
        Self::try_new(wire.lower, wire.upper, wire.ordered, wire.unique)
            .map_err(serde::de::Error::custom)
    }
}
