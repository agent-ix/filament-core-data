---
id: FR-113
title: "Emit namespaced revisions"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
---
# FR-113: Emit namespaced revisions

## Description

The producer SHALL emit every revision as the two-member selection
`{ namespace, value }` mapping 1:1 onto the consumer's
`Revision { namespace, value }`, drawn from a closed namespace vocabulary that
the configuration document declares explicitly.

## Inputs

- The producer object whose revision is emitted: model, profile, configuration,
  component, endpoint, or relationship object.
- The native artifact or definition whose revision is emitted.
- The configuration document's explicitly declared selected revision
  namespaces.

## Outputs

- A two-member revision selection carrying `namespace` and `value` for every
  emitted producer-object and native revision.
- A blocking refusal naming the offending revision when its namespace is
  substituted, undeclared, or absent.

## Behavior

- The producer SHALL emit every revision as the two-member selection
  `{ namespace, value }`.
- The producer SHALL emit the namespace `filament-core-data/producer-object-revision-1`
  for every producer model, profile, configuration, component, endpoint, and
  relationship object revision.
- The producer SHALL emit the namespace `quire-native/definition-revision-1`
  for every native artifact and native definition revision.
- The producer SHALL NOT emit a revision namespace outside those two spellings.
- The configuration document SHALL declare each selected revision namespace
  explicitly.
- The producer SHALL NOT apply a default namespace to a revision.
- The producer SHALL NOT infer a namespace from position, surrounding context,
  or the shape of the `value`.
- The producer SHALL refuse a native definition revision presented under the
  namespace `filament-core-data/producer-object-revision-1`.
- The producer SHALL refuse a producer-object revision presented under the
  namespace `quire-native/definition-revision-1`.
- The producer SHALL refuse a bare revision string presented in place of a
  revision selection.
- The producer SHALL refuse a revision whose `namespace` the configuration
  document does not declare.
- The producer SHALL treat one `value` spelling under two namespaces as two
  different revisions.
- The producer SHALL NOT merge two revisions that share a `value` spelling
  across two namespaces.
- The producer SHALL emit each revision refusal as a blocking input refusal.
- The producer SHALL NOT emit a revision refusal as a warning, a cache miss, or
  an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-113-CON-1 | The revision namespace vocabulary SHALL be exactly `filament-core-data/producer-object-revision-1` and `quire-native/definition-revision-1`. | Integrity | Test |
| FR-113-CON-2 | The producer SHALL refuse a bare revision string as a binding revision, because it carries no namespace. | Integrity | Test |
| FR-113-CON-3 | The producer SHALL keep a revision `namespace` and its `value` separate members, with equal `value` spelling never establishing revision identity across namespaces. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-113-AC-1 | A producer emits producer model, component, endpoint, and relationship revisions under `filament-core-data/producer-object-revision-1` and native artifact and definition revisions under `quire-native/definition-revision-1`, and each member arrives at the consumer's `Revision` without a defaulted or inferred namespace. | Test |
| FR-113-AC-2 | A native definition revision presented under `filament-core-data/producer-object-revision-1` refuses, and a producer-object revision presented under `quire-native/definition-revision-1` refuses. | Test |
| FR-113-AC-3 | A bare revision string presented in place of a two-member revision selection refuses and binds nothing. | Test |
| FR-113-AC-4 | A revision naming a namespace that the configuration document does not declare refuses. | Test |
| FR-113-AC-5 | Two revisions sharing one `value` spelling under the two declared namespaces remain two distinct revisions and never merge. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections, including the explicitly selected
  revision namespaces.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for revision selections.
