// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The export mapping of
//! [FR-116](../../../spec/functional/FR-116-emit-producer-native-correspondence-records.md).
//!
//! [`ExportKind`] is the subset of the consumer's closed export-kind vocabulary
//! this producer actually emits, cited from the pinned consumer contract at
//! revision `72507f856457ba0922719bd5d9f5cadcce4058cd` and never minted here.
//! The `population` kind FR-120 partitions to the assessment side is **not a
//! variant at all** (E3, FND-1803, FND-1825), so a static export of that kind is
//! unrepresentable in the typed API rather than merely refused; FR-117 raises the
//! admission refusal for a wire document that offers one.
//!
//! No member of an export mapping is a consumer `u32` table index. The consumer
//! assigns `ProducerObject.interface`, `Correspondence.native`,
//! `Correspondence.relation`, `Correspondence.exports` and `Definition.requires`
//! when it assembles its own package, and this producer assigns none of them
//! (FR-116-CON-5, FND-1805, E2).

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::component::ComponentDeclaration;
use crate::endpoint::EndpointDeclaration;
use crate::locus::SourceLocus;
use crate::refusal::{Refusal, EXPORT_LOCUS_ABSENT, EXPORT_PATH_ABSENT, IDENTITY_ABSENT};
use crate::relationship::RelationshipDeclaration;
use crate::ConfigurationDocument;

/// The export kinds this producer emits, from the consumer's closed vocabulary.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExportKind {
    /// `component`
    Component,
    /// `endpoint`
    Endpoint,
    /// `enum`
    Enum,
    /// `field`
    Field,
    /// `object`
    Object,
    /// `operation`
    Operation,
    /// `record`
    Record,
    /// `reference`
    Reference,
    /// `relationship`
    Relationship,
    /// `scalar`
    Scalar,
    /// `variant`
    Variant,
}

impl ExportKind {
    /// Every export kind this producer emits.
    pub const EMITTED: [Self; 11] = [
        Self::Component,
        Self::Endpoint,
        Self::Enum,
        Self::Field,
        Self::Object,
        Self::Operation,
        Self::Record,
        Self::Reference,
        Self::Relationship,
        Self::Scalar,
        Self::Variant,
    ];

    /// The exact closed spelling the consumer's vocabulary declares.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Component => "component",
            Self::Endpoint => "endpoint",
            Self::Enum => "enum",
            Self::Field => "field",
            Self::Object => "object",
            Self::Operation => "operation",
            Self::Record => "record",
            Self::Reference => "reference",
            Self::Relationship => "relationship",
            Self::Scalar => "scalar",
            Self::Variant => "variant",
        }
    }
}

/// One export mapping, carried in the producer's own bundle document.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExportRecord {
    /// The export kind, from the consumer's closed vocabulary.
    pub kind: ExportKind,
    /// The exporting producer object identity.
    pub producer_object_identity: String,
    /// The exported component, endpoint, or relationship record identity.
    pub export_identity: String,
    /// The ordered export path segments the consumer addresses the export by.
    #[serde(default)]
    pub export_path: Vec<String>,
    /// The formal export locus the consumer's export record requires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locus: Option<SourceLocus>,
}

impl ExportRecord {
    /// Refuses an export mapping missing any member the consumer's record requires.
    pub fn validate(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        if self.producer_object_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "an export mapping names no exporting producer object identity",
            ));
        }
        if self.export_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!(
                    "an export mapping of {} names no exported identity",
                    self.producer_object_identity
                ),
            ));
        }
        if self.export_path.is_empty() || self.export_path.iter().any(String::is_empty) {
            return Err(Refusal::new(
                EXPORT_PATH_ABSENT,
                format!("{} carries no ordered export path", self.export_identity),
            ));
        }
        let Some(locus) = self.locus.as_ref() else {
            return Err(Refusal::new(
                EXPORT_LOCUS_ABSENT,
                format!("{} carries no formal export locus", self.export_identity),
            ));
        };
        locus.validate(&self.export_identity, configuration)
    }
}

/// The exported records declared in the producer's own bundle document.
///
/// This is the vocabulary an export mapping is resolved against: a component,
/// endpoint or relationship identity resolves against these declarations, and the
/// refusal names which one it resolved against (E8, FND-1809).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DeclaredExports {
    kinds: BTreeMap<String, ExportKind>,
}

impl DeclaredExports {
    /// Indexes every exported component, endpoint and relationship record.
    pub fn new(
        components: &[ComponentDeclaration],
        endpoints: &[EndpointDeclaration],
        relationships: &[RelationshipDeclaration],
    ) -> Self {
        let mut kinds = BTreeMap::new();
        for component in components {
            kinds.insert(component.component_identity.clone(), ExportKind::Component);
        }
        for endpoint in endpoints {
            kinds.insert(endpoint.endpoint_identity.clone(), ExportKind::Endpoint);
        }
        for relationship in relationships {
            kinds.insert(
                relationship.relationship_identity.clone(),
                ExportKind::Relationship,
            );
        }
        Self { kinds }
    }

    /// The declared kind of one exported identity, if it is declared at all.
    pub fn kind_of(&self, identity: &str) -> Option<ExportKind> {
        self.kinds.get(identity).copied()
    }

    /// Every declared exported identity.
    pub fn identities(&self) -> BTreeSet<&str> {
        self.kinds.keys().map(String::as_str).collect()
    }

    /// The number of exported records one export mapping each is owed for.
    pub fn len(&self) -> usize {
        self.kinds.len()
    }

    /// Whether any record is declared at all.
    pub fn is_empty(&self) -> bool {
        self.kinds.is_empty()
    }
}
