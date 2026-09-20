//! MinLengthConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraintKeyword.

use serde::{Deserialize, Serialize};

/// MinLengthConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum MinLengthConstraintKeyword {
    /// minLength
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraintKeyword/variant/minLength.
    #[serde(rename = "minLength")]
    MinLength,
}

impl MinLengthConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
