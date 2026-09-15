// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! Filament Canonical JSON 1: the exact-decimal canonical seam of
//! [FR-118](../../../spec/functional/FR-118-validate-filament-canonical-json-1.md).
//!
//! Three properties of this module are obligations rather than conveniences.
//!
//! * The numeric path never touches binary floating point. `serde_json` is
//!   compiled with `arbitrary_precision`, so a parsed number keeps the original
//!   lexeme and [`serde_json::Number::as_str`] reads it exactly. Without that
//!   feature the lexeme reaching [`canonical_number`] has already been through
//!   binary64, and `0.1000000000000000055511151231257827` canonicalizes to `0.1`
//!   (FND-1750, D18). `canonical_number` itself was never wrong and its
//!   algorithm is unchanged; only the source of its two limits moved.
//! * Every numeric limit comes from the configuration document's declared
//!   `resourceLimits.numericResourceLimit` member, never from a host constant,
//!   a build target, or a pointer width (FR-118-CON-7, E8/E11, FND-1814). A
//!   configuration declaring no such member refuses, naming it.
//! * The canonicalizer sorts object keys itself, by Unicode scalar value, and
//!   never inherits a map implementation's iteration order (FR-118-CON-5, D15,
//!   FND-1751). Set arrays are sorted by their members' canonical bytes; every
//!   other array keeps the producer-declared order. No array is a set by
//!   inference from its element type (FR-118-CON-3).

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest as _, Sha256};

use crate::{ConfigurationDocument, DigestSelection, Refusal};

/// The structural nesting bound of the canonicalizer.
///
/// This is a recursion bound on document structure, not a numeric limit: the
/// numeric limits FR-118 governs are declared by the configuration document and
/// live in [`NumericResourceLimit`].
const MAX_CANONICAL_NESTING_DEPTH: usize = 128;

/// The configuration-declared numeric resource limit of FR-118.
///
/// Both members carry a stated finite value. They are read from the
/// configuration document and are never defaulted, widened, or inferred from
/// the host.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NumericResourceLimit {
    /// Largest admitted count of significant base-10 coefficient digits.
    pub maximum_coefficient_digits: u64,
    /// Largest admitted absolute base-10 exponent.
    pub maximum_exponent_magnitude: u64,
}

impl NumericResourceLimit {
    /// Declares a numeric resource limit from two stated finite values.
    pub fn new(maximum_coefficient_digits: u64, maximum_exponent_magnitude: u64) -> Self {
        Self {
            maximum_coefficient_digits,
            maximum_exponent_magnitude,
        }
    }

    /// Refuses a numeric lexeme before canonicalization.
    ///
    /// The count measured is the significant coefficient digits of the parsed
    /// number — leading and trailing coefficient zeroes are not significant —
    /// and the exponent magnitude is the absolute declared base-10 exponent.
    /// A refused value is never rounded and never replaced by a binary64
    /// substitute: the refusal is returned instead of any value at all
    /// (FR-118-AC-8).
    pub fn admit(&self, lexeme: &str) -> Result<(), Refusal> {
        let unsigned = lexeme.strip_prefix('-').unwrap_or(lexeme);
        let (coefficient, exponent) = match unsigned.split_once(['e', 'E']) {
            Some((coefficient, exponent)) => (coefficient, Some(exponent)),
            None => (unsigned, None),
        };
        let (integer, fraction) = coefficient.split_once('.').unwrap_or((coefficient, ""));
        let digits = format!("{integer}{fraction}");
        let significant = digits
            .trim_start_matches('0')
            .trim_end_matches('0')
            .bytes()
            .filter(u8::is_ascii_digit)
            .count();
        if u64::try_from(significant).is_ok_and(|count| count > self.maximum_coefficient_digits) {
            return Err(Refusal::new(
                "NUMBER_RESOURCE_LIMIT",
                format!(
                    "{lexeme} carries {significant} significant coefficient digits, past the declared maximumCoefficientDigits {}",
                    self.maximum_coefficient_digits
                ),
            ));
        }
        if let Some(exponent) = exponent {
            // A lexeme whose exponent is not an integer at all is refused by
            // `canonical_number` as an invalid number, not as an over-limit one.
            if let Ok(exponent) = exponent.parse::<i64>() {
                if exponent.unsigned_abs() > self.maximum_exponent_magnitude {
                    return Err(Refusal::new(
                        "NUMBER_RESOURCE_LIMIT",
                        format!(
                            "{lexeme} carries exponent magnitude {}, past the declared maximumExponentMagnitude {}",
                            exponent.unsigned_abs(),
                            self.maximum_exponent_magnitude
                        ),
                    ));
                }
            }
        }
        Ok(())
    }

