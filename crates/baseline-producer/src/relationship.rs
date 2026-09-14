// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The complete first-class relationship record of
//! [FR-115](../../../spec/functional/FR-115-emit-complete-relationship-records.md).
//!
//! Three properties are obligations rather than conveniences.
//!
//! * The `source` and `target` endpoint records stay **independent members**
//!   even when both name one type identity (FR-115-CON-3). A self-relationship
//!   therefore emits two endpoint records, each retaining its own endpoint
//!   identity, role and multiplicity.
//! * Each endpoint record joins a **declared** FR-114 endpoint through its
//!   `endpointIdentity`, never through a coinciding type identity, role, or
//!   display name (FR-115-CON-5, D7, FND-1726). The vocabulary it resolves
//!   against is the bundle's declared endpoint records (E8, FND-1809), and the
//!   refusal names that vocabulary.
//! * A requested endpoint projection that cannot preserve both endpoints' roles
//!   and multiplicities refuses with a **named loss record** carrying the
//!   relationship identity. It never guesses a role or a multiplicity.
//!
//! A relationship record names no population member and no relationship
//! instance (FR-115-CON-2). That is a static-half obligation measured here
//! rather than deferred to the bundle: there is no member of these types that
//! could carry one.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::endpoint::EndpointDeclaration;
use crate::inventory::{InventoryDeclaration, InventoryMemberKind, InventoryMembership};
use crate::refusal::{
    Refusal, ENDPOINT_MULTIPLICITY_ABSENT, ENDPOINT_ROLE_ABSENT, ENDPOINT_TYPE_IDENTITY_DISAGREES,
    IDENTITY_ABSENT, RELATIONSHIP_ENDPOINT_PROJECTION_LOSS, RELATIONSHIP_ENDPOINT_UNKNOWN,
    RELATIONSHIP_MEMBER_ABSENT, RELATIONSHIP_OWNERSHIP_ABSENT,
};
use crate::revision::PRODUCER_REVISION_NAMESPACE;
use crate::{
    ConfigurationDocument, DigestSelection, Multiplicity, Revision, CANONICAL_JSON_DOMAIN,
    DIGEST_DOMAIN_VERSION,
};

/// The vocabulary an endpoint join resolves against, named in its refusal.
const DECLARED_ENDPOINT_VOCABULARY: &str = "the bundle's declared endpoint records";

/// One independently identified relationship endpoint record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationshipEndpoint {
    /// The declared endpoint identity this record joins through.
    pub endpoint_identity: String,
    /// The exported type identity.
    pub type_identity: String,
    /// The authored endpoint role; an empty spelling is an absent role.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub role: String,
    /// The endpoint multiplicity; absence is representable and refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<Multiplicity>,
}

impl RelationshipEndpoint {
    fn validate(
        &self,
        side: &str,
        relationship_identity: &str,
        endpoints: &BTreeMap<&str, &EndpointDeclaration>,
    ) -> Result<(), Refusal> {
        if self.endpoint_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!("{relationship_identity} {side} names no endpointIdentity"),
            ));
        }
        if self.type_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!("{relationship_identity} {side} names no typeIdentity"),
            ));
        }
        if self.role.is_empty() {
            return Err(Refusal::new(
                ENDPOINT_ROLE_ABSENT,
                format!("{relationship_identity} {side} omits its role"),
            ));
        }
        let Some(multiplicity) = self.multiplicity.as_ref() else {
            return Err(Refusal::new(
                ENDPOINT_MULTIPLICITY_ABSENT,
                format!("{relationship_identity} {side} omits its multiplicity"),
            ));
        };
        multiplicity.validate(&self.endpoint_identity)?;
        // The join is by `endpointIdentity` against a declared FR-114 endpoint,
        // and by nothing else: no coinciding type identity, role, or display
        // name resolves it.
        let Some(declared) = endpoints.get(self.endpoint_identity.as_str()) else {
            return Err(Refusal::new(
                RELATIONSHIP_ENDPOINT_UNKNOWN,
                format!(
                    "{relationship_identity} {side} endpointIdentity {} names no endpoint in {DECLARED_ENDPOINT_VOCABULARY}",
                    self.endpoint_identity
                ),
            ));
        };
        // The relationship side restates the type identity its joined endpoint
        // declares. A disagreement is refused rather than resolved in either
        // direction: the relationship side is not authority over the endpoint's
        // type, and the endpoint does not silently correct the relationship
        // (FR-127-CON-7). Without this the relationship could name a type that
        // is in no export vocabulary, owes no export mapping, and refuses
        // nothing.
        if declared.type_identity != self.type_identity {
            return Err(Refusal::new(
                ENDPOINT_TYPE_IDENTITY_DISAGREES,
                format!(
                    "{relationship_identity} {side} names typeIdentity {} but its joined endpoint {} declares {}",
                    self.type_identity, self.endpoint_identity, declared.type_identity
                ),
            ));
        }
        Ok(())
    }
}

