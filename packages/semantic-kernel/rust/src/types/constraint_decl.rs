//! ConstraintDecl
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl.

use serde::{Deserialize, Serialize};

/// ConstraintDecl
///
/// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ConstraintDecl {
    /// MinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/MinConstraint.
    MinConstraint(crate::MinConstraint),
    /// MaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/MaxConstraint.
    MaxConstraint(crate::MaxConstraint),
    /// ExclusiveMinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/ExclusiveMinConstraint.
    ExclusiveMinConstraint(crate::ExclusiveMinConstraint),
    /// ExclusiveMaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/ExclusiveMaxConstraint.
    ExclusiveMaxConstraint(crate::ExclusiveMaxConstraint),
    /// PatternConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/PatternConstraint.
    PatternConstraint(crate::PatternConstraint),
    /// MinLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/MinLengthConstraint.
    MinLengthConstraint(crate::MinLengthConstraint),
    /// MaxLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/MaxLengthConstraint.
    MaxLengthConstraint(crate::MaxLengthConstraint),
    /// EnumValuesConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/EnumValuesConstraint.
    EnumValuesConstraint(crate::EnumValuesConstraint),
    /// NonEmptyConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/NonEmptyConstraint.
    NonEmptyConstraint(crate::NonEmptyConstraint),
    /// UniqueConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/UniqueConstraint.
    UniqueConstraint(crate::UniqueConstraint),
    /// FormatConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl/variant/FormatConstraint.
    FormatConstraint(crate::FormatConstraint),
}

impl ConstraintDecl {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
