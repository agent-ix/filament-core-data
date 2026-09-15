---
id: FR-119
title: "Emit assessment document selections"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "depends_on"
---
# FR-119: Emit assessment document selections

## Description

The producer SHALL emit every assessment document — population, snapshot,
window, observation-record, and availability document — only through one
indivisible admission operation that both constructs and validates it, carrying
its own stable identity, its namespaced revision, its canonical digest
selection, and the configuration selection that authorized it as separately
readable typed members under the FR-112 digest discipline and the FR-113
revision discipline, and addressing each document kind under the consumer
vocabulary member named below rather than under a kind vocabulary of this
interface's own.

## Inputs

- The assessment subject to be emitted as a document: a population, a snapshot,
  a window, an observation record, or an availability fact, whose meaning
  [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines and this
  requirement does not restate.
- That document's producer-selected stable identity.
- That document's namespaced revision selection, as
  [FR-113](./FR-113-emit-namespaced-revisions.md) governs it.
- That document's canonical digest selection, as
  [FR-112](./FR-112-emit-versioned-digest-selections.md) governs it.
- The authorizing configuration selection, named by its configuration identity,
  its namespaced revision, and its canonical digest selection.
- The member of the consumer's closed artifact-kind, export-kind, or binding-kind
  vocabulary under which that document kind is addressed, taken by reference from
  the pinned consumer contract named in this requirement's Dependencies.
- The authorizing configuration document's declared `resourceLimits`, which
  [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) owns and from
  which the document-level bound this requirement enforces is read.

## Outputs

- One assessment document per emitted assessment subject, carrying its
  identity, its namespaced revision, its canonical digest selection, and its
  authorizing configuration selection as separately readable typed members.
- A blocking refusal naming the absent digest selection member, the absent
  revision member, the absent configuration selection, the colliding identity,
  or the exceeded document bound, when the document cannot be emitted.
- The refusal FR-112 owns for an inadmissible digest selection and the refusal
  FR-113 owns for an inadmissible revision, surfaced unchanged and raised by
  those requirements rather than a second time here.
- No assessment document value at all when emission is refused.

## Behavior

- The producer SHALL emit every population, snapshot, window,
  observation-record, and availability document as one assessment document
  carrying its own producer-selected stable identity.
- The producer SHALL construct and validate every assessment document in one
  indivisible admission operation, in the shape FR-117 fixes for the static
  bundle.
- The producer SHALL expose every assessment document only through that
  admission operation, exposing no public constructor, no public member, and no
  deserialization path that bypasses admission.
- The producer SHALL yield no value of an assessment document type when it
  refuses an emission.
- The producer SHALL emit on every assessment document the two-member
  namespaced revision selection that FR-113 governs.
- The producer SHALL emit on every assessment document the four-member
  canonical digest selection that FR-112 governs.
- The producer SHALL emit every assessment document canonical digest under the
  producer canonical-object digest class that FR-112 fixes.
- The producer SHALL emit every assessment document revision under the producer
  object revision namespace that FR-113 fixes.
- The producer SHALL emit on every assessment document the configuration
  selection that authorized that document.
- The producer SHALL name that authorizing configuration selection by its
  configuration identity, its namespaced revision, and its canonical digest
  selection together.
- The producer SHALL expose every assessment document member as a directly
  readable typed member.
- The producer SHALL NOT require a consumer to parse prose, default a member, or
  infer a field in order to read an assessment document member.
- The producer SHALL keep the identity, the revision, the digest selection, and
  the authorizing configuration selection of an assessment document separate
  members.
- The producer SHALL NOT establish assessment document identity from equal
  spelling of a revision value, a digest value, or a display name.
- The producer SHALL address a snapshot document to the consumer as an artifact
  reference whose kind is the `snapshot` member of the consumer's closed
  artifact-kind vocabulary.
- The producer SHALL address an observation-record document to the consumer as
  an artifact reference whose kind is the `observation` member of that same
  closed artifact-kind vocabulary.
- The producer SHALL address a population document's correspondence export under
  the `population` member of the consumer's closed export-kind vocabulary, whose
  static-versus-assessment partition FR-120 owns.
- The producer SHALL supply a window selection only against the `clock` member of
  the consumer's closed binding-kind vocabulary, naming a window neither an
  export kind nor an artifact kind.
- The producer SHALL name a population document and an availability document by
  their own identity and canonical digest selection, because the consumer's
  closed artifact-kind vocabulary admits neither document at the pinned revision.
- The producer SHALL supply, as the later inputs the consumer's
  `BindingRequirement` declares, the assessment documents its `population`,
  `snapshot`, `clock`, and `observation` binding kinds require.
- The producer SHALL mint no artifact-kind, export-kind, or binding-kind member
  of its own for an assessment document.
- The producer SHALL raise, for an inadmissible digest selection, the refusal
  FR-112 owns, and for an inadmissible revision, the refusal FR-113 owns,
  restating neither refusal here.
- If an assessment document carries no canonical digest selection member at all,
  then the producer SHALL refuse the document, naming the absent digest selection
  member.
- If an assessment document carries no namespaced revision member at all, then
  the producer SHALL refuse the document, naming the absent revision member.
- If an assessment document carries no configuration selection, then the
  producer SHALL refuse the document, naming the absent configuration selection.
- If two assessment documents share one identity under one revision, then the
  producer SHALL refuse both as an identity collision, naming the shared
  identity.
- The producer SHALL NOT merge two assessment documents that share one identity
  under one revision.
- The producer SHALL read every document-level bound from the authorizing
  configuration document's declared `resourceLimits`, which FR-109 owns, and
  never from a host-chosen value.
- If an assessment document exceeds a document-level bound declared in that
  `resourceLimits` member, then the producer SHALL refuse the document, naming
  the exceeded bound and its declared value.
- The producer SHALL measure that bound as NFR-037 measures it, stating no
  second measurement here.
- The producer SHALL emit each assessment document refusal as a blocking input
  refusal.
- The producer SHALL NOT emit an assessment document refusal as a warning, a
  cache miss, or an invitation to refetch a different version.
- The producer SHALL NOT present emission of an assessment document as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-119-CON-1 | The producer SHALL carry on every assessment document its identity, its namespaced revision, its canonical digest selection, and its authorizing configuration selection as separate typed members. | Integrity | Compile |
| FR-119-CON-2 | The producer SHALL keep an assessment document identity separate from its revision value, its digest value, and any display name, so that equal spelling never establishes document identity. | Traceability | Test |
| FR-119-CON-3 | The producer SHALL scope this requirement to the interface members shared by every assessment document, owning no per-kind content obligation and no population, snapshot, or window semantics, which FR-108 owns. | Interface | Inspection |
| FR-119-CON-4 | The producer SHALL draw every assessment document digest selection from the FR-112 vocabulary and every assessment document revision from the FR-113 vocabulary, restating neither vocabulary and re-owning neither requirement's refusal here. | Traceability | Inspection |
| FR-119-CON-5 | The producer SHALL yield no assessment document value when it refuses an emission. | Integrity | Test |
| FR-119-CON-6 | The producer SHALL keep every assessment document type unconstructible outside its indivisible admission operation, exposing no public constructor, no public member, and no deserialization path that bypasses admission, as FR-117 requires of the static bundle. | Interface | Compile |
| FR-119-CON-7 | The producer SHALL read every assessment document bound from the authorizing configuration document's declared `resourceLimits`, which FR-109 owns and NFR-037 measures, never from the host, the build target, or a pointer width. | Integrity | Analysis |
| FR-119-CON-8 | The producer SHALL address each assessment document kind under the consumer vocabulary member this requirement names, minting no artifact-kind, export-kind, or binding-kind member of its own. | Interface | Contract |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-119-AC-1 | A population, a snapshot, a window, an observation-record, and an availability document are each emitted carrying their own stable identity, their namespaced revision, their canonical digest selection, and their authorizing configuration selection, each read directly as a typed member with none absent, defaulted, or inferred. | Contract |
| FR-119-AC-2 | An assessment document carrying no canonical digest selection member at all is refused, and the refusal names the absent digest selection member, while an inadmissible value inside a present digest selection is refused under FR-112 rather than by a second rule here. | Test |
| FR-119-AC-3 | An assessment document carrying no namespaced revision member at all is refused, and the refusal names the absent revision member, while an undeclared namespace inside a present revision is refused under FR-113 rather than by a second rule here. | Test |
| FR-119-AC-4 | An assessment document carrying no configuration selection is refused, and the refusal names the absent configuration selection. | Test |
| FR-119-AC-5 | Two assessment documents sharing one identity under one revision are refused as an identity collision rather than merged into one document. | Test |
| FR-119-AC-6 | Emission of an assessment document is recorded as document emission only and is not presented as campaign acceptance of any assessment claim. | Inspection |
| FR-119-AC-7 | A refused assessment document yields no value of its type, and no public constructor, no public member, and no deserialization path reaches an assessment document that its admission operation did not validate. | Compile |
| FR-119-AC-8 | An assessment document exceeding a document-level bound declared in the authorizing configuration's `resourceLimits` is refused, and the refusal names the exceeded bound and its declared value. | Test |
| FR-119-AC-9 | A snapshot document is addressed under the consumer's `snapshot` artifact kind and an observation-record document under its `observation` artifact kind, a population document's export is addressed under its `population` export kind, and a window selection is supplied against its `clock` binding kind, each read against the pinned consumer contract. | Contract |
| FR-119-AC-10 | A population document and an availability document are each named by their own identity and canonical digest selection, and neither is given an artifact kind the pinned consumer contract does not carry. | Contract |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines what a
  population, a snapshot, a window, an observation record, and an availability
  fact mean; this requirement states only the interface members it emits for
  them and the refusals it raises, and restates no model-level obligation.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the four-member
  canonical digest selection every assessment document carries, together with
  the closed admissible digest vocabulary and the configuration-declared
  selections within it; it owns the absent-`version` and substituted-domain
  refusals, which this requirement cites and does not restate.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the two-member
  namespaced revision every assessment document carries, together with the
  closed admissible revision-namespace vocabulary the configuration document
  declares its selections from; it owns the undeclared-namespace refusal, which
  this requirement cites and does not restate.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) fixes the indivisible
  admission shape — one operation that both constructs and validates, no public
  constructor, no public member, no deserialization bypass, and no value of the
  type on refusal — which this requirement applies to every assessment document
  rather than redefining.
- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  configuration document's `resourceLimits` member, with `numericResourceLimit`
  inside it, from which this requirement reads its document-level bound.
- [NFR-037](../non-functional/NFR-037-bounded-assessment-documents.md) measures
  the document-level bound this requirement refuses on, so the refusal is owned
  here and the measurement there.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md) owns the
  static-versus-assessment partition of the consumer's closed export-kind
  vocabulary, which this requirement cites when it addresses a population
  document's export.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `ProducerObject { interface, kind, authority, identity, revision, digest }`
  carries the identity, `Revision` and `SelectedDigest` members an assessment
  document supplies, whose `interface` member is a consumer-assigned index and
  no producer obligation, whose `ArtifactRef { refVersion, kind, authority,
  identity, revision, digest, wire }` addresses a snapshot document under its
  closed `ArtifactKind` member `snapshot` and an observation-record document
  under its `observation` member, whose `Export { kind, path, locus }` carries
  the closed `ExportKind` member `population` a population document's export is
  addressed under, and whose `BindingRequirement { name, kind, type, authority,
  contract, model, subject, anchor, scope, relation, requires, locus }` declares
  the requirements for later inputs that the `BindingKind` members `population`,
  `snapshot`, `clock`, and `observation` name, supplying no runtime identity of
  its own.
- Open cross-repo item for `ix://agent-ix/quire-spec-language`, recorded here
  and not a producer obligation: at the pinned revision the closed artifact-kind
  vocabulary carries no member admitting a population document, so a population
  document's provenance cannot be typed as an artifact reference today; and no
  consumer vocabulary carries a `window` member at all. Until that repository
  adds them, the producer supplies a window only through the clock binding
  requirement and names a population document by its identity and canonical
  digest selection rather than as a typed artifact reference.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer reads each assessment document member directly from that
  member, defaults none, assigns the `interface` index itself, and treats a
  `BindingRequirement` tag alone as supplying no assessment authority.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for population, snapshot, and window
  documents.
