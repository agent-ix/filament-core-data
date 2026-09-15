//! MaxConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintValue.

use serde::{Deserialize, Serialize};

/// MaxConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MaxConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number(crate::MaxConstraintValueNumber),
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintValue/variant/string.
    #[serde(rename = "string")]
    String(crate::MaxConstraintValueString),
}

impl MaxConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