/// The closed direction vocabulary of a relationship declaration.
///
/// # Operand order
///
/// A direction never permutes the declaration's members. [`source`] is always
/// the `source` member and [`target`] is always the `target` member, in every
/// variant. Direction states which *traversals* the relationship admits; it does
/// not restate which operand is which, and a consumer that swapped the two on
/// reading `TargetToSource` would be reading a different relationship.
///
/// The exact mapping, for a relationship declared `source = S`, `target = T`:
///
/// | Variant | Wire spelling | Admitted traversal | First argument | Second argument |
/// |---|---|---|---|---|
/// | [`SourceToTarget`] | `source-to-target` | `S -> T` only | `S` | `T` |
/// | [`TargetToSource`] | `target-to-source` | `T -> S` only | `S` | `T` |
/// | [`Bidirectional`] | `bidirectional` | `S -> T` and `T -> S` | `S` | `T` |
/// | [`Undirected`] | `undirected` | neither is oriented | `S` | `T` |
///
/// [`SourceToTarget`] and [`TargetToSource`] differ only in admitted traversal.
/// Both keep `S` as the first argument, so the pair is not a spelling of one
/// relationship authored two ways.
///
/// [`Bidirectional`] admits both traversals of one relationship.
/// [`Undirected`] admits neither: the relationship holds between `S` and `T`
/// without orientation, and a consumer must not manufacture one. The two are
/// distinct states and neither is the other's default.
///
/// An out-of-vocabulary direction is unrepresentable in this type rather than
/// merely refused by it, which is the same guarantee
/// [`ExportKind`](crate::ExportKind) gives for the assessment-side `population`
/// kind: no value of this type spells a direction the consumer cannot interpret.
///
/// [`source`]: RelationshipDeclaration::source
/// [`target`]: RelationshipDeclaration::target
/// [`SourceToTarget`]: RelationshipDirection::SourceToTarget
/// [`TargetToSource`]: RelationshipDirection::TargetToSource
/// [`Bidirectional`]: RelationshipDirection::Bidirectional
/// [`Undirected`]: RelationshipDirection::Undirected
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RelationshipDirection {
    /// Traversal runs from the `source` member to the `target` member only.
    SourceToTarget,
    /// Traversal runs from the `target` member to the `source` member only.
    TargetToSource,
    /// Both traversals are admitted.
    Bidirectional,
    /// Neither traversal is oriented; the relationship carries no direction.
    Undirected,
}

impl RelationshipDirection {
    /// Every admissible direction.
    pub const ADMITTED: [Self; 4] = [
        Self::SourceToTarget,
        Self::TargetToSource,
        Self::Bidirectional,
        Self::Undirected,
    ];

    /// The exact closed wire spelling.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::SourceToTarget => "source-to-target",
            Self::TargetToSource => "target-to-source",
            Self::Bidirectional => "bidirectional",
            Self::Undirected => "undirected",
        }
    }

    /// Whether traversal from the `source` member to the `target` member is admitted.
    pub const fn admits_source_to_target(self) -> bool {
        matches!(self, Self::SourceToTarget | Self::Bidirectional)
    }

    /// Whether traversal from the `target` member to the `source` member is admitted.
    pub const fn admits_target_to_source(self) -> bool {
        matches!(self, Self::TargetToSource | Self::Bidirectional)
    }

    /// Whether the relationship is oriented at all.
    ///
    /// [`Undirected`](Self::Undirected) is the only variant that is not, and it
    /// is an authored state rather than an absent one.
    pub const fn is_oriented(self) -> bool {
        !matches!(self, Self::Undirected)
    }
}

