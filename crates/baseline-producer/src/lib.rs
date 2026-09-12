// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! Baseline 1.2.0 producer-owned model, relationship, population, and closure
//! contract for Plan-016 Task-140.
//!
//! This crate deliberately owns producer facts only. It validates a finite
//! population and its declared windows, but it neither evaluates a claim nor
//! links a native Quire package; those are Task-141 responsibilities.
#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

mod canonical;
mod component;
mod correspondence;
mod decimal;
mod digest;
mod endpoint;
mod export;
mod inventory;
mod locus;
pub mod refusal;
mod relationship;
mod revision;

pub use canonical::{
    canonical_digest, canonical_json, canonical_json_from_bytes, configuration_digest,
    document_digest, ArrayDeclarations, ArrayDisposition, CanonicalPolicy, NumericResourceLimit,
};
pub use component::ComponentDeclaration;
pub use correspondence::{
    select_correspondences, validate_correspondence_set, NativeArtifactReference,
    ProducerNativeCorrespondence, ProducerObjectReference, SelectedPair,
};
pub use decimal::ProducerDecimal;
pub use digest::{
    DigestDomainSelection, DigestSelection, RawByteDigest, ADMISSIBLE_DIGEST_SELECTIONS,
    CANONICAL_JSON_DOMAIN, DIGEST_ALGORITHM, DIGEST_DOMAIN_VERSION, NATIVE_BYTES_DOMAIN,
};
pub use endpoint::EndpointDeclaration;
pub use export::{DeclaredExports, ExportKind, ExportRecord};
pub use inventory::{
    InventoryCompleteness, InventoryDeclaration, InventoryMemberKind, InventoryMembership,
};
pub use locus::{
    ArtifactKind, ArtifactReference, DeclarationSource, FormalDocument, SourceLocus, Span,
    WireReference,
};
pub use refusal::Refusal;
pub use relationship::{
    EndpointProjectionLoss, RelationshipDeclaration, RelationshipEndpoint, RelationshipOwnership,
    RelationshipSemantics, RequestedEndpointProjection,
};
pub use revision::{
    NativeSourceLabel, Revision, ADMISSIBLE_REVISION_NAMESPACES, NATIVE_REVISION_NAMESPACE,
    PRODUCER_REVISION_NAMESPACE,
};

/// The only baseline producer interface version accepted by this crate.
pub const BASELINE_VERSION: &str = "1.2.0";
const MAX_PRODUCER_DOCUMENT_BYTES: usize = 1_048_576;

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
    fn validate(&self, identity: &str) -> Result<(), Refusal> {
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

/// A member's field state; absence, null, and a concrete value never collapse.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "state",
    content = "value",
    rename_all = "kebab-case",
    deny_unknown_fields
)]
pub enum FieldMemberState {
    /// The member is absent.
    Absent,
    /// The member is explicitly present and null.
    PresentNull,
    /// The member is present with one or more JSON values.
    PresentValue(Vec<Value>),
    /// Input retained as invalid with its producer-provided reason.
    Invalid {
        /// Producer-provided reason that remains distinct from absence and null.
        reason: String,
    },
}

/// A relationship instance between exact member-object identities.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationshipInstance {
    /// Stable relationship declaration identity.
    pub relationship_identity: String,
    /// Exact source member-object identity.
    pub source_object_identity: String,
    /// Exact target member-object identity.
    pub target_object_identity: String,
}

/// A finite population member.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PopulationMember {
    /// Stable member-object identity.
    pub object_identity: String,
    /// The selected model type identity.
    pub type_identity: String,
    /// Field states keyed by field identity.
    #[serde(default)]
    pub fields: BTreeMap<String, FieldMemberState>,
}

/// A finite, model-bound observation population.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PopulationDocument {
    /// Stable population identity.
    pub population_identity: String,
    /// Canonical digest of this population document with this member omitted.
    pub digest: DigestSelection,
    /// Exact model identity this population binds.
    pub model_identity: String,
    /// Selected semantic profile identity.
    pub profile_identity: String,
    /// Whether the declared universe is closed.
    pub closed_world: bool,
    /// The exact finite object universe.
    pub declared_object_identities: BTreeSet<String>,
    /// Members of that universe.
    pub members: Vec<PopulationMember>,
    /// Ordered relationship instances.
    #[serde(default)]
    pub relationship_instances: Vec<RelationshipInstance>,
}

