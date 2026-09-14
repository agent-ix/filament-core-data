//! FieldDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl.

use serde::{Deserialize, Serialize};

/// The fields of `FieldDecl`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/name",
        name: "name",
        rust_name: "name",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/type",
        name: "type",
        rust_name: "r#type",
        type_ref: "ix://agent-ix/semantic-core/type/TypeRef",
        rust_type: "crate::TypeRef",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/identity",
        name: "identity",
        rust_name: "identity",
        type_ref: "ix://agent-ix/semantic-core/type/FieldDeclIdentity",
        rust_type: "Option<crate::FieldDeclIdentity>",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/nullable",
        name: "nullable",
        rust_name: "nullable",
        type_ref: "ix://agent-ix/semantic-core/type/FieldDeclNullable",
        rust_type: "Option<crate::FieldDeclNullable>",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/default",
        name: "default",
        rust_name: "default",
        type_ref: "ix://agent-ix/semantic-core/type/DefaultDecl",
        rust_type: "Option<crate::DefaultDecl>",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/doc",
        name: "doc",
        rust_name: "doc",
        type_ref: "ix://agent-ix/semantic-core/type/FieldDeclDoc",
        rust_type: "Option<crate::FieldDeclDoc>",
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
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/FieldDecl/field/constraints",
        name: "constraints",
        rust_name: "constraints",
        type_ref: "ix://agent-ix/semantic-core/type/ConstraintDecl",
        rust_type: "Option<Vec<crate::ConstraintDecl>>",
        row: "field:collection/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: None,
            ordered: None,
            unique: None,
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/FieldDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// FieldDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct FieldDecl {
    /// name
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/name.
    pub name: crate::Identifier,
    /// type
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/type.
    pub r#type: crate::TypeRef,
    /// identity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/identity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity: Option<crate::FieldDeclIdentity>,
    /// nullable
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/nullable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullable: Option<crate::FieldDeclNullable>,
    /// default
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/default.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<crate::DefaultDecl>,
    /// doc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/doc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc: Option<crate::FieldDeclDoc>,
    /// constraints
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl/field/constraints.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constraints: Option<Vec<crate::ConstraintDecl>>,
}

/// The deserialization shape of `FieldDecl`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct FieldDeclWire {
    name: crate::Identifier,
    r#type: crate::TypeRef,
    #[serde(default)]
    identity: Option<crate::FieldDeclIdentity>,
    #[serde(default)]
    nullable: Option<crate::FieldDeclNullable>,
    #[serde(default)]
    default: Option<crate::DefaultDecl>,
    #[serde(default)]
    doc: Option<crate::FieldDeclDoc>,
    #[serde(default)]
    constraints: Option<Vec<crate::ConstraintDecl>>,
}

impl FieldDecl {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        name: crate::Identifier,
        r#type: crate::TypeRef,
        identity: Option<crate::FieldDeclIdentity>,
        nullable: Option<crate::FieldDeclNullable>,
        default: Option<crate::DefaultDecl>,
        doc: Option<crate::FieldDeclDoc>,
        constraints: Option<Vec<crate::ConstraintDecl>>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            name,
            r#type,
            identity,
            nullable,
            default,
            doc,
            constraints,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for FieldDecl {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = FieldDeclWire::deserialize(deserializer)?;
        Self::try_new(
            wire.name,
            wire.r#type,
            wire.identity,
            wire.nullable,
            wire.default,
            wire.doc,
            wire.constraints,
        )
        .map_err(serde::de::Error::custom)
    }
}
