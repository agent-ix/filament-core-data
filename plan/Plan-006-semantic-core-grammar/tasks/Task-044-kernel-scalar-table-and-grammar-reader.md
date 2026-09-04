---
id: Task-044
title: "Kernel scalar table and grammar reader"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-042"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-255"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-256"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-257"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-258"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-260"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-277"
    type: verifies
---
# Task-044: Kernel scalar table and grammar reader

## Scope

Write `kernel-scalars.json` and the test-scoped semantic-core reader that enforces the FR-031 cross-property grammar rules.

## Subtasks

- [x] `packages/semantic-core/kernel-scalars.json`: one entry per member with `irScalar`/`irLowering`, `bounds`, `serialization`, `unitAllowed` (TC-255, TC-257).
- [x] `test/semantic-core-reader.ts`: rules for bounds, flags on collections, decimal presence/absence, unit applicability (`unitAllowed` scalars only, never on `returns`), uniqueness keys, identity flag; diagnostics carry a declaration locus.
- [x] Negative grammar-rule fixtures under `fixtures/semantic-core/negative/rules/` and TC-277 asserting each is rejected at its locus while the FR-006 set reads clean; TC-256 for Decimal with/without `decimal`.
- [x] Mutation test injecting `Any` into `KernelScalar` (TC-258); compatibility corpus entries for kernel-scalar add/remove/re-represent (TC-260).

## Deliverables

- Scalar table.
- Grammar reader and rule fixtures.

## Notes

- Bounds are documentation; the reader does not evaluate values against them (FR-032).
- Disjoint from Task-043's files.
