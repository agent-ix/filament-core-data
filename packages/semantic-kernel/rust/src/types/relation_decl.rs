//! RelationDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl.

use serde::{Deserialize, Serialize};

/// The fields of `RelationDecl`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/RelationDecl/field/verb",
        name: "verb",
        rust_name: "verb",
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
                path: "packages/semantic-core/generated/json-schema/RelationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/RelationDecl/field/category",
        name: "category",
        rust_name: "category",
        type_ref: "ix://agent-ix/semantic-core/type/EdgeCategory",
        rust_type: "crate::EdgeCategory",
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
                path: "packages/semantic-core/generated/json-schema/RelationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/RelationDecl/field/composite",
        name: "composite",
        rust_name: "composite",
        type_ref: "ix://agent-ix/semantic-core/type/RelationDeclComposite",
        rust_type: "Option<crate::RelationDeclComposite>",
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
                path: "packages/semantic-core/generated/json-schema/RelationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/RelationDecl/field/target",
        name: "target",
        rust_name: "target",
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
                path: "packages/semantic-core/generated/json-schema/RelationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/RelationDecl/field/multiplicity",
        name: "multiplicity",
        rust_name: "multiplicity",
        type_ref: "ix://agent-ix/semantic-core/type/Multiplicity",
        rust_type: "Option<crate::Multiplicity>",
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
                path: "packages/semantic-core/generated/json-schema/RelationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// RelationDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct RelationDecl {
    /// verb
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl/field/verb.
    pub verb: crate::Identifier,
    /// category
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl/field/category.
    pub category: crate::EdgeCategory,
    /// composite
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl/field/composite.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub composite: Option<crate::RelationDeclComposite>,
    /// target
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl/field/target.
    pub target: crate::SemanticId,
    /// multiplicity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl/field/multiplicity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<crate::Multiplicity>,
}

/// The deserialization shape of `RelationDecl`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RelationDeclWire {
    verb: crate::Identifier,
    category: crate::EdgeCategory,
    #[serde(default)]
    composite: Option<crate::RelationDeclComposite>,
    target: crate::SemanticId,
    #[serde(default)]
    multiplicity: Option<crate::Multiplicity>,
}

impl RelationDecl {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        verb: crate::Identifier,
        category: crate::EdgeCategory,
        composite: Option<crate::RelationDeclComposite>,
        target: crate::SemanticId,
        multiplicity: Option<crate::Multiplicity>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            verb,
            category,
            composite,
            target,
            multiplicity,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for RelationDecl {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = RelationDeclWire::deserialize(deserializer)?;
        Self::try_new(
            wire.verb,
            wire.category,
            wire.composite,
            wire.target,
            wire.multiplicity,
        )
        .map_err(serde::de::Error::custom)
    }
}
