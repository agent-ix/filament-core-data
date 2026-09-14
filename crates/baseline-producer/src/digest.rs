// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The four-member digest selection of
//! [FR-112](../../../spec/functional/FR-112-emit-versioned-digest-selections.md).
//!
//! Every digest this producer authors is
//! `{ algorithm, domain, version, value }`, mapping member for member onto the
//! pinned consumer `SelectedDigest { domain, version, algorithm, value }`
//! (`ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`,
//! revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, an assumed external
//! contract this crate maps onto and never edits — FND-1760).
//!
//! Three properties are obligations rather than conveniences.
//!
//! * `version` is a separately **authored** member. It is the digest-domain
//!   normalization revision the configuration document selects, and it is never
//!   derived from the domain spelling (FR-112-CON-3). That is why
//!   [`DigestSelection::validate_domain`] takes a domain *and* a version: there
//!   is no function here that can produce one from the other.
//! * Outside the closed admissible vocabulary and inside it but unselected by
//!   the configuration document are **two** refusals, not one (FND-1723).
//! * The consumer-owned `ArtifactRef.digest` is one raw-byte digest string, not
//!   a selection. It is modelled by [`RawByteDigest`], which is admitted and
//!   never refused as a malformed selection (FR-112-CON-4, FR-112-AC-6).

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::refusal::{
    Refusal, DIGEST_ALGORITHM_UNKNOWN, DIGEST_DOMAIN_SUBSTITUTED, DIGEST_DOMAIN_UNKNOWN,
    DIGEST_MISMATCH, DIGEST_SELECTION_UNDECLARED, DIGEST_VALUE_MALFORMED, DIGEST_VERSION_ABSENT,
    DIGEST_VERSION_UNKNOWN,
};
use crate::ConfigurationDocument;

/// The one digest algorithm this interface admits.
pub const DIGEST_ALGORITHM: &str = "sha256";
/// The canonical producer-object digest domain.
pub const CANONICAL_JSON_DOMAIN: &str = "filament-canonical-json-1";
/// The raw-byte digest domain owned by a native consumer artifact.
pub const NATIVE_BYTES_DOMAIN: &str = "quire-native-bytes-1";
/// The authored digest-domain normalization revision of this interface.
pub const DIGEST_DOMAIN_VERSION: &str = "1";

/// The complete closed admissible digest vocabulary of this interface.
///
/// FR-112 fixes these two `(domain, version)` pairs; the configuration document
/// selects among them and declares nothing outside them.
pub const ADMISSIBLE_DIGEST_SELECTIONS: [(&str, &str); 2] = [
    (CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION),
    (NATIVE_BYTES_DOMAIN, DIGEST_DOMAIN_VERSION),
];

/// One configuration-declared digest domain and normalization revision.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DigestDomainSelection {
    /// The selected digest domain.
    pub domain: String,
    /// The selected digest-domain normalization revision.
    pub version: String,
}

impl DigestDomainSelection {
    /// Declares one digest domain/version selection.
    pub fn new(domain: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            domain: domain.into(),
            version: version.into(),
        }
    }

    /// The two selections a bundle emitting both digest classes declares.
    pub fn baseline() -> BTreeSet<Self> {
        ADMISSIBLE_DIGEST_SELECTIONS
            .into_iter()
            .map(|(domain, version)| Self::new(domain, version))
            .collect()
    }
}

/// A producer-authored four-member digest selection.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DigestSelection {
    /// Digest algorithm; this interface fixes it to SHA-256.
    pub algorithm: String,
    /// The named byte domain.
    pub domain: String,
    /// The authored digest-domain normalization revision, never derived from `domain`.
    pub version: String,
    /// `sha256:` followed by 64 lowercase hexadecimal digits.
    pub value: String,
}

impl DigestSelection {
    /// Authors a canonical producer-object digest selection over an already computed value.
    pub fn canonical(value: impl Into<String>) -> Self {
        Self {
            algorithm: DIGEST_ALGORITHM.into(),
            domain: CANONICAL_JSON_DOMAIN.into(),
            version: DIGEST_DOMAIN_VERSION.into(),
            value: value.into(),
        }
    }

    /// Authors a native raw-byte digest selection over an already computed value.
    pub fn native_bytes(value: impl Into<String>) -> Self {
        Self {
            algorithm: DIGEST_ALGORITHM.into(),
            domain: NATIVE_BYTES_DOMAIN.into(),
            version: DIGEST_DOMAIN_VERSION.into(),
            value: value.into(),
        }
    }

    /// Reads a digest selection from one transmitted JSON member.
    ///
    /// This is the seam at which a bare hash string and an absent `version`
    /// become their own refusals rather than a deserialization message: a bare
    /// string refuses as [`DIGEST_VALUE_MALFORMED`] and a three-member object
    /// refuses as [`DIGEST_VERSION_ABSENT`] (FR-112-AC-4, FR-112-AC-5).
    pub fn from_wire(value: &Value) -> Result<Self, Refusal> {
        match value {
            Value::String(text) => Err(Refusal::new(
                DIGEST_VALUE_MALFORMED,
                format!("{text} is a bare hash string, not a four-member digest selection"),
            )),
            Value::Object(members) => {
                if !members.contains_key("version") {
                    return Err(Refusal::new(
                        DIGEST_VERSION_ABSENT,
                        "digest selection declares no version member",
                    ));
                }
                serde_json::from_value(value.clone()).map_err(|error| {
                    Refusal::new(DIGEST_VALUE_MALFORMED, format!("digest selection: {error}"))
                })
            }
            other => Err(Refusal::new(
                DIGEST_VALUE_MALFORMED,
                format!("{other} is not a four-member digest selection"),
            )),
        }
    }

