//! The semantic identity of everything this crate declares, emitted beside
//! the types it belongs to.
//!
//! Every member the IR carries survives generation into a `const` here:
//! `roles`, `origin`, `relationships`, `operations`, `clauses`,
//! `occurrences` and `extensions`. An `operation` reaches the crate as
//! data and never as a Rust function: it has no body in the IR, so a
//! generated function would have nothing to put in one.
//!
//! The crate's *provenance* — what it was generated from and by — is a
//! different concept and lives in `provenance.rs` (FR-137, ADR-0007). The two
//! were once named `identity.rs` and `metadata.rs` here and the opposite way
//! round in the generated TypeScript package, which is the defect that
//! renaming repairs.

/// A source locus the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SourceLocusMeta {
    /// The identity of the source the node came from.
    pub source_identity: &'static str,
    /// The path inside that source.
    pub path: &'static str,
    /// The one-based start line.
    pub start_line: u64,
    /// The one-based start column.
    pub start_column: u64,
    /// The one-based end line, where the IR carried one.
    pub end_line: Option<u64>,
    /// The one-based end column, where the IR carried one.
    pub end_column: Option<u64>,
}

/// A generated origin the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GeneratedOriginMeta {
    /// The generator's semantic identity.
    pub generator_identity: &'static str,
    /// The generator's version.
    pub generator_version: &'static str,
    /// The identities the generator consumed.
    pub input_identities: &'static [&'static str],
}

/// The origin of a node: a source locus, or a generation record.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OriginMeta {
    /// The source locus, where the node came from a source.
    pub source: Option<SourceLocusMeta>,
    /// The generation record, where the node was generated.
    pub generated: Option<GeneratedOriginMeta>,
}

/// A multiplicity the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MultiplicityMeta {
    /// The lower bound.
    pub lower: u64,
    /// The upper bound, where the IR declared one.
    pub upper: Option<u64>,
    /// Whether the collection is ordered, where the IR declared it.
    pub ordered: Option<bool>,
    /// Whether the collection's items are unique, where the IR declared it.
    pub unique: Option<bool>,
}

/// An extension the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ExtensionMeta {
    /// The extension's semantic identity.
    pub identity: &'static str,
    /// The extension's version.
    pub version: &'static str,
    /// Whether a consumer must understand the extension.
    pub required: bool,
    /// The capability the extension claims.
    pub capability: Option<&'static str>,
    /// The extension payload, as canonical JSON text.
    pub payload: &'static str,
}

/// One end of a relationship (gap 3 of FCD #199/#200: the two-end shape).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RelationshipEndMeta {
    /// The end's role, where the IR declared one.
    pub role: Option<&'static str>,
    /// The end's multiplicity.
    pub multiplicity: MultiplicityMeta,
    /// The end's type reference.
    pub type_ref: &'static str,
}

/// A relationship the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RelationshipMeta {
    /// The relationship's semantic identity.
    pub identity: &'static str,
    /// The edge category.
    pub category: &'static str,
    /// Whether the relationship is composite.
    pub composite: bool,
    /// The relationship's direction.
    pub direction: &'static str,
    /// The source end.
    pub source_end: RelationshipEndMeta,
    /// The target end.
    pub target_end: RelationshipEndMeta,
    /// The relationship's origin.
    pub origin: OriginMeta,
}

/// One parameter of an operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ParamMeta {
    /// The parameter's semantic identity.
    pub identity: &'static str,
    /// The parameter's wire name.
    pub name: &'static str,
    /// The derived Rust identifier.
    pub rust_name: &'static str,
    /// The parameter type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust type, as text.
    pub rust_type: &'static str,
    /// Whether the parameter is nullable.
    pub nullable: bool,
    /// The parameter's multiplicity.
    pub multiplicity: MultiplicityMeta,
}

/// An operation's return.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReturnMeta {
    /// The return type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust type, as text.
    pub rust_type: &'static str,
    /// Whether the return is nullable.
    pub nullable: bool,
    /// The return's multiplicity.
    pub multiplicity: MultiplicityMeta,
}

/// An operation the IR carried.
///
/// It is metadata, not a function: the IR gives an operation no body.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OperationMeta {
    /// The operation's semantic identity.
    pub identity: &'static str,
    /// The operation's wire name.
    pub name: &'static str,
    /// The parameters.
    pub params: &'static [ParamMeta],
    /// The return, where the operation declares one.
    pub returns: Option<ReturnMeta>,
    /// The identifiers of the precondition clauses.
    pub pre: &'static [&'static str],
    /// The identifiers of the postcondition clauses.
    pub post: &'static [&'static str],
    /// The operation's origin.
    pub origin: OriginMeta,
}

