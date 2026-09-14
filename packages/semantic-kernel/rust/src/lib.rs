#![forbid(unsafe_code)]
#![deny(missing_docs)]
//! Generated Rust/Serde declarations for `agent-ix/semantic-kernel`.
//!
//! Every declaration here is derived from the semantic contract by one
//! published mapping. Nothing in this crate is hand-written and nothing in
//! it should be hand-edited.

pub mod identity;
pub mod provenance;
pub mod support;
pub mod types;

pub use crate::identity::{FieldMeta, TypeMeta, TYPES};
pub use crate::types::clause_language::ClauseLanguage;
pub use crate::types::clause_ref::ClauseRef;
pub use crate::types::constraint_decl::ConstraintDecl;
pub use crate::types::constraint_keyword::ConstraintKeyword;
pub use crate::types::decimal_policy::DecimalPolicy;
pub use crate::types::decimal_policy_precision::DecimalPolicyPrecision;
pub use crate::types::decimal_policy_scale::DecimalPolicyScale;
pub use crate::types::default_decl::DefaultDecl;
pub use crate::types::default_decl_value::DefaultDeclValue;
pub use crate::types::default_kind::DefaultKind;
pub use crate::types::edge_category::EdgeCategory;
pub use crate::types::enum_value::EnumValue;
pub use crate::types::enum_value_doc::EnumValueDoc;
pub use crate::types::enum_values_constraint::EnumValuesConstraint;
pub use crate::types::enum_values_constraint_keyword::EnumValuesConstraintKeyword;
pub use crate::types::enum_values_constraint_values::EnumValuesConstraintValues;
pub use crate::types::exclusive_max_constraint::ExclusiveMaxConstraint;
pub use crate::types::exclusive_max_constraint_keyword::ExclusiveMaxConstraintKeyword;
pub use crate::types::exclusive_max_constraint_value::ExclusiveMaxConstraintValue;
pub use crate::types::exclusive_min_constraint::ExclusiveMinConstraint;
pub use crate::types::exclusive_min_constraint_keyword::ExclusiveMinConstraintKeyword;
pub use crate::types::exclusive_min_constraint_value::ExclusiveMinConstraintValue;
pub use crate::types::field_decl::FieldDecl;
pub use crate::types::field_decl_doc::FieldDeclDoc;
pub use crate::types::field_decl_identity::FieldDeclIdentity;
pub use crate::types::field_decl_nullable::FieldDeclNullable;
pub use crate::types::format_constraint::FormatConstraint;
pub use crate::types::format_constraint_keyword::FormatConstraintKeyword;
pub use crate::types::format_constraint_name::FormatConstraintName;
pub use crate::types::identifier::Identifier;
pub use crate::types::kernel_scalar::KernelScalar;
pub use crate::types::max_constraint::MaxConstraint;
pub use crate::types::max_constraint_keyword::MaxConstraintKeyword;
pub use crate::types::max_constraint_value::MaxConstraintValue;
pub use crate::types::max_length_constraint::MaxLengthConstraint;
pub use crate::types::max_length_constraint_keyword::MaxLengthConstraintKeyword;
pub use crate::types::max_length_constraint_value::MaxLengthConstraintValue;
pub use crate::types::min_constraint::MinConstraint;
pub use crate::types::min_constraint_keyword::MinConstraintKeyword;
pub use crate::types::min_constraint_value::MinConstraintValue;
pub use crate::types::min_length_constraint::MinLengthConstraint;
pub use crate::types::min_length_constraint_keyword::MinLengthConstraintKeyword;
pub use crate::types::min_length_constraint_value::MinLengthConstraintValue;
pub use crate::types::multiplicity::Multiplicity;
pub use crate::types::multiplicity_lower::MultiplicityLower;
pub use crate::types::multiplicity_ordered::MultiplicityOrdered;
pub use crate::types::multiplicity_unique::MultiplicityUnique;
pub use crate::types::multiplicity_upper::MultiplicityUpper;
pub use crate::types::non_empty_constraint::NonEmptyConstraint;
pub use crate::types::non_empty_constraint_keyword::NonEmptyConstraintKeyword;
pub use crate::types::operation_decl::OperationDecl;
pub use crate::types::pattern_constraint::PatternConstraint;
pub use crate::types::pattern_constraint_dialect::PatternConstraintDialect;
pub use crate::types::pattern_constraint_keyword::PatternConstraintKeyword;
pub use crate::types::pattern_constraint_regex::PatternConstraintRegex;
pub use crate::types::relation_decl::RelationDecl;
pub use crate::types::relation_decl_composite::RelationDeclComposite;
pub use crate::types::semantic_id::SemanticId;
pub use crate::types::source_locus::SourceLocus;
pub use crate::types::source_locus_end_column::SourceLocusEndColumn;
pub use crate::types::source_locus_end_line::SourceLocusEndLine;
pub use crate::types::source_locus_path::SemanticCoreSourceLocusPath;
pub use crate::types::source_locus_start_column::SourceLocusStartColumn;
pub use crate::types::source_locus_start_line::SourceLocusStartLine;
pub use crate::types::type_ref::TypeRef;
pub use crate::types::type_ref_target::TypeRefTarget;
pub use crate::types::unique_constraint::UniqueConstraint;
pub use crate::types::unique_constraint_keyword::UniqueConstraintKeyword;
pub use crate::types::unit_symbol::UnitSymbol;