/// An explicit fact that an observation was unavailable or resource-limited.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AvailabilityFact {
    /// The affected observation-record identity.
    pub observation_record_identity: String,
    /// Producer-retained reason, never a Boolean result.
    pub reason: String,
}

/// A decisive non-Boolean claim outcome supplied by a selected evaluator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DecisiveDisposition {
    /// The evaluator established the claim from its admitted support.
    Satisfied,
    /// The evaluator established a violation from its admitted support.
    Violated,
}

/// The producer-visible availability disposition of a declared support set.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AvailabilityDisposition {
    /// A decisive satisfied result remains justified.
    Satisfied,
    /// A decisive violated result remains justified.
    Violated,
    /// One or more required support records are unavailable.
    Unavailable,
}

/// Assessment-facing availability facts without temporal or protocol interpretation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AvailabilityAssessment {
    /// Result after considering only the evaluator-declared support records.
    pub disposition: AvailabilityDisposition,
    /// Whether the bundle retains any availability incompleteness.
    pub availability_incomplete: bool,
    /// Exact unavailable records that intersect the declared support set.
    pub unavailable_support_record_identities: Vec<String>,
}

/// One ordered observation record for one population member.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationRecord {
    /// Stable record identity.
    pub observation_record_identity: String,
    /// Exact member-object identity.
    pub member_object_identity: String,
    /// Producer-selected order within the observation sequence.
    pub sequence: u64,
}

/// The three allowed producer clock families and their one half-open selection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "clockFamily",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum WindowCoverage {
    /// Event positions in `[startInclusive, endExclusive)`.
    EventPosition {
        /// Inclusive event-sequence position.
        start_inclusive: u64,
        /// Exclusive event-sequence position.
        end_exclusive: u64,
    },
    /// Exact rational samples in `[startInclusive, endExclusive)`.
    FixedSample {
        /// Exact sample epoch in the declared unit.
        epoch: String,
        /// Positive numerator of the exact sample period.
        period_numerator: i64,
        /// Positive denominator of the exact sample period.
        period_denominator: u64,
        /// Producer-declared unit for epoch and period.
        unit: String,
        /// Inclusive sample index.
        start_inclusive: u64,
        /// Exclusive sample index.
        end_exclusive: u64,
    },
    /// RFC 3339 UTC instants in `[startInclusive, endExclusive)`.
    Timestamp {
        /// Inclusive RFC 3339 UTC instant.
        start_inclusive: String,
        /// Exclusive RFC 3339 UTC instant.
        end_exclusive: String,
    },
}

impl WindowCoverage {
    /// Returns this coverage's exact producer clock family.
    pub fn clock_family(&self) -> &'static str {
        match self {
            Self::EventPosition { .. } => "event-position",
            Self::FixedSample { .. } => "fixed-sample",
            Self::Timestamp { .. } => "timestamp",
        }
    }

    /// Refuses a requested native correspondence that assumes another clock family.
    pub fn require_clock_family(&self, expected: &str) -> Result<(), Refusal> {
        if self.clock_family() == expected {
            Ok(())
        } else {
            Err(Refusal::new(
                "CLOCK_FAMILY_MISMATCH",
                format!("expected {expected}, got {}", self.clock_family()),
            ))
        }
    }
}

/// A declared ordered selection of observation records.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WindowDocument {
    /// Stable window identity.
    pub window_identity: String,
    /// Canonical digest of this window document with this member omitted.
    pub digest: DigestSelection,
    /// The one population this window selects from.
    pub population_identity: String,
    /// Exactly one clock-family coverage selection.
    pub coverage: WindowCoverage,
    /// Ordered observation record identities.
    pub observation_record_identities: Vec<String>,
}

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

/// Static and assessment selections held fixed by the producer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Closure {
    /// Static model selection.
    pub model_identity: String,
    /// Canonical digest of the selected model document.
    pub model_digest: DigestSelection,
    /// Static configuration selection.
    pub configuration_identity: String,
    /// Canonical digest of the selected configuration document.
    pub configuration_digest: DigestSelection,
    /// Assessment population when selected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub population_identity: Option<String>,
    /// Canonical digest of the selected population document when one is selected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub population_digest: Option<DigestSelection>,
    /// Assessment window when selected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub window_identity: Option<String>,
    /// Canonical digest of the selected window document when one is selected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub window_digest: Option<DigestSelection>,
}

