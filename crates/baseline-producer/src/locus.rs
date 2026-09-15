// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The source-provenance locus of
//! [FR-114](../../../spec/functional/FR-114-declare-component-and-endpoint-identities.md).
//!
//! [`SourceLocus`] maps member for member onto the pinned consumer
//! `ForeignLocus { source: ArtifactRef, formal: Formal, span: Span }`, and
//! [`ArtifactReference`] onto all **seven** members of `ArtifactRef`. A
//! five-member locus is a wrong answer rather than a simplification (D2,
//! FND-1705, FND-1753), so every member is present here and none is folded into
//! another.
//!
//! Two members of that mapping are consumer-owned and this interface does not
//! govern them: `ArtifactRef.digest` is one [`RawByteDigest`] string rather than
//! a [`crate::DigestSelection`], and it is admitted rather than refused as a
//! non-canonical selection (FR-114-AC-4). The editable native authority label
//! sits on the declaration source record, as the consumer's own `Source` record
//! carries it, and never on the formal document revision: substituting a native
//! label for the authored formal revision is exactly what FR-114-CON-4 forbids.
//!
//! A locus is never synthesized. A component or endpoint whose locus no
//! declaration source document supplies refuses, and no record carrying a
//! synthesized locus is emitted for it (FR-114-CON-5, FND-1765, D23).

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::refusal::{Refusal, FORMAL_DOCUMENT_ABSENT, FORMAL_REVISION_ABSENT, IDENTITY_ABSENT};
use crate::revision::PRODUCER_REVISION_NAMESPACE;
use crate::{ConfigurationDocument, NativeSourceLabel, RawByteDigest, Revision};

/// The consumer's closed artifact-kind vocabulary at the pinned revision.
///
/// Cited rather than minted: these are exactly the spellings
/// `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`,
/// revision `72507f856457ba0922719bd5d9f5cadcce4058cd` declares for
/// `ArtifactKind`. This interface adds no artifact kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ArtifactKind {
    /// `binding`
    Binding,
    /// `dependency-closure`
    DependencyClosure,
    /// `environment`
    Environment,
    /// `executable-projection`
    ExecutableProjection,
    /// `fault-model`
    FaultModel,
    /// `generated-artifact`
    GeneratedArtifact,
    /// `invocation`
    Invocation,
    /// `linked-package`
    LinkedPackage,
    /// `model-lock`
    ModelLock,
    /// `model-manifest`
    ModelManifest,
    /// `model-package`
    ModelPackage,
    /// `observation`
    Observation,
    /// `oracle`
    Oracle,
    /// `property`
    Property,
    /// `review-disposition`
    ReviewDisposition,
    /// `review-procedure`
    ReviewProcedure,
    /// `run-artifact`
    RunArtifact,
    /// `snapshot`
    Snapshot,
    /// `source`
    Source,
    /// `trace`
    Trace,
}

/// The wire identity and version of an artifact reference.
///
/// Separate from the semantic definition revision, as the consumer's `Wire`
/// record keeps them.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WireReference {
    /// The wire identity.
    pub identity: String,
    /// The wire version.
    pub version: String,
}

/// All seven members of the consumer's `ArtifactRef` record.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ArtifactReference {
    /// The artifact-reference contract version, spelled `refVersion` on the wire.
    pub ref_version: String,
    /// The artifact kind, drawn from the consumer's closed vocabulary.
    pub kind: ArtifactKind,
    /// The authority that issued the artifact.
    pub authority: String,
    /// The artifact identity.
    pub identity: String,
    /// The artifact's namespaced revision.
    pub revision: Revision,
    /// One raw-byte digest string; deliberately not a `DigestSelection`.
    pub digest: RawByteDigest,
    /// The artifact's wire identity and version.
    pub wire: WireReference,
}

/// The authored formal document and its namespaced revision.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormalDocument {
    /// The authored formal document.
    pub document: String,
    /// The authored formal document revision; never a native authority label.
    pub revision: Revision,
}

/// A byte span within a declaration source document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Span {
    /// The inclusive start byte offset.
    pub start: u32,
    /// The exclusive end byte offset.
    pub end: u32,
}

/// One declared component's or endpoint's source provenance.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceLocus {
    /// The producer's own declaration source document, as an artifact reference.
    pub source: ArtifactReference,
    /// The authored formal document and revision.
    pub formal: FormalDocument,
    /// The byte span of the declaration within that source document.
    pub span: Span,
}

impl SourceLocus {
    /// Refuses an incomplete locus, naming the record that offered it.
    pub fn validate(
        &self,
        subject: &str,
        configuration: &ConfigurationDocument,
    ) -> Result<(), Refusal> {
        for (member, value) in [
            ("refVersion", &self.source.ref_version),
            ("authority", &self.source.authority),
            ("identity", &self.source.identity),
            ("wire.identity", &self.source.wire.identity),
            ("wire.version", &self.source.wire.version),
        ] {
            if value.is_empty() {
                return Err(Refusal::new(
                    IDENTITY_ABSENT,
                    format!("{subject} locus declares no source {member}"),
                ));
            }
        }
        self.source.revision.validate_selected(configuration)?;
        if self.formal.document.is_empty() {
            return Err(Refusal::new(
                FORMAL_DOCUMENT_ABSENT,
                format!("{subject} locus names no formal document"),
            ));
        }
        if self.formal.revision.value.is_empty() || self.formal.revision.namespace.is_empty() {
            return Err(Refusal::new(
                FORMAL_REVISION_ABSENT,
                format!(
                    "{subject} locus names no formal document revision for {}",
                    self.formal.document
                ),
            ));
        }
        // The formal revision is authored, in the producer-object namespace. A
        // native authority label never substitutes for it (FR-114-CON-4).
        self.formal
            .revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        self.formal.revision.validate_selected(configuration)?;
        if self.span.end < self.span.start {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!("{subject} locus span ends before it starts"),
            ));
        }
        Ok(())
    }
}

/// One declaration source document the producer supplies loci from.
///
/// This maps onto the consumer's `Source { artifact, native, path, formal, … }`
/// record: the artifact reference, the editable native authority label, the path
/// and the authored formal document. It is the supplier FR-114's Inputs name, and
/// a locus naming no member of the supplied set refuses rather than being
/// synthesized.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeclarationSource {
    /// The declaration source document, as an artifact reference.
    pub source: ArtifactReference,
    /// The editable native authority label of that source; not a formal revision.
    pub native: NativeSourceLabel,
    /// The path the consumer retains for the source.
    pub path: String,
    /// The authored formal document and revision of that source.
    pub formal: FormalDocument,
}

impl DeclarationSource {
    /// The identities of every supplied declaration source document.
    pub fn supplied(sources: &[Self]) -> BTreeSet<&str> {
        sources
            .iter()
            .map(|declared| declared.source.identity.as_str())
            .collect()
    }
}
