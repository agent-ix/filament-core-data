//! MaxLengthConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraintKeyword.

use serde::{Deserialize, Serialize};

/// MaxLengthConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum MaxLengthConstraintKeyword {
    /// maxLength
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraintKeyword/variant/maxLength.
    #[serde(rename = "maxLength")]
    MaxLength,
}

impl MaxLengthConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
