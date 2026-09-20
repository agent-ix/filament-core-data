//! ExclusiveMinConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintKeyword.

use serde::{Deserialize, Serialize};

/// ExclusiveMinConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ExclusiveMinConstraintKeyword {
    /// exclusiveMin
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintKeyword/variant/exclusiveMin.
    #[serde(rename = "exclusiveMin")]
    ExclusiveMin,
}

impl ExclusiveMinConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
