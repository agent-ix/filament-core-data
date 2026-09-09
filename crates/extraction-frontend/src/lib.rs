//! The spec-bundle extraction frontend (agent-ix/filament-core-data#36).
//!
//! Task-127 lays the crate down; Task-128 reads a bundle through the Quire
//! extraction contract (FR-091) and lays down the FR-096 registry; the
//! lowering lands in Task-129 onward; Task-131 classifies every type token
//! (FR-092) and mints the kernel scalars a bundle uses; Task-132 lowers
//! records, fields, constraints and enumerations (FR-093) and enforces the
//! NFR-031 limits; Task-133 lowers relationships, operations and clauses
//! (FR-094); Task-134 assembles the document, decides it through the
//! independent reader, canonicalizes, fingerprints and writes it atomically
//! (FR-097) behind the [`lift`] entry the command line calls.
#![forbid(unsafe_code)]

pub mod bundle;
pub mod canonical;
pub mod clauses;
pub mod diagnostics;
pub mod document;
pub mod edges;
pub mod enumeration;
pub mod envelope;
pub mod extract;
pub mod identity;
pub mod lift;
pub mod limits;
pub mod lower;
pub mod provenance;
pub mod resolve;
pub mod rows;
pub mod scalars;
pub mod validate;
pub mod write;

pub use bundle::{Bundle, Document, ObjectType, Package, Refusal};
pub use canonical::{canonical_bytes, reader_json, sort_node_lists};
pub use clauses::{lower_clauses, lower_operations, Clause, Operation, Returns, SourceSpan};
pub use diagnostics::{
    is_blocked, message_with_token, render_registry_doc, sort_diagnostics, Code, Diagnostic,
    Disposition, Locus, NotLoweredReason, Severity, WireCode,
};
pub use document::{assemble, CONTRACT_VERSION};
pub use edges::{frontmatter_edges, lower_relationships, Relationship, PART_OF};
pub use enumeration::{lower_enum, values_rows, Unsatisfied, ValueRow};
pub use envelope::{Envelope, ModuleManifest, PackageBlock, SourceBlock};
pub use extract::{extract, Extracted, Extractions};
pub use identity::{slug, NodeKind, PackageIdentity, Unsluggable};
pub use lift::{emit, lift, LiftOutcome, LiftRequest};
pub use limits::{Limit, Limits, LimitsError};
pub use lower::{
    lower_bundle, lower_record, ArtifactContext, Loss, LowerError, Lowered, Lowering,
    TypeDefinition,
};
pub use provenance::{provenance_record, Provenance};
pub use resolve::{
    classify, pass_one, pass_two, resolve, ArtifactRef, Outcome, Outcomes, Resolution, Resolutions,
    Resolved, Site, Unresolved,
};
pub use scalars::{definitions, KernelScalar, ScalarDefinition, KERNEL_SCALAR_EXTENSION};
pub use validate::{validate, validate_document, ValidDocument};
pub use write::{check_output, write_lift, Emission, Fingerprint, OutputPaths};
