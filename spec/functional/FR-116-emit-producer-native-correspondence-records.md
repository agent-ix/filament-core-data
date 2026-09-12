---
id: FR-116
title: "Emit producer/native correspondence records"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-115"
    type: "depends_on"
---
# FR-116: Emit producer/native correspondence records

## Description

For every selected pair of one producer object and one native artifact, the
producer SHALL emit exactly one immutable correspondence record in the
producer's own bundle document. In that record the producer SHALL carry the
complete producer-object selection, the native artifact selection, the required
native definition closure, the declared binding-relation identity, the
authorizing configuration provenance, and one export mapping per exported
component, endpoint, and relationship record as separately addressable members.

## Inputs

- The selected producer object: its `interface` selection, `kind`, `authority`,
  `identity`, namespaced `revision`, and complete canonical digest selection in
  domain `filament-canonical-json-1`.
- The selected native artifact: its identity, namespaced revision, and raw-byte
  `sha256` digest selection in domain `quire-native-bytes-1`.
- The exact required native definition-closure identities, each with its own
  namespaced revision and raw-byte digest selection.
- The producer-declared binding-relation identity.
- The configuration provenance that authorized the relation.
- The exported component, endpoint, and relationship records declared in the
  producer's own bundle document, each with its exporting producer object
  identity, its export kind, its ordered export path, and its formal locus.

## Outputs

- One immutable correspondence record per selected (producer object, native
  artifact) pair, carried in the producer's own bundle document and carrying
  every input above as a separately addressable member.
- A blocking refusal naming the absent, foreign, duplicated, or stale member
  when the correspondence record cannot be emitted.

## Behavior

- The producer SHALL emit exactly one correspondence record for each selected
  pair of one producer object and one native artifact.
- The producer SHALL carry every correspondence record in the producer's own
  bundle document rather than in a consumer table entry.
- The producer SHALL carry in the correspondence record the producer object's
  `interface` selection, `kind`, `authority`, `identity`, namespaced `revision`,
  and canonical digest selection as six separate members.
- The producer SHALL carry in the correspondence record the native artifact
  identity, its namespaced revision, and its raw-byte `sha256` digest selection
  in domain `quire-native-bytes-1` as three separate members.
- The producer SHALL enumerate in the correspondence record the exact required
  native definition-closure identities, each with its own namespaced revision
  and raw-byte digest selection.
- The producer SHALL carry the producer-declared binding-relation identity as
  its own member of the correspondence record.
- The producer SHALL carry in the correspondence record the configuration
  provenance that authorized the declared relation.
- The producer SHALL declare in the correspondence record a relation between the
  producer object selection and the native artifact selection.
- The producer SHALL declare in the correspondence record one export mapping for
  each exported component, endpoint, and relationship record.
- The producer SHALL carry in every export mapping the exporting producer object
  `identity`, the `exportKind` drawn from the consumer's closed export-kind
  vocabulary, and the ordered `exportPath` segments by which the consumer
  addresses that export.
- The producer SHALL NOT assign the consumer's `u32` export, native, relation,
  or definition table indices, which the consumer assigns when it assembles its
  own package.
- The producer SHALL NOT assign the assessment export kind `population` to an
  export mapping, and FR-117 owns the refusal of a static producer bundle
  carrying such an export.
- The producer SHALL NOT present equal-looking values or matching hash text as
  evidence of semantic equivalence.
- The producer SHALL NOT emit a correspondence record for a producer object the
  consumer does not select.
- If two correspondence records name one selected pair of one producer object
  and one native artifact, then the producer SHALL refuse both records.
- If an export mapping names an export that its named producer object does not
  export, then the producer SHALL refuse the correspondence record.
- If an export mapping names an export owned by the producer object of another
  correspondence record, then the producer SHALL refuse the correspondence
  record.
- If the producer object selection or the native artifact selection changes
  while the prior binding-relation identity is retained, then the producer SHALL
  refuse the correspondence record.
- If a native re-encoding is presentation-only, then the producer SHALL require
  a new native artifact selection and a new correspondence record.
