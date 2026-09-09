//! The spec-bundle extraction frontend (agent-ix/filament-core-data#36).
//!
//! Task-127 lays the crate down; Task-128 reads a bundle through the Quire
//! extraction contract (FR-091) and lays down the FR-096 registry; the
//! lowering lands in Task-129 onward.
#![forbid(unsafe_code)]

pub mod bundle;
pub mod diagnostics;
pub mod extract;

pub use bundle::{Bundle, Document, ObjectType, Package, Refusal};
pub use diagnostics::{Code, Diagnostic, Locus, Severity};
pub use extract::{extract, Extracted, Extractions};
