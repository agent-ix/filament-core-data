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

The producer SHALL emit every revision it authors for a producer object, a
native artifact, or a native definition as the two-member selection
`{ namespace, value }` mapping 1:1 onto the consumer's
`Revision { namespace, value }`, drawn from a closed namespace vocabulary whose
selected members the configuration document declares explicitly.

## Inputs

- The producer object whose revision is emitted: model, profile, configuration,
  component, endpoint, or relationship object.
- The native artifact or definition whose revision is emitted.
- The configuration document's explicitly declared selected revision
  namespaces, drawn from the closed namespace vocabulary this requirement
  fixes.

## Outputs

- A two-member revision selection carrying `namespace` and `value` for every
  producer-object and native revision the producer authors.
- A blocking refusal naming the offending revision when its namespace is
  substituted, unselected, outside the closed vocabulary, or absent.

## Behavior

- The producer SHALL emit every revision it authors as the two-member selection
  `{ namespace, value }`.
- The producer SHALL treat `filament-core-data/producer-object-revision-1` and
  `quire-native/definition-revision-1` as the complete closed admissible
  revision-namespace vocabulary of this interface.
- The producer SHALL emit the namespace `filament-core-data/producer-object-revision-1`
  for every producer model, profile, configuration, component, endpoint, and
  relationship object revision.
- The producer SHALL emit the namespace `quire-native/definition-revision-1`
  for every native artifact and native definition revision.
- The producer SHALL emit only the revision namespaces that the configuration
  document declares as selections from that closed vocabulary.
- The producer SHALL NOT apply a default namespace to a revision.
- The producer SHALL NOT infer a namespace from position, surrounding context,
  or the shape of the `value`.
- The producer SHALL refuse a native definition revision presented under the
  namespace `filament-core-data/producer-object-revision-1`.
- The producer SHALL refuse a producer-object revision presented under the
  namespace `quire-native/definition-revision-1`.
- The producer SHALL refuse a bare revision string presented in place of a
  revision selection it authors.
- The producer SHALL refuse a revision whose `namespace` lies outside the
  closed admissible revision-namespace vocabulary.
- The producer SHALL refuse a revision whose `namespace` the configuration
  document does not declare as a selection.
- The producer SHALL treat one `value` spelling under two namespaces as two
  different revisions.
- The producer SHALL NOT merge two revisions that share a `value` spelling
  across two namespaces.
- The producer SHALL admit a native source record whose `revision` member is an
  editable native authority label, which is not a formal revision and which
  this requirement does not govern.
- The producer SHALL emit each revision refusal as a blocking input refusal.
- The producer SHALL NOT emit a revision refusal as a warning, a cache miss, or
  an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-113-CON-1 | The producer SHALL confine every revision namespace it emits to exactly `filament-core-data/producer-object-revision-1` and `quire-native/definition-revision-1`. | Integrity | Test |
| FR-113-CON-2 | The producer SHALL refuse a bare revision string as a binding revision, because it carries no namespace. | Integrity | Test |
| FR-113-CON-3 | The producer SHALL keep a revision `namespace` and its `value` separate members, with equal `value` spelling never establishing revision identity across namespaces. | Traceability | Test |
| FR-113-CON-4 | The producer SHALL scope this requirement to the revision members it authors for producer objects, native artifacts, and native definitions, excluding the consumer-owned `NativeSource.revision` editable native authority label and the consumer-owned `ArtifactRef.digest` raw-byte digest string, neither of which it refuses. | Interface | Test |
| FR-113-CON-5 | The producer SHALL read its revision-namespace selections from the configuration document, which selects among the members of the closed admissible revision-namespace vocabulary this requirement fixes. | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-113-AC-1 | A producer emits producer model, component, endpoint, and relationship revisions under `filament-core-data/producer-object-revision-1` and native artifact and definition revisions under `quire-native/definition-revision-1`, and both members match the identically named members of the pinned consumer `Revision` wire contract, with neither member absent, defaulted, nor inferred. | Contract |
| FR-113-AC-2 | A native definition revision presented under `filament-core-data/producer-object-revision-1` refuses, and a producer-object revision presented under `quire-native/definition-revision-1` refuses. | Test |
| FR-113-AC-3 | A bare revision string presented in place of a two-member revision selection the producer authors refuses and binds nothing. | Test |
| FR-113-AC-4 | A revision whose namespace lies outside the closed admissible revision-namespace vocabulary refuses, and one inside that vocabulary whose namespace the configuration document does not declare as a selection refuses. | Test |
| FR-113-AC-5 | Two revisions sharing one `value` spelling under the two declared namespaces remain two distinct revisions and never merge. | Test |
| FR-113-AC-6 | A conforming source-provenance locus carrying `NativeSource.revision` as an editable native authority label and `ArtifactRef.digest` as one raw-byte digest string is admitted, and neither member refuses as a malformed revision selection. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections, including which members of the closed
  admissible revision-namespace vocabulary this bundle selects.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment does not own:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which carries
  `Revision { namespace, value }` and the `NativeSource.revision` native
  authority label that this requirement excludes.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer reads both `Revision` members directly, defaults and
  infers neither, and treats its own `NativeSource.revision` as an editable
  authority label rather than as a formal revision.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for revision selections.
