---
id: FR-126
title: "Declare the producer interface version"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
---
# FR-126: Declare the producer interface version

## Description

The producer SHALL declare the producer interface version `1.2.0` on every
document it emits, as one authored three-component member whose patch, minor,
and major components each fix exactly what a change to that component may do to
the set of documents the interface admits and to the refusals it makes.

## Inputs

- The document the producer emits, static or assessment, with its identity, its
  namespaced revision, and its digest selection as
  [FR-119](./FR-119-emit-assessment-document-selections.md) emits them.
- The producer interface version the producer implements, authored as
  `1.2.0`.
- The declared interface version of a document offered to the producer.
- The document set the producer emits or reads as one unit.

## Outputs

- One authored interface version member `1.2.0` on every document the producer
  emits, and exactly one interface version across every document of one document
  set.
- A blocking refusal naming the offending declared interface version, its
  absence, the second interface version of a document set, or the substituted
  member, when an interface version cannot be read as declared.
- No admitted document at all when the interface version is refused.

## Behavior

- The producer SHALL declare the producer interface version `1.2.0` on every
  document it emits.
- The producer SHALL author the interface version as three components — major,
  minor, and patch — each separately readable.
- The producer SHALL change no admitted document and no refusal when it changes
  only the patch component of its interface version.
- The producer SHALL admit, when it changes the minor component of its interface
  version within one major version, every document an interface version of that
  same major version already admitted.
- The producer SHALL add, in a minor revision of its interface version, only
  members a reader of an earlier minor version of the same major version may
  ignore.
- The producer SHALL NOT remove a member, retype a member, or narrow a closed
  vocabulary in a minor revision of its interface version.
- The producer SHALL confine to a major revision of its interface version every
  change that refuses a document an earlier interface version admitted.
- The producer SHALL refuse a document whose declared interface version the
  producer does not implement, naming that version.
- The producer SHALL NOT read a document whose declared interface version it
  does not implement on a best-effort basis.
- The producer SHALL NOT read an unknown interface version as the nearest known
  interface version.
- The producer SHALL NOT default an absent interface version.
- The producer SHALL refuse a document whose interface version member is absent,
  naming that absent member.
- The producer SHALL emit exactly one interface version across every document of
  one document set.
- The producer SHALL NOT emit two different interface versions inside one
  document set.
- The producer SHALL refuse a document set carrying two different declared
  interface versions, naming both versions and the documents that declared them.
- The producer SHALL keep the interface version, a model revision, a digest
  domain version, and a wire schema identity four separate members.
- The producer SHALL NOT derive the interface version from a model revision, a
  digest domain version, or a wire schema identity.
- The producer SHALL refuse a model revision offered in place of the interface
  version, naming the substituted member.
- The producer SHALL refuse a digest domain version offered in place of the
  interface version, naming the substituted member.
- The producer SHALL emit each interface version refusal as a blocking input
  refusal.
- The producer SHALL NOT emit an interface version refusal as a warning, a cache
  miss, or an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-126-CON-1 | The producer SHALL declare the interface version as an authored member of every emitted document, never as a convention inferred from the document's shape, its member set, or its transport. | Integrity | Test |
| FR-126-CON-2 | The producer SHALL keep the interface version, the model revision of FR-113, the digest domain `version` of FR-112, and the consumer's wire schema identity four distinct members, none of which substitutes for another even when their spellings coincide. | Traceability | Test |
| FR-126-CON-3 | The producer SHALL expose no comparison that orders an unknown interface version against a known one, so no nearest-known fallback exists to be taken. | Interface | Compile |
| FR-126-CON-4 | The producer SHALL hold one interface version for a whole document set, refusing a set rather than admitting its agreeing subset. | Integrity | Test |
| FR-126-CON-5 | The producer SHALL classify each change to its own interface as patch, minor, or major by the admitted-document and refusal effects stated here rather than by the component the release note increments. | Correctness | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-126-AC-1 | Every document of one emitted document set — static and assessment alike — carries the interface version `1.2.0` as one authored three-component member read directly, with no member absent, defaulted, or inferred from the document's shape. | Contract |
| FR-126-AC-2 | Two interface versions differing only in their patch component admit exactly the same document set and make exactly the same refusals over it. | Test |
| FR-126-AC-3 | An interface version whose minor component is incremented within one major version admits every document the earlier minor version admitted, and the members it adds are ignored by a reader of the earlier minor version without changing that reader's result. | Test |
| FR-126-AC-4 | A change that refuses a document an earlier interface version admitted is carried only by an incremented major component, and the same change presented under an incremented minor or patch component is refused. | Test |
| FR-126-AC-5 | A document declaring an interface version the producer does not implement refuses, naming that version, and is neither read on a best-effort basis nor read under the nearest known interface version. | Test |
| FR-126-AC-6 | A document whose interface version member is absent refuses, naming that absent member, and no interface version is defaulted for it. | Test |
| FR-126-AC-7 | A document set whose documents declare two different interface versions refuses, naming both versions and the documents that declared them, and no agreeing subset of that set is admitted. | Test |
| FR-126-AC-8 | A digest domain `version` offered in place of the interface version refuses, and a model revision offered in place of the interface version refuses, each naming the substituted member. | Test |
| FR-126-AC-9 | Declaration of an interface version is recorded as an interface declaration only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the digest
  domain `version` that this requirement keeps a separate member from the
  interface version, and whose closed admissible digest vocabulary an interface
  major revision governs.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  identity, namespaced revision, and digest selection of every assessment
  document on which this interface version is declared.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the namespaced
  revision selections that this requirement keeps separate members from the
  interface version.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) admits the static bundle
  whose documents carry this interface version; a static link remains sufficient
  for recognition, resolution, and type/profile admission, and this declaration
  adds no assessment prerequisite to it.
- [FR-125](./FR-125-project-a-baseline-document-to-v1-1.md) projects a document
  between interface versions and owns the loss record a lossy projection
  refuses with; this requirement owns only which interface versions exist and
  which are refused.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for producer interface 1.2.0 and for its
  additive compatibility rule.
- **Assumed external contract, not owned here**: the consumer contract at
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which carries
  `Wire { identity, version }` as the wire schema identity explicitly separate
  from a semantic definition revision, `Revision { namespace, value }`,
  `SelectedDigest { domain, version, algorithm, value }`, and
  `ProducerObject { interface, ... }` whose `interface` member selects the
  producer interface a producer object retains; this increment maps onto that
  contract rather than owning it, and it declares no member of it.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: a consumer refuses an interface version it does not implement rather
  than reading the document on a best-effort basis, never reads an unknown
  interface version as the nearest known one, and never substitutes its own
  `Wire.version` wire schema identity, a `Revision.value`, or a
  `SelectedDigest.version` for the producer interface version.
