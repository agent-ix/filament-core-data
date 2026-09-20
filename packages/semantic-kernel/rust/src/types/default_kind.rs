//! DefaultKind
//!
//! Semantic identity: ix://agent-ix/semantic-core/DefaultKind.

use serde::{Deserialize, Serialize};

/// DefaultKind
///
/// Semantic identity: ix://agent-ix/semantic-core/DefaultKind.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum DefaultKind {
    /// semantic
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultKind/variant/semantic.
    #[serde(rename = "semantic")]
    Semantic,
    /// representation
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultKind/variant/representation.
    #[serde(rename = "representation")]
    Representation,
    /// migration
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultKind/variant/migration.
    #[serde(rename = "migration")]
    Migration,
}

impl DefaultKind {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
