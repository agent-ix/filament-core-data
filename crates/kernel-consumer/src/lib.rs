//! An independent consumer of the packaged semantic-kernel Rust crate.

/// The semantic identity read from the generated crate's public provenance
/// surface, not duplicated by this consumer.
pub fn package_identity() -> &'static str {
	agent_ix_semantic_kernel::provenance::PACKAGE_IDENTITY
}