    /// Refuses a canonical decimal expansion wider than the declared limits allow.
    fn admit_expansion(&self, expansion: &str) -> Result<(), Refusal> {
        let digits = expansion.bytes().filter(u8::is_ascii_digit).count();
        let admitted = self
            .maximum_coefficient_digits
            .saturating_add(self.maximum_exponent_magnitude);
        if u64::try_from(digits).is_ok_and(|count| count > admitted) {
            return Err(Refusal::new(
                "NUMBER_RESOURCE_LIMIT",
                format!(
                    "canonical decimal expansion of {digits} digits is past the declared limit {admitted}"
                ),
            ));
        }
        Ok(())
    }
}

/// Whether an array's membership or its order is the declared property.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArrayDisposition {
    /// Membership is declared; the emitted order is the members' canonical bytes.
    Set,
    /// Order is declared; the producer-declared order is emitted unchanged.
    SemanticOrder,
}

/// The explicit, per-member declaration of which arrays are sets.
///
/// Membership and order are two separate declarations, and equal member
/// spelling never merges them (FR-118-CON-3): a member declared a set cannot
/// also be declared a semantic-order array, and an undeclared array is never
/// treated as a set by inference from its element type.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ArrayDeclarations {
    sets: BTreeSet<String>,
    semantic_order: BTreeSet<String>,
}

impl ArrayDeclarations {
    /// An empty declaration, in which every array carries semantic order.
    pub fn new() -> Self {
        Self::default()
    }

    /// The baseline 1.2 declaration for the members this producer emits.
    ///
    /// Every entry is listed by name. Nothing here is derived from a Rust type:
    /// a `BTreeSet` member is not a set because it is a `BTreeSet`, it is a set
    /// because it is declared one.
    pub fn baseline() -> Self {
        let mut declarations = Self::new();
        for member in [
            "adapterIdentities",
            "componentIdentities",
            "digestSelections",
            "endpointIdentities",
            "mappingTargets",
            "profileIdentities",
            "relationshipIdentities",
            "revisionNamespaces",
            "roleIdentities",
            "trustedReferences",
        ] {
            declarations
                .sets
                .insert(member.to_owned())
                .then_some(())
                .expect("the baseline set declaration lists each member once");
        }
        for member in [
            "availability",
            "correspondences",
            "exportPath",
            "exports",
            "members",
            "nativeDefinitionClosure",
            "observationRecordIdentities",
            "observationRecords",
            "relationships",
        ] {
            declarations
                .semantic_order
                .insert(member.to_owned())
                .then_some(())
                .expect("the baseline semantic-order declaration lists each member once");
        }
        declarations
    }

    /// Declares one member a set array.
    pub fn with_set(mut self, member: &str) -> Result<Self, Refusal> {
        if self.semantic_order.contains(member) {
            return Err(Refusal::new(
                "ARRAY_DISPOSITION_CONFLICT",
                format!("{member} is already declared a semantic-order array"),
            ));
        }
        self.sets.insert(member.to_owned());
        Ok(self)
    }

    /// Declares one member a semantic-order array.
    pub fn with_semantic_order(mut self, member: &str) -> Result<Self, Refusal> {
        if self.sets.contains(member) {
            return Err(Refusal::new(
                "ARRAY_DISPOSITION_CONFLICT",
                format!("{member} is already declared a set array"),
            ));
        }
        self.semantic_order.insert(member.to_owned());
        Ok(self)
    }

    /// The declared disposition of one member.
    pub fn disposition(&self, member: &str) -> ArrayDisposition {
        if self.sets.contains(member) {
            ArrayDisposition::Set
        } else {
            ArrayDisposition::SemanticOrder
        }
    }

    /// Every member declared a set, in Unicode scalar-value order.
    pub fn declared_sets(&self) -> impl Iterator<Item = &str> {
        self.sets.iter().map(String::as_str)
    }

    /// Every member declared a semantic-order array, in Unicode scalar-value order.
    pub fn declared_semantic_order(&self) -> impl Iterator<Item = &str> {
        self.semantic_order.iter().map(String::as_str)
    }
}

