//! PatternConstraintDialect
//!
//! Semantic identity: ix://agent-ix/semantic-core/PatternConstraintDialect.

use serde::{Deserialize, Serialize};

/// PatternConstraintDialect
///
/// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintDialect.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum PatternConstraintDialect {
    /// ecma-262
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintDialect/variant/ecma-262.
    #[serde(rename = "ecma-262")]
    Ecma262,
}

impl PatternConstraintDialect {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
