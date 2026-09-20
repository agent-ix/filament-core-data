//! TypeRef
//!
//! Semantic identity: ix://agent-ix/semantic-core/TypeRef.

use serde::{Deserialize, Serialize};

/// The fields of `TypeRef`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/TypeRef/target",
        name: "target",
        rust_name: "target",
        type_ref: "ix://agent-ix/semantic-core/TypeRefTarget",
        rust_type: "crate::TypeRefTarget",
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
                path: "packages/semantic-core/generated/json-schema/TypeRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/TypeRef/multiplicity",
        name: "multiplicity",
        rust_name: "multiplicity",
        type_ref: "ix://agent-ix/semantic-core/Multiplicity",
        rust_type: "Option<crate::Multiplicity>",
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
                path: "packages/semantic-core/generated/json-schema/TypeRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/TypeRef/unit",
        name: "unit",
        rust_name: "unit",
        type_ref: "ix://agent-ix/semantic-core/UnitSymbol",
        rust_type: "Option<crate::UnitSymbol>",
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
                path: "packages/semantic-core/generated/json-schema/TypeRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/TypeRef/decimal",
        name: "decimal",
        rust_name: "decimal",
        type_ref: "ix://agent-ix/semantic-core/DecimalPolicy",
        rust_type: "Option<crate::DecimalPolicy>",
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
                path: "packages/semantic-core/generated/json-schema/TypeRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// TypeRef
///
/// Semantic identity: ix://agent-ix/semantic-core/TypeRef.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct TypeRef {
    /// target
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRef/target.
    pub target: crate::TypeRefTarget,
    /// multiplicity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRef/multiplicity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<crate::Multiplicity>,
    /// unit
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRef/unit.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<crate::UnitSymbol>,
    /// decimal
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRef/decimal.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimal: Option<crate::DecimalPolicy>,
}

/// The deserialization shape of `TypeRef`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TypeRefWire {
    target: crate::TypeRefTarget,
    #[serde(default)]
    multiplicity: Option<crate::Multiplicity>,
    #[serde(default)]
    unit: Option<crate::UnitSymbol>,
    #[serde(default)]
    decimal: Option<crate::DecimalPolicy>,
}

impl TypeRef {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        target: crate::TypeRefTarget,
        multiplicity: Option<crate::Multiplicity>,
        unit: Option<crate::UnitSymbol>,
        decimal: Option<crate::DecimalPolicy>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            target,
            multiplicity,
            unit,
            decimal,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for TypeRef {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = TypeRefWire::deserialize(deserializer)?;
        Self::try_new(wire.target, wire.multiplicity, wire.unit, wire.decimal)
            .map_err(serde::de::Error::custom)
    }
}
