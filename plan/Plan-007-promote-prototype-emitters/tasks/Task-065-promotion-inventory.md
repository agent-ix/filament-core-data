---
id: Task-065
title: "Promotion inventory and the feasibility-doc record"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-064"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-040"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-320"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-321"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-322"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-323"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-324"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-325"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-326"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-327"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-328"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-329"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-330"
    type: verifies
---
# Task-065: Promotion inventory and the feasibility-doc record

## Scope

Write the disposition ledger last, when every `src/compiler/` file it must account for exists.

## Subtasks

- [x] `src/compiler/inventory.json` with `components` (one record per the fourteen FR-040 Inputs entries: `component`, `source`, `capability`, `disposition`, `targets`, `evidence`, `limitation`) and `authored` (`path`, `reason`).
- [x] Enforce the closed disposition set, non-empty limitations, target existence, and full `src/compiler/` file ownership, with mutation runs for each rejection path (TC-321, TC-323, TC-326, TC-329, TC-330).
- [x] Restate the recorded limitation of every `partial` capability the inventory cites (TC-329).
- [x] Add the `## Promotion inventory` section to `docs/semantic-data-system/typespec-feasibility.md` with counts equal to the inventory's (TC-328).

## Deliverables

- A ledger in which no component is promoted merely because one golden passed.

## Notes

- The Rust and TypeScript backends carry the four absent gates — conformance corpus, property/fuzz suite, compatibility matrix, downstream adoption — until issues #21 and #22 discharge them against the issue #20 corpus.
