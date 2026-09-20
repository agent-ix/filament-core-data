//! FormatConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/FormatConstraintKeyword.

use serde::{Deserialize, Serialize};

/// FormatConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/FormatConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum FormatConstraintKeyword {
    /// format
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FormatConstraintKeyword/variant/format.
    #[serde(rename = "format")]
    Format,
}

impl FormatConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
