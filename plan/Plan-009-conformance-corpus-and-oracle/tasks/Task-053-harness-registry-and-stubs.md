---
id: Task-053
title: "The differential harness, adapter registry, and stub adapters"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-049"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-302"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-303"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-304"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-305"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-306"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-307"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-308"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-309"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-310"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-311"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-312"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-313"
    type: verifies
---
# Task-053: The differential harness, adapter registry, and stub adapters

## Scope

Land the harness, the four declared adapter slots, the stub adapters the harness tests drive, and the divergence register.

## Subtasks

- [x] Author `conformance/adapters/registry.json` with the issue #19, #21, #22, and #23 slots, their statuses, `pointerCompatible`, and the ownership note.
- [x] Implement the harness: `caseDigest` binding, oracle-only comparison, the match rule over `resultState`, ordered code, severity, locus, classification, and normalized bytes.
- [x] Implement `support` handling: declared `unsupported`, registry-declared `unavailable` as an unmet row, and every undeclared answer as a failure.
- [x] Implement the divergence register with `owner` and `verdict`, failing on an entry the run does not reproduce.
- [x] Implement the clock-free report and the separate `conformance-audit` target that reports an expired `reviewBy`.
- [x] Add the conforming and seeded-divergent stub adapters and the tests that drive them.
- [x] Add the source analysis asserting no adapter-to-adapter comparison and no import of adapter internals.

## Deliverables

- `conformance/runner/differential.mjs`
- `conformance/adapters/registry.json`
- `conformance/adapters/stub-*.mjs`
- `conformance/divergences.json`

## Notes

- All four real adapter slots are `unavailable` today; that is recorded as unmet coverage, never as a pass.
- Supplying an adapter command belongs to the owning issue, and the registry says so.
