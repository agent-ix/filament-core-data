//! EdgeCategory
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory.

use serde::{Deserialize, Serialize};

/// EdgeCategory
///
/// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum EdgeCategory {
    /// structural
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/structural.
    #[serde(rename = "structural")]
    Structural,
    /// behavioral
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/behavioral.
    #[serde(rename = "behavioral")]
    Behavioral,
    /// dataflow
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/dataflow.
    #[serde(rename = "dataflow")]
    Dataflow,
    /// dependency
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/dependency.
    #[serde(rename = "dependency")]
    Dependency,
    /// realization
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/realization.
    #[serde(rename = "realization")]
    Realization,
    /// governance
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/governance.
    #[serde(rename = "governance")]
    Governance,
    /// traceability
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory/variant/traceability.
    #[serde(rename = "traceability")]
    Traceability,
}

impl EdgeCategory {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
