//! DecimalPolicy
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicy.

use serde::{Deserialize, Serialize};

/// The fields of `DecimalPolicy`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/DecimalPolicy/field/precision",
        name: "precision",
        rust_name: "precision",
        type_ref: "ix://agent-ix/semantic-core/type/DecimalPolicyPrecision",
        rust_type: "crate::DecimalPolicyPrecision",
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
                path: "packages/semantic-core/generated/json-schema/DecimalPolicy.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/DecimalPolicy/field/scale",
        name: "scale",
        rust_name: "scale",
        type_ref: "ix://agent-ix/semantic-core/type/DecimalPolicyScale",
        rust_type: "crate::DecimalPolicyScale",
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
                path: "packages/semantic-core/generated/json-schema/DecimalPolicy.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// DecimalPolicy
///
/// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicy.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct DecimalPolicy {
    /// precision
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicy/field/precision.
    pub precision: crate::DecimalPolicyPrecision,
    /// scale
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicy/field/scale.
    pub scale: crate::DecimalPolicyScale,
}

/// The deserialization shape of `DecimalPolicy`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DecimalPolicyWire {
    precision: crate::DecimalPolicyPrecision,
    scale: crate::DecimalPolicyScale,
}

impl DecimalPolicy {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        precision: crate::DecimalPolicyPrecision,
        scale: crate::DecimalPolicyScale,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { precision, scale })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for DecimalPolicy {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = DecimalPolicyWire::deserialize(deserializer)?;
        Self::try_new(wire.precision, wire.scale).map_err(serde::de::Error::custom)
    }
}