/// A complete producer fixture/bundle that native consumers can read without inference.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProducerBundle {
    /// Producer interface version.
    pub baseline_version: String,
    /// Selected model.
    pub model: ModelContract,
    /// First-class declarations.
    pub relationships: Vec<RelationshipDeclaration>,
    /// Finite assessment population.
    pub population: PopulationDocument,
    /// Ordered observation records.
    pub observation_records: Vec<ObservationRecord>,
    /// Availability facts retained separately from truth.
    #[serde(default)]
    pub availability: Vec<AvailabilityFact>,
    /// Selected assessment window.
    pub window: WindowDocument,
    /// Static configuration.
    pub configuration: ConfigurationDocument,
    /// Explicit closure; no implicit defaults exist.
    pub closure: Closure,
    /// Producer-declared model/profile correspondences available to Task-141.
    #[serde(default)]
    pub correspondences: Vec<ProducerNativeCorrespondence>,
}

impl ProducerBundle {
    /// Parses one bounded producer bundle from hostile JSON input.
    pub fn from_json(bytes: &[u8]) -> Result<Self, Refusal> {
        if bytes.len() > MAX_PRODUCER_DOCUMENT_BYTES {
            return Err(Refusal::new(
                "DOCUMENT_RESOURCE_LIMIT",
                "producer document exceeds 1 MiB",
            ));
        }
        serde_json::from_slice(bytes)
            .map_err(|error| Refusal::new("INVALID_PRODUCER_DOCUMENT", error.to_string()))
    }

    /// Applies availability only to a selected evaluator's exact support set.
    ///
    /// This method deliberately does not evaluate a clause, map a clock, or
    /// infer support. It preserves a decisive result when unavailable records
    /// are outside the declared support, and returns `Unavailable` only when
    /// one of the exact required records is unavailable.
    pub fn assess_declared_support(
        &self,
        decisive: DecisiveDisposition,
        required_observation_record_identities: &[String],
    ) -> Result<AvailabilityAssessment, Refusal> {
        let records: BTreeSet<&str> = self
            .observation_records
            .iter()
            .map(|record| record.observation_record_identity.as_str())
            .collect();
        let mut support = BTreeSet::new();
        for identity in required_observation_record_identities {
            if !records.contains(identity.as_str()) {
                return Err(Refusal::new("UNKNOWN_SUPPORT_RECORD", identity.clone()));
            }
            if !support.insert(identity.as_str()) {
                return Err(Refusal::new("DUPLICATE_SUPPORT_RECORD", identity.clone()));
            }
        }
        let unavailable_support_record_identities = self
            .availability
            .iter()
            .filter(|fact| support.contains(fact.observation_record_identity.as_str()))
            .map(|fact| fact.observation_record_identity.clone())
            .collect::<Vec<_>>();
        let disposition = if unavailable_support_record_identities.is_empty() {
            match decisive {
                DecisiveDisposition::Satisfied => AvailabilityDisposition::Satisfied,
                DecisiveDisposition::Violated => AvailabilityDisposition::Violated,
            }
        } else {
            AvailabilityDisposition::Unavailable
        };
        Ok(AvailabilityAssessment {
            disposition,
            availability_incomplete: !self.availability.is_empty(),
            unavailable_support_record_identities,
        })
    }

    /// Refuses a relationship-to-field projection that drops either endpoint role.
    pub fn project_relationship_to_field(
        &self,
        relationship_identity: &str,
        preserves_source_role: bool,
        preserves_target_role: bool,
    ) -> Result<(), Refusal> {
        if !self
            .relationships
            .iter()
            .any(|relationship| relationship.relationship_identity == relationship_identity)
        {
            return Err(Refusal::new("UNKNOWN_RELATIONSHIP", relationship_identity));
        }
        if !preserves_source_role || !preserves_target_role {
            return Err(Refusal::new(
                "RELATIONSHIP_ENDPOINT_ROLE_LOSS",
                relationship_identity,
            ));
        }
        Ok(())
    }

