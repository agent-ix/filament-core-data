---
id: FR-124
title: "Emit assessment correspondence and exports"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-120"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-122"
    type: "depends_on"
---
# FR-124: Emit assessment correspondence and exports

## Description

For every assessment object that a native clause role consumes,
the producer SHALL emit one immutable correspondence record carrying the
producer object selection, the native artifact or definition selection, the
exact native definition closure, the binding-relation identity, the
configuration provenance, and one export mapping for every exported population,
snapshot, window, and observation-record identity as separately addressable
members.

## Inputs

- The selected producer assessment object: its `kind`, `identity`, namespaced
  `revision`, and complete canonical digest selection in domain
  `filament-canonical-json-1`.
- The selected native artifact or definition: its identity, namespaced revision,
  and raw-byte `sha256` digest selection in domain `quire-native-bytes-1`.
- The exact required native definition-closure identities, each with its own
  namespaced revision and raw-byte digest selection.
- The producer-declared binding-relation identity.
- The configuration provenance that authorized the declared relation.
- The exported population, snapshot, window, and observation-record identities
  declared in the producer's own assessment document, each with its exporting
  producer object identity, its `exportKind`, and its ordered `exportPath`.

## Outputs

- One immutable correspondence record per selected pair of one producer
  assessment object and one native artifact, carrying every input above as a
  separately addressable member.
- A blocking refusal naming the absent, foreign, unexported, stale, or
  static-only member when the correspondence record cannot be emitted.

## Behavior

- The producer SHALL emit one immutable correspondence record for every
  assessment object that a native clause role consumes.
- The producer SHALL apply to every assessment correspondence record the FR-116
  correspondence cardinality rule unchanged, rather than declaring a second
  cardinality rule of its own.
- The producer SHALL carry every assessment correspondence record in the
  producer's own assessment document rather than in a consumer table entry.
- The producer SHALL carry in the correspondence record the producer object
  `kind`, `identity`, namespaced `revision`, and canonical digest selection in
  domain `filament-canonical-json-1` as four separate members.
- The producer SHALL carry in the correspondence record the native artifact or
  definition identity, its namespaced revision, and its raw-byte `sha256` digest
  selection in domain `quire-native-bytes-1` as three separate members.
- The producer SHALL enumerate in the correspondence record the exact required
  native definition-closure identities, each with its own namespaced revision and
  raw-byte digest selection.
- The producer SHALL carry the producer-declared binding-relation identity as its
  own member of the correspondence record.
- The producer SHALL carry in the correspondence record the configuration
  provenance that authorized the declared relation.
- The producer SHALL declare in the correspondence record one export mapping for
  every exported population, snapshot, window, and observation-record identity.
- The producer SHALL carry in every export mapping the exporting producer object
  `identity`, the `exportKind` drawn from the consumer's closed export-kind
  vocabulary, and the ordered `exportPath` segments by which the consumer
  addresses that export.
- The producer SHALL treat `population` as a legitimate `exportKind` of an
  assessment correspondence export, unlike in a static bundle, where FR-117
  refuses it.
- The producer SHALL NOT assign the consumer's `u32` export, native, relation, or
  definition table indices, which the consumer assigns when it assembles its own
  package.
- The producer SHALL NOT present equal-looking values or matching hash text as
  evidence of semantic equivalence.
- If an export mapping names an export that its named producer object does not
  export, then the producer SHALL refuse the correspondence record.
- If an export mapping names an export owned by the producer object of another
  correspondence record, then the producer SHALL refuse the correspondence
  record.
- If the producer object selection or the native artifact selection changes while
  the prior binding-relation identity is retained, then the producer SHALL refuse
  the correspondence record.
- If an export mapping of an assessment correspondence record names a static-only
  `exportKind`, then the producer SHALL refuse the correspondence record.
- If the configuration provenance authorizing the relation is absent, then the
  producer SHALL refuse the correspondence record.
- The producer SHALL NOT present emission of an assessment correspondence record
  as campaign acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-124-CON-1 | The producer SHALL carry in an assessment correspondence record the producer object `kind`, `identity`, namespaced revision, and canonical digest selection, the native identity, native revision, and native raw-byte digest selection, the native definition-closure entries, the binding-relation identity, the configuration provenance, and the export mappings as separate members. | Integrity | Compile |
| FR-124-CON-2 | The producer SHALL carry on every assessment export mapping an `exportKind` drawn from the consumer's closed export-kind vocabulary and an ordered `exportPath`. | Interface | Test |
| FR-124-CON-3 | The producer SHALL keep a producer canonical digest selection and a native raw-byte digest selection distinct members even when their hash text coincides. | Traceability | Test |
| FR-124-CON-4 | The producer SHALL admit the assessment `exportKind` `population` only in an assessment correspondence record, whose static counterpart FR-120 partitions. | Integrity | Test |
| FR-124-CON-5 | The producer SHALL leave every consumer `u32` table index unassigned, because the consumer assigns those indices when it assembles its own package. | Interface | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-124-AC-1 | One assessment object consumed by a native clause role yields one correspondence record whose producer object `kind`, identity, revision, and canonical digest selection, native selection, native definition closure, binding-relation identity, configuration provenance, and export mappings are each readable as separate members. | Compile |
| FR-124-AC-2 | Every exported population, snapshot, window, and observation-record identity carries one export mapping with its exporting producer object identity, its `exportKind`, and its ordered `exportPath` segments, the `exportKind` `population` is admitted here, and the emitted record carries no consumer table index. | Test |
| FR-124-AC-3 | A correspondence record whose export mapping names an export that its named producer object does not export is refused, and the refusal names the unexported export. | Test |
| FR-124-AC-4 | A correspondence record whose export mapping names an export owned by another correspondence's producer object is refused, and the refusal names the foreign owning producer object. | Test |
| FR-124-AC-5 | Changing the producer object selection or the native artifact selection while retaining the prior binding-relation identity is refused, and the refusal names the stale relation. | Test |
| FR-124-AC-6 | A correspondence record naming a static-only `exportKind` as an assessment export is refused, and the refusal names the offending export kind. | Test |
| FR-124-AC-7 | A correspondence record submitted without the configuration provenance that authorized its relation is refused. | Test |
| FR-124-AC-8 | Emission of an assessment correspondence record is recorded as a producer emission only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) owns the
  correspondence cardinality rule this document reuses rather than restates:
  exactly one record per selected pair of one producer object and one native
  artifact, two records naming one such pair refused, and no record at all for a
  producer object the consumer does not select.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document selections whose objects these records correspond to.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md)
  owns the static/assessment export split, and therefore owns that `population`
  is an assessment export kind here while
  [FR-117](./FR-117-admit-a-static-producer-bundle.md) refuses it in a static
  producer bundle.
- [FR-122](./FR-122-emit-snapshot-and-window-selections.md) defines the snapshot,
  window, and observation-record identities mapped by this record's exports.
- The native consumer boundary is stated here as context, never as a requirement
  of this document: that consumer validates each digest only in its named domain,
  then validates the relation, kinds, exports, and closure, and assigns its own
  `u32` table indices when it assembles its package. The consumer contract is an
  assumed external contract that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `Correspondence { producer, native, relation, exports }` and
  `Export { kind, path, locus }` records — the latter with the closed
  `ExportKind` vocabulary that includes the assessment kind `population` — this
  record's members supply.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