/// A clause the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ClauseMeta {
    /// The clause's semantic identity.
    pub identity: &'static str,
    /// The clause language.
    pub language: &'static str,
    /// The clause identifier operations refer to it by.
    pub clause_id: &'static str,
    /// The clause text.
    pub text: &'static str,
    /// The clause's source span, where the IR carried one.
    pub source_span: Option<SourceLocusMeta>,
    /// The clause's origin.
    pub origin: OriginMeta,
}

/// One generated field.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FieldMeta {
    /// The field's semantic identity.
    pub identity: &'static str,
    /// The field's wire name.
    pub name: &'static str,
    /// The derived Rust identifier.
    pub rust_name: &'static str,
    /// The field type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust member type, as text.
    pub rust_type: &'static str,
    /// The mapping-table row the member type came from.
    pub row: &'static str,
    /// The derived presence.
    pub presence: &'static str,
    /// Whether the field is nullable.
    pub nullable: bool,
    /// The field's multiplicity.
    pub multiplicity: MultiplicityMeta,
    /// The UCUM symbol the field carries, where it carries one.
    pub unit: Option<&'static str>,
    /// The field's default kind.
    pub default_kind: &'static str,
    /// The field's default value as canonical JSON text, where it carries one.
    pub default_value: Option<&'static str>,
    /// The field's origin.
    pub origin: OriginMeta,
}

/// One generated type.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TypeMeta {
    /// The type's semantic identity.
    pub identity: &'static str,
    /// The type's display name.
    pub display_name: &'static str,
    /// The IR kind.
    pub kind: &'static str,
    /// The derived Rust type name.
    pub rust_name: &'static str,
    /// The roles the IR carried, in document order.
    pub roles: &'static [&'static str],
    /// The unknown-member policy.
    pub unknown_policy: &'static str,
    /// The type's origin.
    pub origin: OriginMeta,
    /// The type's fields, for a record.
    pub fields: &'static [FieldMeta],
    /// The type's relationships.
    pub relationships: &'static [RelationshipMeta],
    /// The type's operations.
    pub operations: &'static [OperationMeta],
    /// The type's clauses.
    pub clauses: &'static [ClauseMeta],
    /// The type's extensions.
    pub extensions: &'static [ExtensionMeta],
}

/// An occurrence the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OccurrenceMeta {
    /// The occurrence's semantic identity.
    pub identity: &'static str,
    /// The type the occurrence is an instance of.
    pub definition: &'static str,
    /// The observation timestamp the IR carried.
    pub observed_at: &'static str,
    /// The observed value, as canonical JSON text.
    pub value: &'static str,
}

/// Every generated type, in the order the contract declares them.
pub const TYPES: &[TypeMeta] = &[
    crate::identity::TypeMeta {
        identity: "ix://agent-ix/conformance/type/Text",
        display_name: "Text",
        kind: "scalar",
        rust_name: "Text",
        roles: &[],
        unknown_policy: "reject",
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/scalars.tsp",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
        fields: &[],
        relationships: &[],
        operations: &[],
        clauses: &[],
        extensions: &[],
    },
    crate::identity::TypeMeta {
        identity: "ix://agent-ix/conformance/type/Leaf",
        display_name: "Leaf",
        kind: "record",
        rust_name: "Leaf",
        roles: &[],
        unknown_policy: "reject",
        origin: crate::identity::OriginMeta {
            source: Some(crate::identity::SourceLocusMeta {
                source_identity: "ix://agent-ix/filament-core-data/source/typespec",
                path: "model/leaf.tsp",
                start_line: 1,
                start_column: 1,
                end_line: None,
                end_column: None,
            }),
            generated: None,
        },
        fields: crate::types::leaf::FIELDS,
        relationships: &[],
        operations: &[],
        clauses: &[],
        extensions: &[],
    },
];

/// Every occurrence the contract carried, in document order.
pub const OCCURRENCES: &[OccurrenceMeta] = &[];

/// Every extension the contract package carried, in document order.
pub const PACKAGE_EXTENSIONS: &[ExtensionMeta] = &[];
