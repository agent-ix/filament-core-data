// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The producer interface `1.2.0` static half: versioned digest selections,
//! namespaced revisions, first-class component, endpoint, inventory,
//! relationship and correspondence records, and one admitted static bundle.
//!
//! The crate root declares modules and re-exports; every type lives in the module
//! its requirement owns. Two entry points matter:
//!
//! * [`StaticProducerBundle::admit`] and [`StaticProducerBundle::admit_json`] are
//!   the only way to obtain an [`AdmittedStaticBundle`]. They construct and
//!   validate indivisibly, and a refused admission yields no value of the
//!   admitted type (FR-117).
//! * [`assessment`] carries Plan-016's population, window, observation and
//!   availability types unchanged. Nothing in the static path references it: a
//!   static admission requires, contains and mints no population, snapshot,
//!   window, workflow instance, relationship instance, observation record,
//!   progress record or observation closure.
#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod assessment;
mod canonical;
mod component;
mod configuration;
mod correspondence;
mod decimal;
mod digest;
mod endpoint;
mod export;
mod inventory;
mod locus;
mod model;
pub mod refusal;
mod relationship;
mod revision;
mod static_bundle;

pub use canonical::{
    canonical_digest, canonical_json, canonical_json_from_bytes, configuration_digest,
    document_digest, ArrayDeclarations, ArrayDisposition, CanonicalPolicy, NumericResourceLimit,
};
pub use component::ComponentDeclaration;
pub use configuration::{ConfigurationDocument, ResourceLimits};
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
pub use model::{
    DefaultKind, FieldContract, LegacyV1Field, ModelContract, ModelSelection, ModelType,
    Multiplicity, Presence, ProfileSelection, V1Projection,
};
pub use refusal::Refusal;
pub use relationship::{
    EndpointProjectionLoss, RelationshipDeclaration, RelationshipDirection, RelationshipEndpoint,
    RelationshipOwnership, RelationshipSemantics, RequestedEndpointProjection,
};
pub use revision::{
    NativeSourceLabel, Revision, ADMISSIBLE_REVISION_NAMESPACES, NATIVE_REVISION_NAMESPACE,
    PRODUCER_REVISION_NAMESPACE,
};
pub use static_bundle::{
    AdmissionRegistry, AdmittedBundleKey, AdmittedStaticBundle, StaticClosure,
    StaticProducerBundle, ASSESSMENT_MEMBER_NAMES, INTERFACE_VERSION,
};

/// The only baseline producer interface version accepted by this crate.
pub const BASELINE_VERSION: &str = "1.2.0";
