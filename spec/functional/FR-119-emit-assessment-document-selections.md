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
---
# FR-119: Emit assessment document selections

## Description

The producer SHALL emit every assessment document — population, snapshot,
window, observation-record, and availability document — carrying its own stable
identity, its namespaced revision, its canonical digest selection, and the
configuration selection that authorized it as separately readable typed members
under the FR-112 digest discipline and the FR-113 revision discipline.

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

## Outputs

- One assessment document per emitted assessment subject, carrying its
  identity, its namespaced revision, its canonical digest selection, and its
  authorizing configuration selection as separately readable typed members.
- A blocking refusal naming the absent `version`, the substituted digest
  domain, the undeclared revision namespace, the absent configuration
  selection, or the colliding identity, when the document cannot be emitted.
- No assessment document value at all when emission is refused.

## Behavior

- The producer SHALL emit every population, snapshot, window,
  observation-record, and availability document as one assessment document
  carrying its own producer-selected stable identity.
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
- The producer SHALL keep the identity, the revision, the digest selection, the
  provenance locus, the ownership member, and the membership member of an
  assessment document separate members.
- The producer SHALL NOT establish assessment document identity from equal
  spelling of a revision value, a digest value, or a display name.
- If an assessment document's digest selection omits its `version`, then the
  producer SHALL refuse the document, naming the absent `version`.
- If an assessment document's digest selection substitutes a domain other than
  the one FR-112 fixes for its digest class, then the producer SHALL refuse the
  document, naming the substituted domain.
- If an assessment document's revision carries no namespace that the
  configuration document declares as a selection, then the producer SHALL refuse
  the document, naming the undeclared namespace.
- If an assessment document carries no configuration selection, then the
  producer SHALL refuse the document, naming the absent configuration selection.
- If two assessment documents share one identity under one revision, then the
  producer SHALL refuse both as an identity collision, naming the shared
  identity.
- The producer SHALL NOT merge two assessment documents that share one identity
  under one revision.
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
| FR-119-CON-4 | The producer SHALL draw every assessment document digest selection from the FR-112 vocabulary and every assessment document revision from the FR-113 vocabulary, restating neither vocabulary here. | Traceability | Inspection |
| FR-119-CON-5 | The producer SHALL yield no assessment document value when it refuses an emission. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-119-AC-1 | A population, a snapshot, a window, an observation-record, and an availability document are each emitted carrying their own stable identity, their namespaced revision, their canonical digest selection, and their authorizing configuration selection, each read directly as a typed member with none absent, defaulted, or inferred. | Contract |
| FR-119-AC-2 | An assessment document whose digest selection omits its `version` is refused, and one whose digest selection substitutes a domain other than the class FR-112 fixes for it is refused. | Test |
| FR-119-AC-3 | An assessment document whose revision carries no namespace the configuration document declares is refused, and the refusal names the undeclared namespace. | Test |
| FR-119-AC-4 | An assessment document carrying no configuration selection is refused, and the refusal names the absent configuration selection. | Test |
| FR-119-AC-5 | Two assessment documents sharing one identity under one revision are refused as an identity collision rather than merged into one document. | Test |
| FR-119-AC-6 | Emission of an assessment document is recorded as document emission only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines what a
  population, a snapshot, a window, an observation record, and an availability
  fact mean; this requirement states only the interface members it emits for
  them and the refusals it raises, and restates no model-level obligation.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the four-member
  canonical digest selection every assessment document carries, together with
  the closed admissible digest vocabulary and the configuration-declared
  selections within it.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the two-member
  namespaced revision every assessment document carries, together with the
  closed admissible revision-namespace vocabulary the configuration document
  declares its selections from.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `ProducerObject { interface, kind, authority, identity, revision, digest }`
  carries the identity, `Revision` and `SelectedDigest` members an assessment
  document supplies, and whose `BindingRequirement { name, kind, ... }` carries
  the `population`, `snapshot`, `observation`, and `progress` binding kinds that
  name an assessment document as a later input.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer reads each assessment document member directly from that
  member, defaults none, and treats a `BindingRequirement` tag alone as
  supplying no assessment authority.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for population, snapshot, and window
  documents.
