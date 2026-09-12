---
id: FR-125
title: "Project a baseline document to v1.1"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-106"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
---
# FR-125: Project a baseline document to v1.1

## Description

The producer SHALL emit a v1.1 projection of a 1.2 document only when every
authored presence in that document equals the value a v1.1 reader derives and no
other 1.2-only contract member would be lost, and SHALL otherwise refuse the
projection with an identity-preserving loss record naming every member the
projection would lose.

## Inputs

- The 1.2 source document to be projected, with its identity, its namespaced
  revision, and its digest selection as
  [FR-119](./FR-119-emit-assessment-document-selections.md) emits them.
- Each field declaration's authored `presence` value and its `multiplicity`,
  `nullable`, and `default` values, as
  [FR-106](./FR-106-author-field-presence-independently.md) defines them.
- The requested target interface version of the projection.
- The declared 1.2-only contract member set, each member paired with its v1.1
  counterpart or with the declaration that it has none.

## Outputs

- One v1.1 projection document carrying its own identity, its own namespaced
  revision, and its own digest selection, when every 1.2-only distinction of the
  source survives the projection.
- A blocking refusal carrying an identity-preserving loss record that names each
  lost field identity and each lost 1.2-only contract member, when the
  projection would lose a distinction.
- No projection document at all when the projection is refused.

## Behavior

- The producer SHALL emit a v1.1 projection of a 1.2 document only when every
  authored presence in that document equals the value a v1.1 reader derives from
  that field's multiplicity.
- The producer SHALL emit a v1.1 projection only when no 1.2-only contract
  member of the source document would be lost.
- The producer SHALL refuse a projection whose source carries an authored
  presence differing from the value a v1.1 reader derives, naming that field
  identity in the loss record.
- The producer SHALL refuse a projection whose source carries a 1.2-only
  contract member for which v1.1 declares no counterpart, naming that member in
  the loss record.
- The producer SHALL name each lost member in the loss record rather than
  reporting a lost count, a lossy flag, or a nearest-equivalent substitute.
- The producer SHALL retain the source document's identity, namespaced revision,
  and digest selection unchanged in the loss record of a refused projection.
- The producer SHALL NOT rewrite a model to make a projection pass.
- The producer SHALL NOT rewrite a population to make a projection pass.
- The producer SHALL NOT rewrite a document to make a projection pass.
- The producer SHALL refuse a projection that rewrote any part of its source in
  order to pass, naming that rewritten member.
- The producer SHALL emit a v1.1 projection as a new document carrying its own
  identity, its own namespaced revision, and its own digest selection.
- The producer SHALL NOT emit a v1.1 projection as an edit of the document it
  projects.
- The producer SHALL leave the projected 1.2 document's identity, revision, and
  digest selection unchanged by the emission of a projection of it.
- The producer SHALL treat a v1.1 document as carrying derived presence only.
- The producer SHALL NOT reinterpret a v1.1 document as carrying authored
  presence.
- The producer SHALL refuse a v1.1 document offered as a 1.2 document, naming
  the absent authored presence rather than widening that document.
- The producer SHALL emit each projection refusal as a blocking input refusal.
- The producer SHALL NOT emit a projection refusal as a warning, a cache miss,
  or an invitation to refetch a different version.
- The producer SHALL NOT present emission of a projection as campaign acceptance
  of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-125-CON-1 | The producer SHALL take the authored-presence semantics of a projection from the FR-106 field contract, restating no part of that contract here. | Traceability | Inspection |
| FR-125-CON-2 | The producer SHALL expose no adapter, no repair pass, and no normalization step that edits a model, a population, or a document so that a refused projection passes. | Interface | Inspection |
| FR-125-CON-3 | The producer SHALL keep a projection document's identity, revision, and digest selection separate members from those of the document it projects, so equal spelling never merges the two documents. | Traceability | Test |
| FR-125-CON-4 | The producer SHALL carry the source document's exact identity, revision, and digest selection in every loss record, so a refusal remains attributable to the document that caused it. | Integrity | Test |
| FR-125-CON-5 | The producer SHALL emit a projection only for a target interface version it implements, refusing any other requested target rather than selecting the nearest one. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-125-AC-1 | A 1.2 document whose every authored presence equals the value a v1.1 reader derives and which carries no other 1.2-only member projects to v1.1, and the projection is read as a new document carrying its own identity, its own namespaced revision, and its own digest selection. | Test |
| FR-125-AC-2 | A 1.2 document carrying one field whose authored presence differs from the value a v1.1 reader derives refuses its projection with a blocking loss record naming that field identity. | Test |
| FR-125-AC-3 | A 1.2 document carrying one 1.2-only contract member for which v1.1 declares no counterpart refuses its projection with a blocking loss record naming that member. | Test |
| FR-125-AC-4 | A projection that passed only because a member of its source model, population, or document was rewritten refuses with a blocking refusal naming that rewritten member, and the source is emitted unchanged. | Test |
| FR-125-AC-5 | A v1.1 document offered as a 1.2 document refuses, naming the absent authored presence, and is neither widened to 1.2 nor read as carrying authored presence. | Test |
| FR-125-AC-6 | An admitted projection leaves the projected 1.2 document's identity, namespaced revision, and digest selection byte-unchanged, and the two documents remain two distinct identities. | Test |
| FR-125-AC-7 | A refused projection's loss record carries the source document's exact identity, namespaced revision, and digest selection, names every lost member individually rather than a count or a flag, and yields no projection document. | Test |
| FR-125-AC-8 | Emission of a projection is recorded as a projection only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-106](./FR-106-author-field-presence-independently.md) defines the authored
  `presence` axis, its independence from multiplicity, and the derived v1.1
  value this projection compares against; this requirement states the interface
  obligation for emitting the projection and restates none of that contract.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  identity, namespaced revision, and digest selection that both the projected
  document and the projection document carry.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the four-member
  digest selection a projection document authors for itself.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the two-member
  revision selection a projection document authors for itself.
- [FR-126](./FR-126-declare-the-producer-interface-version.md) declares the
  interface version a projection targets and owns the refusal of an interface
  version the producer does not implement.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for the additive 1.2 compatibility rule
  and for the v1.2-to-v1.1 projection this requirement emits.
- **Assumed external contract, not owned here**: the consumer contract at
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `ProducerObject { interface, kind, authority, identity, revision, digest }`
  record carries the identity, revision, and digest selection of a projection
  document as it does of any other producer object; this increment maps onto
  that contract rather than owning it.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: a consumer reading a v1.1 projection reads derived presence only, and
  it never reads a projection as a substitute for the 1.2 document it was
  projected from.
