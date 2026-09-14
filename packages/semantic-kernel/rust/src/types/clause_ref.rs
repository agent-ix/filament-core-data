//! ClauseRef
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef.

use serde::{Deserialize, Serialize};

/// The fields of `ClauseRef`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/ClauseRef/field/language",
        name: "language",
        rust_name: "language",
        type_ref: "ix://agent-ix/semantic-core/type/ClauseLanguage",
        rust_type: "crate::ClauseLanguage",
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
                path: "packages/semantic-core/generated/json-schema/ClauseRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/ClauseRef/field/clauseId",
        name: "clauseId",
        rust_name: "clause_id",
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
                path: "packages/semantic-core/generated/json-schema/ClauseRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/ClauseRef/field/sourceSpan",
        name: "sourceSpan",
        rust_name: "source_span",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocus",
        rust_type: "Option<crate::SourceLocus>",
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
                path: "packages/semantic-core/generated/json-schema/ClauseRef.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// ClauseRef
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ClauseRef {
    /// language
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef/field/language.
    pub language: crate::ClauseLanguage,
    /// clauseId
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef/field/clauseId.
    #[serde(rename = "clauseId")]
    pub clause_id: crate::Identifier,
    /// sourceSpan
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef/field/sourceSpan.
    #[serde(rename = "sourceSpan", skip_serializing_if = "Option::is_none")]
    pub source_span: Option<crate::SourceLocus>,
}

/// The deserialization shape of `ClauseRef`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ClauseRefWire {
    language: crate::ClauseLanguage,
    #[serde(rename = "clauseId")]
    clause_id: crate::Identifier,
    #[serde(rename = "sourceSpan", default)]
    source_span: Option<crate::SourceLocus>,
}

impl ClauseRef {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        language: crate::ClauseLanguage,
        clause_id: crate::Identifier,
        source_span: Option<crate::SourceLocus>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            language,
            clause_id,
            source_span,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for ClauseRef {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = ClauseRefWire::deserialize(deserializer)?;
        Self::try_new(wire.language, wire.clause_id, wire.source_span)
            .map_err(serde::de::Error::custom)
    }
}
