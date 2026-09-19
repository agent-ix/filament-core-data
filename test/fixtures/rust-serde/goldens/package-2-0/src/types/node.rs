//! Node
//!
//! Semantic identity: ix://agent-ix/conformance/type/Node.

use serde::{Deserialize, Serialize};

/// The fields of `Node`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-id",
        name: "id",
        rust_name: "id",
        type_ref: "ix://agent-ix/conformance/type/Text",
        rust_type: "crate::Text",
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
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 5,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-label",
        name: "label",
        rust_name: "label",
        type_ref: "ix://agent-ix/conformance/type/Text",
        rust_type: "Option<crate::support::Nullable<crate::Text>>",
        row: "field:single/nullable/optional",
        presence: "optional",
        nullable: true,
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
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 6,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-elapsed",
        name: "elapsed",
        rust_name: "elapsed",
        type_ref: "ix://agent-ix/conformance/type/Millis",
        rust_type: "crate::Millis",
        row: "field:single/non-null/required",
        presence: "required",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 1,
            upper: Some(1),
            ordered: Some(false),
            unique: Some(false),
        },
        unit: Some("ms"),
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 7,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-status",
        name: "status",
        rust_name: "status",
        type_ref: "ix://agent-ix/conformance/type/Status",
        rust_type: "crate::Status",
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
        default_kind: "semantic",
        default_value: Some("\"draft\""),
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 8,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-children",
        name: "children",
        rust_name: "children",
        type_ref: "ix://agent-ix/conformance/type/NodeRef",
        rust_type: "Option<Vec<crate::NodeRef>>",
        row: "field:collection/non-null/optional",
        presence: "optional",
        nullable: false,
        multiplicity: crate::identity::MultiplicityMeta {
            lower: 0,
            upper: None,
            ordered: Some(true),
            unique: Some(true),
        },
        unit: None,
        default_kind: "none",
        default_value: None,
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 9,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-tags",
        name: "tags",
        rust_name: "tags",
        type_ref: "ix://agent-ix/conformance/type/TextList",
        rust_type: "Option<crate::TextList>",
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
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 10,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-attrs",
        name: "attrs",
        rust_name: "attrs",
        type_ref: "ix://agent-ix/conformance/type/TextMap",
        rust_type: "Option<crate::TextMap>",
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
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 11,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
    crate::identity::FieldMeta {
        identity: "ix://agent-ix/conformance/field/node-payload",
        name: "payload",
        rust_name: "payload",
        type_ref: "ix://agent-ix/conformance/type/Payload",
        rust_type: "Option<crate::Payload>",
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
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/node.tsp",
                start_line: 12,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
    },
];

fn default_status() -> crate::Status {
    crate::Status::Draft
}

/// Node
///
/// Semantic identity: ix://agent-ix/conformance/type/Node.
///
/// Roles: agent-ix:entity.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Node {
    /// node-id
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-id.
    pub id: crate::Text,
    /// node-label
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-label.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<crate::support::Nullable<crate::Text>>,
    /// node-elapsed
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-elapsed.
    ///
    /// Unit: ms.
    pub elapsed: crate::Millis,
    /// node-status
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-status.
    pub status: crate::Status,
    /// node-children
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-children.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<crate::NodeRef>>,
    /// node-tags
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-tags.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<crate::TextList>,
    /// node-attrs
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-attrs.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attrs: Option<crate::TextMap>,
    /// node-payload
    ///
    /// Semantic identity: ix://agent-ix/conformance/field/node-payload.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<crate::Payload>,
}

/// The deserialization shape of `Node`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NodeWire {
    id: crate::Text,
    #[serde(default, deserialize_with = "crate::support::present_or_absent")]
    label: Option<crate::support::Nullable<crate::Text>>,
    elapsed: crate::Millis,
    #[serde(default = "crate::types::node::default_status")]
    status: crate::Status,
    #[serde(default)]
    children: Option<Vec<crate::NodeRef>>,
    #[serde(default)]
    tags: Option<crate::TextList>,
    #[serde(default)]
    attrs: Option<crate::TextMap>,
    #[serde(default)]
    payload: Option<crate::Payload>,
}

impl Node {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        id: crate::Text,
        label: Option<crate::support::Nullable<crate::Text>>,
        elapsed: crate::Millis,
        status: crate::Status,
        children: Option<Vec<crate::NodeRef>>,
        tags: Option<crate::TextList>,
        attrs: Option<crate::TextMap>,
        payload: Option<crate::Payload>,
    ) -> Result<Self, crate::support::ValidationError> {
        if let Some(items) = &children {
            for left in 0..items.len() {
                for right in (left + 1)..items.len() {
                    if items[left] == items[right] {
                        return Err(crate::support::ValidationError::new(
                            "ix://agent-ix/conformance/field/node-children",
                            "multiplicity.unique",
                            "children",
                            "pairwise distinct items",
                        ));
                    }
                }
            }
        }
        Ok(Self {
            id,
            label,
            elapsed,
            status,
            children,
            tags,
            attrs,
            payload,
        })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for Node {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = NodeWire::deserialize(deserializer)?;
        Self::try_new(
            wire.id,
            wire.label,
            wire.elapsed,
            wire.status,
            wire.children,
            wire.tags,
            wire.attrs,
            wire.payload,
        )
        .map_err(serde::de::Error::custom)
    }
}
