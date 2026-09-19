//! Provenance constants, each taken verbatim from the compiler request.
//!
//! The correspondence between a constant and the request member it comes
//! from is published in FR-056 rather than inferred here, because the
//! request's member set carries no `SOURCE_DIGEST`, `MANIFEST_DIGEST` or
//! `LOCK_DIGEST` of its own and an implementer would otherwise have to
//! invent the mapping — and the test comparing them would have to invent it
//! a second time.
//!
//! No timestamp, hostname, working directory, user name or absolute path is
//! written here or anywhere else in the crate.

/// The semantic identity of the source the contract was read from.
pub const SOURCE_IDENTITY: &str = "ix://agent-ix/filament-core-data/source/typespec";

/// The version of the source the contract was read from.
pub const SOURCE_VERSION: &str = "1.0.0";

/// The digest of the source the contract was read from.
pub const SOURCE_DIGEST: &str =
    "sha256:0000000000000000000000000000000000000000000000000000000000000000";

/// The semantic contract package this crate was generated from.
pub const PACKAGE_IDENTITY: &str = "agent-ix/conformance";

/// The version of the semantic contract package.
pub const PACKAGE_VERSION: &str = "1.0.0";

/// The digest of the package manifest.
pub const MANIFEST_DIGEST: &str =
    "sha256:1111111111111111111111111111111111111111111111111111111111111111";

/// The digest of the package lock.
pub const LOCK_DIGEST: &str =
    "sha256:2222222222222222222222222222222222222222222222222222222222222222";

/// The lock fingerprint the compiler request carried.
pub const LOCK_FINGERPRINT: &str =
    "sha256:b6a86fe50f4ae68aac605371f97e27ac111e923b11ea2f1c8e2f662999aaf6d6";

/// The IR contract version the document declared.
pub const CONTRACT_VERSION: &str = "2.0.0";

/// The semantic identity of the backend that generated this crate.
pub const GENERATOR_IDENTITY: &str = "ix://agent-ix/filament-core-data/rust-backend";

/// The version of the backend that generated this crate.
pub const GENERATOR_VERSION: &str = "0.1.0";

/// The Cargo package name derived from the contract package identity.
pub const CRATE_NAME: &str = "agent-ix-conformance";
