// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The blocking input refusal and its stable codes.
//!
//! Every refusal this crate emits is blocking. None of them is a warning, a
//! cache miss, or an invitation to refetch a different version: FR-112, FR-113,
//! FR-114, FR-115, FR-116, FR-117 and FR-118 each state that prohibition
//! separately, and the type below has no representation for a non-blocking
//! outcome at all.
//!
//! Each code names what was absent, foreign, substituted, duplicated, or stale,
//! and each message names the offending record, so a refusal identifies its
//! subject without the caller re-deriving it.

/// A validation refusal with an identity-preserving, stable code.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Refusal {
    /// Stable refusal code.
    pub code: &'static str,
    /// Human-readable, deterministic detail.
    pub message: String,
}

impl Refusal {
    pub(crate) fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for Refusal {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for Refusal {}

/// A digest selection carries an algorithm this interface does not admit.
pub const DIGEST_ALGORITHM_UNKNOWN: &str = "DIGEST_ALGORITHM_UNKNOWN";
/// A digest was offered in a domain other than the one its class requires.
pub const DIGEST_DOMAIN_SUBSTITUTED: &str = "DIGEST_DOMAIN_SUBSTITUTED";
/// A digest `domain` lies outside the closed admissible digest vocabulary.
pub const DIGEST_DOMAIN_UNKNOWN: &str = "DIGEST_DOMAIN_UNKNOWN";
/// A digest selection carries no `version` member.
pub const DIGEST_VERSION_ABSENT: &str = "DIGEST_VERSION_ABSENT";
/// A digest `version` lies outside the closed admissible digest vocabulary.
pub const DIGEST_VERSION_UNKNOWN: &str = "DIGEST_VERSION_UNKNOWN";
/// A digest `value` is not `sha256:` followed by 64 lowercase hexadecimal digits.
///
/// This is also the refusal a bare hash string offered in place of a four-member
/// selection carries (FR-112-CON-1): a bare string has no domain, no version and
/// no algorithm, so it is not a selection at all.
pub const DIGEST_VALUE_MALFORMED: &str = "DIGEST_VALUE_MALFORMED";
/// A recomputed digest `value` differs from the declared one.
pub const DIGEST_MISMATCH: &str = "DIGEST_MISMATCH";
/// An in-vocabulary domain/version pair the configuration document does not select.
///
/// Distinct from [`DIGEST_DOMAIN_UNKNOWN`] and [`DIGEST_VERSION_UNKNOWN`] on
/// purpose: outside the closed vocabulary and inside it but unselected are two
/// separate refusals (FND-1723, FR-112-CON-5).
pub const DIGEST_SELECTION_UNDECLARED: &str = "DIGEST_SELECTION_UNDECLARED";

/// A revision carries no `namespace` member.
///
/// This is also the refusal a bare revision string carries (FR-113-CON-2): a
/// bare string carries no namespace, so it is not a revision selection.
pub const REVISION_NAMESPACE_ABSENT: &str = "REVISION_NAMESPACE_ABSENT";
/// A revision `namespace` lies outside the closed admissible namespace vocabulary.
pub const REVISION_NAMESPACE_UNKNOWN: &str = "REVISION_NAMESPACE_UNKNOWN";
/// An in-vocabulary namespace the configuration document does not declare.
///
/// Distinct from [`REVISION_NAMESPACE_UNKNOWN`] for the reason FND-1723 gives.
pub const REVISION_NAMESPACE_UNDECLARED: &str = "REVISION_NAMESPACE_UNDECLARED";
/// A revision of one class was offered under the other class's namespace.
pub const REVISION_NAMESPACE_SUBSTITUTED: &str = "REVISION_NAMESPACE_SUBSTITUTED";
/// A revision carries no `value`.
pub const REVISION_VALUE_ABSENT: &str = "REVISION_VALUE_ABSENT";

/// An authored identity is absent where the interface requires one.
pub const IDENTITY_ABSENT: &str = "IDENTITY_ABSENT";

/// A component record declares no source provenance locus.
pub const COMPONENT_PROVENANCE_ABSENT: &str = "COMPONENT_PROVENANCE_ABSENT";
/// No declaration source document supplies a component's locus.
///
/// Distinct from [`COMPONENT_PROVENANCE_ABSENT`]: the record carries a locus, but
/// no supplied declaration source document accounts for it, and none is
/// synthesized for it (FR-114-CON-5, FND-1765).
pub const COMPONENT_PROVENANCE_UNSUPPLIED: &str = "COMPONENT_PROVENANCE_UNSUPPLIED";
/// An endpoint record declares no source provenance locus.
pub const ENDPOINT_PROVENANCE_ABSENT: &str = "ENDPOINT_PROVENANCE_ABSENT";
/// No declaration source document supplies an endpoint's locus.
pub const ENDPOINT_PROVENANCE_UNSUPPLIED: &str = "ENDPOINT_PROVENANCE_UNSUPPLIED";
/// An endpoint record names no authored role.
pub const ENDPOINT_ROLE_ABSENT: &str = "ENDPOINT_ROLE_ABSENT";
/// An endpoint record names no multiplicity.
pub const ENDPOINT_MULTIPLICITY_ABSENT: &str = "ENDPOINT_MULTIPLICITY_ABSENT";
/// A locus names no formal document.
pub const FORMAL_DOCUMENT_ABSENT: &str = "FORMAL_DOCUMENT_ABSENT";
/// A locus names no authored formal document revision.
pub const FORMAL_REVISION_ABSENT: &str = "FORMAL_REVISION_ABSENT";
/// A declared record lies outside a closed declared inventory, or claims another one.
pub const INVENTORY_MEMBER_UNLISTED: &str = "INVENTORY_MEMBER_UNLISTED";
/// A membership carries a completeness disposition the FR-110 declaration does not declare.
///
/// The `unknown` disposition an explicitly incomplete inventory retains is
/// FR-110's; a record may carry it but may not mint it, so a membership claiming
/// a completeness its inventory declaration contradicts refuses under this code
/// in either direction (FR-114-CON-6).
pub const INVENTORY_INCOMPLETE_UNKNOWN: &str = "INVENTORY_INCOMPLETE_UNKNOWN";
