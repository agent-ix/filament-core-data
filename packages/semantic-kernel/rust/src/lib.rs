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
pub use crate::types::enum_values_constraint_values_boolean::EnumValuesConstraintValuesBoolean;
pub use crate::types::enum_values_constraint_values_number::EnumValuesConstraintValuesNumber;
pub use crate::types::enum_values_constraint_values_string::EnumValuesConstraintValuesString;
pub use crate::types::exclusive_max_constraint::ExclusiveMaxConstraint;
pub use crate::types::exclusive_max_constraint_keyword::ExclusiveMaxConstraintKeyword;
pub use crate::types::exclusive_max_constraint_value::ExclusiveMaxConstraintValue;
pub use crate::types::exclusive_max_constraint_value_number::ExclusiveMaxConstraintValueNumber;
pub use crate::types::exclusive_max_constraint_value_string::ExclusiveMaxConstraintValueString;
pub use crate::types::exclusive_min_constraint::ExclusiveMinConstraint;
pub use crate::types::exclusive_min_constraint_keyword::ExclusiveMinConstraintKeyword;
pub use crate::types::exclusive_min_constraint_value::ExclusiveMinConstraintValue;
pub use crate::types::exclusive_min_constraint_value_number::ExclusiveMinConstraintValueNumber;
pub use crate::types::exclusive_min_constraint_value_string::ExclusiveMinConstraintValueString;
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
pub use crate::types::max_constraint_value_number::MaxConstraintValueNumber;
pub use crate::types::max_constraint_value_string::MaxConstraintValueString;
pub use crate::types::max_length_constraint::MaxLengthConstraint;
pub use crate::types::max_length_constraint_keyword::MaxLengthConstraintKeyword;
pub use crate::types::max_length_constraint_value::MaxLengthConstraintValue;
pub use crate::types::min_constraint::MinConstraint;
pub use crate::types::min_constraint_keyword::MinConstraintKeyword;
pub use crate::types::min_constraint_value::MinConstraintValue;
pub use crate::types::min_constraint_value_number::MinConstraintValueNumber;
pub use crate::types::min_constraint_value_string::MinConstraintValueString;
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
    /// Semantic identity: ix://agent-ix/semantic-core/ClauseLanguage.
    ClauseLanguage,
    /// ClauseRef
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ClauseRef.
    ClauseRef,
    /// ConstraintDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintDecl.
    ConstraintDecl,
    /// ConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ConstraintKeyword.
    ConstraintKeyword,
    /// DecimalPolicy
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DecimalPolicy.
    DecimalPolicy,
    /// DecimalPolicyPrecision
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DecimalPolicyPrecision.
    DecimalPolicyPrecision,
    /// DecimalPolicyScale
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DecimalPolicyScale.
    DecimalPolicyScale,
    /// DefaultDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultDecl.
    DefaultDecl,
    /// DefaultDeclValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultDeclValue.
    DefaultDeclValue,
    /// DefaultKind
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/DefaultKind.
    DefaultKind,
    /// EdgeCategory
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EdgeCategory.
    EdgeCategory,
    /// EnumValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValue.
    EnumValue,
    /// EnumValueDoc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValueDoc.
    EnumValueDoc,
    /// EnumValuesConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraint.
    EnumValuesConstraint,
    /// EnumValuesConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraintKeyword.
    EnumValuesConstraintKeyword,
    /// EnumValuesConstraintValuesString
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraintValuesString.
    EnumValuesConstraintValuesString,
    /// EnumValuesConstraintValuesNumber
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraintValuesNumber.
    EnumValuesConstraintValuesNumber,
    /// EnumValuesConstraintValuesBoolean
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraintValuesBoolean.
    EnumValuesConstraintValuesBoolean,
    /// EnumValuesConstraintValues
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/EnumValuesConstraintValues.
    EnumValuesConstraintValues,
    /// ExclusiveMaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraint.
    ExclusiveMaxConstraint,
    /// ExclusiveMaxConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintKeyword.
    ExclusiveMaxConstraintKeyword,
    /// ExclusiveMaxConstraintValueNumber
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValueNumber.
    ExclusiveMaxConstraintValueNumber,
    /// ExclusiveMaxConstraintValueString
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValueString.
    ExclusiveMaxConstraintValueString,
    /// ExclusiveMaxConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue.
    ExclusiveMaxConstraintValue,
    /// ExclusiveMinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraint.
    ExclusiveMinConstraint,
    /// ExclusiveMinConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintKeyword.
    ExclusiveMinConstraintKeyword,
    /// ExclusiveMinConstraintValueNumber
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValueNumber.
    ExclusiveMinConstraintValueNumber,
    /// ExclusiveMinConstraintValueString
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValueString.
    ExclusiveMinConstraintValueString,
    /// ExclusiveMinConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/ExclusiveMinConstraintValue.
    ExclusiveMinConstraintValue,
    /// FieldDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FieldDecl.
    FieldDecl,
    /// FieldDeclIdentity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FieldDeclIdentity.
    FieldDeclIdentity,
    /// FieldDeclNullable
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FieldDeclNullable.
    FieldDeclNullable,
    /// FieldDeclDoc
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FieldDeclDoc.
    FieldDeclDoc,
    /// FormatConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FormatConstraint.
    FormatConstraint,
    /// FormatConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FormatConstraintKeyword.
    FormatConstraintKeyword,
    /// FormatConstraintName
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/FormatConstraintName.
    FormatConstraintName,
    /// Identifier
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Identifier.
    Identifier,
    /// KernelScalar
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/KernelScalar.
    KernelScalar,
    /// MaxConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraint.
    MaxConstraint,
    /// MaxConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintKeyword.
    MaxConstraintKeyword,
    /// MaxConstraintValueNumber
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintValueNumber.
    MaxConstraintValueNumber,
    /// MaxConstraintValueString
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintValueString.
    MaxConstraintValueString,
    /// MaxConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxConstraintValue.
    MaxConstraintValue,
    /// MaxLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraint.
    MaxLengthConstraint,
    /// MaxLengthConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraintKeyword.
    MaxLengthConstraintKeyword,
    /// MaxLengthConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MaxLengthConstraintValue.
    MaxLengthConstraintValue,
    /// MinConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraint.
    MinConstraint,
    /// MinConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintKeyword.
    MinConstraintKeyword,
    /// MinConstraintValueNumber
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValueNumber.
    MinConstraintValueNumber,
    /// MinConstraintValueString
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValueString.
    MinConstraintValueString,
    /// MinConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinConstraintValue.
    MinConstraintValue,
    /// MinLengthConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraint.
    MinLengthConstraint,
    /// MinLengthConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraintKeyword.
    MinLengthConstraintKeyword,
    /// MinLengthConstraintValue
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MinLengthConstraintValue.
    MinLengthConstraintValue,
    /// Multiplicity
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/Multiplicity.
    Multiplicity,
    /// MultiplicityLower
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MultiplicityLower.
    MultiplicityLower,
    /// MultiplicityUpper
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MultiplicityUpper.
    MultiplicityUpper,
    /// MultiplicityOrdered
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MultiplicityOrdered.
    MultiplicityOrdered,
    /// MultiplicityUnique
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/MultiplicityUnique.
    MultiplicityUnique,
    /// NonEmptyConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/NonEmptyConstraint.
    NonEmptyConstraint,
    /// NonEmptyConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/NonEmptyConstraintKeyword.
    NonEmptyConstraintKeyword,
    /// OperationDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/OperationDecl.
    OperationDecl,
    /// PatternConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraint.
    PatternConstraint,
    /// PatternConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintKeyword.
    PatternConstraintKeyword,
    /// PatternConstraintRegex
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintRegex.
    PatternConstraintRegex,
    /// PatternConstraintDialect
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/PatternConstraintDialect.
    PatternConstraintDialect,
    /// RelationDecl
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/RelationDecl.
    RelationDecl,
    /// RelationDeclComposite
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/RelationDeclComposite.
    RelationDeclComposite,
    /// SemanticId
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SemanticId.
    SemanticId,
    /// SourceLocus
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocus.
    SourceLocus,
    /// SourceLocusPath
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocusPath.
    SemanticCoreSourceLocusPath,
    /// SourceLocusStartLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocusStartLine.
    SourceLocusStartLine,
    /// SourceLocusStartColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocusStartColumn.
    SourceLocusStartColumn,
    /// SourceLocusEndLine
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocusEndLine.
    SourceLocusEndLine,
    /// SourceLocusEndColumn
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/SourceLocusEndColumn.
    SourceLocusEndColumn,
    /// TypeRef
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRef.
    TypeRef,
    /// TypeRefTarget
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/TypeRefTarget.
    TypeRefTarget,
    /// UniqueConstraint
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/UniqueConstraint.
    UniqueConstraint,
    /// UniqueConstraintKeyword
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/UniqueConstraintKeyword.
    UniqueConstraintKeyword,
    /// UnitSymbol
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/UnitSymbol.
    UnitSymbol,
}