/// Explicit relationship category, direction, containment, lifecycle, and ownership.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationshipSemantics {
    /// Producer-defined relationship category.
    pub category: String,
    /// The relationship's direction, from the closed admissible vocabulary.
    ///
    /// See [`RelationshipDirection`] for the exact mapping of each variant to
    /// the `source`/`target` operand order; no variant permutes the two.
    pub direction: RelationshipDirection,
    /// Whether the relationship forms the composite graph.
    pub composite: bool,
    /// Declared lifecycle semantics.
    pub lifecycle: String,
    /// Declared ownership semantics.
    pub ownership: String,
}

/// The declaring ownership triple of one relationship record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationshipOwnership {
    /// The owning model identity.
    pub model_identity: String,
    /// The owning profile identity.
    pub profile_identity: String,
    /// The owning configuration identity.
    pub configuration_identity: String,
}

/// A first-class relationship declaration; it is never inferred from a field.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationshipDeclaration {
    /// The authored stable relationship identity.
    pub relationship_identity: String,
    /// The authored relationship name.
    pub relationship_name: String,
    /// The relationship's namespaced revision; absence refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub relationship_revision: Option<Revision>,
    /// The relationship's canonical digest selection; absence refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub digest: Option<DigestSelection>,
    /// The independently identified source endpoint record.
    pub source: RelationshipEndpoint,
    /// The independently identified target endpoint record.
    pub target: RelationshipEndpoint,
    /// Explicit semantics.
    pub semantics: RelationshipSemantics,
    /// The declaring model, profile and configuration identities; absence refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ownership: Option<RelationshipOwnership>,
    /// The explicit inventory membership; absence refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inventory_membership: Option<InventoryMembership>,
}