    /// Validates all Task-140 producer invariants without performing evaluation.
    pub fn validate(&self) -> Result<(), Refusal> {
        if self.baseline_version != BASELINE_VERSION
            || self.configuration.baseline_version != BASELINE_VERSION
        {
            return Err(Refusal::new(
                "UNKNOWN_BASELINE_VERSION",
                "baselineVersion must be exactly 1.2.0",
            ));
        }
        let policy = CanonicalPolicy::from_configuration(&self.configuration)?;
        if configuration_digest(&self.configuration)? != self.configuration.digest {
            return Err(Refusal::new(
                "CONFIGURATION_DIGEST_MISMATCH",
                self.configuration.configuration_identity.clone(),
            ));
        }
        if document_digest(&self.model, &policy)? != self.model.digest
            || document_digest(&self.population, &policy)? != self.population.digest
            || document_digest(&self.window, &policy)? != self.window.digest
        {
            return Err(Refusal::new(
                "DOCUMENT_DIGEST_MISMATCH",
                "a model, population, or window digest does not match its document",
            ));
        }
        if self.population.model_identity != self.model.model_identity
            || self.closure.model_identity != self.model.model_identity
            || self.closure.configuration_identity != self.configuration.configuration_identity
        {
            return Err(Refusal::new(
                "IDENTITY_MISMATCH",
                "population or closure does not retain the selected model/configuration identity",
            ));
        }
        if !self
            .model
            .profile_identities
            .contains(&self.population.profile_identity)
            || !self
                .configuration
                .profile_identities
                .contains(&self.population.profile_identity)
        {
            return Err(Refusal::new(
                "UNKNOWN_PROFILE",
                format!(
                    "{} is not selected by model and configuration",
                    self.population.profile_identity
                ),
            ));
        }
        self.validate_relationships()?;
        self.validate_population()?;
        self.validate_window()?;
        for correspondence in &self.correspondences {
            correspondence.validate_selections(&self.configuration)?;
            if correspondence.producer.identity != self.model.model_identity
                || correspondence.producer.digest != self.model.digest
            {
                return Err(Refusal::new(
                    "CORRESPONDENCE_PRODUCER_MISMATCH",
                    correspondence.binding_relation_identity.clone(),
                ));
            }
        }
        Ok(())
    }

    fn validate_relationships(&self) -> Result<(), Refusal> {
        let mut identities = BTreeSet::new();
        let mut graph: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
        for relationship in &self.relationships {
            if !identities.insert(&relationship.relationship_identity) {
                return Err(Refusal::new(
                    "DUPLICATE_RELATIONSHIP",
                    relationship.relationship_identity.clone(),
                ));
            }
            for endpoint in [&relationship.source, &relationship.target] {
                let Some(multiplicity) = endpoint.multiplicity.as_ref() else {
                    return Err(Refusal::new(
                        refusal::ENDPOINT_MULTIPLICITY_ABSENT,
                        endpoint.endpoint_identity.clone(),
                    ));
                };
                multiplicity.validate(&endpoint.endpoint_identity)?;
                if !self.model.types.contains_key(&endpoint.type_identity) {
                    return Err(Refusal::new(
                        "UNKNOWN_RELATIONSHIP_ENDPOINT_TYPE",
                        endpoint.type_identity.clone(),
                    ));
                }
            }
            if relationship.semantics.composite {
                graph
                    .entry(&relationship.source.type_identity)
                    .or_default()
                    .push(&relationship.target.type_identity);
            }
        }
        for origin in graph.keys().copied().collect::<Vec<_>>() {
            let mut visiting = BTreeSet::new();
            if composite_cycle(origin, origin, &graph, &mut visiting) {
                return Err(Refusal::new(
                    "COMPOSITE_CYCLE",
                    format!("composite graph closes at {origin}"),
                ));
            }
        }
        Ok(())
    }

