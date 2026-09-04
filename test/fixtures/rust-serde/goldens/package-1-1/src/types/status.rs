//! Status
//!
//! Semantic identity: ix://agent-ix/conformance/type/Status.

use serde::{Deserialize, Serialize};

/// Status
///
/// Semantic identity: ix://agent-ix/conformance/type/Status.
///
/// Roles: agent-ix:state.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Status {
    /// status-draft
    ///
    /// Semantic identity: ix://agent-ix/conformance/variant/status-draft.
    #[serde(rename = "draft")]
    Draft,
    /// status-final
    ///
    /// Semantic identity: ix://agent-ix/conformance/variant/status-final.
    #[serde(rename = "final")]
    Final,
}

impl Status {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
