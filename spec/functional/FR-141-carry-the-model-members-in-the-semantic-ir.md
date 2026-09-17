---
id: FR-141
title: "Carry the model members in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-106"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-044"
    type: "constrained_by"
---
# FR-141: Carry the model members in the semantic IR

## Description

This requirement answers the model-member part of
[filament-core-data#93](https://github.com/agent-ix/filament-core-data/issues/93).

The semantic IR at contract `2.0.0` SHALL carry the model members that the
quire-spec model definition (AD-006) declares, so that a checked model reads
generalization, feature presence, subsetting, redefinition, operation frames,
inline pre- and postconditions and populations from the IR rather than from
prose. The members are:

| Member | Node | Meaning |
|---|---|---|
| `supertypes` | `typeDefinition` | The types this type specializes; the generalization graph is acyclic |
| `abstract` | `typeDefinition` | Whether the type has direct instances |
| `presence` | `field` | Whether the member must appear, authored (FR-106) |
| `subsets` | `field` | The supertype fields whose values include this field's values |
| `redefines` | `field` | The supertype field this field narrows |
| `frame` | `operation` | The feature paths the operation `modifies`, `creates` and `deletes` |
| `requires`, `ensures` | `operation` | Inline pre- and postconditions, each a clause with a language and text |
| `populations` | document | Named instance extents, each a set of type references with a multiplicity |
| scalar `any` | `typeDefinition` | An unconstrained JSON value (FR-139) |
| `identity` | `typeDefinition` | The node identity; a spec-bundle lift mints it from the artifact id (FR-143) |

Clauses are Quire. A clause language is one of `quire`, `ocl`, `sysml`,
`fretish` or a registered `namespace:name`. `quire` is the one checked language;
a clause in any other admitted language is carried as authored, unchecked, with
an advisory, and a reader never re-reads its text in another language.

## Inputs

- A semantic IR document declaring `contractVersion`

## Outputs

- Reader diagnostics for every violated member rule, each at a JSON pointer

## Behavior

- The schema SHALL admit each member of the table only in a `2.0.0` document and SHALL refuse it in a `1.0.0` or `1.1.0` document with `SCHEMA_VIOLATION`.
- A reader SHALL raise `UNRESOLVED_CONSTRUCT_REF` for a supertype naming no declared type, `CONSTRUCT_TARGET_KIND` for a supertype of another kind, and `SUPERTYPE_CYCLE` for a type that reaches itself through `supertypes`.
- A reader SHALL raise `UNRESOLVED_FEATURE_REF` for a `subsets` or `redefines` entry naming no field of a transitive supertype, and `INVALID_REDEFINITION` for a redefinition whose multiplicity lies outside the redefined field's bounds.
- A reader SHALL raise `UNRESOLVED_FRAME_PATH` for a frame path whose first segment names neither a field of the owning type or its supertypes nor a parameter of the operation.
- A reader SHALL raise `UNRESOLVED_TYPE_REF` for a population member naming no declared type.
- The Node, Python and Rust readers SHALL agree on the schema verdict of every document.
- The TypeSpec frontend SHALL lower a member of the intrinsic type `unknown` to the kernel scalar `any`, named `JsonObject` as a spec bundle names it, never to a record.
- If an inline `requires` or `ensures` clause declares an admitted language other than `quire`, then each reader SHALL accept the document and raise the advisory `agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED` (severity `info`, non-blocking) at that clause's `language`: the IR reader form of the engine's `semantic.clause-language-unchecked`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-141-CON-1 | A member of the table SHALL NOT appear in a `1.0.0` or `1.1.0` document the readers accept. | Compatibility | Test |
| FR-141-CON-2 | A reader SHALL NOT approximate a clause language: a language outside the admitted set is refused by the schema, and an admitted language other than `quire` is carried unchecked with `CLAUSE_LANGUAGE_UNCHECKED`, never read as `quire`. `agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED` is the IR reader's spelling of the Quire engine's `semantic.clause-language-unchecked`: the two name one condition, a clause whose language the reader carries without checking it as Quire. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-141-AC-1 | A `2.0.0` document carrying every member of the table is accepted by the Rust, Node and Python readers. | Test (TC-1740) |
| FR-141-AC-2 | A supertype naming no type, a supertype of another kind and a two-type generalization cycle raise `UNRESOLVED_CONSTRUCT_REF`, `CONSTRUCT_TARGET_KIND` and `SUPERTYPE_CYCLE` at the `supertypes` pointer. | Test (TC-1741) |
| FR-141-AC-3 | A `subsets` entry naming no supertype field raises `UNRESOLVED_FEATURE_REF`, and a `redefines` widening the redefined upper bound raises `INVALID_REDEFINITION`. | Test (TC-1742) |
| FR-141-AC-4 | A frame path starting at no field or parameter raises `UNRESOLVED_FRAME_PATH`, and a population member naming no type raises `UNRESOLVED_TYPE_REF`. | Test (TC-1743) |
| FR-141-AC-5 | Each member of the table inside a `1.1.0` document is refused with `SCHEMA_VIOLATION` by every reader. | Test (TC-1744) |
| FR-141-AC-6 | A `2.0.0` document whose inline `requires` clause declares `ocl`, or whose `ensures` clause declares `acme:tla`, is accepted by the Rust, Node and Python readers with exactly one non-blocking `CLAUSE_LANGUAGE_UNCHECKED` at that clause's `language`; the same clause in `quire` raises nothing. | Test (TC-1759) |
| FR-141-AC-7 | A TypeSpec model member of type `unknown` compiles without a blocking diagnostic to a field whose `typeRef` resolves to a `scalar` definition of scalar `any` whose identity ends `/type/JsonObject`, the identity a spec bundle mints for the same scalar, and no zero-field record is emitted for it. | Test (TC-1761) |

## Dependencies

- **Upstream**: [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-106](./FR-106-author-field-presence-independently.md), [FR-139](./FR-139-express-an-unconstrained-value-in-the-semantic-ir.md)
- **Downstream**: [FR-142](./FR-142-declare-one-construct-per-object-type.md)
- **Constrained by**: [NFR-044](../non-functional/NFR-044-preserve-semantic-ir-revision-compatibility.md)
