//! ExclusiveMaxConstraintValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue.

use serde::{Deserialize, Serialize};

/// ExclusiveMaxConstraintValue
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ExclusiveMaxConstraintValue {
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue/variant/number.
    #[serde(rename = "number")]
    Number,
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue/variant/string.
    #[serde(rename = "string")]
    String,
}

impl ExclusiveMaxConstraintValue {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
