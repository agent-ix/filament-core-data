// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The first-class endpoint declaration of FR-114.
//!
//! An endpoint carries the same six authored members a component does and
//! additionally names its owning component identity, its type identity, its
//! authored role and its multiplicity. None of those four is reconstructed from
//! another: the role is not read off the type, the type is not read off the
//! component, and the multiplicity is not defaulted (FR-114-AC-1).
//!
//! An absent role and an absent multiplicity are representable states that
//! refuse, naming the offending record, rather than states a default fills in.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::inventory::{InventoryDeclaration, InventoryMemberKind, InventoryMembership};
use crate::locus::SourceLocus;
use crate::refusal::{
    Refusal, ENDPOINT_MULTIPLICITY_ABSENT, ENDPOINT_PROVENANCE_ABSENT,
    ENDPOINT_PROVENANCE_UNSUPPLIED, ENDPOINT_ROLE_ABSENT, IDENTITY_ABSENT,
};
use crate::revision::PRODUCER_REVISION_NAMESPACE;
use crate::{
    ConfigurationDocument, DigestSelection, Multiplicity, Revision, CANONICAL_JSON_DOMAIN,
    DIGEST_DOMAIN_VERSION,
};

/// One exported endpoint, declared as a first-class record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EndpointDeclaration {
    /// The authored endpoint identity.
    pub endpoint_identity: String,
    /// The endpoint's namespaced revision.
    pub endpoint_revision: Revision,
    /// The endpoint's canonical digest selection.
    pub digest: DigestSelection,
    /// The owning component identity, distinct from the endpoint identity.
    pub component_identity: String,
    /// The exported model type identity this endpoint names.
    pub type_identity: String,
    /// The authored endpoint role; an empty spelling is an absent role.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub role: String,
    /// The endpoint multiplicity; absence is representable and refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<Multiplicity>,
    /// The source provenance locus; absence is representable and refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_locus: Option<SourceLocus>,
    /// The explicit inventory membership.
    pub inventory_membership: InventoryMembership,
}

impl EndpointDeclaration {
    /// Refuses an endpoint record missing any of its authored members.
    pub fn validate(
        &self,
        configuration: &ConfigurationDocument,
        inventory: &InventoryDeclaration,
        declaration_sources: &BTreeSet<&str>,
    ) -> Result<(), Refusal> {
        if self.endpoint_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "an endpoint record declares no endpoint identity",
            ));
        }
        for (member, value) in [
            ("componentIdentity", &self.component_identity),
            ("typeIdentity", &self.type_identity),
        ] {
            if value.is_empty() {
                return Err(Refusal::new(
                    IDENTITY_ABSENT,
                    format!("{} declares no {member}", self.endpoint_identity),
                ));
            }
        }
        if self.role.is_empty() {
            return Err(Refusal::new(
                ENDPOINT_ROLE_ABSENT,
                format!("{} names no authored role", self.endpoint_identity),
            ));
        }
        let Some(multiplicity) = self.multiplicity.as_ref() else {
            return Err(Refusal::new(
                ENDPOINT_MULTIPLICITY_ABSENT,
                format!("{} names no multiplicity", self.endpoint_identity),
            ));
        };
        multiplicity.validate(&self.endpoint_identity)?;
        self.endpoint_revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.endpoint_revision.validate_selected(configuration)?;
        self.digest
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.digest.validate_selected(configuration)?;
        let Some(locus) = self.source_locus.as_ref() else {
            return Err(Refusal::new(
                ENDPOINT_PROVENANCE_ABSENT,
                format!(
                    "{} declares no source provenance locus",
                    self.endpoint_identity
                ),
            ));
        };
        locus.validate(&self.endpoint_identity, configuration)?;
        if !declaration_sources.contains(locus.source.identity.as_str()) {
            return Err(Refusal::new(
                ENDPOINT_PROVENANCE_UNSUPPLIED,
                format!(
                    "no declaration source document supplies {} for {}; no locus is synthesized",
                    locus.source.identity, self.endpoint_identity
                ),
            ));
        }
        inventory.validate_membership(
            &self.inventory_membership,
            InventoryMemberKind::Endpoint,
            &self.endpoint_identity,
        )
    }

    /// Indexes endpoint declarations by their authored identity.
    ///
    /// This is the vocabulary a relationship endpoint record joins against
    /// through its `endpointIdentity` (FND-1809, E8): the join is by identity and
    /// never by a coinciding type identity, role, or display name.
    pub fn index(endpoints: &[Self]) -> BTreeMap<&str, &Self> {
        endpoints
            .iter()
            .map(|endpoint| (endpoint.endpoint_identity.as_str(), endpoint))
            .collect()
    }
}
