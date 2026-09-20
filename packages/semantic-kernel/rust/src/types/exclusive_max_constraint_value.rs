//! ExclusiveMaxConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue.

use serde::{Deserialize, Serialize};

/// ExclusiveMaxConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ExclusiveMaxConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number(crate::ExclusiveMaxConstraintValueNumber),
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue/variant/string.
    #[serde(rename = "string")]
    String(crate::ExclusiveMaxConstraintValueString),
}

impl ExclusiveMaxConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
