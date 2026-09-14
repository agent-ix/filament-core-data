//! PatternConstraintRegex
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraintRegex.
//!
//! Unknown policy: `reject`, which is inert for a
//! `scalar` — the kind has no unknown member for a policy to govern. The
//! declared value is carried verbatim in this type's metadata constant.

use serde::{Deserialize, Serialize};

/// PatternConstraintRegex
///
/// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraintRegex.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct PatternConstraintRegex(String);

impl PatternConstraintRegex {
    /// Builds the value, enforcing every constraint the contract declares
    /// on it. Deserialization routes through this constructor, so a value
    /// that violates a constraint cannot arrive from the wire either.
    pub fn try_new(value: String) -> Result<Self, crate::support::ValidationError> {
        Ok(Self(value))
    }

    /// The wrapped value.
    pub fn get(&self) -> &String {
        &self.0
    }

    /// The wrapped value, consuming the newtype.
    pub fn into_inner(self) -> String {
        self.0
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for PatternConstraintRegex {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let inner = <String as Deserialize>::deserialize(deserializer)?;
        Self::try_new(inner).map_err(serde::de::Error::custom)
    }
}