/// One variant per generated type.
///
/// A consumer that matches exhaustively over this enum stops compiling when
/// the contract gains a type, which is the point: a contract addition is a
/// compile error in the consumer rather than a silent omission.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SemanticType {
    /// ClauseLanguage
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ClauseLanguage.
    ClauseLanguage,
    /// ClauseRef
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ClauseRef.
    ClauseRef,
    /// ConstraintDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintDecl.
    ConstraintDecl,
    /// ConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ConstraintKeyword.
    ConstraintKeyword,
    /// DecimalPolicy
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicy.
    DecimalPolicy,
    /// DecimalPolicyPrecision
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicyPrecision.
    DecimalPolicyPrecision,
    /// DecimalPolicyScale
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DecimalPolicyScale.
    DecimalPolicyScale,
    /// DefaultDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DefaultDecl.
    DefaultDecl,
    /// DefaultDeclValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DefaultDeclValue.
    DefaultDeclValue,
    /// DefaultKind
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/DefaultKind.
    DefaultKind,
    /// EdgeCategory
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EdgeCategory.
    EdgeCategory,
    /// EnumValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValue.
    EnumValue,
    /// EnumValueDoc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValueDoc.
    EnumValueDoc,
    /// EnumValuesConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraint.
    EnumValuesConstraint,
    /// EnumValuesConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintKeyword.
    EnumValuesConstraintKeyword,
    /// EnumValuesConstraintValues
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/EnumValuesConstraintValues.
    EnumValuesConstraintValues,
    /// ExclusiveMaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraint.
    ExclusiveMaxConstraint,
    /// ExclusiveMaxConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintKeyword.
    ExclusiveMaxConstraintKeyword,
    /// ExclusiveMaxConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue.
    ExclusiveMaxConstraintValue,
    /// ExclusiveMinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraint.
    ExclusiveMinConstraint,
    /// ExclusiveMinConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintKeyword.
    ExclusiveMinConstraintKeyword,
    /// ExclusiveMinConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue.
    ExclusiveMinConstraintValue,
    /// FieldDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDecl.
    FieldDecl,
    /// FieldDeclIdentity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDeclIdentity.
    FieldDeclIdentity,
    /// FieldDeclNullable
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDeclNullable.
    FieldDeclNullable,
    /// FieldDeclDoc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FieldDeclDoc.
    FieldDeclDoc,
    /// FormatConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FormatConstraint.
    FormatConstraint,
    /// FormatConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FormatConstraintKeyword.
    FormatConstraintKeyword,
    /// FormatConstraintName
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/FormatConstraintName.
    FormatConstraintName,
    /// Identifier
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/Identifier.
    Identifier,
    /// KernelScalar
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar.
    KernelScalar,
    /// MaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraint.
    MaxConstraint,
    /// MaxConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintKeyword.
    MaxConstraintKeyword,
    /// MaxConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxConstraintValue.
    MaxConstraintValue,
    /// MaxLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxLengthConstraint.
    MaxLengthConstraint,
    /// MaxLengthConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxLengthConstraintKeyword.
    MaxLengthConstraintKeyword,
    /// MaxLengthConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MaxLengthConstraintValue.
    MaxLengthConstraintValue,
    /// MinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraint.
    MinConstraint,
    /// MinConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraintKeyword.
    MinConstraintKeyword,
    /// MinConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinConstraintValue.
    MinConstraintValue,
    /// MinLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinLengthConstraint.
    MinLengthConstraint,
    /// MinLengthConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinLengthConstraintKeyword.
    MinLengthConstraintKeyword,
    /// MinLengthConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MinLengthConstraintValue.
    MinLengthConstraintValue,
    /// Multiplicity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/Multiplicity.
    Multiplicity,
    /// MultiplicityLower
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MultiplicityLower.
    MultiplicityLower,
    /// MultiplicityUpper
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MultiplicityUpper.
    MultiplicityUpper,
    /// MultiplicityOrdered
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MultiplicityOrdered.
    MultiplicityOrdered,
    /// MultiplicityUnique
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/MultiplicityUnique.
    MultiplicityUnique,
    /// NonEmptyConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/NonEmptyConstraint.
    NonEmptyConstraint,
    /// NonEmptyConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/NonEmptyConstraintKeyword.
    NonEmptyConstraintKeyword,
    /// OperationDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/OperationDecl.
    OperationDecl,
    /// PatternConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraint.
    PatternConstraint,
    /// PatternConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraintKeyword.
    PatternConstraintKeyword,
    /// PatternConstraintRegex
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraintRegex.
    PatternConstraintRegex,
    /// PatternConstraintDialect
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/PatternConstraintDialect.
    PatternConstraintDialect,
    /// RelationDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDecl.
    RelationDecl,
    /// RelationDeclComposite
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/RelationDeclComposite.
    RelationDeclComposite,
    /// SemanticId
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SemanticId.
    SemanticId,
    /// SourceLocus
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocus.
    SourceLocus,
    /// SourceLocusPath
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusPath.
    SemanticCoreSourceLocusPath,
    /// SourceLocusStartLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusStartLine.
    SourceLocusStartLine,
    /// SourceLocusStartColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusStartColumn.
    SourceLocusStartColumn,
    /// SourceLocusEndLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusEndLine.
    SourceLocusEndLine,
    /// SourceLocusEndColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/SourceLocusEndColumn.
    SourceLocusEndColumn,
    /// TypeRef
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/TypeRef.
    TypeRef,
    /// TypeRefTarget
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/TypeRefTarget.
    TypeRefTarget,
    /// UniqueConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/UniqueConstraint.
    UniqueConstraint,
    /// UniqueConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/UniqueConstraintKeyword.
    UniqueConstraintKeyword,
    /// UnitSymbol
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/UnitSymbol.
    UnitSymbol,
}

