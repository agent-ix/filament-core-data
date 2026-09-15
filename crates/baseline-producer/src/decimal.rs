// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The authored exact decimal of FR-118.
//!
//! A decimal authored through the typed API carries its lexeme, not a binary
//! floating-point approximation of it. Binary64 is not merely avoided on this
//! path: it is unrepresentable, because the only state a [`ProducerDecimal`]
//! holds is the validated lexeme (FR-118-CON-1, NFR-036-M-5).

use serde::de::{Deserialize, Deserializer, Error as _};
use serde::ser::{Serialize, Serializer};

use crate::Refusal;

/// One authored exact decimal, held as its validated JSON number lexeme.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ProducerDecimal(String);

impl ProducerDecimal {
    /// Validates one authored decimal lexeme.
    ///
    /// The lexeme must satisfy the JSON number grammar exactly as written: an
    /// optional `-`, an integer part with no redundant leading zero, an
    /// optional fraction of at least one digit, and an optional exponent. It is
    /// validated by reading its characters, never by parsing it into a number,
    /// so no digit is rounded in the course of accepting it.
    ///
    /// The stored lexeme is the spelling the pinned parser round-trips, which
    /// differs from an accepted input in at most one character: an exponent
    /// written `e7` is stored `e+7`. Every digit is preserved, and the
    /// constructor refuses rather than storing a lexeme whose digits differ
    /// from the authored ones.
    pub fn new(lexeme: impl Into<String>) -> Result<Self, Refusal> {
        let lexeme = lexeme.into();
        admit_json_number_grammar(&lexeme)?;
        let stored = serde_json::from_str::<serde_json::Number>(&lexeme)
            .map_err(|error| Refusal::new("INVALID_NUMBER", format!("{lexeme}: {error}")))?
            .as_str()
            .to_owned();
        if digits_of(&stored) != digits_of(&lexeme) {
            return Err(Refusal::new(
                "INVALID_NUMBER",
                format!("{lexeme} does not round-trip digit for digit as {stored}"),
            ));
        }
        Ok(Self(stored))
    }

    /// The exact authored lexeme, digit for digit.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Consumes the decimal, returning its exact authored lexeme.
    pub fn into_inner(self) -> String {
        self.0
    }
}

/// Refuses anything the JSON number grammar does not admit, reading characters only.
fn admit_json_number_grammar(lexeme: &str) -> Result<(), Refusal> {
    let refuse = || {
        Err(Refusal::new(
            "INVALID_NUMBER",
            format!("{lexeme} is not a JSON number lexeme"),
        ))
    };
    let unsigned = lexeme.strip_prefix('-').unwrap_or(lexeme);
    let (coefficient, exponent) = match unsigned.split_once(['e', 'E']) {
        Some((coefficient, exponent)) => (coefficient, Some(exponent)),
        None => (unsigned, None),
    };
    let (integer, fraction) = match coefficient.split_once('.') {
        Some((integer, fraction)) => (integer, Some(fraction)),
        None => (coefficient, None),
    };
    if integer.is_empty() || !integer.bytes().all(|byte| byte.is_ascii_digit()) {
        return refuse();
    }
    if integer.len() > 1 && integer.starts_with('0') {
        return refuse();
    }
    if let Some(fraction) = fraction {
        if fraction.is_empty() || !fraction.bytes().all(|byte| byte.is_ascii_digit()) {
            return refuse();
        }
    }
    if let Some(exponent) = exponent {
        let magnitude = exponent.strip_prefix(['+', '-']).unwrap_or(exponent);
        if magnitude.is_empty() || !magnitude.bytes().all(|byte| byte.is_ascii_digit()) {
            return refuse();
        }
    }
    Ok(())
}

/// The decimal digits of a lexeme, in order, with every other character dropped.
fn digits_of(lexeme: &str) -> Vec<u8> {
    lexeme.bytes().filter(u8::is_ascii_digit).collect()
}

impl std::fmt::Display for ProducerDecimal {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl Serialize for ProducerDecimal {
    /// Emits the lexeme as a JSON number, digit for digit.
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serde_json::from_str::<serde_json::Number>(&self.0)
            .map_err(serde::ser::Error::custom)?
            .serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for ProducerDecimal {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let number = serde_json::Number::deserialize(deserializer)?;
        Self::new(number.as_str()).map_err(D::Error::custom)
    }
}
