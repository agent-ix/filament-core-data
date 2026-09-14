//! SourceLocus
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus.

use serde::{Deserialize, Serialize};

/// The fields of `SourceLocus`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/sourceIdentity",
        name: "sourceIdentity",
        rust_name: "source_identity",
        type_ref: "ix://agent-ix/semantic-core/type/SemanticId",
        rust_type: "crate::SemanticId",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/path",
        name: "path",
        rust_name: "path",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocusPath",
        rust_type: "crate::SemanticCoreSourceLocusPath",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/startLine",
        name: "startLine",
        rust_name: "start_line",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocusStartLine",
        rust_type: "crate::SourceLocusStartLine",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/startColumn",
        name: "startColumn",
        rust_name: "start_column",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocusStartColumn",
        rust_type: "crate::SourceLocusStartColumn",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/endLine",
        name: "endLine",
        rust_name: "end_line",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocusEndLine",
        rust_type: "Option<crate::SourceLocusEndLine>",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/SourceLocus/field/endColumn",
        name: "endColumn",
        rust_name: "end_column",
        type_ref: "ix://agent-ix/semantic-core/type/SourceLocusEndColumn",
        rust_type: "Option<crate::SourceLocusEndColumn>",
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
                path: "packages/semantic-core/generated/json-schema/SourceLocus.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// SourceLocus
///
/// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct SourceLocus {
    /// sourceIdentity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/sourceIdentity.
    #[serde(rename = "sourceIdentity")]
    pub source_identity: crate::SemanticId,
    /// path
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/path.
    pub path: crate::SemanticCoreSourceLocusPath,
    /// startLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/startLine.
    #[serde(rename = "startLine")]
    pub start_line: crate::SourceLocusStartLine,
    /// startColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/startColumn.
    #[serde(rename = "startColumn")]
    pub start_column: crate::SourceLocusStartColumn,
    /// endLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/endLine.
    #[serde(rename = "endLine", skip_serializing_if = "Option::is_none")]
    pub end_line: Option<crate::SourceLocusEndLine>,
    /// endColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus/field/endColumn.
    #[serde(rename = "endColumn", skip_serializing_if = "Option::is_none")]
    pub end_column: Option<crate::SourceLocusEndColumn>,
}

/// The deserialization shape of `SourceLocus`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SourceLocusWire {
    #[serde(rename = "sourceIdentity")]
    source_identity: crate::SemanticId,
    path: crate::SemanticCoreSourceLocusPath,
    #[serde(rename = "startLine")]
    start_line: crate::SourceLocusStartLine,
    #[serde(rename = "startColumn")]
    start_column: crate::SourceLocusStartColumn,
    #[serde(rename = "endLine", default)]
    end_line: Option<crate::SourceLocusEndLine>,
    #[serde(rename = "endColumn", default)]
    end_column: Option<crate::SourceLocusEndColumn>,
}

impl SourceLocus {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        source_identity: crate::SemanticId,
        path: crate::SemanticCoreSourceLocusPath,
        start_line: crate::SourceLocusStartLine,
        start_column: crate::SourceLocusStartColumn,
        end_line: Option<crate::SourceLocusEndLine>,
        end_column: Option<crate::SourceLocusEndColumn>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            source_identity,
            path,
            start_line,
            start_column,
            end_line,
            end_column,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for SourceLocus {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = SourceLocusWire::deserialize(deserializer)?;
        Self::try_new(
            wire.source_identity,
            wire.path,
            wire.start_line,
            wire.start_column,
            wire.end_line,
            wire.end_column,
        )
        .map_err(serde::de::Error::custom)
    }
}
