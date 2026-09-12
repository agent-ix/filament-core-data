---
id: FR-121
title: "Emit finite population membership records"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-106"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-120"
    type: "depends_on"
---
# FR-121: Emit finite population membership records

## Description

The producer SHALL emit a population document's membership as a finite
`members` set in which each member carries a stable `objectIdentity`, a
`typeIdentity` naming a type the bound static bundle's selected model exports,
its field-member states keeping absence, explicit null, and a present value
three different outcomes, and its relationship-instance endpoint identities,
under a document that declares explicitly whether its world is closed and that
carries its own `declaredObjectUniverse` member whenever it declares a closed
world.

## Inputs

- The population document's `populationIdentity`, `modelIdentity`,
  `profileIdentity`, and its authored `closedWorld` declaration.
- The population document's authored `declaredObjectUniverse` member, which
  enumerates the object identities a closed-world population is checked against
  and which this requirement emits as a member of the document itself.
- The finite `members` set, each member carrying its `objectIdentity`, its
  `typeIdentity`, its field-member states, and its relationship-instance
  endpoint identities.
- The bound admitted static bundle of
  [FR-117](./FR-117-admit-a-static-producer-bundle.md), whose selected model's
  exported type identities are the available type vocabulary, bound as
  [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md)
  requires.
- The population semantics [FR-108](./FR-108-bind-populations-to-model-contracts.md)
  defines, which this requirement emits documents for and does not redefine.

## Outputs

- One population document carrying its declared `closedWorld` value, its
  `declaredObjectUniverse` member when that value declares a closed world, and a
  finite `members` set whose members are each separately readable typed records.
- A blocking refusal naming the absent `declaredObjectUniverse` member, the
  offending object identity, type identity, field-member state, or
  relationship-instance endpoint identity when the membership cannot be emitted.

## Behavior

- The producer SHALL emit the population document's membership as a finite
  `members` set.
- The producer SHALL declare on the population document whether its world is
  closed.
- The producer SHALL emit the `declaredObjectUniverse` member on every population
  document that declares a closed world.
- If a population document declares a closed world and carries no
  `declaredObjectUniverse` member, then the producer SHALL refuse the population
  document, naming the absent `declaredObjectUniverse` member.
- The producer SHALL NOT read an absent `declaredObjectUniverse` member as an
  open world.
- The producer SHALL emit one stable `objectIdentity` on every member.
- The producer SHALL emit one `typeIdentity` on every member.
- The producer SHALL emit, as every member's `typeIdentity`, a type identity that
  the bound static bundle's selected model exports.
- The producer SHALL emit each member's field-member states under the field
  contract that [FR-106](./FR-106-author-field-presence-independently.md)
  defines, which this requirement cites rather than restates.
- The producer SHALL keep an absent field member, an explicitly null field
  member, and a present-value field member three different emitted outcomes.
- The producer SHALL emit every relationship instance of a member with its
  declared endpoint identities.
- The producer SHALL emit two observations of one object as two records.
- The producer SHALL NOT merge two observations of one object into one record.
- The producer SHALL emit a member's `objectIdentity` as an authored identity.
- The producer SHALL NOT reconstruct a member's `objectIdentity` from a field
  value.
- The producer SHALL NOT reconstruct a member's `objectIdentity` from a foreign
  key.
- The producer SHALL keep `objectIdentity`, `typeIdentity`, and membership
  separate members whose equal spelling merges none of them.
- The producer SHALL take the distinction between membership of an object and
  coverage of an observation record from FR-108, which owns it.
- The producer SHALL NOT state that membership-versus-coverage distinction as an
  obligation of its own.
- If the population document declares a closed world and a member's
  `objectIdentity` lies outside that document's `declaredObjectUniverse` member,
  then the producer SHALL refuse the population document, naming that object
  identity.
- If a member's `typeIdentity` names a type the bound static bundle's selected
  model does not export, then the producer SHALL refuse the population document,
  naming that type identity and the exported type vocabulary it was resolved
  against.
- If a field-member state collapses absence, explicit null, or a present value
  into another of those three outcomes, then the producer SHALL refuse the
  population document, naming that field member.
- If a relationship instance names an endpoint identity that the population
  document does not declare, then the producer SHALL refuse the population
  document, naming that dangling endpoint identity.
- The producer SHALL emit each membership refusal as a blocking input refusal.
- The producer SHALL NOT emit a membership refusal as a warning, a cache miss,
  or an invitation to refetch a different version.
- The producer SHALL NOT consult an environment variable, a working directory, a
  wall clock, or the network to complete a membership record.
