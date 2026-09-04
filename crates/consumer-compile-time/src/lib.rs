//! The compile-time consumer of the generated crate (FR-061).
//!
//! Everything this crate claims is decided by `rustc` rather than by a test
//! run. The `match` below carries no wildcard arm, so a type added to the
//! contract stops this crate compiling; the `const` assertion below is
//! evaluated during compilation, so a change in the generated type count stops
//! it compiling too. `make rust-install-from-artifact` rehearses both failures
//! against a deliberately modified document rather than asserting them.

use agent_ix_conformance::metadata::{ClauseMeta, OperationMeta, RelationshipMeta, TypeMeta};
use agent_ix_conformance::{SemanticType, TYPES};

/// The number of types the contract this consumer was written against declares.
///
/// It is written out rather than derived, because a derived count would agree
/// with whatever the crate happened to export and would assert nothing.
pub const DECLARED_TYPE_COUNT: usize = 12;

/// The export surface is finite and known.
///
/// This is a `const` item, so the comparison happens while the crate is
/// compiled: a generated crate carrying a different number of types is a
/// compile error here and never a runtime surprise.
const _: () = assert!(
    TYPES.len() == DECLARED_TYPE_COUNT,
    "the generated crate exports a different number of types than this consumer declares"
);

/// The wire form every generated type is written in, decided per variant.
///
/// The `match` is exhaustive and carries **no** wildcard arm. That is the whole
/// point of the function: adding a variant to `SemanticType` makes this fail to
/// compile with `E0004` instead of falling into a catch-all that silently
/// answers for a type nobody wrote a rule for.
pub fn shape_of(semantic_type: SemanticType) -> &'static str {
    match semantic_type {
        SemanticType::Text => "string",
        SemanticType::Count => "integer",
        SemanticType::Millis => "integer",
        SemanticType::Status => "string-enum",
        SemanticType::TextList => "array",
        SemanticType::TextMap => "object",
        SemanticType::Payload => "tagged-union",
        SemanticType::NodeRef => "identity",
        SemanticType::Node => "record",
        SemanticType::Root => "record",
        SemanticType::Envelope => "record",
        SemanticType::Bundle => "record",
    }
}

/// Every variant of `SemanticType`, in the order the contract declares them.
///
/// It is a slice rather than an array of length `DECLARED_TYPE_COUNT`, so that
/// the exhaustive `match` and the `const` assertion fail independently: the
/// rehearsal in `make rust-install-from-artifact` proves each one on its own,
/// and an array would have made a type addition break all three at once.
pub const ALL_TYPES: &[SemanticType] = &[
    SemanticType::Text,
    SemanticType::Count,
    SemanticType::Millis,
    SemanticType::Status,
    SemanticType::TextList,
    SemanticType::TextMap,
    SemanticType::Payload,
    SemanticType::NodeRef,
    SemanticType::Node,
    SemanticType::Root,
    SemanticType::Envelope,
    SemanticType::Bundle,
];

/// The metadata entry for one semantic identity.
fn type_meta(identity: &str) -> Option<&'static TypeMeta> {
    TYPES.iter().find(|entry| entry.identity == identity)
}

/// The `Root` type's metadata, which carries the relationship, the operation
/// and the clause this consumer reads.
fn root() -> &'static TypeMeta {
    match type_meta("ix://agent-ix/conformance/type/Root") {
        Some(meta) => meta,
        None => panic!("the generated crate declares no Root type"),
    }
}

/// One identity constant, read from the generated provenance module.
pub fn package_identity() -> &'static str {
    agent_ix_conformance::identity::PACKAGE_IDENTITY
}

/// One role, read from the generated type metadata.
pub fn value_role() -> &'static str {
    match type_meta("ix://agent-ix/conformance/type/Text") {
        Some(meta) => match meta.roles.first() {
            Some(role) => role,
            None => panic!("the generated Text metadata carries no role"),
        },
        None => panic!("the generated crate declares no Text type"),
    }
}

/// One relationship, read from the generated type metadata.
pub fn contains_relationship() -> &'static RelationshipMeta {
    match root().relationships.first() {
        Some(relationship) => relationship,
        None => panic!("the generated Root metadata carries no relationship"),
    }
}

/// One operation, read from the generated type metadata.
pub fn resize_operation() -> &'static OperationMeta {
    match root().operations.first() {
        Some(operation) => operation,
        None => panic!("the generated Root metadata carries no operation"),
    }
}

/// One clause, read from the generated type metadata.
pub fn size_clause() -> &'static ClauseMeta {
    match root().clauses.first() {
        Some(clause) => clause,
        None => panic!("the generated Root metadata carries no clause"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// TC-720: the static export surface is the one the contract declares.
    #[test]
    fn tc_720_reads_the_static_export_surface() {
        assert_eq!(TYPES.len(), DECLARED_TYPE_COUNT);
        assert_eq!(ALL_TYPES.len(), DECLARED_TYPE_COUNT);
        for (position, semantic_type) in ALL_TYPES.iter().enumerate() {
            assert_eq!(semantic_type.identity(), TYPES[position].identity);
            assert!(!shape_of(*semantic_type).is_empty());
        }
    }

    /// TC-720: one identity constant, one role, one relationship, one
    /// operation and one clause reach the consumer with the values the
    /// contract carries.
    #[test]
    fn tc_720_reads_identity_role_relationship_operation_and_clause() {
        assert_eq!(package_identity(), "agent-ix/conformance");
        assert_eq!(value_role(), "agent-ix:value");

        let relationship = contains_relationship();
        assert_eq!(relationship.verb, "contains");
        assert_eq!(relationship.category, "structural");
        assert!(relationship.composite);
        assert_eq!(relationship.target, "ix://agent-ix/conformance/type/Node");

        let operation = resize_operation();
        assert_eq!(operation.name, "resize");
        assert_eq!(operation.params.len(), 1);
        assert_eq!(operation.pre, ["size-non-negative"]);
        assert_eq!(operation.post, ["node-returned"]);

        let clause = size_clause();
        assert_eq!(clause.clause_id, "size-non-negative");
        assert_eq!(clause.language, "ocl");
        assert_eq!(clause.text, "size >= 0");
    }
}
