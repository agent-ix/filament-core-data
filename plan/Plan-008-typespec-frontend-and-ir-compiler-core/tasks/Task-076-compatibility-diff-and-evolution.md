---
id: Task-076
title: "Compatibility classifier and contract-version projections"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-051"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-527"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-528"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-529"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-530"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-531"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-532"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-533"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-534"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-535"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-536"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-537"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-538"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-539"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-540"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-541"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-542"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-543"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-544"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-545"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-546"
    type: verifies
---
# Task-076: Compatibility classifier and contract-version projections

## Scope

Classify a revision into a compatibility report and project a document between contract versions.

## Subtasks

- [x] `test/fixtures/compiler/compatibility/family-map.json`: the observed-family to report-family map as data.
- [x] `test/fixtures/compiler/compatibility/cases/**`: one constructed input pair per case of the published case index, which stays byte-unchanged.
- [x] `src/compiler/compat/diff.mjs`: the classification table, the disposition rank, the most-restrictive aggregate, the `source.identity` fallback for identity-less changes, the `requiredGates` naming of every omitted family, and the equal-fingerprint single-`patch` result.
- [x] `src/compiler/compat/evolution.mjs`: both projections, the verbatim envelope carry-over, `MISSING_TARGET_DIALECT`, `UNKNOWN_CONTRACT_VERSION`, and the same-version identity.
- [x] `test/fixtures/compiler/evolution/`: the forward and backward goldens; a round-trip property test.
- [x] Assert every produced report validates against `compatibility-report.schema.json`.

## Deliverables

- `diff.mjs`, `evolution.mjs`, the compatibility and evolution fixtures, and their tests.

## Notes

- SR-071 FND-606 named this the highest-churn surface in the ticket. The family map is data and every case is a constructed pair, so a change to the table is a data change with a failing test rather than a silent reclassification.
