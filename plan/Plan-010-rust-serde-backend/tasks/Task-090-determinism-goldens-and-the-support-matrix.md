---
id: Task-090
title: "Determinism, the frozen goldens, and the support matrix"
type: Task
status: done
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-086"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-060"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-711"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-712"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-713"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-714"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-715"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-716"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-717"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-718"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-731"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-732"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-733"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-734"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-735"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-736"
    type: verifies
---
# Task-090: Determinism, the frozen goldens, and the support matrix

## Scope

Produce the determinism evidence, and produce it honestly.

## Subtasks

- [x] Generate each corpus base twice into two scratch directories and compare bytes.
- [x] Repeat under the declared `TZ`, `LANG`, `HOME` and working-directory perturbations.
- [x] Transcribe the goldens once; write the digest baseline from a second, separate script.
- [x] Run `rustfmt --check` over every generated crate and assert the formatter is the pinned version.
- [x] Write the ambient-input scan over the generator's module graph.
- [x] Run the whole pipeline with the network denied, and prove the build fails when a cached crate is removed.
- [x] Write `docs/semantic-data-system/rust-backend-support-matrix.md`: one row supported with named measured evidence, every other row unmet with its reason and issue #60.

## Deliverables

- `test/fixtures/rust-serde/goldens/`
- `test/fixtures/rust-serde/digests.json`
- `docs/semantic-data-system/rust-backend-support-matrix.md`

## Notes

The second platform row is unreachable in this ticket: the only CI is a Node-only reusable workflow and `.github/**` is prohibited. It is recorded unmet, not construed as met.