    /// Refuses the exact named domain, its authored version, and the required value spelling.
    ///
    /// A canonical-object digest offered in the native domain, and a native
    /// raw-byte digest offered in the canonical domain, each refuse here as a
    /// substitution; neither is revalidated in the other domain and neither is
    /// read as a cache miss (FR-112-AC-2).
    pub fn validate_domain(&self, domain: &str, version: &str) -> Result<(), Refusal> {
        if self.algorithm != DIGEST_ALGORITHM {
            return Err(Refusal::new(
                DIGEST_ALGORITHM_UNKNOWN,
                format!(
                    "expected algorithm {DIGEST_ALGORITHM}, got {} on {}",
                    self.algorithm, self.value
                ),
            ));
        }
        if self.domain != domain {
            return Err(Refusal::new(
                DIGEST_DOMAIN_SUBSTITUTED,
                format!(
                    "expected domain {domain}, got {} on {}",
                    self.domain, self.value
                ),
            ));
        }
        if self.version.is_empty() {
            return Err(Refusal::new(
                DIGEST_VERSION_ABSENT,
                format!("{} declares no digest-domain version", self.value),
            ));
        }
        if self.version != version {
            return Err(Refusal::new(
                DIGEST_VERSION_UNKNOWN,
                format!(
                    "expected version {version} in domain {domain}, got {} on {}",
                    self.version, self.value
                ),
            ));
        }
        self.validate_value()
    }

    /// Refuses a `domain` or `version` outside the closed admissible vocabulary.
    pub fn validate_vocabulary(&self) -> Result<(), Refusal> {
        if !ADMISSIBLE_DIGEST_SELECTIONS
            .iter()
            .any(|(domain, _)| *domain == self.domain)
        {
            return Err(Refusal::new(
                DIGEST_DOMAIN_UNKNOWN,
                format!(
                    "{} lies outside the closed admissible digest vocabulary",
                    self.domain
                ),
            ));
        }
        if self.version.is_empty() {
            return Err(Refusal::new(
                DIGEST_VERSION_ABSENT,
                format!("{} declares no digest-domain version", self.value),
            ));
        }
        if !ADMISSIBLE_DIGEST_SELECTIONS
            .iter()
            .any(|(domain, version)| *domain == self.domain && *version == self.version)
        {
            return Err(Refusal::new(
                DIGEST_VERSION_UNKNOWN,
                format!(
                    "{}/{} lies outside the closed admissible digest vocabulary",
                    self.domain, self.version
                ),
            ));
        }
        self.validate_value()
    }

    /// Refuses a pair the configuration document does not declare as a selection.
    pub fn validate_selected(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        self.validate_vocabulary()?;
        let declared = DigestDomainSelection::new(&self.domain, &self.version);
        if !configuration.digest_selections.contains(&declared) {
            return Err(Refusal::new(
                DIGEST_SELECTION_UNDECLARED,
                format!(
                    "{} does not declare the in-vocabulary selection {}/{}",
                    configuration.configuration_identity, self.domain, self.version
                ),
            ));
        }
        Ok(())
    }

    /// Refuses a recomputed value differing from this declared value.
    ///
    /// The refusal is blocking. It is not a warning, not a cache miss, and not
    /// an invitation to refetch a different version (FR-112-AC-3).
    pub fn require_recomputed(&self, recomputed: &Self) -> Result<(), Refusal> {
        if self == recomputed {
            return Ok(());
        }
        Err(Refusal::new(
            DIGEST_MISMATCH,
            format!(
                "declared {} in {}/{} but recomputed {} in {}/{}",
                self.value,
                self.domain,
                self.version,
                recomputed.value,
                recomputed.domain,
                recomputed.version
            ),
        ))
    }

    fn validate_value(&self) -> Result<(), Refusal> {
        if !is_sha256_spelling(&self.value) {
            return Err(Refusal::new(
                DIGEST_VALUE_MALFORMED,
                format!(
                    "{} is not sha256: followed by 64 lowercase hexadecimal digits",
                    self.value
                ),
            ));
        }
        Ok(())
    }
}

/// The consumer-owned raw-byte digest string of `ArtifactRef.digest`.
///
/// This member is one digest string, not a four-member selection, and FR-112
/// does not govern it: a locus carrying it is admitted, and it never refuses as
/// a malformed digest selection (FR-112-CON-4, FR-114-AC-4).
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RawByteDigest(String);

impl RawByteDigest {
    /// Admits one raw-byte digest string in the consumer's shared spelling.
    pub fn new(value: impl Into<String>) -> Result<Self, Refusal> {
        let value = value.into();
        if !is_sha256_spelling(&value) {
            return Err(Refusal::new(
                DIGEST_VALUE_MALFORMED,
                format!("{value} is not a raw-byte digest string"),
            ));
        }
        Ok(Self(value))
    }

    /// The digest string, exactly as the consumer carries it.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for RawByteDigest {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

fn is_sha256_spelling(value: &str) -> bool {
    let Some(hex) = value.strip_prefix("sha256:") else {
        return false;
    };
    hex.len() == 64
        && hex
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}
