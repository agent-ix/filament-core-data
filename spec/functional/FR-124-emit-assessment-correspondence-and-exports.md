---
id: FR-124
title: "Emit assessment correspondence and exports"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-111"
    type: "depends_on"
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

For every selected pair of one producer assessment object and one native
artifact, the producer SHALL emit exactly one immutable assessment
correspondence record in the producer's own assessment document, carrying the
members FR-116 obligates on a correspondence record and adding only what the
assessment side differs in: one export mapping per exported population identity,
the snapshot and observation-record documents addressed as consumer artifact
references, and the window selection supplied as a clock binding requirement.

## Inputs

- The selected producer assessment object: the five members the producer
  authors, being its `kind`, `authority`, `identity`, namespaced `revision`, and
  complete canonical digest selection in domain `filament-canonical-json-1`.
- The selected native artifact or definition: its identity, namespaced revision,
  and raw-byte `sha256` digest selection in domain `quire-native-bytes-1`.
- The exact required native definition-closure identities, each with its own
  namespaced revision and raw-byte digest selection.
- The producer-declared binding-relation identity.
- The configuration provenance that authorized the declared relation.
- The exported population identities declared in the producer's own assessment
  document, each with its exporting producer object identity, its `exportKind`,
  its ordered `exportPath`, and its formal export locus.
- The snapshot document and the observation-record document this record
  concerns, each supplied as a consumer artifact reference carrying the member of
  the consumer's closed artifact-kind vocabulary for a snapshot and for an
  observation respectively.
- The window selection this record concerns, supplied as a binding requirement
  carrying the member of the consumer's closed binding-kind vocabulary for a
  clock.
- The later inputs the consumer's binding-requirement record declares for the
  binding-kind members `population`, `snapshot`, `clock`, and `observation`.

## Outputs

- One immutable assessment correspondence record per selected pair of one
  producer assessment object and one native artifact, carried in the producer's
  own assessment document and carrying every input above as a separately
  addressable member.
- The snapshot and observation-record artifact references and the clock binding
  requirement carrying the window selection, each emitted as its own member
  rather than as an export mapping.
- A blocking refusal naming the absent, foreign, unexported, stale, or
  static-side member when the assessment correspondence record cannot be
  emitted.

## Behavior

- The producer SHALL emit exactly one assessment correspondence record for each
  selected pair of one producer assessment object and one native artifact, which
  is the FR-116 cardinality unit this requirement reuses rather than a second
  unit of its own.
- The producer SHALL carry every assessment correspondence record in the
  producer's own assessment document rather than in a consumer table entry.
- The producer SHALL carry on every assessment correspondence record the
  producer-object, native-artifact, native-definition-closure, binding-relation,
  configuration-provenance, and export-mapping members FR-116 obligates, rather
  than a member set of its own.
- The producer SHALL carry in the assessment correspondence record the producer
  assessment object's `kind`, `authority`, `identity`, namespaced `revision`, and
  canonical digest selection in domain `filament-canonical-json-1` as five
  separate members.
- The producer SHALL NOT author the `interface` member of the consumer's
  producer-object record, which is a `u32` index into a consumer table that the
  consumer assigns when it assembles its own package, as FR-116 states for the
  static half.
- The producer SHALL apply to every assessment correspondence record the FR-116
  refusals of an unexported export mapping, of an export mapping owned by
  another record's producer object, of a changed producer-object or
  native-artifact selection under a retained binding-relation identity, and of
  an absent configuration provenance, rather than declaring refusals of its own.
- The producer SHALL apply to every assessment correspondence record FR-116's
  prohibition on presenting equal-looking values or matching hash text as
  evidence of semantic equivalence.
- The producer SHALL apply to the native definition closure of every assessment
  correspondence record the FR-111 control that retains `unknown` with its path
  for circular or unresolved support, as FR-116 does for the static half.
- The producer SHALL declare in the assessment correspondence record one export
  mapping for every exported population identity, whose `exportKind` is the
  member FR-120's static/assessment export-kind partition places on the
  assessment side.
- The producer SHALL carry in every assessment export mapping the exporting
  producer object `identity`, its `exportKind`, the ordered `exportPath`
  segments by which the consumer addresses that export, and the formal export
  locus the consumer's export record requires, in the shape the consumer's
  foreign locus record declares.
- The producer SHALL address the snapshot document an assessment correspondence
  record concerns as a consumer artifact reference whose kind is the
  artifact-kind member `snapshot`.
- The producer SHALL address the observation-record document an assessment
  correspondence record concerns as a consumer artifact reference whose kind is
  the artifact-kind member `observation`.
- The producer SHALL supply the window selection an assessment correspondence
  record concerns as a binding requirement whose kind is the binding-kind member
  `clock`.
- The producer SHALL supply, through the binding requirements an assessment
  correspondence record carries, the later inputs the consumer's
  binding-requirement record declares for the binding-kind members `population`,
  `snapshot`, `clock`, and `observation`.
- The producer SHALL NOT declare an export mapping for a snapshot document, for
  an observation-record document, or for a window selection.
- The producer SHALL NOT assign the consumer's `u32` export, native, relation,
  definition, or producer-object interface table indices, which the consumer
  assigns when it assembles its own package.
- If an export mapping of an assessment correspondence record carries an
  `exportKind` that FR-120's partition places on the static side, then the
  producer SHALL refuse the assessment correspondence record.
- The producer SHALL NOT present emission of an assessment correspondence record
  as campaign acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-124-CON-1 | The producer SHALL carry in an assessment correspondence record the five producer-object members it authors — `kind`, `authority`, `identity`, namespaced revision, and canonical digest selection — together with the native identity, native revision, and native raw-byte digest selection, the native definition-closure entries, the binding-relation identity, the configuration provenance, and the export mappings as separate members, and no producer-object interface member. | Integrity | Compile |