    fn validate_population(&self) -> Result<(), Refusal> {
        let mut members: BTreeMap<&str, &PopulationMember> = BTreeMap::new();
        for member in &self.population.members {
            if self.population.closed_world
                && !self
                    .population
                    .declared_object_identities
                    .contains(&member.object_identity)
            {
                return Err(Refusal::new(
                    "OBJECT_OUTSIDE_CLOSED_WORLD",
                    member.object_identity.clone(),
                ));
            }
            if members
                .insert(member.object_identity.as_str(), member)
                .is_some()
            {
                return Err(Refusal::new(
                    "DUPLICATE_OBJECT",
                    member.object_identity.clone(),
                ));
            }
            let Some(model_type) = self.model.types.get(&member.type_identity) else {
                return Err(Refusal::new(
                    "UNKNOWN_MEMBER_TYPE",
                    member.type_identity.clone(),
                ));
            };
            for (field_identity, contract) in &model_type.fields {
                contract.multiplicity.validate(field_identity)?;
                if matches!(contract.default_kind, DefaultKind::None)
                    != contract.default_value.is_none()
                {
                    return Err(Refusal::new("INVALID_DEFAULT", field_identity.clone()));
                }
                let state = member
                    .fields
                    .get(field_identity)
                    .unwrap_or(&FieldMemberState::Absent);
                match state {
                    FieldMemberState::Absent if contract.presence == Presence::Required => {
                        return Err(Refusal::new(
                            "REQUIRED_MEMBER_ABSENT",
                            field_identity.clone(),
                        ))
                    }
                    FieldMemberState::PresentNull if !contract.nullable => {
                        return Err(Refusal::new(
                            "NON_NULLABLE_MEMBER_NULL",
                            field_identity.clone(),
                        ))
                    }
                    FieldMemberState::PresentValue(values) => {
                        let count = u32::try_from(values.len()).unwrap_or(u32::MAX);
                        if count < contract.multiplicity.lower
                            || contract
                                .multiplicity
                                .upper
                                .is_some_and(|upper| count > upper)
                        {
                            return Err(Refusal::new(
                                "MEMBER_MULTIPLICITY",
                                field_identity.clone(),
                            ));
                        }
                    }
                    FieldMemberState::Invalid { .. } => {
                        return Err(Refusal::new("INVALID_MEMBER", field_identity.clone()))
                    }
                    _ => {}
                }
            }
            if member
                .fields
                .keys()
                .any(|field| !model_type.fields.contains_key(field))
            {
                return Err(Refusal::new(
                    "UNKNOWN_FIELD",
                    member.object_identity.clone(),
                ));
            }
        }
        if self.population.closed_world
            && self.population.declared_object_identities.len() != members.len()
        {
            return Err(Refusal::new(
                "CLOSED_WORLD_UNIVERSE_MISMATCH",
                "declared universe and members differ",
            ));
        }
        let declarations: BTreeMap<&str, &RelationshipDeclaration> = self
            .relationships
            .iter()
            .map(|relationship| (relationship.relationship_identity.as_str(), relationship))
            .collect();
        for instance in &self.population.relationship_instances {
            let Some(declaration) = declarations.get(instance.relationship_identity.as_str())
            else {
                return Err(Refusal::new(
                    "UNKNOWN_RELATIONSHIP",
                    instance.relationship_identity.clone(),
                ));
            };
            let Some(source) = members.get(instance.source_object_identity.as_str()) else {
                return Err(Refusal::new(
                    "DANGLING_RELATIONSHIP_ENDPOINT",
                    format!(
                        "{} -> {}",
                        instance.source_object_identity, instance.target_object_identity
                    ),
                ));
            };
            let Some(target) = members.get(instance.target_object_identity.as_str()) else {
                return Err(Refusal::new(
                    "DANGLING_RELATIONSHIP_ENDPOINT",
                    format!(
                        "{} -> {}",
                        instance.source_object_identity, instance.target_object_identity
                    ),
                ));
            };
            if source.type_identity != declaration.source.type_identity
                || target.type_identity != declaration.target.type_identity
            {
                return Err(Refusal::new(
                    "RELATIONSHIP_ENDPOINT_TYPE_MISMATCH",
                    instance.relationship_identity.clone(),
                ));
            }
        }
        Ok(())
    }