impl SemanticType {
    /// The semantic identity of the type the variant names.
    pub fn identity(&self) -> &'static str {
        match self {
            SemanticType::ClauseLanguage => "ix://agent-ix/semantic-core/ClauseLanguage",
            SemanticType::ClauseRef => "ix://agent-ix/semantic-core/ClauseRef",
            SemanticType::ConstraintDecl => "ix://agent-ix/semantic-core/ConstraintDecl",
            SemanticType::ConstraintKeyword => "ix://agent-ix/semantic-core/ConstraintKeyword",
            SemanticType::DecimalPolicy => "ix://agent-ix/semantic-core/DecimalPolicy",
            SemanticType::DecimalPolicyPrecision => {
                "ix://agent-ix/semantic-core/DecimalPolicyPrecision"
            }
            SemanticType::DecimalPolicyScale => "ix://agent-ix/semantic-core/DecimalPolicyScale",
            SemanticType::DefaultDecl => "ix://agent-ix/semantic-core/DefaultDecl",
            SemanticType::DefaultDeclValue => "ix://agent-ix/semantic-core/DefaultDeclValue",
            SemanticType::DefaultKind => "ix://agent-ix/semantic-core/DefaultKind",
            SemanticType::EdgeCategory => "ix://agent-ix/semantic-core/EdgeCategory",
            SemanticType::EnumValue => "ix://agent-ix/semantic-core/EnumValue",
            SemanticType::EnumValueDoc => "ix://agent-ix/semantic-core/EnumValueDoc",
            SemanticType::EnumValuesConstraint => {
                "ix://agent-ix/semantic-core/EnumValuesConstraint"
            }
            SemanticType::EnumValuesConstraintKeyword => {
                "ix://agent-ix/semantic-core/EnumValuesConstraintKeyword"
            }
            SemanticType::EnumValuesConstraintValuesString => {
                "ix://agent-ix/semantic-core/EnumValuesConstraintValuesString"
            }
            SemanticType::EnumValuesConstraintValuesNumber => {
                "ix://agent-ix/semantic-core/EnumValuesConstraintValuesNumber"
            }
            SemanticType::EnumValuesConstraintValuesBoolean => {
                "ix://agent-ix/semantic-core/EnumValuesConstraintValuesBoolean"
            }
            SemanticType::EnumValuesConstraintValues => {
                "ix://agent-ix/semantic-core/EnumValuesConstraintValues"
            }
            SemanticType::ExclusiveMaxConstraint => {
                "ix://agent-ix/semantic-core/ExclusiveMaxConstraint"
            }
            SemanticType::ExclusiveMaxConstraintKeyword => {
                "ix://agent-ix/semantic-core/ExclusiveMaxConstraintKeyword"
            }
            SemanticType::ExclusiveMaxConstraintValueNumber => {
                "ix://agent-ix/semantic-core/ExclusiveMaxConstraintValueNumber"
            }
            SemanticType::ExclusiveMaxConstraintValueString => {
                "ix://agent-ix/semantic-core/ExclusiveMaxConstraintValueString"
            }
            SemanticType::ExclusiveMaxConstraintValue => {
                "ix://agent-ix/semantic-core/ExclusiveMaxConstraintValue"
            }
            SemanticType::ExclusiveMinConstraint => {
                "ix://agent-ix/semantic-core/ExclusiveMinConstraint"
            }
            SemanticType::ExclusiveMinConstraintKeyword => {
                "ix://agent-ix/semantic-core/ExclusiveMinConstraintKeyword"
            }
            SemanticType::ExclusiveMinConstraintValueNumber => {
                "ix://agent-ix/semantic-core/ExclusiveMinConstraintValueNumber"
            }
            SemanticType::ExclusiveMinConstraintValueString => {
                "ix://agent-ix/semantic-core/ExclusiveMinConstraintValueString"
            }
            SemanticType::ExclusiveMinConstraintValue => {
                "ix://agent-ix/semantic-core/ExclusiveMinConstraintValue"
            }
            SemanticType::FieldDecl => "ix://agent-ix/semantic-core/FieldDecl",
            SemanticType::FieldDeclIdentity => "ix://agent-ix/semantic-core/FieldDeclIdentity",
            SemanticType::FieldDeclNullable => "ix://agent-ix/semantic-core/FieldDeclNullable",
            SemanticType::FieldDeclDoc => "ix://agent-ix/semantic-core/FieldDeclDoc",
            SemanticType::FormatConstraint => "ix://agent-ix/semantic-core/FormatConstraint",
            SemanticType::FormatConstraintKeyword => {
                "ix://agent-ix/semantic-core/FormatConstraintKeyword"
            }
            SemanticType::FormatConstraintName => {
                "ix://agent-ix/semantic-core/FormatConstraintName"
            }
            SemanticType::Identifier => "ix://agent-ix/semantic-core/Identifier",
            SemanticType::KernelScalar => "ix://agent-ix/semantic-core/KernelScalar",
            SemanticType::MaxConstraint => "ix://agent-ix/semantic-core/MaxConstraint",
            SemanticType::MaxConstraintKeyword => {
                "ix://agent-ix/semantic-core/MaxConstraintKeyword"
            }
            SemanticType::MaxConstraintValueNumber => {
                "ix://agent-ix/semantic-core/MaxConstraintValueNumber"
            }
            SemanticType::MaxConstraintValueString => {
                "ix://agent-ix/semantic-core/MaxConstraintValueString"
            }
            SemanticType::MaxConstraintValue => "ix://agent-ix/semantic-core/MaxConstraintValue",
            SemanticType::MaxLengthConstraint => "ix://agent-ix/semantic-core/MaxLengthConstraint",
            SemanticType::MaxLengthConstraintKeyword => {
                "ix://agent-ix/semantic-core/MaxLengthConstraintKeyword"
            }
            SemanticType::MaxLengthConstraintValue => {
                "ix://agent-ix/semantic-core/MaxLengthConstraintValue"
            }
            SemanticType::MinConstraint => "ix://agent-ix/semantic-core/MinConstraint",
            SemanticType::MinConstraintKeyword => {
                "ix://agent-ix/semantic-core/MinConstraintKeyword"
            }
            SemanticType::MinConstraintValueNumber => {
                "ix://agent-ix/semantic-core/MinConstraintValueNumber"
            }
            SemanticType::MinConstraintValueString => {
                "ix://agent-ix/semantic-core/MinConstraintValueString"
            }
            SemanticType::MinConstraintValue => "ix://agent-ix/semantic-core/MinConstraintValue",
            SemanticType::MinLengthConstraint => "ix://agent-ix/semantic-core/MinLengthConstraint",
            SemanticType::MinLengthConstraintKeyword => {
                "ix://agent-ix/semantic-core/MinLengthConstraintKeyword"
            }
            SemanticType::MinLengthConstraintValue => {
                "ix://agent-ix/semantic-core/MinLengthConstraintValue"
            }
            SemanticType::Multiplicity => "ix://agent-ix/semantic-core/Multiplicity",
            SemanticType::MultiplicityLower => "ix://agent-ix/semantic-core/MultiplicityLower",
            SemanticType::MultiplicityUpper => "ix://agent-ix/semantic-core/MultiplicityUpper",
            SemanticType::MultiplicityOrdered => "ix://agent-ix/semantic-core/MultiplicityOrdered",
            SemanticType::MultiplicityUnique => "ix://agent-ix/semantic-core/MultiplicityUnique",
            SemanticType::NonEmptyConstraint => "ix://agent-ix/semantic-core/NonEmptyConstraint",
            SemanticType::NonEmptyConstraintKeyword => {
                "ix://agent-ix/semantic-core/NonEmptyConstraintKeyword"
            }
            SemanticType::OperationDecl => "ix://agent-ix/semantic-core/OperationDecl",
            SemanticType::PatternConstraint => "ix://agent-ix/semantic-core/PatternConstraint",
            SemanticType::PatternConstraintKeyword => {
                "ix://agent-ix/semantic-core/PatternConstraintKeyword"
            }
            SemanticType::PatternConstraintRegex => {
                "ix://agent-ix/semantic-core/PatternConstraintRegex"
            }
            SemanticType::PatternConstraintDialect => {
                "ix://agent-ix/semantic-core/PatternConstraintDialect"
            }
            SemanticType::RelationDecl => "ix://agent-ix/semantic-core/RelationDecl",
            SemanticType::RelationDeclComposite => {
                "ix://agent-ix/semantic-core/RelationDeclComposite"
            }
            SemanticType::SemanticId => "ix://agent-ix/semantic-core/SemanticId",
            SemanticType::SourceLocus => "ix://agent-ix/semantic-core/SourceLocus",
            SemanticType::SemanticCoreSourceLocusPath => {
                "ix://agent-ix/semantic-core/SourceLocusPath"
            }
            SemanticType::SourceLocusStartLine => {
                "ix://agent-ix/semantic-core/SourceLocusStartLine"
            }
            SemanticType::SourceLocusStartColumn => {
                "ix://agent-ix/semantic-core/SourceLocusStartColumn"
            }
            SemanticType::SourceLocusEndLine => "ix://agent-ix/semantic-core/SourceLocusEndLine",
            SemanticType::SourceLocusEndColumn => {
                "ix://agent-ix/semantic-core/SourceLocusEndColumn"
            }
            SemanticType::TypeRef => "ix://agent-ix/semantic-core/TypeRef",
            SemanticType::TypeRefTarget => "ix://agent-ix/semantic-core/TypeRefTarget",
            SemanticType::UniqueConstraint => "ix://agent-ix/semantic-core/UniqueConstraint",
            SemanticType::UniqueConstraintKeyword => {
                "ix://agent-ix/semantic-core/UniqueConstraintKeyword"
            }
            SemanticType::UnitSymbol => "ix://agent-ix/semantic-core/UnitSymbol",
        }
    }
}

/// Every extension identity the contract this crate was generated from
/// declares, ordered by code point.
pub const DECLARED_EXTENSION_IDENTITIES: &[&str] =
    &["ix://agent-ix/semantic-core/extension/untagged-union-wire-form"];

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
