---
id: FR-143
title: "Lift object-type artifacts to their constructs"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-142"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "depends_on"
---
# FR-143: Lift object-type artifacts to their constructs

## Description

This requirement answers the extraction-frontend part of
[filament-core-data#146](https://github.com/agent-ix/filament-core-data/issues/146)
and of [#93](https://github.com/agent-ix/filament-core-data/issues/93).

The extraction frontend SHALL lift an artifact whose `object` is one of the ten
business object types to the FR-142 construct of the same name, emit a
`1.2.0` document, and mint every node identity of the artifact from its
artifact id. An artifact of any other object type lifts to a `record`.

## Inputs

- A spec bundle read through FR-091, each artifact carrying `id`, `title` and `object`
- The quire-rs extraction of each artifact's fields, clauses and operations
- The artifact's frontmatter edges, lowered by FR-094

## Outputs

- One construct per object-type artifact, or an `ARTIFACT_NOT_LOWERED` refusal naming the broken rule

## Behavior

### Identity

- The frontend SHALL set a type definition's `identity` to `ix://<org>/<name>/type/<slug(artifact id)>` and its `displayName` to the artifact's declared name: its `name`, else its `title`.
- The frontend SHALL use the artifact id as the `<Name>` part of every field, alias, constraint, relationship, operation, variant and clause identity of the artifact (FR-095).
- Renaming an artifact's declared name SHALL change only the type's `displayName`, its aliases' `displayName`, and constraint `diagnosticCode` values.

### Construct members

- The frontend SHALL set `identityFields` of an `entity`, `nested_entity`, `aggregate_root` or `process` to the fields carrying the `identity-field` extension.
- The frontend SHALL set an `aggregate_root`'s `members` to the targets of its composite relationships.
- The frontend SHALL set a `nested_entity`'s `owner` to the one `entity`, `nested_entity` or `aggregate_root` of the bundle whose composite relationship targets it.
- The frontend SHALL set an `event`'s `occurrenceField` to its one field resolving to the `Timestamp` kernel scalar.
- The frontend SHALL set a `repository`'s `persists` to the targets of its `persists` edges and a `domain`'s `members` to the targets of its `contains` edges.
- The frontend SHALL fill a `state_machine`'s `states` and `transitions`, a `process`'s `steps` and a `domain`'s `vocabulary` from the engine's structured extraction of the artifact.
- The frontend SHALL lower the `JsonObject` type token to the kernel scalar `any` with no declared loss.
- The frontend SHALL raise the `required-collection-presence` declared loss for a `0..*` field, whose authored presence the source row does not carry.

### Built-in rules at the artifact

- The frontend SHALL refuse, with blocking `ARTIFACT_NOT_LOWERED` (reason `other`) at the artifact head naming the rule, an artifact that:
  - is an `entity`, `nested_entity`, `aggregate_root` or `process` with no identity field;
  - is a `value_object` or `event` with an identity field;
  - is an `aggregate_root` with no clause;
  - is an `event` without exactly one `Timestamp` field;
  - is a `state_machine` with no operation;
  - is a `repository` with a field or with no operation;
  - is a `domain` with a field or an operation;
  - is a `nested_entity` with no owner or more than one;
  - has a relationship whose target is an artifact of the bundle that lowers to nothing.
- A refused artifact SHALL emit no type definition and no alias, and SHALL keep its own diagnostics.
- The frontend SHALL apply refusals to a fixed point before it emits any type, so that an owner lost to a refusal refuses its nested entity and no emitted `owner` or relationship names a refused artifact.
- The frontend SHALL NOT emit a construct with a built-in rule approximated.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-143-CON-1 | No type identity SHALL be minted from an artifact's declared name. | Correctness | Test |
| FR-143-CON-2 | Every emitted construct SHALL pass the FR-142 reader rules at lift time. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-143-AC-1 | The `business` fixture lifts to a `1.2.0` document holding one construct of each of the ten kinds, and the reader accepts it: `FR-001` and `PR-001` name their `id` field in `identityFields`, `AR-001`'s `members` are `FR-001` and `VO-001`, `NE-001`'s `owner` is `FR-001`, `EV-001`'s `occurrenceField` is its `placedAt` field, `RP-001` persists `FR-001`, and `DM-001`'s `members` are `AR-001`, `EN-001` and `FR-001`. | Test (TC-1751) |
| FR-143-AC-2 | Every type identity of the `business` fixture ends in its artifact id and every `displayName` is its declared name; renaming a declared name leaves every relationship byte-identical. | Test (TC-1752) |
| FR-143-AC-3 | Each rule of "Built-in rules at the artifact" broken on one artifact yields one blocking `ARTIFACT_NOT_LOWERED` naming that rule, and no type of that artifact is emitted. | Test (TC-1753) |
| FR-143-AC-4 | A `nested_entity` no composite relationship targets, and one two owners target, are each refused naming the owner rule; when nested entity `NE-001` is refused and `NE-002` is owned only by `NE-001`, `NE-002` is refused too with its own declared loss kept, and no emitted `owner` or relationship names a refused artifact. | Test (TC-1754) |
| FR-143-AC-5 | The `business` fixture's `SM-001` lifts the states `draft`, `placed`, `shipped` and `cancelled` with transitions `draft`→`placed`, `placed`→`shipped` and `placed`→`cancelled`; `PR-001` lifts the steps `placed`, `picked` and `shipped` in order; and `DM-001` lifts a non-empty `vocabulary`. | Test (TC-1755) |

## Dependencies

- **Upstream**: [FR-142](./FR-142-declare-one-construct-per-object-type.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md)
- **Upstream**: agent-ix/quire-rs#432, the engine extraction of states, transitions, steps and vocabulary, which filament-core-data#154 pins and lifts
