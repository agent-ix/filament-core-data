//! EnumValuesConstraintValues
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues.

use serde::{Deserialize, Serialize};

/// EnumValuesConstraintValues
///
/// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EnumValuesConstraintValues {
    /// string
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues/variant/string.
    #[serde(rename = "string")]
    String(crate::EnumValuesConstraintValuesString),
    /// number
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues/variant/number.
    #[serde(rename = "number")]
    Number(crate::EnumValuesConstraintValuesNumber),
    /// boolean
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues/variant/boolean.
    #[serde(rename = "boolean")]
    Boolean(crate::EnumValuesConstraintValuesBoolean),
}

impl EnumValuesConstraintValues {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