/// The declared inputs a canonicalization run reads, and the only ones it reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CanonicalPolicy {
    /// The configuration-declared numeric resource limit.
    pub numeric_resource_limit: NumericResourceLimit,
    /// The per-member set-versus-semantic-order declaration.
    pub array_declarations: ArrayDeclarations,
}

impl CanonicalPolicy {
    /// Builds a policy from a declared numeric limit and array declaration.
    pub fn new(
        numeric_resource_limit: NumericResourceLimit,
        array_declarations: ArrayDeclarations,
    ) -> Self {
        Self {
            numeric_resource_limit,
            array_declarations,
        }
    }

    /// Reads the policy from a configuration document's declared members.
    ///
    /// A configuration document declaring no `resourceLimits.numericResourceLimit`
    /// refuses here, naming the absent member, and no host-chosen limit is
    /// applied in its place (FR-118-AC-12, FR-118-CON-7).
    pub fn from_configuration(configuration: &ConfigurationDocument) -> Result<Self, Refusal> {
        let Some(limit) = configuration
            .resource_limits
            .numeric_resource_limit
            .as_ref()
        else {
            return Err(Refusal::new(
                "NUMERIC_RESOURCE_LIMIT_ABSENT",
                format!(
                    "{} declares no resourceLimits.numericResourceLimit",
                    configuration.configuration_identity
                ),
            ));
        };
        Ok(Self::new(limit.clone(), ArrayDeclarations::baseline()))
    }
}

/// Returns a configuration's canonical semantic-input digest, excluding its own digest member.
pub fn configuration_digest(
    configuration: &ConfigurationDocument,
) -> Result<DigestSelection, Refusal> {
    let policy = CanonicalPolicy::from_configuration(configuration)?;
    document_digest(configuration, &policy)
}

/// Returns a document's canonical digest, excluding its top-level `digest` member.
///
/// The self-digest exclusion of FR-118-CON-4 is applied here and only here: the
/// canonicalizer itself emits whatever members it is handed.
pub fn document_digest<T: Serialize>(
    document: &T,
    policy: &CanonicalPolicy,
) -> Result<DigestSelection, Refusal> {
    let mut value = serde_json::to_value(document)
        .map_err(|error| Refusal::new("SERIALIZATION_FAILURE", error.to_string()))?;
    let Some(object) = value.as_object_mut() else {
        return Err(Refusal::new(
            "SERIALIZATION_FAILURE",
            "document did not serialize as an object",
        ));
    };
    object.remove("digest");
    canonical_digest(&value, policy)
}

/// Returns the canonical producer-object digest for a JSON value.
pub fn canonical_digest(
    value: &Value,
    policy: &CanonicalPolicy,
) -> Result<DigestSelection, Refusal> {
    let bytes = canonical_json(value, policy)?.into_bytes();
    Ok(DigestSelection::canonical(format!(
        "sha256:{:x}",
        Sha256::digest(bytes)
    )))
}

/// Emits Filament Canonical JSON 1 for a JSON value.
pub fn canonical_json(value: &Value, policy: &CanonicalPolicy) -> Result<String, Refusal> {
    canonical_json_at(value, 0, policy, None)
}

/// Emits Filament Canonical JSON 1 for a transmitted document's bytes.
///
/// A byte sequence that is not valid Unicode refuses here and digests nothing
/// (FR-118-AC-6): the refusal precedes parsing, so no string of the document
/// ever reaches the canonicalizer.
pub fn canonical_json_from_bytes(
    bytes: &[u8],
    policy: &CanonicalPolicy,
) -> Result<String, Refusal> {
    let text = std::str::from_utf8(bytes).map_err(|error| {
        Refusal::new(
            "INVALID_UNICODE",
            format!("document is not valid Unicode: {error}"),
        )
    })?;
    let value: Value = serde_json::from_str(text)
        .map_err(|error| Refusal::new("INVALID_UNICODE", error.to_string()))?;
    canonical_json(&value, policy)
}