    fn validate_window(&self) -> Result<(), Refusal> {
        if self.window.population_identity != self.population.population_identity
            || self.closure.population_identity.as_deref()
                != Some(&self.population.population_identity)
            || self.closure.window_identity.as_deref() != Some(&self.window.window_identity)
            || self.closure.model_digest != self.model.digest
            || self.closure.configuration_digest != self.configuration.digest
            || self.closure.population_digest.as_ref() != Some(&self.population.digest)
            || self.closure.window_digest.as_ref() != Some(&self.window.digest)
        {
            return Err(Refusal::new(
                "WINDOW_CLOSURE_MISMATCH",
                "window/population selection is not exact",
            ));
        }
        match &self.window.coverage {
            WindowCoverage::EventPosition {
                start_inclusive,
                end_exclusive,
            } if start_inclusive >= end_exclusive => {
                return Err(Refusal::new(
                    "INVALID_WINDOW",
                    "event positions are not half-open",
                ))
            }
            WindowCoverage::FixedSample {
                period_numerator,
                period_denominator,
                start_inclusive,
                end_exclusive,
                ..
            } if *period_numerator <= 0
                || *period_denominator == 0
                || start_inclusive >= end_exclusive =>
            {
                return Err(Refusal::new(
                    "INVALID_WINDOW",
                    "fixed samples need a positive rational half-open period",
                ))
            }
            WindowCoverage::Timestamp {
                start_inclusive,
                end_exclusive,
            } => {
                let start = parse_rfc3339_utc(start_inclusive)?;
                let end = parse_rfc3339_utc(end_exclusive)?;
                if start >= end {
                    return Err(Refusal::new(
                        "INVALID_WINDOW",
                        "timestamp instants are not half-open",
                    ));
                }
            }
            _ => {}
        }
        let mut records = BTreeMap::new();
        for record in &self.observation_records {
            if !self
                .population
                .members
                .iter()
                .any(|member| member.object_identity == record.member_object_identity)
            {
                return Err(Refusal::new(
                    "UNKNOWN_RECORD_MEMBER",
                    record.member_object_identity.clone(),
                ));
            }
            if records
                .insert(record.observation_record_identity.as_str(), record)
                .is_some()
            {
                return Err(Refusal::new(
                    "DUPLICATE_OBSERVATION_RECORD",
                    record.observation_record_identity.clone(),
                ));
            }
        }
        let mut previous = None;
        for identity in &self.window.observation_record_identities {
            let Some(record) = records.get(identity.as_str()) else {
                return Err(Refusal::new("UNKNOWN_OBSERVATION_RECORD", identity.clone()));
            };
            if previous.is_some_and(|sequence| record.sequence <= sequence) {
                return Err(Refusal::new("OBSERVATION_ORDER", identity.clone()));
            }
            previous = Some(record.sequence);
        }
        for availability in &self.availability {
            if !records.contains_key(availability.observation_record_identity.as_str()) {
                return Err(Refusal::new(
                    "UNKNOWN_AVAILABILITY_RECORD",
                    availability.observation_record_identity.clone(),
                ));
            }
        }
        Ok(())
    }
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct UtcInstant {
    year: i32,
    month: u8,
    day: u8,
    hour: u8,
    minute: u8,
    second: u8,
    nanosecond: u32,
}

fn parse_rfc3339_utc(value: &str) -> Result<UtcInstant, Refusal> {
    let bytes = value.as_bytes();
    if bytes.len() < 20
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || !value.ends_with('Z')
    {
        return Err(Refusal::new("INVALID_TIMESTAMP", value));
    }
    let decimal = &value[19..value.len() - 1];
    let fractional = if decimal.is_empty() {
        0
    } else {
        let Some(digits) = decimal.strip_prefix('.') else {
            return Err(Refusal::new("INVALID_TIMESTAMP", value));
        };
        if digits.is_empty()
            || digits.len() > 9
            || !digits.bytes().all(|byte| byte.is_ascii_digit())
        {
            return Err(Refusal::new("INVALID_TIMESTAMP", value));
        }
        let number = digits
            .parse::<u32>()
            .map_err(|_| Refusal::new("INVALID_TIMESTAMP", value))?;
        number.saturating_mul(10_u32.saturating_pow(u32::try_from(9 - digits.len()).unwrap_or(0)))
    };
    let component = |start: usize, end: usize| -> Result<u8, Refusal> {
        value
            .get(start..end)
            .filter(|slice| slice.bytes().all(|byte| byte.is_ascii_digit()))
            .ok_or_else(|| Refusal::new("INVALID_TIMESTAMP", value))?
            .parse::<u8>()
            .map_err(|_| Refusal::new("INVALID_TIMESTAMP", value))
    };
    let year = value[0..4]
        .parse::<i32>()
        .map_err(|_| Refusal::new("INVALID_TIMESTAMP", value))?;
    let month = component(5, 7)?;
    let day = component(8, 10)?;
    let hour = component(11, 13)?;
    let minute = component(14, 16)?;
    let second = component(17, 19)?;
    let month_days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        2 => 28,
        _ => return Err(Refusal::new("INVALID_TIMESTAMP", value)),
    };
    if day == 0 || day > month_days || hour > 23 || minute > 59 || second > 59 {
        return Err(Refusal::new("INVALID_TIMESTAMP", value));
    }
    Ok(UtcInstant {
        year,
        month,
        day,
        hour,
        minute,
        second,
        nanosecond: fractional,
    })
}

fn composite_cycle<'a>(
    origin: &'a str,
    current: &'a str,
    graph: &BTreeMap<&'a str, Vec<&'a str>>,
    visiting: &mut BTreeSet<&'a str>,
) -> bool {
    if !visiting.insert(current) {
        return current == origin;
    }
    let cycle = graph.get(current).is_some_and(|targets| {
        targets
            .iter()
            .copied()
            .any(|target| target == origin || composite_cycle(origin, target, graph, visiting))
    });
    visiting.remove(current);
    cycle
}