- The producer SHALL NOT present emission of a population document as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-121-CON-1 | The producer SHALL emit a `members` set that is finite and enumerable, carrying no open, streamed, or query-completed membership. | Integrity | Test |
| FR-121-CON-2 | The producer SHALL take its member field-member semantics from the FR-106 field contract and its population semantics from FR-108, restating neither obligation here. | Traceability | Inspection |
| FR-121-CON-3 | The producer SHALL keep a member's `objectIdentity` an authored member, never derived from a field value, a foreign key, or a relationship instance. | Traceability | Test |
| FR-121-CON-4 | The producer SHALL resolve every member `typeIdentity` against the exported type identities of the bound static bundle's selected model and against no other vocabulary. | Interface | Test |
| FR-121-CON-5 | The producer SHALL cite FR-108 as the sole owner of the distinction between membership of an object and coverage of an observation record, stating no such rule of its own. | Traceability | Inspection |
| FR-121-CON-6 | The producer SHALL carry the `declaredObjectUniverse` as a member of the population document itself on every document declaring a closed world, refusing an absent member rather than defaulting the document to an open world. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-121-AC-1 | A population document carrying its declared `closedWorld` value and a finite `members` set is emitted, and each member's `objectIdentity`, `typeIdentity`, field-member states, and relationship-instance endpoint identities are read directly as typed members without parsing prose, defaulting a member, or inferring a field. | Test |
| FR-121-AC-2 | A member whose `objectIdentity` lies outside the `declaredObjectUniverse` member of a closed-world population refuses with a blocking refusal naming that object identity. | Test |
| FR-121-AC-3 | A member whose `typeIdentity` names a type the bound static bundle's selected model does not export refuses with a blocking refusal naming that type identity and the exported type vocabulary it was resolved against. | Test |
| FR-121-AC-4 | A field-member state that collapses absence, explicit null, or a present value into another of those three outcomes refuses with a blocking refusal naming that field member. | Test |
| FR-121-AC-5 | A relationship instance whose endpoint identity the population document does not declare refuses with a blocking refusal naming that dangling endpoint identity. | Test |
| FR-121-AC-6 | Two observations of one member object are emitted as two records and are never merged into one. | Test |
| FR-121-AC-7 | A member whose source row supplies a candidate field value and a foreign key is emitted with its authored `objectIdentity`, and no identity is reconstructed from either. | Test |
| FR-121-AC-8 | Emission of a population document is recorded as an assessment document only and is not presented as campaign acceptance of any assessment claim. | Inspection |
| FR-121-AC-9 | A population document declaring a closed world and carrying no `declaredObjectUniverse` member refuses with a blocking refusal naming that absent member, and is not admitted as an open-world population. | Test |

## Dependencies

- [FR-106](./FR-106-author-field-presence-independently.md) defines the field
  contract whose absent, explicit-null, and present-value distinctions each
  member's field-member states carry; this requirement cites that contract and
  restates no part of it.
- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines the
  population semantics — closed-world declaration, field-member distinction,
  relationship endpoint binding, and the separation of membership from
  observation coverage — that this requirement emits documents for rather than
  redefines; it is the sole owner of the membership-versus-coverage distinction,
  which this requirement cites and never restates.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  identity, revision, and digest selections every assessment document carries,
  including the population document this requirement's membership belongs to.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md)
  binds this population document to one admitted static bundle, whose selected
  model supplies the exported type identities each member's `typeIdentity` is
  resolved against, and which reconciles the one configuration selection that
  governs the bound pair.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) admits that static
  bundle; a static link remains sufficient for recognition, resolution, and
  type/profile admission, and this population document is never a prerequisite
  of it.
- [NFR-037](../non-functional/NFR-037-bounded-assessment-documents.md) measures
  the member-count and nesting-depth bounds this requirement's finite `members`
  set is read under; the document-level refusal on an exceeded bound is FR-119's.
- The consumer contract this requirement maps onto is an assumed external
  contract that this increment does not own:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose closed
  `ExportKind` vocabulary carries the assessment member `population` a population
  document's export is addressed under, and whose `BindingRequirement` record
  names, through its closed `BindingKind` vocabulary's members `population`,
  `relationship`, and `observation`, the later inputs this document supplies.
- Open cross-repo item for `ix://agent-ix/quire-spec-language`, recorded here and
  not a producer obligation: at the pinned revision no member of that
  repository's closed artifact-kind vocabulary admits a population document, so
  this document is named by its identity and canonical digest selection, as
  FR-119 states, rather than as a typed artifact reference.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer resolves a member's type identity against the statically
  admitted export vocabulary, reads each membership member directly, and
  defaults, infers, and reconstructs no object identity of its own.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for population, snapshot, and window
  membership.
