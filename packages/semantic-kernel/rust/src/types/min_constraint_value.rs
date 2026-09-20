//! MinConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/MinConstraintValue.

use serde::{Deserialize, Serialize};

/// MinConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MinConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number(crate::MinConstraintValueNumber),
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValue/variant/string.
    #[serde(rename = "string")]
    String(crate::MinConstraintValueString),
}

impl MinConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
