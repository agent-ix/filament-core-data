//! TypeRefTarget
//!
//! Semantic identity: ix://agent-ix/semantic-core/TypeRefTarget.

use serde::{Deserialize, Serialize};

/// TypeRefTarget
///
/// Semantic identity: ix://agent-ix/semantic-core/TypeRefTarget.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TypeRefTarget {
    /// SemanticId
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRefTarget/variant/SemanticId.
    SemanticId(crate::SemanticId),
    /// KernelScalar
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRefTarget/variant/KernelScalar.
    KernelScalar(crate::KernelScalar),
}

impl TypeRefTarget {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
