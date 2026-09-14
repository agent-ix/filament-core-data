//! ExclusiveMinConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue.

use serde::{Deserialize, Serialize};

/// ExclusiveMinConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ExclusiveMinConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number,
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue/variant/string.
    #[serde(rename = "string")]
    String,
}

impl ExclusiveMinConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
