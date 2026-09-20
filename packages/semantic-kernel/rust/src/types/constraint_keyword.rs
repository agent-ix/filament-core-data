//! ConstraintKeyword
//!
//! Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword.

use serde::{Deserialize, Serialize};

/// ConstraintKeyword
///
/// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ConstraintKeyword {
    /// min
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/min.
    #[serde(rename = "min")]
    Min,
    /// max
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/max.
    #[serde(rename = "max")]
    Max,
    /// exclusiveMin
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/exclusiveMin.
    #[serde(rename = "exclusiveMin")]
    ExclusiveMin,
    /// exclusiveMax
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/exclusiveMax.
    #[serde(rename = "exclusiveMax")]
    ExclusiveMax,
    /// pattern
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/pattern.
    #[serde(rename = "pattern")]
    Pattern,
    /// minLength
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/minLength.
    #[serde(rename = "minLength")]
    MinLength,
    /// maxLength
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/maxLength.
    #[serde(rename = "maxLength")]
    MaxLength,
    /// enumValues
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/enumValues.
    #[serde(rename = "enumValues")]
    EnumValues,
    /// nonEmpty
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/nonEmpty.
    #[serde(rename = "nonEmpty")]
    NonEmpty,
    /// unique
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/unique.
    #[serde(rename = "unique")]
    Unique,
    /// format
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword/variant/format.
    #[serde(rename = "format")]
    Format,
}

impl ConstraintKeyword {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
