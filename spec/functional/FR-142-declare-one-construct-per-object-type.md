---
id: FR-142
title: "Declare one construct per object type"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-044"
    type: "constrained_by"
---
# FR-142: Declare one construct per object type

## Description

This requirement answers
[filament-core-data#146](https://github.com/agent-ix/filament-core-data/issues/146).

The semantic IR at contract `1.2.0` SHALL declare one type-definition `kind`
per business object type, and each construct SHALL carry its object type's
built-in rules and a stated Quire meaning. The IR declares no actor construct
and no architecture construct.

| `kind` | Required members | Built-in rules | Quire meaning |
|---|---|---|---|
| `entity` | `fields`, `identityFields` | `identityFields` is non-empty and names fields of the type or a supertype | A class whose instances are told apart by the identity fields and persist across changes to other fields |
| `value_object` | `fields` | No `identityFields` | A datatype: two values are equal when every field is equal |
| `nested_entity` | `fields`, `identityFields`, `owner` | `owner` is an `entity`, `nested_entity` or `aggregate_root` | A class composed by its owner; an instance exists only within one owner instance, and its identity fields tell instances apart within that owner instance |
| `aggregate_root` | `fields`, `identityFields`, `clauses`, `members` | At least one clause; `members` are `entity`, `value_object`, `nested_entity` or `enumeration` types | A class that is a consistency boundary; its clauses are invariants ranging over its members |
| `enumeration` | `variants` | No `fields`; the variant set is closed | An enumeration whose literals are exactly the variants |
| `event` | `fields`, `occurrenceField` | No `identityFields`; `occurrenceField` names a field resolving to scalar `datetime` | An immutable datatype recording one occurrence at the occurrence field's instant |
| `state_machine` | `operations`, `states`, `transitions` | At least one operation; a transition's `from` and `to` name its states, `trigger` names its operation, `guard` binds a clause by `clauseId`, `emits` names events | A state machine: a transition fires on its trigger when its guard holds and emits its events |
| `process` | `fields`, `identityFields`, `steps` | A step's `consumes` and `emits` name events | A class whose instances run the ordered steps, each consuming and emitting events |
| `repository` | `operations`, `persists` | At least one operation; no `fields`; `persists` names `entity` or `aggregate_root` types | An interface of persistence operations over the persisted types, holding no state of its own |
| `domain` | `members`, `vocabulary` | No `fields` and no `operations`; a member is not a domain; a type is a member of at most one domain | A namespace for its members and their vocabulary, not a data type |

Construct members other than those a kind carries are refused on that kind.
A built-in rule is decided on the document; a rule over instances, such as a
nested entity's identity being local to its owner instance, is the construct's
Quire meaning, since a document carries no instances.
Every construct except `enumeration` carries `relationships` and `operations`
as a record does.

## Inputs

- A semantic IR document declaring `contractVersion: "1.2.0"`

## Outputs

- Reader diagnostics for every violated built-in rule, each at a JSON pointer
- Each backend's rendering of every construct kind, by that kind's own mapping row
- `src/compiler/constructs.mjs`: the one Node list of construct kinds and edge-carrying kinds, read by the Node reader and every backend

## Behavior

- The schema SHALL admit the ten construct kinds only in a `1.2.0` document.
- The schema SHALL refuse a construct missing a required member, carrying a member its kind does not carry, or breaking a cardinality rule of the table, with `SCHEMA_VIOLATION`.
- A reader SHALL raise `UNRESOLVED_CONSTRUCT_REF` for a construct member naming no declared type, state, operation or field, and `CONSTRUCT_TARGET_KIND` for one naming a type of a kind the table excludes.
- A reader SHALL raise `INVALID_OCCURRENCE_FIELD` for an occurrence field not resolving to scalar `datetime`.
- A reader SHALL raise `DANGLING_CLAUSE_REF` for a transition guard naming no clause of the state machine.
- A reader SHALL raise `MULTIPLE_DOMAIN_MEMBERSHIP` for a type named by the members of two domains.
- The Rust, TypeScript, JSON Schema and Python backends SHALL render every construct kind and model member, each kind by its own mapping row: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md) and [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) and [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-100](./FR-100-map-semantic-ir-to-json-schema.md), and [FR-136](./FR-136-register-the-python-backends-in-the-generation-seam.md).
- `docs/semantic-data-system/contracts-v1.md` SHALL state each construct's members, built-in rules and Quire meaning.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-142-CON-1 | A reader SHALL NOT accept a construct whose built-in rule is broken. | Integrity | Test |
| FR-142-CON-2 | No layer SHALL approximate a construct as another kind. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-142-AC-1 | A `1.2.0` document declaring one construct of each of the ten kinds is accepted by the Rust, Node and Python readers. | Test (TC-1745) |
| FR-142-AC-2 | For each kind, removing a required member, and adding a member the kind does not carry, is refused with `SCHEMA_VIOLATION`. | Test (TC-1746) |
| FR-142-AC-3 | An owner of kind `value_object`, an aggregate member of kind `repository`, a repository persisting a `value_object`, a domain member that is a domain, and a construct member naming no type each raise their reader code at the member pointer. | Test (TC-1747) |
| FR-142-AC-4 | An event whose occurrence field is a string raises `INVALID_OCCURRENCE_FIELD`; a transition naming an undeclared state or operation raises `UNRESOLVED_CONSTRUCT_REF`; a guard naming no clause raises `DANGLING_CLAUSE_REF`; one type in two domains raises `MULTIPLE_DOMAIN_MEMBERSHIP`. | Test (TC-1748) |
| FR-142-AC-5 | The Rust, TypeScript and JSON Schema backends generate a document carrying one construct of every kind with state `success`, no diagnostic, and a rendering of each kind by its own mapping row, none as another kind. | Test (TC-1749) |
| FR-142-AC-6 | The contract document states the members, built-in rules and Quire meaning of every construct. | Inspection (TC-1750) |
| FR-142-AC-7 | The construct kinds the Rust reader, the extraction frontend, the Node constructs list and the Node and Python readers spell are exactly the schema's `1.2.0` `typeDefinition.kind` values, and their edge-carrying kinds are exactly the schema's. | Test (TC-1760) |

## Dependencies

- **Upstream**: [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md)
- **Downstream**: [FR-143](./FR-143-lift-object-type-artifacts-to-their-constructs.md)
- **Constrained by**: [NFR-044](../non-functional/NFR-044-preserve-semantic-ir-revision-compatibility.md)