impl SemanticType {
    /// The semantic identity of the type the variant names.
    pub fn identity(&self) -> &'static str {
        match self {
            SemanticType::ClauseLanguage => "ix://agent-ix/semantic-core/type/ClauseLanguage",
            SemanticType::ClauseRef => "ix://agent-ix/semantic-core/type/ClauseRef",
            SemanticType::ConstraintDecl => "ix://agent-ix/semantic-core/type/ConstraintDecl",
            SemanticType::ConstraintKeyword => "ix://agent-ix/semantic-core/type/ConstraintKeyword",
            SemanticType::DecimalPolicy => "ix://agent-ix/semantic-core/type/DecimalPolicy",
            SemanticType::DecimalPolicyPrecision => {
                "ix://agent-ix/semantic-core/type/DecimalPolicyPrecision"
            }
            SemanticType::DecimalPolicyScale => {
                "ix://agent-ix/semantic-core/type/DecimalPolicyScale"
            }
            SemanticType::DefaultDecl => "ix://agent-ix/semantic-core/type/DefaultDecl",
            SemanticType::DefaultDeclValue => "ix://agent-ix/semantic-core/type/DefaultDeclValue",
            SemanticType::DefaultKind => "ix://agent-ix/semantic-core/type/DefaultKind",
            SemanticType::EdgeCategory => "ix://agent-ix/semantic-core/type/EdgeCategory",
            SemanticType::EnumValue => "ix://agent-ix/semantic-core/type/EnumValue",
            SemanticType::EnumValueDoc => "ix://agent-ix/semantic-core/type/EnumValueDoc",
            SemanticType::EnumValuesConstraint => {
                "ix://agent-ix/semantic-core/type/EnumValuesConstraint"
            }
            SemanticType::EnumValuesConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/EnumValuesConstraintKeyword"
            }
            SemanticType::EnumValuesConstraintValues => {
                "ix://agent-ix/semantic-core/type/EnumValuesConstraintValues"
            }
            SemanticType::ExclusiveMaxConstraint => {
                "ix://agent-ix/semantic-core/type/ExclusiveMaxConstraint"
            }
            SemanticType::ExclusiveMaxConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintKeyword"
            }
            SemanticType::ExclusiveMaxConstraintValue => {
                "ix://agent-ix/semantic-core/type/ExclusiveMaxConstraintValue"
            }
            SemanticType::ExclusiveMinConstraint => {
                "ix://agent-ix/semantic-core/type/ExclusiveMinConstraint"
            }
            SemanticType::ExclusiveMinConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/ExclusiveMinConstraintKeyword"
            }
            SemanticType::ExclusiveMinConstraintValue => {
                "ix://agent-ix/semantic-core/type/ExclusiveMinConstraintValue"
            }
            SemanticType::FieldDecl => "ix://agent-ix/semantic-core/type/FieldDecl",
            SemanticType::FieldDeclIdentity => "ix://agent-ix/semantic-core/type/FieldDeclIdentity",
            SemanticType::FieldDeclNullable => "ix://agent-ix/semantic-core/type/FieldDeclNullable",
            SemanticType::FieldDeclDoc => "ix://agent-ix/semantic-core/type/FieldDeclDoc",
            SemanticType::FormatConstraint => "ix://agent-ix/semantic-core/type/FormatConstraint",
            SemanticType::FormatConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/FormatConstraintKeyword"
            }
            SemanticType::FormatConstraintName => {
                "ix://agent-ix/semantic-core/type/FormatConstraintName"
            }
            SemanticType::Identifier => "ix://agent-ix/semantic-core/type/Identifier",
            SemanticType::KernelScalar => "ix://agent-ix/semantic-core/type/KernelScalar",
            SemanticType::MaxConstraint => "ix://agent-ix/semantic-core/type/MaxConstraint",
            SemanticType::MaxConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/MaxConstraintKeyword"
            }
            SemanticType::MaxConstraintValue => {
                "ix://agent-ix/semantic-core/type/MaxConstraintValue"
            }
            SemanticType::MaxLengthConstraint => {
                "ix://agent-ix/semantic-core/type/MaxLengthConstraint"
            }
            SemanticType::MaxLengthConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/MaxLengthConstraintKeyword"
            }
            SemanticType::MaxLengthConstraintValue => {
                "ix://agent-ix/semantic-core/type/MaxLengthConstraintValue"
            }
            SemanticType::MinConstraint => "ix://agent-ix/semantic-core/type/MinConstraint",
            SemanticType::MinConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/MinConstraintKeyword"
            }
            SemanticType::MinConstraintValue => {
                "ix://agent-ix/semantic-core/type/MinConstraintValue"
            }
            SemanticType::MinLengthConstraint => {
                "ix://agent-ix/semantic-core/type/MinLengthConstraint"
            }
            SemanticType::MinLengthConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/MinLengthConstraintKeyword"
            }
            SemanticType::MinLengthConstraintValue => {
                "ix://agent-ix/semantic-core/type/MinLengthConstraintValue"
            }
            SemanticType::Multiplicity => "ix://agent-ix/semantic-core/type/Multiplicity",
            SemanticType::MultiplicityLower => "ix://agent-ix/semantic-core/type/MultiplicityLower",
            SemanticType::MultiplicityUpper => "ix://agent-ix/semantic-core/type/MultiplicityUpper",
            SemanticType::MultiplicityOrdered => {
                "ix://agent-ix/semantic-core/type/MultiplicityOrdered"
            }
            SemanticType::MultiplicityUnique => {
                "ix://agent-ix/semantic-core/type/MultiplicityUnique"
            }
            SemanticType::NonEmptyConstraint => {
                "ix://agent-ix/semantic-core/type/NonEmptyConstraint"
            }
            SemanticType::NonEmptyConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/NonEmptyConstraintKeyword"
            }
            SemanticType::OperationDecl => "ix://agent-ix/semantic-core/type/OperationDecl",
            SemanticType::PatternConstraint => "ix://agent-ix/semantic-core/type/PatternConstraint",
            SemanticType::PatternConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/PatternConstraintKeyword"
            }
            SemanticType::PatternConstraintRegex => {
                "ix://agent-ix/semantic-core/type/PatternConstraintRegex"
            }
            SemanticType::PatternConstraintDialect => {
                "ix://agent-ix/semantic-core/type/PatternConstraintDialect"
            }
            SemanticType::RelationDecl => "ix://agent-ix/semantic-core/type/RelationDecl",
            SemanticType::RelationDeclComposite => {
                "ix://agent-ix/semantic-core/type/RelationDeclComposite"
            }
            SemanticType::SemanticId => "ix://agent-ix/semantic-core/type/SemanticId",
            SemanticType::SourceLocus => "ix://agent-ix/semantic-core/type/SourceLocus",
            SemanticType::SemanticCoreSourceLocusPath => {
                "ix://agent-ix/semantic-core/type/SourceLocusPath"
            }
            SemanticType::SourceLocusStartLine => {
                "ix://agent-ix/semantic-core/type/SourceLocusStartLine"
            }
            SemanticType::SourceLocusStartColumn => {
                "ix://agent-ix/semantic-core/type/SourceLocusStartColumn"
            }
            SemanticType::SourceLocusEndLine => {
                "ix://agent-ix/semantic-core/type/SourceLocusEndLine"
            }
            SemanticType::SourceLocusEndColumn => {
                "ix://agent-ix/semantic-core/type/SourceLocusEndColumn"
            }
            SemanticType::TypeRef => "ix://agent-ix/semantic-core/type/TypeRef",
            SemanticType::TypeRefTarget => "ix://agent-ix/semantic-core/type/TypeRefTarget",
            SemanticType::UniqueConstraint => "ix://agent-ix/semantic-core/type/UniqueConstraint",
            SemanticType::UniqueConstraintKeyword => {
                "ix://agent-ix/semantic-core/type/UniqueConstraintKeyword"
            }
            SemanticType::UnitSymbol => "ix://agent-ix/semantic-core/type/UnitSymbol",
        }
    }
}

/// Every extension identity the contract this crate was generated from
/// declares, ordered by code point.
pub const DECLARED_EXTENSION_IDENTITIES: &[&str] = &[];

/// The capabilities this crate admits.
///
/// Empty, and empty is a stated decision rather than an omission.
/// `consumer-policy.schema.json` is sealed and carries no capability
/// member, and the published `rust` target contract declares no capability
/// list, so there is no published input a non-empty set could be read from.
/// That is GAP-007 in `conformance/contract-gaps.json`, owned by issue #9.
/// A crate that claimed to admit a capability nobody published would be
/// inventing the rule the gap records as missing.
pub const ADMITTED_CAPABILITIES: &[&str] = &[];

/// Decides one extension against this crate's declared set.
///
/// An empty result is acceptance; a blocking diagnostic is rejection. A
/// `required: false` extension is always preserved, whatever its identity.
pub fn decide_extension(extension: &support::Extension) -> Vec<support::Diagnostic> {
    extension.decide(DECLARED_EXTENSION_IDENTITIES, ADMITTED_CAPABILITIES)
}
