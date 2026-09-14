//! ExclusiveMaxConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintKeyword.

use serde::{Deserialize, Serialize};

/// ExclusiveMaxConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ExclusiveMaxConstraintKeyword {
    /// exclusiveMax
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintKeyword/variant/exclusiveMax.
    #[serde(rename = "exclusiveMax")]
    ExclusiveMax,
}

impl ExclusiveMaxConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
