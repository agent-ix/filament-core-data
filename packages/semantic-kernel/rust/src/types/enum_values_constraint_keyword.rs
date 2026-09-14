//! EnumValuesConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintKeyword.

use serde::{Deserialize, Serialize};

/// EnumValuesConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum EnumValuesConstraintKeyword {
    /// enumValues
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintKeyword/variant/enumValues.
    #[serde(rename = "enumValues")]
    EnumValues,
}

impl EnumValuesConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
