// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The first-class component declaration of FR-114.
//!
//! Six members are separately authored and equal spelling never merges them:
//! identity, namespaced revision, canonical digest selection, source locus,
//! ownership and inventory membership (FR-114-CON-3). A repository identity, a
//! component identity, a role identity and an endpoint identity stay four
//! distinct identities even when their display names coincide (FR-114-CON-1),
//! which is a consequence of their being four members rather than an assertion.
//!
//! No component identity is reconstructed from a path, a package name or a
//! deployment name (FR-114-CON-2). There is no constructor here that takes one:
//! the identity is an authored member and the locus path is a separate member of
//! the locus.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::inventory::{InventoryDeclaration, InventoryMemberKind, InventoryMembership};
use crate::locus::SourceLocus;
use crate::refusal::{
    Refusal, COMPONENT_PROVENANCE_ABSENT, COMPONENT_PROVENANCE_UNSUPPLIED, IDENTITY_ABSENT,
};
use crate::revision::PRODUCER_REVISION_NAMESPACE;
use crate::{
    ConfigurationDocument, DigestSelection, Revision, CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION,
};

/// One exported component, declared as a first-class record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComponentDeclaration {
    /// The authored component identity.
    pub component_identity: String,
    /// The component's namespaced revision.
    pub component_revision: Revision,
    /// The component's canonical digest selection.
    pub digest: DigestSelection,
    /// The owning repository identity, distinct from the component identity.
    pub repository_identity: String,
    /// The owning repository's namespaced revision.
    pub repository_revision: Revision,
    /// The owning role identities, distinct from the component identity.
    #[serde(default)]
    pub role_identities: BTreeSet<String>,
    /// The owning model type identity.
    pub owning_type_identity: String,
    /// The source provenance locus; absence is representable and refuses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_locus: Option<SourceLocus>,
    /// The explicit inventory membership.
    pub inventory_membership: InventoryMembership,
}

impl ComponentDeclaration {
    /// Refuses a component record missing any of its six authored members.
    pub fn validate(
        &self,
        configuration: &ConfigurationDocument,
        inventory: &InventoryDeclaration,
        declaration_sources: &BTreeSet<&str>,
    ) -> Result<(), Refusal> {
        if self.component_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "a component record declares no component identity",
            ));
        }
        for (member, value) in [
            ("repositoryIdentity", &self.repository_identity),
            ("owningTypeIdentity", &self.owning_type_identity),
        ] {
            if value.is_empty() {
                return Err(Refusal::new(
                    IDENTITY_ABSENT,
                    format!("{} declares no {member}", self.component_identity),
                ));
            }
        }
        if self.role_identities.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!("{} names no owning role identity", self.component_identity),
            ));
        }
        self.component_revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.component_revision.validate_selected(configuration)?;
        self.repository_revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.repository_revision.validate_selected(configuration)?;
        self.digest
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.digest.validate_selected(configuration)?;
        let Some(locus) = self.source_locus.as_ref() else {
            return Err(Refusal::new(
                COMPONENT_PROVENANCE_ABSENT,
                format!(
                    "{} declares no source provenance locus",
                    self.component_identity
                ),
            ));
        };
        locus.validate(&self.component_identity, configuration)?;
        if !declaration_sources.contains(locus.source.identity.as_str()) {
            return Err(Refusal::new(
                COMPONENT_PROVENANCE_UNSUPPLIED,
                format!(
                    "no declaration source document supplies {} for {}; no locus is synthesized",
                    locus.source.identity, self.component_identity
                ),
            ));
        }
        inventory.validate_membership(
            &self.inventory_membership,
            InventoryMemberKind::Component,
            &self.component_identity,
        )
    }

    /// Indexes component declarations by their authored identity.
    pub fn index(components: &[Self]) -> BTreeMap<&str, &Self> {
        components
            .iter()
            .map(|component| (component.component_identity.as_str(), component))
            .collect()
    }
}