impl RelationshipDeclaration {
    /// Refuses a relationship record missing any authored member or join.
    pub fn validate(
        &self,
        configuration: &ConfigurationDocument,
        inventory: &InventoryDeclaration,
        endpoints: &BTreeMap<&str, &EndpointDeclaration>,
    ) -> Result<(), Refusal> {
        if self.relationship_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "a relationship record declares no relationship identity",
            ));
        }
        if self.relationship_name.is_empty() {
            return Err(Refusal::new(
                RELATIONSHIP_MEMBER_ABSENT,
                format!(
                    "{} declares no relationshipName",
                    self.relationship_identity
                ),
            ));
        }
        let Some(revision) = self.relationship_revision.as_ref() else {
            return Err(Refusal::new(
                RELATIONSHIP_MEMBER_ABSENT,
                format!(
                    "{} declares no namespaced relationship revision",
                    self.relationship_identity
                ),
            ));
        };
        revision.validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        revision.validate_selected(configuration)?;
        let Some(digest) = self.digest.as_ref() else {
            return Err(Refusal::new(
                RELATIONSHIP_MEMBER_ABSENT,
                format!(
                    "{} declares no canonical digest selection",
                    self.relationship_identity
                ),
            ));
        };
        digest.validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        digest.validate_selected(configuration)?;
        self.source
            .validate("source", &self.relationship_identity, endpoints)?;
        self.target
            .validate("target", &self.relationship_identity, endpoints)?;
        let Some(ownership) = self.ownership.as_ref() else {
            return Err(Refusal::new(
                RELATIONSHIP_OWNERSHIP_ABSENT,
                format!(
                    "{} names no owning model, profile and configuration identities",
                    self.relationship_identity
                ),
            ));
        };
        for (member, value) in [
            ("modelIdentity", &ownership.model_identity),
            ("profileIdentity", &ownership.profile_identity),
            ("configurationIdentity", &ownership.configuration_identity),
        ] {
            if value.is_empty() {
                return Err(Refusal::new(
                    RELATIONSHIP_OWNERSHIP_ABSENT,
                    format!("{} names no owning {member}", self.relationship_identity),
                ));
            }
        }
        let Some(membership) = self.inventory_membership.as_ref() else {
            return Err(Refusal::new(
                RELATIONSHIP_MEMBER_ABSENT,
                format!(
                    "{} declares no inventory membership",
                    self.relationship_identity
                ),
            ));
        };
        inventory.validate_membership(
            membership,
            InventoryMemberKind::Relationship,
            &self.relationship_identity,
        )
    }

    /// Projects the two endpoint records onto one requested endpoint shape.
    ///
    /// The projection is fallible on purpose. A requested shape that would
    /// collapse the two endpoints' roles or multiplicities into one value
    /// refuses, carrying a named loss record with the relationship identity and
    /// both authored values, rather than guessing either (FR-115-AC-3).
    pub fn project_endpoints(
        &self,
        requested: &RequestedEndpointProjection,
    ) -> Result<RelationshipEndpoint, Box<EndpointProjectionLoss>> {
        let loss = |detail: String| {
            Box::new(EndpointProjectionLoss {
                relationship_identity: self.relationship_identity.clone(),
                source_role: self.source.role.clone(),
                target_role: self.target.role.clone(),
                source_multiplicity: self.source.multiplicity.clone(),
                target_multiplicity: self.target.multiplicity.clone(),
                refusal: Refusal::new(RELATIONSHIP_ENDPOINT_PROJECTION_LOSS, detail),
            })
        };
        if self.source.role != self.target.role {
            return Err(loss(format!(
                "{} cannot project roles {} and {} onto the requested single role {}",
                self.relationship_identity, self.source.role, self.target.role, requested.role
            )));
        }
        if requested.role != self.source.role {
            return Err(loss(format!(
                "{} cannot project role {} onto the requested single role {}",
                self.relationship_identity, self.source.role, requested.role
            )));
        }
        if self.source.multiplicity != self.target.multiplicity
            || requested.multiplicity != self.source.multiplicity
        {
            return Err(loss(format!(
                "{} cannot project its two multiplicities onto the requested single multiplicity",
                self.relationship_identity
            )));
        }
        Ok(RelationshipEndpoint {
            endpoint_identity: requested.endpoint_identity.clone(),
            type_identity: self.source.type_identity.clone(),
            role: requested.role.clone(),
            multiplicity: requested.multiplicity.clone(),
        })
    }

    /// Indexes relationship declarations by their authored identity.
    pub fn index(relationships: &[Self]) -> BTreeMap<&str, &Self> {
        relationships
            .iter()
            .map(|relationship| (relationship.relationship_identity.as_str(), relationship))
            .collect()
    }

    /// The declared endpoint identities both endpoint records join through.
    pub fn joined_endpoint_identities(&self) -> BTreeSet<&str> {
        BTreeSet::from([
            self.source.endpoint_identity.as_str(),
            self.target.endpoint_identity.as_str(),
        ])
    }
}

/// The single endpoint shape a caller asks the producer to emit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestedEndpointProjection {
    /// The endpoint identity the requested single record would carry.
    pub endpoint_identity: String,
    /// The single role the request asks for.
    pub role: String,
    /// The single multiplicity the request asks for.
    pub multiplicity: Option<Multiplicity>,
}

/// The named loss record a refused endpoint projection emits.
///
/// It carries the relationship identity and both authored roles and
/// multiplicities, so the caller reads what would have been lost rather than a
/// guessed replacement.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EndpointProjectionLoss {
    /// The relationship whose projection was refused.
    pub relationship_identity: String,
    /// The authored source role.
    pub source_role: String,
    /// The authored target role.
    pub target_role: String,
    /// The authored source multiplicity.
    pub source_multiplicity: Option<Multiplicity>,
    /// The authored target multiplicity.
    pub target_multiplicity: Option<Multiplicity>,
    /// The blocking refusal this loss record carries.
    pub refusal: Refusal,
}

impl std::fmt::Display for EndpointProjectionLoss {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "{}: {} retains source role {} and target role {}",
            self.refusal, self.relationship_identity, self.source_role, self.target_role
        )
    }
}

impl std::error::Error for EndpointProjectionLoss {}
