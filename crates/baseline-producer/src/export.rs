// SPDX-License-Identifier: AGPL-3.0-or-later
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
use crate::refusal::{
    Refusal, ENDPOINT_TYPE_EXPORT_KIND_FOREIGN, EXPORT_FOREIGN, EXPORT_LOCUS_ABSENT,
    EXPORT_PATH_ABSENT, IDENTITY_ABSENT, IDENTITY_KIND_AMBIGUOUS,
};
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

    /// The kinds that name a native type rather than a member or a record.
    ///
    /// An endpoint's `typeIdentity` resolves to an export of one of these kinds
    /// and no other (FR-114-CON-7). `Component`, `Endpoint` and `Relationship`
    /// name producer records; `Field` and `Operation` name members of a type,
    /// not a type. The assessment-side `population` kind is not a variant of
    /// this vocabulary at all, so it cannot appear here or anywhere else.
    pub const TYPE_KINDS: [Self; 6] = [
        Self::Enum,
        Self::Object,
        Self::Record,
        Self::Reference,
        Self::Scalar,
        Self::Variant,
    ];

    /// Whether this kind names a native type an endpoint may resolve to.
    pub const fn is_type(self) -> bool {
        matches!(
            self,
            Self::Enum
                | Self::Object
                | Self::Record
                | Self::Reference
                | Self::Scalar
                | Self::Variant
        )
    }

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

/// What one declared identity admits as its export mapping's kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Admits {
    /// A producer record, admitting exactly the one kind it is declared as.
    Record(ExportKind),
    /// An endpoint's named model type, admitting any of [`ExportKind::TYPE_KINDS`].
    ///
    /// The kind is open across that closed subset because the *native* artifact
    /// decides whether a type is an object, a record, a scalar and so on. The
    /// producer does not pre-empt that decision, and the consumer does not
    /// recover it by parsing export-path segments (FR-114-CON-7).
    Type,
}

/// The exported records and model types declared in the producer's own bundle.
///
/// This is the vocabulary an export mapping is resolved against: a component,
/// endpoint or relationship identity resolves against these declarations, and the
/// refusal names which one it resolved against (E8, FND-1809). Every endpoint's
/// `typeIdentity` is declared here too, so a type that no export mapping resolves
/// is a named refusal rather than a path the consumer is left to parse.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DeclaredExports {
    declared: BTreeMap<String, Admits>,
}

impl DeclaredExports {
    /// Indexes every exported record and every endpoint's named model type.
    ///
    /// A type identity that coincides with a declared record identity keeps the
    /// record's exact-kind admission: the record is the more specific
    /// declaration, and nothing here mints a second entry for it.
    pub fn new(
        components: &[ComponentDeclaration],
        endpoints: &[EndpointDeclaration],
        relationships: &[RelationshipDeclaration],
    ) -> Self {
        let mut declared = BTreeMap::new();
        for component in components {
            declared.insert(
                component.component_identity.clone(),
                Admits::Record(ExportKind::Component),
            );
        }
        for endpoint in endpoints {
            declared.insert(
                endpoint.endpoint_identity.clone(),
                Admits::Record(ExportKind::Endpoint),
            );
        }
        for relationship in relationships {
            declared.insert(
                relationship.relationship_identity.clone(),
                Admits::Record(ExportKind::Relationship),
            );
        }
        for endpoint in endpoints {
            declared
                .entry(endpoint.type_identity.clone())
                .or_insert(Admits::Type);
        }
        Self { declared }
    }

    /// Refuses an identity declared both as a producer record and as a model type.
    ///
    /// The two admissions are mutually exclusive: a record admits exactly its own
    /// kind, a model type admits any type kind, and no single export mapping
    /// satisfies both. Keeping the record admission silently would leave an
    /// admitted endpoint whose model type resolves to no type export at all, so
    /// the collision is named instead (FR-127-CON-8).
    pub fn validate_no_kind_collision(
        &self,
        endpoints: &[EndpointDeclaration],
    ) -> Result<(), Refusal> {
        for endpoint in endpoints {
            if matches!(
                self.declared.get(&endpoint.type_identity),
                Some(Admits::Record(_))
            ) {
                return Err(Refusal::new(
                    IDENTITY_KIND_AMBIGUOUS,
                    format!(
                        "{} is declared as a producer record and is also named as the model type of endpoint {}; one identity cannot admit both",
                        endpoint.type_identity, endpoint.endpoint_identity
                    ),
                ));
            }
        }
        Ok(())
    }

    /// The declared kind of one exported *record*, if it is declared as one.
    ///
    /// A declared model type returns `None`: its kind is the native artifact's
    /// to state, not the producer's, so there is no single kind to return.
    /// Use [`Self::is_declared_type`] to tell an undeclared identity from a type.
    pub fn kind_of(&self, identity: &str) -> Option<ExportKind> {
        match self.declared.get(identity) {
            Some(Admits::Record(kind)) => Some(*kind),
            Some(Admits::Type) | None => None,
        }
    }

    /// Whether this identity is declared as an endpoint's named model type.
    pub fn is_declared_type(&self, identity: &str) -> bool {
        matches!(self.declared.get(identity), Some(Admits::Type))
    }

    /// Whether this identity is declared at all, as a record or as a type.
    pub fn is_declared(&self, identity: &str) -> bool {
        self.declared.contains_key(identity)
    }

    /// Every declared identity, records and model types alike.
    pub fn identities(&self) -> BTreeSet<&str> {
        self.declared.keys().map(String::as_str).collect()
    }

    /// The number of declarations one export mapping each is owed for.
    pub fn len(&self) -> usize {
        self.declared.len()
    }

    /// Whether any record or type is declared at all.
    pub fn is_empty(&self) -> bool {
        self.declared.is_empty()
    }

    /// Refuses an export mapping whose kind the declared identity does not admit.
    ///
    /// A record admits exactly its declared kind. A model type admits any of
    /// [`ExportKind::TYPE_KINDS`] and refuses every other, so an endpoint can
    /// never resolve to a `field`, an `operation` or another producer record.
    pub fn validate_kind(&self, identity: &str, offered: ExportKind) -> Result<(), Refusal> {
        match self.declared.get(identity) {
            None => Err(Refusal::new(
                EXPORT_FOREIGN,
                format!(
                    "{identity} names no component, endpoint, relationship or endpoint model type declared in the producer's own bundle document"
                ),
            )),
            Some(Admits::Record(declared)) if *declared != offered => Err(Refusal::new(
                EXPORT_FOREIGN,
                format!(
                    "{identity} is declared as {} but its export mapping carries {}",
                    declared.as_str(),
                    offered.as_str()
                ),
            )),
            Some(Admits::Record(_)) => Ok(()),
            Some(Admits::Type) if !offered.is_type() => Err(Refusal::new(
                ENDPOINT_TYPE_EXPORT_KIND_FOREIGN,
                format!(
                    "{identity} is a declared endpoint model type, so its export mapping cannot carry {}; the admissible kinds are {}",
                    offered.as_str(),
                    ExportKind::TYPE_KINDS
                        .iter()
                        .map(|kind| kind.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                ),
            )),
            Some(Admits::Type) => Ok(()),
        }
    }
}
