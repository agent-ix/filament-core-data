//! The runtime consumer of the generated crate (FR-061).
//!
//! The crate's own surface is deliberately thin. Everything this consumer
//! claims is exchanged *through* the generated crate, and the JSON front door
//! it is fed through is `serde_json`, which FR-061 declares a `dev-dependency`
//! — a test-time dependency of this consumer and never a runtime dependency of
//! the generated crate. The claims therefore live in `tests/`, where that
//! dependency is available, and this module carries only what a claim needs
//! that has no JSON in it.

/// The semantic identity of the contract package this consumer exchanges
/// values with, read back from the generated crate rather than written out.
pub fn package_identity() -> &'static str {
    agent_ix_conformance::provenance::PACKAGE_IDENTITY
}

/// The number of types the generated crate exports.
pub fn exported_type_count() -> usize {
    agent_ix_conformance::TYPES.len()
}
