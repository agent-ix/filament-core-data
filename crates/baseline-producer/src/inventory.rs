// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! Inventory membership, as FR-114 carries it.
//!
//! Inventory **closure** and the explicitly incomplete inventory's retained
//! `unknown` disposition belong to
//! [FR-110](../../../spec/functional/FR-110-lock-ecosystem-inventory-and-bindings.md),
//! not here (FR-114-CON-6, FND-1762, FND-1830, D20). This module carries a
//! declared member's membership and raises the closed-inventory refusal; it
//! declares no closure of its own and mints no second `unknown`. The
//! completeness a membership carries is read from the FR-110 declaration, and a
//! membership carrying a completeness the declaration does not declare refuses.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::refusal::{
    Refusal, IDENTITY_ABSENT, INVENTORY_INCOMPLETE_UNKNOWN, INVENTORY_MEMBER_UNLISTED,
};

/// The completeness boundary FR-110 declares for one inventory.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InventoryCompleteness {
    /// The inventory declares its selection complete; an unlisted member refuses.
    Complete,
    /// The inventory declares itself explicitly incomplete and retains `unknown`.
    Incomplete,
}

impl InventoryCompleteness {
    /// The disposition FR-110 declares for this completeness boundary.
    ///
    /// The `unknown` spelling is FR-110's, retained rather than minted here.
    pub fn disposition(self) -> &'static str {
        match self {
            Self::Complete => "complete",
            Self::Incomplete => "unknown",
        }
    }
}

/// The kind of declared record an inventory admits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InventoryMemberKind {
    /// A declared component record.
    Component,
    /// A declared endpoint record.
    Endpoint,
    /// A declared relationship record.
    Relationship,
}

/// One declared record's explicit inventory membership.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InventoryMembership {
    /// The inventory identity that admits this record.
    pub inventory_identity: String,
    /// The completeness member, carrying FR-110's declared disposition.
    pub completeness: InventoryCompleteness,
}

impl InventoryMembership {
    /// Declares one membership under an inventory's declared completeness.
    pub fn new(inventory_identity: impl Into<String>, completeness: InventoryCompleteness) -> Self {
        Self {
            inventory_identity: inventory_identity.into(),
            completeness,
        }
    }
}

/// The FR-110 inventory declaration this bundle reads.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InventoryDeclaration {
    /// The inventory identity.
    pub inventory_identity: String,
    /// The declared completeness boundary FR-110 owns.
    pub completeness: InventoryCompleteness,
    /// Every admitted component identity.
    #[serde(default)]
    pub component_identities: BTreeSet<String>,
    /// Every admitted endpoint identity.
    #[serde(default)]
    pub endpoint_identities: BTreeSet<String>,
    /// Every admitted relationship identity.
    #[serde(default)]
    pub relationship_identities: BTreeSet<String>,
}

impl InventoryDeclaration {
    /// Refuses a membership the declaration does not admit.
    ///
    /// A member outside a **closed** inventory refuses. Under an explicitly
    /// incomplete inventory an unlisted member is admitted instead, carrying the
    /// completeness member with the retained `unknown` disposition FR-110
    /// declares (FR-114-AC-3).
    pub fn validate_membership(
        &self,
        membership: &InventoryMembership,
        kind: InventoryMemberKind,
        identity: &str,
    ) -> Result<(), Refusal> {
        if self.inventory_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "the inventory declaration names no inventory identity",
            ));
        }
        if membership.inventory_identity != self.inventory_identity {
            return Err(Refusal::new(
                INVENTORY_MEMBER_UNLISTED,
                format!(
                    "{identity} claims inventory {} but the declared inventory is {}",
                    membership.inventory_identity, self.inventory_identity
                ),
            ));
        }
        if membership.completeness != self.completeness {
            return Err(Refusal::new(
                INVENTORY_INCOMPLETE_UNKNOWN,
                format!(
                    "{identity} carries the {} disposition while inventory {} declares {}",
                    membership.completeness.disposition(),
                    self.inventory_identity,
                    self.completeness.disposition()
                ),
            ));
        }
        if self.completeness == InventoryCompleteness::Incomplete {
            return Ok(());
        }
        let listed = match kind {
            InventoryMemberKind::Component => &self.component_identities,
            InventoryMemberKind::Endpoint => &self.endpoint_identities,
            InventoryMemberKind::Relationship => &self.relationship_identities,
        };
        if !listed.contains(identity) {
            return Err(Refusal::new(
                INVENTORY_MEMBER_UNLISTED,
                format!(
                    "{identity} lies outside the closed declared inventory {}",
                    self.inventory_identity
                ),
            ));
        }
        Ok(())
    }
}
