---
id: FR-123
title: "Emit availability facts separately from truth"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-121"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-122"
    type: "depends_on"
---
# FR-123: Emit availability facts separately from truth

## Description

The producer SHALL emit every unavailable or incomplete observation as its own
explicit availability fact carrying its `availabilityFactIdentity`, the exact
observation-record identity it concerns, and its producer-retained reason, and as
an availability fact only, holding a truth disposition in no member of any
document it emits, because whether an availability fact prevents a truth result
is decided by the selected evaluator alone under the semantics
[FR-108](./FR-108-bind-populations-to-model-contracts.md) owns.

## Inputs

- The assessment document whose observations are reported, with its selected
  population, snapshot, and window membership.
- The ordered observation-record identities bound by that document.
- For each unavailable or resource-limited observation, its
  `availabilityFactIdentity`, the exact affected observation-record identity, and
  its producer-retained reason.
- The selected evaluator's declared exact admitted support set of
  observation-record identities, when one is supplied to the producer, read as a
  declared set of identities and never as a disposition.

## Outputs

- One explicit availability fact per unavailable or incomplete observation,
  carrying its `availabilityFactIdentity`, its observation-record identity, and
  its reason as separate members.
- An availability-incompleteness dimension carried as its own member of the
  emitting document, derived from that document's availability facts alone.
- A blocking refusal naming the offending availability fact, the colliding
  observation-record identity, the offending membership omission, or the
  offending truth-disposition member, when the document cannot be emitted.

## Behavior

- The producer SHALL emit every unavailable or incomplete observation as its own
  explicit availability fact.
- The producer SHALL carry `availabilityFactIdentity` on every availability
  fact.
- The producer SHALL carry on every availability fact the exact
  observation-record identity that the fact concerns.
- The producer SHALL carry on every availability fact its producer-retained
  reason as a member separate from that observation-record identity.
- The producer SHALL NOT represent an unavailable or incomplete observation as a
  member missing from a population, snapshot, or window membership.
- The producer SHALL NOT represent an unavailable or incomplete observation as a
  false result.
- The producer SHALL NOT shrink a declared population, snapshot, or window
  membership to accommodate an unavailable or incomplete observation.
- The producer SHALL declare availability only.
- The producer SHALL NOT carry a truth disposition in any member of any document
  it emits.
- The producer SHALL NOT retain a truth disposition.
- The producer SHALL NOT echo a truth disposition supplied to it.
- The producer SHALL NOT compute a truth disposition.
- The producer SHALL NOT report a truth disposition for any claim.
- The producer SHALL emit one availability fact for one unavailable or
  incomplete observation whether or not a declared admitted support set is
  supplied to it, because the fact records availability and not a consequence of
  availability.
- The producer SHALL carry the availability-incompleteness dimension on every
  document carrying any availability fact.
- The producer SHALL derive that availability-incompleteness dimension from the
  document's own availability facts alone.
- The producer SHALL carry each availability fact in the producer's own
  assessment document rather than in a consumer table entry.
- If an availability fact names no observation-record identity, then
  the producer SHALL refuse that availability fact.
- If an availability fact carries no `availabilityFactIdentity`, then the
  producer SHALL refuse that availability fact, naming the absent identity
  member.
- If two availability facts of one document name one observation-record
  identity, then the producer SHALL refuse that document, naming both facts,
  rather than merging them into one fact.
- If an availability fact names an observation record that the bound documents do
  not contain, then the producer SHALL refuse that availability fact.
- If a document represents an unavailable or incomplete observation as an absent
  membership member rather than as an availability fact, then the producer SHALL
  refuse that document.
- If a document the producer would emit carries a member holding a truth
  disposition, then the producer SHALL refuse that document, naming that member.