fn canonical_json_at(
    value: &Value,
    depth: usize,
    policy: &CanonicalPolicy,
    member: Option<&str>,
) -> Result<String, Refusal> {
    if depth > MAX_CANONICAL_NESTING_DEPTH {
        return Err(Refusal::new(
            "NESTING_RESOURCE_LIMIT",
            "canonical JSON nesting exceeds 128",
        ));
    }
    match value {
        Value::Null => Ok("null".into()),
        Value::Bool(boolean) => Ok(boolean.to_string()),
        // The exact lexeme as parsed. `as_str` is available because this crate
        // compiles `serde_json` with `arbitrary_precision`; `to_string` would
        // have been through binary64 without it.
        Value::Number(number) => canonical_number(number.as_str(), &policy.numeric_resource_limit),
        Value::String(string) => Ok(canonical_string(string)),
        Value::Array(values) => {
            let mut members = values
                .iter()
                .map(|item| canonical_json_at(item, depth + 1, policy, None))
                .collect::<Result<Vec<_>, _>>()?;
            if member.is_some_and(|member| {
                policy.array_declarations.disposition(member) == ArrayDisposition::Set
            }) {
                members.sort_by(|left, right| left.as_bytes().cmp(right.as_bytes()));
            }
            Ok(format!("[{}]", members.join(",")))
        }
        Value::Object(object) => {
            // Sorted here, by this canonicalizer, in Unicode scalar-value
            // order. The iteration order of whatever map carried these members
            // is never the emitted order (FR-118-CON-5).
            let mut entries: Vec<(&String, &Value)> = object.iter().collect();
            entries.sort_by(|left, right| left.0.chars().cmp(right.0.chars()));
            entries
                .into_iter()
                .map(|(key, value)| {
                    Ok(format!(
                        "{}:{}",
                        canonical_string(key),
                        canonical_json_at(value, depth + 1, policy, Some(key))?
                    ))
                })
                .collect::<Result<Vec<_>, Refusal>>()
                .map(|parts| format!("{{{}}}", parts.join(",")))
        }
    }
}

fn canonical_string(value: &str) -> String {
    let mut output = String::with_capacity(value.len() + 2);
    output.push('"');
    for character in value.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\u{0000}'..='\u{001f}' => {
                use std::fmt::Write as _;
                write!(output, "\\u{:04x}", u32::from(character))
                    .expect("writing to String cannot fail");
            }
            _ => output.push(character),
        }
    }
    output.push('"');
    output
}

fn canonical_number(raw: &str, limit: &NumericResourceLimit) -> Result<String, Refusal> {
    limit.admit(raw)?;
    let negative = raw.starts_with('-');
    let unsigned = raw.strip_prefix('-').unwrap_or(raw);
    let (coefficient, exponent) = match unsigned.split_once(['e', 'E']) {
        Some((coefficient, exponent)) => (
            coefficient,
            exponent
                .parse::<i32>()
                .map_err(|_| Refusal::new("INVALID_NUMBER", raw))?,
        ),
        None => (unsigned, 0),
    };
    let (integer, fraction) = coefficient.split_once('.').unwrap_or((coefficient, ""));
    if integer.is_empty()
        || !integer.bytes().all(|byte| byte.is_ascii_digit())
        || !fraction.bytes().all(|byte| byte.is_ascii_digit())
    {
        return Err(Refusal::new("INVALID_NUMBER", raw));
    }
    let mut digits = format!("{integer}{fraction}");
    let mut decimal = i64::try_from(integer.len())
        .map_err(|_| Refusal::new("NUMBER_RESOURCE_LIMIT", "numeric input is too large"))?
        + i64::from(exponent);
    while digits.starts_with('0') {
        digits.remove(0);
        decimal -= 1;
    }
    if digits.is_empty() {
        return Ok("0".into());
    }
    while digits.ends_with('0') {
        digits.pop();
    }
    let result = if decimal <= 0 {
        let zeroes = usize::try_from(-decimal).map_err(|_| {
            Refusal::new(
                "NUMBER_RESOURCE_LIMIT",
                "decimal expansion is outside resource limit",
            )
        })?;
        format!("0.{}{}", "0".repeat(zeroes), digits)
    } else {
        let position = usize::try_from(decimal).map_err(|_| {
            Refusal::new(
                "NUMBER_RESOURCE_LIMIT",
                "decimal expansion is outside resource limit",
            )
        })?;
        if position >= digits.len() {
            format!("{}{}", digits, "0".repeat(position - digits.len()))
        } else {
            format!("{}.{}", &digits[..position], &digits[position..])
        }
    };
    limit.admit_expansion(&result)?;
    Ok(if negative {
        format!("-{result}")
    } else {
        result
    })
}
