// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The producer/native correspondence record of
//! [FR-116](../../../spec/functional/FR-116-emit-producer-native-correspondence-records.md).
//!
//! One selected pair of one producer object and one native artifact yields
//! exactly one immutable record, carried in the producer's **own bundle
//! document** rather than in a consumer table entry (FND-1710, D3).
//!
//! The producer authors **five** producer-object members — `kind`, `authority`,
//! `identity`, namespaced `revision` and canonical `digest` selection — and not a
//! sixth. The consumer's `interface` member is a `u32` index into a consumer
//! table that the consumer assigns when it assembles its own package, and the
//! obligation to author it was withdrawn (FND-1805, FND-1801, E2). Every other
//! consumer `u32` index — `Correspondence.native`, `Correspondence.relation`,
//! `Correspondence.exports`, `Definition.requires` — is likewise left unassigned
//! (FR-116-CON-5).
//!
//! A producer canonical digest selection and a native raw-byte digest selection
//! stay distinct members even when their hash text coincides: matching text is
//! never presented as evidence of semantic equivalence (FR-116-CON-3).
//!
//! FR-111 owns the circular and unresolved-support control that retains
//! `unknown` with its path, and governs termination of the native definition
//! closure this record enumerates (FND-1719, FND-1835). This module cites it and
//! writes no second termination rule: it refuses an **incomplete** closure
//! against the declared required identities and stops there.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::export::{DeclaredExports, ExportRecord};
use crate::refusal::{
    Refusal, CORRESPONDENCE_CLOSURE_INCOMPLETE, CORRESPONDENCE_CONFIGURATION_ABSENT,
    CORRESPONDENCE_CONFIGURATION_MISMATCH, CORRESPONDENCE_DUPLICATE_PAIR,
    CORRESPONDENCE_STALE_SELECTION, ENDPOINT_TYPE_EXPORT_ABSENT, EXPORT_ABSENT, EXPORT_CROSS_BOUND,
    EXPORT_FOREIGN, IDENTITY_ABSENT,
};
use crate::revision::{NATIVE_REVISION_NAMESPACE, PRODUCER_REVISION_NAMESPACE};
use crate::{
    ConfigurationDocument, DigestSelection, Revision, CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION,
    NATIVE_BYTES_DOMAIN,
};

/// The five producer-object members the producer authors.
///
/// There is no sixth. The consumer's `interface` index is absent from this type,
/// so it cannot be authored even by mistake — which is a compile-time control
/// rather than a convention (FR-116-CON-1, FR-116-AC-1, verified by `Compile`):
///
/// ```compile_fail
/// use agent_ix_baseline_producer::ProducerObjectReference;
/// fn read_interface(producer: &ProducerObjectReference) -> u32 {
///     // The consumer assigns this `u32` index; the producer has no such member.
///     producer.interface
/// }
/// ```
///
/// The same read of a member the producer does author compiles:
///
/// ```
/// use agent_ix_baseline_producer::ProducerObjectReference;
/// fn read_kind(producer: &ProducerObjectReference) -> &str {
///     &producer.object_kind
/// }
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProducerObjectReference {
    /// Producer object kind (for example `model` or `profile`).
    pub object_kind: String,
    /// The authority that issued the producer object.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub authority: String,
    /// Exact producer object identity.
    pub identity: String,
    /// Exact immutable producer revision, namespaced.
    pub revision: Revision,
    /// Canonical producer-object digest selection.
    pub digest: DigestSelection,
}

/// The native artifact or native definition selected by a correspondence record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeArtifactReference {
    /// Native artifact or definition identity.
    pub identity: String,
    /// Exact immutable native revision, namespaced.
    pub revision: Revision,
    /// Digest of raw native bytes, never a producer canonical digest.
    pub raw_byte_digest: DigestSelection,
}

impl NativeArtifactReference {
    fn validate(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        if self.identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "a native selection declares no identity",
            ));
        }
        self.revision
            .validate_namespace(NATIVE_REVISION_NAMESPACE)?;
        self.revision.validate_selected(configuration)?;
        self.raw_byte_digest
            .validate_domain(NATIVE_BYTES_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.raw_byte_digest.validate_selected(configuration)
    }
}

/// One selected (producer object, native artifact) pair.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct SelectedPair {
    /// The selected producer object identity.
    pub producer_object_identity: String,
    /// The selected native artifact identity.
    pub native_artifact_identity: String,
}

impl SelectedPair {
    /// Names one selected pair.
    pub fn new(
        producer_object_identity: impl Into<String>,
        native_artifact_identity: impl Into<String>,
    ) -> Self {
        Self {
            producer_object_identity: producer_object_identity.into(),
            native_artifact_identity: native_artifact_identity.into(),
        }
    }
}

