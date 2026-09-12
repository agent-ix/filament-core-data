---
id: FR-116
title: "Emit producer/native correspondence records"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: "depends_on"
---
# FR-116: Emit producer/native correspondence records

## Description

For every native clause role that consumes a producer model or profile, the
producer SHALL emit exactly one immutable correspondence record that carries the
producer object selection, the native artifact selection, the required native
definition closure, the declared binding-relation identity, the authorizing
configuration provenance, and the exported relationship, component, and endpoint
identities as separate members.

## Inputs

- The selected producer object: its kind, authority, identity, namespaced
  revision, and complete canonical digest selection in domain
  `filament-canonical-json-1`.
- The selected native artifact or definition: its identity, namespaced revision,
  and raw-byte `sha256` digest selection in domain `quire-native-bytes-1`.
- The exact required native definition-closure identities, each with its own
  namespaced revision and raw-byte digest selection.
- The producer-declared binding-relation identity.
- The configuration provenance that authorized the relation.
- The exported relationship, component, and endpoint identities with their
  export kinds and formal loci.

## Outputs

- One immutable correspondence record per consuming native clause role, carrying
  every input above as a separately addressable member.
- A blocking refusal naming the absent, foreign, or stale member when the
  correspondence cannot be emitted.

## Behavior

- The producer SHALL emit exactly one correspondence record for each native
  clause role that consumes the selected producer model or profile.
- The correspondence record SHALL carry the producer object kind, identity,
  namespaced revision, and complete canonical digest selection as four separate
  members.
- The correspondence record SHALL carry the native artifact or definition
  identity, its namespaced revision, and its raw-byte `sha256` digest selection
  in domain `quire-native-bytes-1` as three separate members.
- The correspondence record SHALL enumerate the exact required native
  definition-closure identities, each with its own namespaced revision and
  raw-byte digest selection.
- The correspondence record SHALL carry the producer-declared binding-relation
  identity as its own member.
- The correspondence record SHALL carry the configuration provenance that
  authorized the declared relation.
- The correspondence record SHALL enumerate the exported relationship,
  component, and endpoint identities, and SHALL assign each export an export
  kind drawn from the consumer's closed export vocabulary.
- The correspondence record SHALL declare a relation between the producer
  selection and the native selection.
- The producer SHALL NOT present equal-looking values or matching hash text as
  evidence of semantic equivalence.
- If an export identity is not exported by the named producer object, then the
  producer SHALL refuse the correspondence record.
- If an export identity is owned by the producer object of another
  correspondence record, then the producer SHALL refuse the correspondence
  record.
- If the producer selection or the native selection changes while the prior
  binding-relation identity is retained, then the producer SHALL refuse the
  correspondence record.
- Where a native re-encoding is presentation-only, the producer SHALL require a
  new native selection and a new correspondence record.
- The producer SHALL NOT satisfy a presentation-only native re-encoding by
  substituting a digest in the existing correspondence record.
- If the configuration provenance authorizing the relation is absent, then the
  producer SHALL refuse the correspondence record.
- If a required native definition-closure identity is absent, then the producer SHALL refuse the correspondence record.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-116-CON-1 | A correspondence record SHALL carry producer object identity, namespaced revision, canonical digest selection, native identity, native revision, native raw-byte digest selection, definition-closure entries, binding-relation identity, configuration provenance, and export entries as separate members. | Integrity | Inspection |
| FR-116-CON-2 | A correspondence record SHALL assign every export an export kind drawn from the consumer's closed export vocabulary. | Interface | Test |
| FR-116-CON-3 | A producer canonical digest selection and a native raw-byte digest selection SHALL remain distinct members even when their hash text coincides. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-116-AC-1 | A selected producer model consumed by one native clause role yields exactly one correspondence record whose producer selection, native selection, definition closure, binding-relation identity, configuration provenance, and typed exports are each readable as separate members. | Test |
| FR-116-AC-2 | A correspondence record naming an export identity that the named producer object does not export is refused, and a correspondence record naming an export owned by another correspondence's producer object is refused. | Test |
| FR-116-AC-3 | Changing the producer selection or the native selection while retaining the prior binding relation is refused, and a presentation-only native re-encoding is admitted only through a new native selection and a new correspondence record rather than a digest substitution. | Test |
| FR-116-AC-4 | A correspondence record submitted without the configuration provenance that authorized its relation is refused. | Test |
| FR-116-AC-5 | A correspondence record whose required native definition-closure identities are incomplete is refused. | Test |

## Dependencies

- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the versioned
  canonical and raw-byte digest selections carried by this record.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the namespaced
  revisions carried by this record.
- [FR-114](./FR-114-declare-component-and-endpoint-identities.md) defines
  the component and endpoint declarations exported by this record.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
