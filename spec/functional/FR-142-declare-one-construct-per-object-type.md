---
id: FR-142
title: "Declare construct kinds as module data"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-044"
    type: "constrained_by"
---
# FR-142: Declare construct kinds as module data

## Description

This requirement answers
[filament-core-data#146](https://github.com/agent-ix/filament-core-data/issues/146)
and [filament-core-data#172](https://github.com/agent-ix/filament-core-data/issues/172),
and records its decision in
[ADR-0011](../../docs/semantic-data-system/adr/0011-domain-packages-construct-kinds-are-module-data.md).

The semantic IR at contract `2.0.0` SHALL carry each construct kind as data a
module declares. A type definition's `kind` is either one of the eight core
kinds (`scalar`, `record`, `enum`, `union`, `alias`, `sequence`, `map`,
`reference`) or a construct kind `{module, name}`, where `module` is the
declaring module's package identity and `name` is the object type's name. The
document's `constructs` table carries, for each construct kind a type uses, the
module's declaration of that kind, the module version and the digest of the
module's manifest bytes.

A declaration is written in a closed core vocabulary that
`schema/semantic/v1/construct-vocabulary.json` states once:

| Term | Values |
|---|---|
| `identity` | `identified`, `value`, `none` |
| `shape` | `record`, `enumeration`, `interface`, `state_machine`, `sequence`, `namespace` |
| `members` | member name → `required`, `optional` or `forbidden`, over the core members `fields`, `variants`, `relationships`, `operations`, `clauses`, `supertypes`, `abstract` (default `optional`) and `identityFields`, `owner`, `members`, `occurrenceField`, `states`, `transitions`, `steps`, `persists`, `vocabulary`, `direction`, `interfaceType`, `multiplicity`, `declaredType`, `flowDirection`, `sourceEnd`, `targetEnd`, `sourceElement`, `targetElement`, `featureOrder` (default `forbidden`) |
| `references` | reference member → the roles a named type carries to be admitted; the reference members are `owner`, `members`, `persists`, `interfaceType`, `declaredType`, `sourceElement`, `targetElement`, `sourceEnd` and `targetEnd` (each end's `type`), and `transitions` (each transition's `emits`) and `steps` (each step's `consumes` and `emits`) |
| `rules` | `identity_field_required`, `identity_field_forbidden`, `min_clauses`, `occurrence_field_required`, `no_fields`, `no_operations`, `min_operations`, `single_owner`, `exclusive_membership`, `members_not_namespace`; each rule requires one member presence of the declaration |
| `meaning` | A Quire meaning id, carried opaquely and never interpreted |

The Rust reader `crates/semantic-ir` implements the rules of every construct
kind once, generically over declarations; no reader, frontend or backend
matches on a construct kind's name. Backends dispatch on a construct's
`shape` and `identity`.

## Inputs

- A semantic IR document declaring `contractVersion: "2.0.0"`

## Outputs

- Reader diagnostics for every violated declaration or rule, each at a JSON pointer
- Each backend's rendering of every construct kind, by the mapping row its shape and identity select
- `src/compiler/constructs.mjs`: the one Node reading of the core vocabulary, the constructs table and a kind's shape and identity, read by the Node reader and every backend

## Behavior

- The schema SHALL admit a construct kind and the `constructs` table only in a `2.0.0` document, and SHALL require the table there.
- The schema SHALL refuse a declaration outside the core vocabulary, a declaration naming a member, reference or rule twice, a rule whose required member presence the declaration does not declare, a reference to a member the declaration forbids, and a reference role that is empty or `*`, with `SCHEMA_VIOLATION` at the pointer inside the entry.
- The schema SHALL refuse a type whose construct kind names no `constructs` entry, an entry no type's kind names, and a kind declared twice, with `SCHEMA_VIOLATION`.
- The schema SHALL refuse a construct missing a member its declaration requires, carrying a member its declaration forbids, or carrying an empty list where `min_clauses` or `min_operations` applies, with `SCHEMA_VIOLATION`; a core-kind type SHALL NOT carry a member whose default is `forbidden`, except an alias's `target`.
- A reader SHALL raise `UNRESOLVED_CONSTRUCT_REF` for a reference member entry naming no declared type, and for a member naming no declared state, operation or field.
- A reader SHALL raise `CONSTRUCT_TARGET_KIND` for a reference member entry naming a type that carries none of the roles its declaration admits, for a supertype of another kind, and, under `members_not_namespace`, for a member whose construct's shape is `namespace`.
- A reader SHALL raise `INVALID_OCCURRENCE_FIELD` for an occurrence field not resolving to scalar `datetime`.
- A reader SHALL raise `DANGLING_CLAUSE_REF` for a transition guard naming no clause of its type.
- The schema SHALL admit a port `direction` of `in`, `out` or `inout`, a connection `flowDirection` of `source-to-target`, `target-to-source` or `bidirectional`, and connection ends each carrying a `type` and an optional `multiplicity`.
- A reader SHALL raise `UNRESOLVED_CONSTRUCT_REF` for a `featureOrder` entry naming no single field or operation its type declares itself, and `INCOMPLETE_FEATURE_ORDER` for each such field or operation a `featureOrder` omits; a backend that renders no feature order SHALL ignore it.
- A reader SHALL raise `MULTIPLE_DOMAIN_MEMBERSHIP` for a type named by the members of two types whose declarations select `exclusive_membership`.
- The Rust, Node and Python readers SHALL read the core vocabulary from `construct-vocabulary.json`, and their reading SHALL equal the schema's `constructDeclaration`.
- The Rust, TypeScript, JSON Schema and Python backends SHALL render every construct kind and model member by the mapping row its shape and identity select: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md) and [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) and [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-100](./FR-100-map-semantic-ir-to-json-schema.md), and [FR-136](./FR-136-register-the-python-backends-in-the-generation-seam.md). A rendered kind name is the construct kind's `name`.
- Each backend SHALL carry clauses, guards, transitions, subsets, frames and populations as data and SHALL emit, for each of these member kinds a `2.0.0` document declares, one non-blocking `CONSTRUCT_MEMBER_UNENFORCED` at the member's first pointer naming its declared loss and owning issue: clauses [#159](https://github.com/agent-ix/filament-core-data/issues/159), guards [#160](https://github.com/agent-ix/filament-core-data/issues/160), transitions [#161](https://github.com/agent-ix/filament-core-data/issues/161), subsets [#162](https://github.com/agent-ix/filament-core-data/issues/162), frames [#163](https://github.com/agent-ix/filament-core-data/issues/163), populations [#164](https://github.com/agent-ix/filament-core-data/issues/164).
- `docs/semantic-data-system/contracts-v1.md` SHALL state the core vocabulary, the rule each term selects, and the construct declarations of the `business` fixture module.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-142-CON-1 | A reader SHALL NOT accept a construct whose declaration or selected rule is broken. | Integrity | Test |
| FR-142-CON-2 | No layer SHALL approximate a construct as another kind. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-142-AC-1 | A `2.0.0` document declaring one construct of each of the ten `business` fixture kinds, and its `constructs` table, is accepted by the Rust, Node and Python readers. | Test (TC-1745) |
| FR-142-AC-2 | For each kind, removing a member its declaration requires, and adding a member its declaration forbids, is refused with `SCHEMA_VIOLATION`. | Test (TC-1746) |
| FR-142-AC-3 | An owner, an aggregate member and a persisted type carrying none of the admitted roles, a namespace member that is a namespace, and a reference member naming no type each raise their reader code at the member pointer. | Test (TC-1747) |
| FR-142-AC-4 | An occurrence field that is a string raises `INVALID_OCCURRENCE_FIELD`; a transition naming an undeclared state or operation raises `UNRESOLVED_CONSTRUCT_REF`; a guard naming no clause raises `DANGLING_CLAUSE_REF`; one type in the members of two `exclusive_membership` types raises `MULTIPLE_DOMAIN_MEMBERSHIP`. | Test (TC-1748) |
| FR-142-AC-5 | The Rust, TypeScript and JSON Schema backends generate a document carrying one construct of every kind with state `success`, no blocking diagnostic, and a rendering of each kind by the row its shape and identity select, none as another kind. | Test (TC-1749) |
| FR-142-AC-6 | The contract document states the core vocabulary, the rule each term selects, and the `business` fixture module's declarations. | Inspection (TC-1750) |
| FR-142-AC-7 | No business construct kind name appears as a literal in filament-core-data source outside fixtures, goldens, generated code and tests; a kind name that is also a core shape term names that shape. | Test (TC-1787) |
| FR-142-AC-8 | Each backend generating a `2.0.0` document that declares clauses, guards, transitions, subsets, frames and populations succeeds with exactly one non-blocking `CONSTRUCT_MEMBER_UNENFORCED` per member kind, each naming its pointer and owning issue, and a document declaring none of them raises none. | Test (TC-1776) |
| FR-142-AC-9 | A kind naming no `constructs` entry, an entry no type uses, a kind declared twice, a `2.0.0` document without `constructs`, a wildcard role and a rule whose member presence is undeclared are each refused with `SCHEMA_VIOLATION`; widening a declaration's admitted roles admits a reference its former roles refused, and removing the role from the named type refuses it. | Test (TC-1789) |
| FR-142-AC-10 | A document declaring a kind no reader, frontend or backend code names, such as a systems `port` carrying `owner`, `direction`, `interfaceType` and `multiplicity` and a `connection` carrying `flowDirection` and two ends, reads clean in the Rust and Node readers and renders by its shape and identity alone; a `direction` outside `in`, `out` and `inout`, a missing required member and an owner without the admitted role are refused. | Test (TC-1791) |
| FR-142-AC-11 | The Rust, Node and Python readings of the core vocabulary each equal `construct-vocabulary.json` and the schema's `constructDeclaration`, member defaults, reference items and rule requirements included. | Test (TC-1786) |
| FR-142-AC-12 | Reading a declaration refuses an identity outside the vocabulary, an unknown member, a rule whose member presence is undeclared, a reference to a forbidden member, a wildcard or repeated role, a reference on a non-reference member, a repeated rule, an unknown declaration member and a missing required member, each at its pointer; a declaration without `references` and `rules` reads with none. | Test (TC-1788) |
| FR-142-AC-13 | A type whose declaration admits `featureOrder` and that lists its own fields and operations each once reads clean; an order omitting one raises `INCOMPLETE_FEATURE_ORDER` at `featureOrder`, an entry naming another type's operation raises `UNRESOLVED_CONSTRUCT_REF` at the entry, and a repeated entry, an empty order, an order on a construct forbidding it and a missing required order are refused with `SCHEMA_VIOLATION`. | Test (TC-1793) |

## Dependencies

- **Upstream**: [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md)
- **Downstream**: [FR-143](./FR-143-lift-object-type-artifacts-to-their-constructs.md); the Rust, TypeScript and Python types for module artifact types and object types are [filament-core-data#150](https://github.com/agent-ix/filament-core-data/issues/150)
- **Constrained by**: [NFR-044](../non-functional/NFR-044-preserve-semantic-ir-revision-compatibility.md)
