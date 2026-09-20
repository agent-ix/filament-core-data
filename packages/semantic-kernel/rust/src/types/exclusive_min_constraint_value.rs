//! ExclusiveMinConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValue.

use serde::{Deserialize, Serialize};

/// ExclusiveMinConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ExclusiveMinConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number(crate::ExclusiveMinConstraintValueNumber),
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValue/variant/string.
    #[serde(rename = "string")]
    String(crate::ExclusiveMinConstraintValueString),
}

impl ExclusiveMinConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
