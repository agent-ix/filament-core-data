//! ConstraintDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl.

use serde::{Deserialize, Serialize};

/// ConstraintDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConstraintDecl {
    /// MinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/MinConstraint.
    MinConstraint(crate::MinConstraint),
    /// MaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/MaxConstraint.
    MaxConstraint(crate::MaxConstraint),
    /// ExclusiveMinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/ExclusiveMinConstraint.
    ExclusiveMinConstraint(crate::ExclusiveMinConstraint),
    /// ExclusiveMaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/ExclusiveMaxConstraint.
    ExclusiveMaxConstraint(crate::ExclusiveMaxConstraint),
    /// PatternConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/PatternConstraint.
    PatternConstraint(crate::PatternConstraint),
    /// MinLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/MinLengthConstraint.
    MinLengthConstraint(crate::MinLengthConstraint),
    /// MaxLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/MaxLengthConstraint.
    MaxLengthConstraint(crate::MaxLengthConstraint),
    /// EnumValuesConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/EnumValuesConstraint.
    EnumValuesConstraint(crate::EnumValuesConstraint),
    /// NonEmptyConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/NonEmptyConstraint.
    NonEmptyConstraint(crate::NonEmptyConstraint),
    /// UniqueConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/UniqueConstraint.
    UniqueConstraint(crate::UniqueConstraint),
    /// FormatConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl/variant/FormatConstraint.
    FormatConstraint(crate::FormatConstraint),
}

impl ConstraintDecl {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
