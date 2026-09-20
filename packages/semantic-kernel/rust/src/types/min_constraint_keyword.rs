//! MinConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/MinConstraintKeyword.

use serde::{Deserialize, Serialize};

/// MinConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/MinConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum MinConstraintKeyword {
    /// min
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintKeyword/variant/min.
    #[serde(rename = "min")]
    Min,
}

impl MinConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
