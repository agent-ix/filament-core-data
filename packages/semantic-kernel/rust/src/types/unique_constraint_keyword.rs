//! UniqueConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/UniqueConstraintKeyword.

use serde::{Deserialize, Serialize};

/// UniqueConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/type/UniqueConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum UniqueConstraintKeyword {
    /// unique
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/UniqueConstraintKeyword/variant/unique.
    #[serde(rename = "unique")]
    Unique,
}

impl UniqueConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