/// An immutable producer/native relation; matching text is not equivalence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProducerNativeCorrespondence {
    /// Producer-declared binding relation identity.
    pub binding_relation_identity: String,
    /// The five authored producer-object members.
    pub producer: ProducerObjectReference,
    /// The native artifact selection.
    pub native: NativeArtifactReference,
    /// Native definitions that close the selected artifact, each with its own
    /// namespaced revision and raw-byte digest selection.
    pub native_definition_closure: Vec<NativeArtifactReference>,
    /// The exact required native definition-closure identities.
    ///
    /// An entry named here and absent from `native_definition_closure` refuses as
    /// an incomplete closure; the closure's termination is FR-111's, cited and not
    /// restated.
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub required_native_definition_identities: BTreeSet<String>,
    /// Configuration whose declared policy authorized this relation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub configuration_identity: Option<String>,
    /// One export mapping per exported component, endpoint and relationship record.
    #[serde(default)]
    pub exports: Vec<ExportRecord>,
}

impl ProducerNativeCorrespondence {
    /// Refuses the record's selections, provenance and closure.
    ///
    /// This is the part of admission that needs no view of the other
    /// correspondence records: both sides' namespaced revisions and digest
    /// selections, the per-entry closure selections, the required-closure
    /// completeness, and the configuration provenance. The five-member
    /// completeness of the producer object is [`Self::validate_authored_members`].
    pub fn validate_selections(
        &self,
        configuration: &ConfigurationDocument,
    ) -> Result<(), Refusal> {
        if self.binding_relation_identity.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "a correspondence record declares no binding relation identity",
            ));
        }
        self.producer
            .revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.producer.revision.validate_selected(configuration)?;
        self.producer
            .digest
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        self.producer.digest.validate_selected(configuration)?;
        self.native.validate(configuration)?;
        for definition in &self.native_definition_closure {
            definition.validate(configuration)?;
        }
        let enumerated: BTreeSet<&str> = self
            .native_definition_closure
            .iter()
            .map(|definition| definition.identity.as_str())
            .collect();
        for required in &self.required_native_definition_identities {
            if !enumerated.contains(required.as_str()) {
                return Err(Refusal::new(
                    CORRESPONDENCE_CLOSURE_INCOMPLETE,
                    format!(
                        "{} enumerates no native definition {required}",
                        self.binding_relation_identity
                    ),
                ));
            }
        }
        let Some(provenance) = self.configuration_identity.as_ref() else {
            return Err(Refusal::new(
                CORRESPONDENCE_CONFIGURATION_ABSENT,
                format!(
                    "{} carries no configuration provenance",
                    self.binding_relation_identity
                ),
            ));
        };
        if provenance != &configuration.configuration_identity {
            return Err(Refusal::new(
                CORRESPONDENCE_CONFIGURATION_MISMATCH,
                format!(
                    "{} names configuration {provenance} but {} authorized the relation",
                    self.binding_relation_identity, configuration.configuration_identity
                ),
            ));
        }
        Ok(())
    }

    /// Refuses a record missing any of the five authored producer-object members.
    ///
    /// This is a separate entry point from [`Self::validate_selections`] so that
    /// the static admission of FR-117 raises it while the Plan-016 assessment
    /// bundle — whose fixture predates the `authority` member and whose controls
    /// TC-1373..TC-1381 are complete work — keeps the semantics it shipped with.
    /// Nothing in the static path skips it: `validate_correspondence_set` calls it
    /// for every record.
    pub fn validate_authored_members(&self) -> Result<(), Refusal> {
        for (member, value) in [
            ("kind", &self.producer.object_kind),
            ("authority", &self.producer.authority),
            ("identity", &self.producer.identity),
        ] {
            if value.is_empty() {
                return Err(Refusal::new(
                    IDENTITY_ABSENT,
                    format!(
                        "{} declares no producer object {member}",
                        self.binding_relation_identity
                    ),
                ));
            }
        }
        Ok(())
    }

    /// Refuses the record's export mappings against its own producer object.
    ///
    /// An export mapping whose named producer object is not this record's refuses
    /// as foreign, and one naming an identity no declared record exports refuses
    /// naming the vocabulary it resolved against (FR-116-AC-2).
    pub fn validate_exports(
        &self,
        configuration: &ConfigurationDocument,
        declared: &DeclaredExports,
    ) -> Result<(), Refusal> {
        for export in &self.exports {
            export.validate(configuration)?;
            if export.producer_object_identity != self.producer.identity {
                return Err(Refusal::new(
                    EXPORT_FOREIGN,
                    format!(
                        "{} names producer object {} which {} does not export",
                        export.export_identity,
                        export.producer_object_identity,
                        self.producer.identity
                    ),
                ));
            }
            declared.validate_kind(&export.export_identity, export.kind)?;
        }
        Ok(())
    }

    /// Refuses a changed selection carried under a retained binding relation.
    ///
    /// A presentation-only native re-encoding is admitted only through a new
    /// native artifact selection **and** a new correspondence record, never
    /// through a digest substitution under the retained relation (FR-116-AC-3).
    pub fn validate_against_prior(&self, prior: &Self) -> Result<(), Refusal> {
        if self.binding_relation_identity != prior.binding_relation_identity {
            return Ok(());
        }
        if self.producer != prior.producer || self.native != prior.native {
            return Err(Refusal::new(
                CORRESPONDENCE_STALE_SELECTION,
                format!(
                    "{} retains its binding relation over a changed producer or native selection: producer {} / {}, native {} / {}",
                    self.binding_relation_identity,
                    prior.producer.digest.value,
                    self.producer.digest.value,
                    prior.native.raw_byte_digest.value,
                    self.native.raw_byte_digest.value
                ),
            ));
        }
        Ok(())
    }

    /// The selected pair this record names.
    pub fn selected_pair(&self) -> SelectedPair {
        SelectedPair::new(&self.producer.identity, &self.native.identity)
    }
}

