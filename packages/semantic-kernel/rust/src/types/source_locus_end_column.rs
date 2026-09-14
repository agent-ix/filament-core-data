//! SourceLocusEndColumn
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusEndColumn.
//!
//! Unknown policy: `reject`, which is inert for a
//! `scalar` — the kind has no unknown member for a policy to govern. The
//! declared value is carried verbatim in this type's metadata constant.

use serde::{Deserialize, Serialize};

/// SourceLocusEndColumn
///
/// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusEndColumn.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct SourceLocusEndColumn(i64);

impl SourceLocusEndColumn {
    /// Builds the value, enforcing every constraint the contract declares
    /// on it. Deserialization routes through this constructor, so a value
    /// that violates a constraint cannot arrive from the wire either.
    pub fn try_new(value: i64) -> Result<Self, crate::support::ValidationError> {
        {
            if value < 1i64 {
                return Err(crate::support::ValidationError::new(
                    "ix://agent-ix/semantic-core/type/SourceLocusEndColumn/constraint/min",
                    "min",
                    "",
                    "1",
                ));
            }
            if value > 2147483647i64 {
                return Err(crate::support::ValidationError::new(
                    "ix://agent-ix/semantic-core/type/SourceLocusEndColumn/constraint/max",
                    "max",
                    "",
                    "2147483647",
                ));
            }
        }
        Ok(Self(value))
    }

    /// The wrapped value.
    pub fn get(&self) -> &i64 {
        &self.0
    }

    /// The wrapped value, consuming the newtype.
    pub fn into_inner(self) -> i64 {
        self.0
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for SourceLocusEndColumn {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let inner = <i64 as Deserialize>::deserialize(deserializer)?;
        Self::try_new(inner).map_err(serde::de::Error::custom)
    }
}
