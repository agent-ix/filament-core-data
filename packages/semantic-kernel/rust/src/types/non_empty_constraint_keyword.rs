//! NonEmptyConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/NonEmptyConstraintKeyword.

use serde::{Deserialize, Serialize};

/// NonEmptyConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/NonEmptyConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum NonEmptyConstraintKeyword {
    /// nonEmpty
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/NonEmptyConstraintKeyword/variant/nonEmpty.
    #[serde(rename = "nonEmpty")]
    NonEmpty,
}

impl NonEmptyConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
