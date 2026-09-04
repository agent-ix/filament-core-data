---
id: FR-020
title: "Define the semantic type system and identity model"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "depends_on"
---
# [FR-020] Define the semantic type system and identity model

## Description

The semantic IR (v1, revised additively by v1.1) SHALL define a closed structural-kind vocabulary, orthogonal
semantic roles, stable package/type/field identities, and explicit presence,
nullability, default, constraint, recursion, and extension semantics.

## Behavior

- The type system SHALL represent scalar, record, enum, discriminated union, alias/newtype, sequence, map, and semantic-reference shapes.
- A type definition SHALL carry structural kind independently from zero or more namespaced semantic roles.
- Package, type, and field identity SHALL remain stable across compatible display-name, generated-identifier, file-path, and documentation changes.
- Field presence SHALL distinguish required from optional independently of permitted null values.
- Defaults SHALL identify whether they are semantic values, representation-local conveniences, or migration rules.
- Constraints SHALL retain their keyword, operands, applicability, diagnostic identity, and source locus.
- Recursive references SHALL preserve identity without flattening the graph into duplicated anonymous structures.
- Open and closed enums, unions, records, and extension points SHALL declare their unknown-value behavior.
- Definitions and occurrences SHALL remain distinct.
- In IR v1.1, a field SHALL carry an explicit multiplicity and an optional unit, with presence and nullability as derived views ([FR-027](./FR-027-declare-field-multiplicity-and-units.md)).
- In IR v1.1, a type definition of any kind SHALL carry opaque clause nodes ([FR-028](./FR-028-represent-relationships-operations-and-clauses.md)).
- In IR v1.1, a record type definition SHALL additionally carry first-class relationship and operation nodes ([FR-028](./FR-028-represent-relationships-operations-and-clauses.md)).
- In IR v1.1, the IR schema SHALL close the constraint keyword vocabulary and type each keyword's operands ([FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)).
- The contract SHALL NOT infer a definition version from an occurrence timestamp or database revision.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-020-CON-1 | Generated-language names SHALL NOT serve as semantic type or field identity. | Compatibility | Cross-target inspection |
| FR-020-CON-2 | A target that cannot preserve a selected type feature SHALL emit an unsupported or lossy diagnostic instead of silently coercing it. | Integrity | Negative golden test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-020-AC-1 | Every required structural kind has one normative IR shape and positive and invalid examples. | Inspection |
| FR-020-AC-2 | One record can carry an entity, event, observation, evidence, report, or other semantic role without changing its structural kind. | Test |
| FR-020-AC-3 | Required, optional, nullable, and defaulted fields remain distinguishable in the IR and all core target contracts. | Test |
| FR-020-AC-4 | Stable type and field identities survive generated-name and source-file renames classified as non-semantic. | Test |
| FR-020-AC-5 | Recursive references and namespaced extensions do not collapse into anonymous JSON values. | Test |
| FR-020-AC-6 | Unknown values follow the declared open/closed policy and never become a known zero/default variant. | Test |
| FR-020-AC-7 | Multiplicity, unit, relationships, operations, and clauses round-trip through the normalized serialization byte-identically. | Test |
| FR-020-AC-8 | Two independent readers of the v1.1 IR schema — the TypeScript Ajv reader in `test/` and a Python `jsonschema` reader under `tests/` (pytest, test-only), each implementing the cross-field rules of FR-027..030 — agree on every golden and negative fixture. | Test |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), architecture metamodel
- **Downstream**: [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), target emitters and compatibility classifier
