---
id: FR-134
title: "Retire the legacy contract at boundaries with no readers"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-020"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-135"
    type: "depends_on"
---
# FR-134: Retire the legacy contract at boundaries with no readers

## Description

This requirement answers
[filament-core-data#6](https://github.com/agent-ix/filament-core-data/issues/6).

The retirement SHALL remove the legacy Avro contract only at a boundary proven to have no remaining readers.

The retirement SHALL keep every removal reversible until the compatibility window it depends on has closed.

Retirement is ordered rather than simultaneous: readers move before writers, the
compatibility window is observed, and only then is unused legacy machinery
removed. A removal that runs ahead of that order leaves a persisted payload
readable by no deployed code, which is the one failure in this requirement that
cannot be undone by redeploying.

The scope is smaller than it looks. Exactly one external consumer of the legacy
contract exists — `filament-ide`'s `coredb` sync path — and no Python consumer
of the published package exists outside this repository. That census is the
requirement's foundation and is stated as a finding to be re-measured rather
than assumed, because a census taken once and trusted afterwards is how a reader
gets missed.

## Inputs

- The consumer census, naming every producer, consumer and persisted
  representation of the legacy contract
- The version-lock graph over those consumers

## Outputs

- A retirement order, boundary by boundary, each with its reader count
- The removals themselves, each isolated from the others

## Behavior

- The retirement SHALL publish a consumer census before any boundary is
  retired, and SHALL re-measure it rather than reuse an earlier one.
- The retirement SHALL move readers before writers at every boundary.
- The retirement SHALL remove a legacy adapter only at a boundary whose reader
  count is zero.
- The retirement SHALL retain the legacy representation at any boundary where a
  reader remains, with that reader's owner named.
- The retirement SHALL isolate each removal, so one boundary's regression does
  not require reverting another's.
- The retirement SHALL NOT remove code that is the only reader of a persisted
  payload.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-134-CON-1 | No persisted payload SHALL become readable only by removed code | Integrity | Test |
| FR-134-CON-2 | A boundary with a remaining reader SHALL keep its legacy representation, whatever the schedule says | Integrity | Inspection |
| FR-134-CON-3 | Each removal SHALL be revertible independently of every other removal | Design | Demonstration |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-134-AC-1 | Every known consumer is migrated, explicitly deferred with a named owner, or proven retired | Inspection |
| FR-134-AC-2 | A census re-measured immediately before a removal finds the same readers the plan assumed, or the removal does not proceed | Analysis |
| FR-134-AC-3 | No persisted payload is readable only by removed code, demonstrated over the retained corpus | Test |
| FR-134-AC-4 | At a boundary with one remaining reader, the legacy representation is retained and the reader's owner is named | Inspection |
| FR-134-AC-5 | Reverting any single removal restores that boundary without reverting another | Demonstration |
| FR-134-AC-6 | `filament-ide`'s `coredb` sync path reads the generated contract and no longer reads the legacy one | Test |
| FR-134-AC-7 | Architecture records, migration notes and package deprecations name the retired boundaries and the retained ones | Inspection |

## Dependencies

- **Upstream**: [FR-135](./FR-135-freeze-the-first-contract-major.md), whose compatibility window this retirement observes
- **Downstream**: the generated-package support policy, which shortens once no boundary carries two representations
