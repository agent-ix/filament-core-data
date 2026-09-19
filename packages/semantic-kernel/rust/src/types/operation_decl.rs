//! OperationDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl.

use serde::{Deserialize, Serialize};

/// The fields of `OperationDecl`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/OperationDecl/field/name",
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
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/OperationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/OperationDecl/field/params",
        name: "params",
        rust_name: "params",
        type_ref: "ix://agent-ix/semantic-core/type/FieldDecl",
        rust_type: "Option<Vec<crate::FieldDecl>>",
        row: "field:collection/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: None,
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/OperationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/OperationDecl/field/returns",
        name: "returns",
        rust_name: "returns",
        type_ref: "ix://agent-ix/semantic-core/type/TypeRef",
        rust_type: "Option<crate::TypeRef>",
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
                path: "packages/semantic-core/generated/json-schema/OperationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/OperationDecl/field/pre",
        name: "pre",
        rust_name: "pre",
        type_ref: "ix://agent-ix/semantic-core/type/ClauseRef",
        rust_type: "Option<Vec<crate::ClauseRef>>",
        row: "field:collection/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: None,
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/OperationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/semantic-core/type/OperationDecl/field/post",
        name: "post",
        rust_name: "post",
        type_ref: "ix://agent-ix/semantic-core/type/ClauseRef",
        rust_type: "Option<Vec<crate::ClauseRef>>",
        row: "field:collection/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: None,
            ordered: Some(false),
            unique: Some(false),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/semantic-core",
                path: "packages/semantic-core/generated/json-schema/OperationDecl.json",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

/// OperationDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct OperationDecl {
    /// name
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl/field/name.
    pub name: crate::Identifier,
    /// params
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl/field/params.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Vec<crate::FieldDecl>>,
    /// returns
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl/field/returns.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub returns: Option<crate::TypeRef>,
    /// pre
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl/field/pre.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pre: Option<Vec<crate::ClauseRef>>,
    /// post
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl/field/post.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post: Option<Vec<crate::ClauseRef>>,
}

/// The deserialization shape of `OperationDecl`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct OperationDeclWire {
    name: crate::Identifier,
    #[serde(default)]
    params: Option<Vec<crate::FieldDecl>>,
    #[serde(default)]
    returns: Option<crate::TypeRef>,
    #[serde(default)]
    pre: Option<Vec<crate::ClauseRef>>,
    #[serde(default)]
    post: Option<Vec<crate::ClauseRef>>,
}

impl OperationDecl {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        name: crate::Identifier,
        params: Option<Vec<crate::FieldDecl>>,
        returns: Option<crate::TypeRef>,
        pre: Option<Vec<crate::ClauseRef>>,
        post: Option<Vec<crate::ClauseRef>>,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self {
            name,
            params,
            returns,
            pre,
            post,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for OperationDecl {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = OperationDeclWire::deserialize(deserializer)?;
        Self::try_new(wire.name, wire.params, wire.returns, wire.pre, wire.post)
            .map_err(serde::de::Error::custom)
    }
}
