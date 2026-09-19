//! MaxConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/MaxConstraintKeyword.

use serde::{Deserialize, Serialize};

/// MaxConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum MaxConstraintKeyword {
    /// max
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintKeyword/variant/max.
    #[serde(rename = "max")]
    Max,
}

impl MaxConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
