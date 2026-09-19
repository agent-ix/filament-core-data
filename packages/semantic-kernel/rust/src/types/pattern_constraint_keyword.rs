//! PatternConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/PatternConstraintKeyword.

use serde::{Deserialize, Serialize};

/// PatternConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum PatternConstraintKeyword {
    /// pattern
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintKeyword/variant/pattern.
    #[serde(rename = "pattern")]
    Pattern,
}

impl PatternConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