/// Refuses a correspondence set with a duplicated pair, a cross-bound export, or
/// an unexported declared record.
///
/// Two records naming one selected pair refuse — **both** of them, as FR-116's
/// Behavior states — and an export owned by another correspondence's producer
/// object refuses as cross-bound. Every declared component, endpoint and
/// relationship record is owed exactly one export mapping.
pub fn validate_correspondence_set(
    records: &[ProducerNativeCorrespondence],
    configuration: &ConfigurationDocument,
    declared: &DeclaredExports,
) -> Result<(), Refusal> {
    let mut pairs: BTreeMap<SelectedPair, Vec<&str>> = BTreeMap::new();
    for record in records {
        pairs
            .entry(record.selected_pair())
            .or_default()
            .push(&record.binding_relation_identity);
    }
    for (pair, relations) in &pairs {
        if relations.len() > 1 {
            return Err(Refusal::new(
                CORRESPONDENCE_DUPLICATE_PAIR,
                format!(
                    "{} correspondence records name the one selected pair ({}, {}); all of them are refused: {}",
                    relations.len(),
                    pair.producer_object_identity,
                    pair.native_artifact_identity,
                    relations.join(", ")
                ),
            ));
        }
    }
    let mut owners: BTreeMap<&str, &str> = BTreeMap::new();
    for record in records {
        record.validate_authored_members()?;
        record.validate_selections(configuration)?;
        record.validate_exports(configuration, declared)?;
        for export in &record.exports {
            if let Some(owner) = owners.insert(
                export.export_identity.as_str(),
                record.producer.identity.as_str(),
            ) {
                if owner != record.producer.identity {
                    return Err(Refusal::new(
                        EXPORT_CROSS_BOUND,
                        format!(
                            "{} is exported by producer object {owner} and by {}",
                            export.export_identity, record.producer.identity
                        ),
                    ));
                }
                return Err(Refusal::new(
                    EXPORT_CROSS_BOUND,
                    format!(
                        "{} carries two export mappings under producer object {owner}",
                        export.export_identity
                    ),
                ));
            }
        }
    }
    for identity in declared.identities() {
        if owners.contains_key(identity) {
            continue;
        }
        if declared.is_declared_type(identity) {
            return Err(Refusal::new(
                ENDPOINT_TYPE_EXPORT_ABSENT,
                format!(
                    "{identity} is named as an endpoint's model type but no correspondence record exports it, so no native type export resolves it"
                ),
            ));
        }
        return Err(Refusal::new(
            EXPORT_ABSENT,
            format!("{identity} is declared but no correspondence record exports it"),
        ));
    }
    Ok(())
}

/// Emits only the correspondence records whose pair the consumer selects.
///
/// A producer object the consumer does not select yields no correspondence record
/// (FR-116-AC-7); a duplicated selected pair refuses.
pub fn select_correspondences<'records>(
    records: &'records [ProducerNativeCorrespondence],
    selected: &BTreeSet<SelectedPair>,
) -> Result<Vec<&'records ProducerNativeCorrespondence>, Refusal> {
    let mut emitted = Vec::new();
    let mut seen = BTreeSet::new();
    for record in records {
        let pair = record.selected_pair();
        if !selected.contains(&pair) {
            continue;
        }
        if !seen.insert(pair.clone()) {
            return Err(Refusal::new(
                CORRESPONDENCE_DUPLICATE_PAIR,
                format!(
                    "two correspondence records name the one selected pair ({}, {})",
                    pair.producer_object_identity, pair.native_artifact_identity
                ),
            ));
        }
        emitted.push(record);
    }
    Ok(emitted)
}
