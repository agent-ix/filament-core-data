---
id: Task-094
title: "The non-disruption, attribution and revert gates"
type: Task
status: done
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-093"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-737"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-738"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-739"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-740"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-741"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-742"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-743"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-744"
    type: verifies
---
# Task-094: The non-disruption, attribution and revert gates

## Scope

Land the gate family this repository has been dragged back by four times, in the shape PR #54 settled and with the fifth face SR-084 FND-986 recorded.

## Subtasks

- [x] Use `changeRange` from `test/changed-paths.ts` with both sentinels; pass `--no-renames` everywhere; union the per-commit sets over `--first-parent --no-merges`.
- [x] Rebase this branch onto the trunk rather than merging it, and assert zero merge commits inside the range.
- [x] Assert every path in the set is permitted and none prohibited, and that every permitted entry is named by a requirement Output or by NFR-023's Verification.
- [x] Byte-compare every `conformance/` file but the adapter registry, and the frozen schemas, fixtures, packages, spikes and prototype backends.
- [x] Assert `publish = false` on every manifest, emitted and hand-written, and that removing it fails.
- [x] Compare `Cargo.lock`'s third-party entries against `THIRD-PARTY-NOTICES.md`.
- [x] Rehearse the revert, the accretion on a synthetic history, a trunk merge inside the range, and an unresolvable sentinel.

## Deliverables

- the NFR-023 gates in `test/rust-backend.test.ts`

## Notes

Every gate that cannot resolve its inputs fails saying so. A negative prohibition over a history-fixed range is the only shape that neither empties on merge nor accretes afterwards.
