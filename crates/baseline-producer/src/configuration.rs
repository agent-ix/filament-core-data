// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The FR-109 configuration document and its declared finite resource limits.
//!
//! The static bundle consumes only this document's static members
//! (FR-117-CON-4): its identity, its interface version, its digest, its declared
//! digest and revision selections, and its resource limits. Nothing here reaches
//! an FR-108 population obligation.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::canonical::NumericResourceLimit;
use crate::digest::{DigestDomainSelection, DigestSelection};

/// Static producer configuration, separated from assessment inputs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConfigurationDocument {
    /// Stable configuration identity.
    pub configuration_identity: String,
    /// Must be exactly `1.2.0`.
    pub baseline_version: String,
    /// Canonical digest of this document with this member omitted.
    pub digest: DigestSelection,
    /// Model-authority identity.
    pub model_authority: String,
    /// Explicit profiles.
    pub profile_identities: BTreeSet<String>,
    /// Explicit adapters.
    pub adapter_identities: BTreeSet<String>,
    /// Explicit mapping targets.
    pub mapping_targets: BTreeSet<String>,
    /// Producer-declared loss/refusal policy identity.
    pub loss_policy: String,
    /// Finite resource limits, declared and never taken from the host.
    pub resource_limits: ResourceLimits,
    /// The digest domain/version pairs this configuration selects (FR-112-CON-5).
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub digest_selections: BTreeSet<DigestDomainSelection>,
    /// The revision namespaces this configuration declares (FR-113-CON-5).
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub revision_namespaces: BTreeSet<String>,
    /// Trusted references by stable identity.
    pub trusted_references: BTreeSet<String>,
}

/// The configuration document's declared finite resource limits.
///
/// One spelling across the interface: `resourceLimits`, with
/// `numericResourceLimit` inside it, which FR-109 owns and declares
/// (FND-1814, E11). The numeric member is an `Option` because absence is a
/// representable state the producer refuses, naming the absent member, rather
/// than a state a host default fills in (FR-118-AC-12).
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResourceLimits {
    /// The declared numeric resource limit FR-118 reads.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub numeric_resource_limit: Option<NumericResourceLimit>,
    /// Remaining finite document bounds by stable name.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub declared_bounds: BTreeMap<String, u64>,
}