- The producer SHALL NOT satisfy a presentation-only native re-encoding by
  substituting a digest in the existing correspondence record.
- If the configuration provenance authorizing the relation is absent, then the
  producer SHALL refuse the correspondence record.
- If a required native definition-closure identity is absent, then the producer SHALL refuse the correspondence record.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-116-CON-1 | The producer SHALL carry in a correspondence record the producer object `interface` selection, `kind`, `authority`, `identity`, namespaced revision, and canonical digest selection, the native identity, native revision, and native raw-byte digest selection, the definition-closure entries, the binding-relation identity, the configuration provenance, and the export mappings as separate members. | Integrity | Compile |
| FR-116-CON-2 | The producer SHALL carry on every export mapping an `exportKind` drawn from the consumer's closed export-kind vocabulary and an ordered `exportPath`. | Interface | Test |
| FR-116-CON-3 | The producer SHALL keep a producer canonical digest selection and a native raw-byte digest selection distinct members even when their hash text coincides. | Traceability | Test |
| FR-116-CON-4 | The producer SHALL emit exactly one correspondence record per selected (producer object, native artifact) pair, which maps onto the consumer's at-most-one nullable per-model correspondence. | Integrity | Test |
| FR-116-CON-5 | The producer SHALL leave every consumer `u32` table index unassigned, because the consumer assigns those indices when it assembles its own package. | Interface | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-116-AC-1 | One selected pair of one producer object and one native artifact yields exactly one correspondence record whose producer object `interface`, `kind`, `authority`, `identity`, revision, and digest selection, native selection, definition closure, binding-relation identity, configuration provenance, and export mappings are each readable as separate members. | Compile |
| FR-116-AC-2 | A correspondence record whose export mapping names an export that its named producer object does not export is refused, and a correspondence record whose export mapping names an export owned by another correspondence's producer object is refused. | Test |
| FR-116-AC-3 | Changing the producer object selection or the native artifact selection while retaining the prior binding relation is refused, and a presentation-only native re-encoding is admitted only through a new native artifact selection and a new correspondence record rather than a digest substitution. | Test |
| FR-116-AC-4 | A correspondence record submitted without the configuration provenance that authorized its relation is refused. | Test |
| FR-116-AC-5 | A correspondence record whose required native definition-closure identities are incomplete is refused. | Test |
| FR-116-AC-6 | Two correspondence records naming one selected (producer object, native artifact) pair are refused. | Test |
| FR-116-AC-7 | A producer object that the consumer does not select yields no correspondence record. | Test |
| FR-116-AC-8 | Every emitted export mapping carries its exporting producer object identity, its `exportKind`, and its ordered `exportPath` segments, and the emitted record carries no consumer table index. | Test |
| FR-116-AC-9 | No emitted export mapping carries the assessment export kind `population`, whose presence in a static producer bundle FR-117-AC-7 refuses. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) defines the
  configuration provenance that authorizes a declared relation.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the versioned
  canonical and raw-byte digest selections carried by this record.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the namespaced
  revisions carried by this record.
- [FR-114](./FR-114-declare-component-and-endpoint-identities.md) defines
  the component and endpoint declarations mapped by this record's exports.
- [FR-115](./FR-115-emit-complete-relationship-records.md) defines the
  relationship records mapped by this record's exports.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) owns the refusal of a
  static producer bundle carrying an assessment-kind correspondence export.
- The consumer contract this record maps onto is an assumed external contract
  that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `ProducerObject { interface, kind, authority, identity, revision, digest }`,
  `Correspondence { producer, native, relation, exports }`,
  `Export { kind, path, locus }`, `Definition { identity, revision, artifact,
  rules, requires }`, and `Model { artifact, profile, exports, correspondence }`
  records this record's members supply. That consumer assigns the `u32` indices
  in `Correspondence.native`, `Correspondence.relation`,
  `Correspondence.exports`, and `Definition.requires` when it assembles its own
  package; that assignment is the consumer's boundary and is stated here as
  context, never as a requirement of this bundle.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
