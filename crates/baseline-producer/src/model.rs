// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The selected model and profile: field contracts, exported types, and the
//! three-member selections the static bundle carries.
//!
//! FR-117's Inputs name the selected model and the selected profile by their
//! identity, their namespaced revision and their canonical digest selection, so
//! [`ModelSelection`] and [`ProfileSelection`] carry exactly those three members
//! each. They stay distinct from the bundle's own header identity, revision and
//! digest even when their spellings coincide (FR-117-CON-7).

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::refusal::{Refusal, IDENTITY_ABSENT};
use crate::revision::PRODUCER_REVISION_NAMESPACE;
use crate::{
    ConfigurationDocument, DigestSelection, Revision, CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION,
};

/// A field's explicitly authored presence axis.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Presence {
    /// The member must be authored, independent of cardinality.
    Required,
    /// The member may be absent; cardinality applies only when present.
    Optional,
}

/// The declared source of a field default, separate from presence and nullability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DefaultKind {
    /// No default is declared.
    None,
    /// The model declares a semantic default.
    Semantic,
    /// A representation declares a default.
    Representation,
    /// A migration declares a default.
    Migration,
}

/// A finite or unbounded cardinality range and collection distinctions.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Multiplicity {
    /// Inclusive minimum count.
    pub lower: u32,
    /// Inclusive maximum count, absent for unbounded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub upper: Option<u32>,
    /// Whether order is semantically retained.
    #[serde(default)]
    pub ordered: bool,
    /// Whether uniqueness is semantically retained.
    #[serde(default)]
    pub unique: bool,
}

impl Multiplicity {
    pub(crate) fn validate(&self, identity: &str) -> Result<(), Refusal> {
        if self.upper.is_some_and(|upper| upper < self.lower) {
            return Err(Refusal::new(
                "INVALID_MULTIPLICITY",
                format!("{identity} has upper below lower"),
            ));
        }
        Ok(())
    }
}

/// A field declaration used to validate a population member state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FieldContract {
    /// Stable field identity.
    pub field_identity: String,
    /// Authored member-presence requirement.
    pub presence: Presence,
    /// Value count contract when present.
    pub multiplicity: Multiplicity,
    /// Whether a present member may have the null state.
    pub nullable: bool,
    /// Declared default source, never inferred from absence.
    pub default_kind: DefaultKind,
    /// The declared default value when the default source requires one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_value: Option<Value>,
}

/// The result of attempting to express a Baseline 1.2 field in Baseline 1.1.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum V1Projection {
    /// The field has no Baseline 1.2 distinction that the older form loses.
    Accepted,
    /// The projection would discard authored meaning and is therefore refused.
    Refused(Refusal),
}

impl FieldContract {
    /// Refuses a lossy projection to the historical Baseline 1.1 field form.
    pub fn v1_projection(&self) -> V1Projection {
        let historical_presence = if self.multiplicity.lower == 0 {
            Presence::Optional
        } else {
            Presence::Required
        };
        if self.presence != historical_presence {
            return V1Projection::Refused(Refusal::new(
                "PRESENCE_PROJECTION_LOSS",
                self.field_identity.clone(),
            ));
        }
        if !matches!(self.default_kind, DefaultKind::None)
            || self.default_value.is_some()
            || self.multiplicity.ordered
            || self.multiplicity.unique
        {
            return V1Projection::Refused(Refusal::new(
                "FIELD_PROJECTION_LOSS",
                self.field_identity.clone(),
            ));
        }
        V1Projection::Accepted
    }
}

/// A historical Baseline 1.1 field, which did not carry authored presence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyV1Field {
    /// Stable field identity retained by the historical source.
    pub field_identity: String,
    /// Historical value-count contract.
    pub multiplicity: Multiplicity,
    /// Historical nullability contract.
    pub nullable: bool,
}

impl LegacyV1Field {
    /// Refuses to invent Baseline 1.2 authored presence from a v1.1 source.
    pub fn project_to_baseline(self) -> Result<FieldContract, Refusal> {
        Err(Refusal::new("SOURCE_PRESENCE_LOSS", self.field_identity))
    }
}

/// A type exported by one immutable model selection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ModelType {
    /// Stable type identity.
    pub type_identity: String,
    /// Fields by stable identity.
    #[serde(default)]
    pub fields: BTreeMap<String, FieldContract>,
}

/// A selected semantic model for a producer bundle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ModelContract {
    /// Producer-selected model identity.
    pub model_identity: String,
    /// Canonical digest of this model document with this member omitted.
    pub digest: DigestSelection,
    /// The profiles this model permits.
    pub profile_identities: BTreeSet<String>,
    /// Exported types by stable identity.
    pub types: BTreeMap<String, ModelType>,
}

/// The selected producer model, as the static bundle carries it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ModelSelection {
    /// The selected model identity.
    pub model_identity: String,
    /// The model's namespaced revision.
    pub model_revision: Revision,
    /// The model's canonical digest selection.
    pub digest: DigestSelection,
}

impl ModelSelection {
    /// Refuses a model selection missing any of its three members.
    pub fn validate(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        if self.model_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "the selected model declares no model identity",
            ));
        }
        self.model_revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.model_revision.validate_selected(configuration)?;
        self.digest
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.digest.validate_selected(configuration)
    }
}

/// The selected producer profile, as the static bundle carries it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileSelection {
    /// The selected profile identity.
    pub profile_identity: String,
    /// The profile's namespaced revision.
    pub profile_revision: Revision,
    /// The profile's canonical digest selection.
    pub digest: DigestSelection,
}

impl ProfileSelection {
    /// Refuses a profile selection missing any of its three members.
    pub fn validate(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        if self.profile_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "the selected profile declares no profile identity",
            ));
        }
        self.profile_revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.profile_revision.validate_selected(configuration)?;
        self.digest
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.digest.validate_selected(configuration)
    }
}