| FR-124-CON-2 | The producer SHALL carry on every assessment export mapping an `exportKind` drawn from the consumer's closed export-kind vocabulary, an ordered `exportPath`, and the formal export locus the consumer's export record requires, as FR-116-CON-2 obligates for a static export mapping. | Interface | Test |
| FR-124-CON-3 | The producer SHALL keep a producer canonical digest selection and a native raw-byte digest selection distinct members even when their hash text coincides, which FR-116-CON-3 owns for both halves. | Traceability | Test |
| FR-124-CON-4 | The producer SHALL carry as an assessment export mapping's `exportKind` only the member FR-120's static/assessment export-kind partition places on the assessment side, and FR-120 owns that partition. | Integrity | Test |
| FR-124-CON-5 | The producer SHALL leave every consumer `u32` table index unassigned, including the producer-object interface index, because the consumer assigns those indices when it assembles its own package. | Interface | Inspection |
| FR-124-CON-6 | The producer SHALL express a snapshot document and an observation-record document as consumer artifact references and a window selection as a clock binding requirement, declaring an export mapping for none of the three. | Interface | Compile |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-124-AC-1 | One selected pair of one producer assessment object and one native artifact yields exactly one assessment correspondence record whose five authored producer-object members — `kind`, `authority`, `identity`, revision, and canonical digest selection — and whose native selection, native definition closure, binding-relation identity, configuration provenance, and export mappings are each readable as separate members. | Compile |
| FR-124-AC-2 | Every exported population identity carries one export mapping with its exporting producer object identity, its `exportKind`, its ordered `exportPath` segments, and its formal export locus, and the emitted record carries no consumer table index. | Test |
| FR-124-AC-3 | A snapshot document is addressed as a consumer artifact reference of artifact kind `snapshot` and an observation-record document as one of artifact kind `observation`, and neither yields an export mapping. | Test |
| FR-124-AC-4 | A window selection is supplied as a binding requirement of binding kind `clock`, and no export mapping is emitted for that window selection. | Test |
| FR-124-AC-5 | Each of the binding-kind members `population`, `snapshot`, `clock`, and `observation` the assessment half satisfies is carried by an emitted binding requirement supplying the later inputs the consumer's binding-requirement record declares for it. | Test |
| FR-124-AC-6 | An assessment correspondence record whose export mapping carries an `exportKind` on the static side of FR-120's partition is refused, and the refusal names the offending export kind. | Test |
| FR-124-AC-7 | An emitted assessment correspondence record's producer object carries exactly the five members the producer authors and no authored interface member. | Test |
| FR-124-AC-8 | Emission of an assessment correspondence record is recorded as a producer emission only and is not presented as campaign acceptance of any assessment claim. | Inspection |
| FR-124-AC-9 | The FR-116 refusals this requirement reuses hold on an assessment correspondence record: an unexported export mapping is refused, an export mapping owned by another record's producer object is refused, a changed producer-object or native-artifact selection under a retained binding-relation identity is refused, and an absent configuration provenance is refused. | Test |

## Dependencies

- [FR-111](./FR-111-classify-mixed-version-impact.md) owns the circular and
  unresolved support control that retains `unknown` with its path, which governs
  termination of the native definition closure this record enumerates, on the
  same terms FR-116 cites it for.
- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) owns every
  member and every refusal the two halves share, and this requirement cites them
  rather than restating them: the five authored producer-object members and the
  non-obligation to author the consumer-assigned interface index, the native
  artifact selection, the native definition-closure enumeration, the
  binding-relation identity, the configuration provenance, the export-mapping
  members including the formal export locus, the unassigned consumer table
  indices, and the cardinality unit — exactly one record per selected pair of
  one producer object and one native artifact, two records naming one such pair
  refused, and no record at all for a producer object the consumer does not
  select.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document selections whose objects these records correspond to.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md) owns the
  static/assessment partition of the consumer's closed export-kind vocabulary,
  which this requirement cites rather than enumerating, and therefore owns that
  the assessment side of that partition is admissible here while
  [FR-117](./FR-117-admit-a-static-producer-bundle.md) refuses it inside a static
  producer bundle.
- [FR-122](./FR-122-emit-snapshot-and-window-selections.md) owns the content of
  the snapshot document, the window document, and the observation-record
  document that this record's artifact references and clock binding requirement
  name.
- Open cross-repo item against `ix://agent-ix/quire-spec-language`, recorded here
  as an upstream gap and never as an obligation of this requirement: at the
  pinned revision the consumer's closed artifact-kind vocabulary admits no
  member for a population document, so a population document's provenance cannot
  be typed as a consumer artifact reference today; and no consumer vocabulary —
  export kind, artifact kind, or binding kind — carries a `window` member at all.
  Until that consumer adds them, the producer supplies a window selection only
  through the clock binding requirement, and names a population document by its
  identity and its canonical digest selection rather than as a typed artifact
  reference.
- The native consumer boundary is stated here as context, never as a requirement
  of this document: that consumer validates each digest only in its named domain,
  then validates the relation, kinds, exports, and native definition closure, and
  assigns its own `u32` table indices when it assembles its package. The consumer
  contract is an assumed external contract that this increment maps onto rather
  than owns: `ix://agent-ix/quire-spec-language`, file
  `src/protocol_artifact/wire.rs`, pinned at revision
  `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose `ProducerObject`,
  `Correspondence`, `Export`, `ForeignLocus`, `ArtifactRef`, and
  `BindingRequirement` records this record's members supply, and whose closed
  export-kind, artifact-kind, and binding-kind vocabularies supply every kind
  this requirement names, by reference to that revision.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
