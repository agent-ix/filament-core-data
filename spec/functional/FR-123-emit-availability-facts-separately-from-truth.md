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
explicit availability fact carrying the exact observation-record identity it
concerns and its producer-retained reason, so that availability is declared by
the producer and the decision whether an availability fact prevents a truth
result belongs to the selected evaluator alone.

## Inputs

- The assessment document whose observations are reported, with its selected
  population, snapshot, and window membership.
- The ordered observation-record identities bound by that document.
- For each unavailable or resource-limited observation, the exact affected
  observation-record identity and its producer-retained reason.
- The selected evaluator's declared exact admitted support set of
  observation-record identities, and its already-established decisive
  satisfied or violated disposition, when one is supplied to the producer.

## Outputs

- One explicit availability fact per unavailable or incomplete observation,
  carrying its observation-record identity and its reason as separate members.
- An availability-incompleteness dimension retained separately from any
  disposition the producer reports back to its caller.
- A blocking refusal naming the offending availability fact, the offending
  membership omission, or the offending truth disposition, when the document
  cannot be emitted.

## Behavior

- The producer SHALL emit every unavailable or incomplete observation as its own
  explicit availability fact.
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
- The producer SHALL declare availability only, because the selected evaluator
  owns the decision whether an unavailable fact prevents a truth result.
- The producer SHALL NOT report a truth disposition of its own for any claim,
  because deciding truth is not the producer's role.
- The producer SHALL retain unchanged a decisive satisfied or violated
  disposition that a selected evaluator has already established, when every
  unavailable availability fact lies outside that evaluator's exact admitted
  support set.
- The producer SHALL report the unavailable disposition, rather than a false or
  violated result, when an availability fact names an observation record inside
  the selected evaluator's exact admitted support set.
- The producer SHALL retain the availability-incompleteness dimension whenever
  the document carries any availability fact, independently of the disposition it
  reports.
- The producer SHALL carry each availability fact in the producer's own
  assessment document rather than in a consumer table entry.
- If an availability fact names no observation-record identity, then
  the producer SHALL refuse that availability fact.
- If an availability fact names an observation record that the bound documents do
  not contain, then the producer SHALL refuse that availability fact.
- If a document represents an unavailable or incomplete observation as an absent
  membership member rather than as an availability fact, then the producer SHALL
  refuse that document.
- If a producer document reports a truth disposition of its own, then the
  producer SHALL refuse that document.
- The producer SHALL NOT present emission of an availability fact as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-123-CON-1 | The producer SHALL expose an availability fact type carrying its observation-record identity and its reason as separate members and carrying no Boolean result member. | Integrity | Compile |
| FR-123-CON-2 | The producer SHALL keep the availability-incompleteness dimension a member distinct from any reported disposition, so neither value derives from the other. | Traceability | Test |
| FR-123-CON-3 | The producer SHALL expose no operation that decides a claim's truth, restricting its availability operation to the evaluator-declared exact support set it is given. | Interface | Inspection |
| FR-123-CON-4 | The producer SHALL keep population, snapshot, and window membership independent of availability, so an availability fact changes no declared membership. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-123-AC-1 | An unavailable observation is emitted as its own explicit availability fact carrying the exact affected observation-record identity and its reason, while the declared population, snapshot, and window membership is unchanged and no false result appears. | Test |
| FR-123-AC-2 | An unavailable availability fact outside a selected evaluator's exact admitted support leaves that evaluator's already-established decisive satisfied or violated disposition intact with availability incompleteness retained, and the same fact inside that admitted support yields the unavailable disposition rather than a false or violated result. | Test |
| FR-123-AC-3 | An availability fact naming no observation-record identity is refused, and the refusal names the absent observation-record identity member. | Test |
| FR-123-AC-4 | An availability fact naming an observation record that the bound documents do not contain is refused, and the refusal names the unknown observation-record identity. | Test |
| FR-123-AC-5 | A document that represents an unavailable observation as a member absent from its population, snapshot, or window membership rather than as an availability fact is refused, and the refusal names the omitted member. | Test |
| FR-123-AC-6 | A producer document that reports a truth disposition of its own is refused, because deciding truth is the selected evaluator's role and not the producer's. | Test |
| FR-123-AC-7 | Emission of an availability fact is recorded as a producer availability declaration only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines the
  availability and disposition semantics this interface obligation emits: that an
  unavailable observation is retained as an explicit availability fact with its
  affected observation-record identity and reason, that unavailable support
  outside a selected evaluator's exact admitted support does not erase a result
  that evaluator has already decisively established, and that removing support
  the result depends on makes that claim unavailable rather than false. Those
  semantics are cited here and are not restated as a second obligation.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document selections that carry these availability facts.
- [FR-121](./FR-121-emit-finite-population-membership-records.md) defines the
  finite population membership records that an availability fact never shrinks.
- [FR-122](./FR-122-emit-snapshot-and-window-selections.md) defines the snapshot
  and window selections and their ordered observation-record identities that an
  availability fact names.
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