- The producer SHALL NOT present emission of an availability fact as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-123-CON-1 | The producer SHALL expose an availability fact type carrying its `availabilityFactIdentity`, its observation-record identity, and its reason as separate members and carrying no Boolean result member. | Integrity | Compile |
| FR-123-CON-2 | The producer SHALL expose no member, on any document or type it emits, that holds a truth disposition, so the availability-incompleteness dimension derives from the emitted availability facts alone and from no disposition. | Integrity | Compile |
| FR-123-CON-3 | The producer SHALL expose no operation that decides a claim's truth, restricting its availability operation to emitting facts against the evaluator-declared exact support set it is given. | Interface | Inspection |
| FR-123-CON-4 | The producer SHALL keep population, snapshot, and window membership independent of availability, so an availability fact changes no declared membership. | Integrity | Test |
| FR-123-CON-5 | The producer SHALL keep `availabilityFactIdentity` and observation-record identity separate members whose equal spelling merges no two facts. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-123-AC-1 | An unavailable observation is emitted as its own explicit availability fact carrying its `availabilityFactIdentity`, the exact affected observation-record identity, and its reason, while the declared population, snapshot, and window membership is unchanged and no false result appears. | Test |
| FR-123-AC-2 | An availability fact whose observation-record identity lies outside the selected evaluator's declared exact admitted support set and one whose observation-record identity lies inside that set are each emitted as the same fact carrying the same members, the emitting document carries the availability-incompleteness dimension in both cases, and neither document carries any member holding a truth disposition. | Test |
| FR-123-AC-3 | An availability fact naming no observation-record identity is refused, and the refusal names the absent observation-record identity member. | Test |
| FR-123-AC-4 | An availability fact naming an observation record that the bound documents do not contain is refused, and the refusal names the unknown observation-record identity. | Test |
| FR-123-AC-5 | A document that represents an unavailable observation as a member absent from its population, snapshot, or window membership rather than as an availability fact is refused, and the refusal names the omitted member. | Test |
| FR-123-AC-6 | A document the producer would emit that carries a member holding a truth disposition is refused, and the refusal names that member. | Test |
| FR-123-AC-7 | Emission of an availability fact is recorded as a producer availability declaration only and is not presented as campaign acceptance of any assessment claim. | Inspection |
| FR-123-AC-8 | Two availability facts of one document naming one observation-record identity are refused, the refusal names both facts, and no merged fact is emitted. | Test |
| FR-123-AC-9 | An availability fact carrying no `availabilityFactIdentity` is refused, and the refusal names the absent identity member. | Test |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines the
  availability and disposition semantics this interface obligation emits facts
  for: that an unavailable observation is retained as an explicit availability
  fact with its affected observation-record identity and reason, that unavailable
  support outside a selected evaluator's exact admitted support does not erase a
  result that evaluator has already decisively established, and that removing
  support the result depends on makes that claim unavailable rather than false.
  FR-108 remains the owner of those disposition semantics; they are cited here
  and are restated as no obligation of this requirement.
- Consequence recorded in prose, owned by FR-108 and asserted as no producer
  output: for a result attributed to the selected evaluator, an availability
  fact whose observation-record identity lies outside that evaluator's declared
  admitted support set leaves that result as the evaluator established it, while
  one lying inside that set makes the claim unavailable to that evaluator rather
  than false. This producer emits the fact and the availability-incompleteness
  dimension; the evaluator draws that consequence.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document selections that carry these availability facts.
- [FR-121](./FR-121-emit-finite-population-membership-records.md) defines the
  finite population membership records that an availability fact never shrinks.
- [FR-122](./FR-122-emit-snapshot-and-window-selections.md) defines the snapshot,
  observation-record, and window documents and the ordered observation-record
  identities that an availability fact names.
- The selected evaluator's boundary is stated here as context, never as a
  requirement of this document: that evaluator, and not this producer, decides
  whether an availability fact is required support for its selected claim and
  therefore prevents a truth result.
- The consumer contract these facts map onto is an assumed external contract that
  this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
