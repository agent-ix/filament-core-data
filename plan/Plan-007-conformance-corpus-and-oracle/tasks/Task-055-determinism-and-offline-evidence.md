---
id: Task-055
title: "Determinism, locale, directory, and offline evidence"
type: Task
status: pending
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-054"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-291"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-295"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-307"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-332"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-334"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-335"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-340"
    type: verifies
---
# Task-055: Determinism, locale, directory, and offline evidence

## Scope

Produce the evidence that the corpus is deterministic and isolated, and wire the two suites so `make test` and `poetry run pytest` both gate it.

## Subtasks

- [ ] Run the oracle, the harness, and the coverage generator twice and compare bytes.
- [ ] Re-run under `LC_ALL=tr_TR.UTF-8` and under `LC_ALL=C` and compare bytes.
- [ ] Re-run from a different working directory and compare bytes.
- [ ] Run the static analysis for imports, clock, network, environment, and out-of-tree filesystem access across the oracle and the harness.
- [ ] Prove both suites run with the network unavailable.
- [ ] Write `conformance/README.md`: versioning, minimization, provenance, canonical form, the import path, and the issue #11 ownership note.

## Deliverables

- `conformance/README.md`
- The determinism, locale, directory, and isolation tests in both suites

## Notes

- Multi-platform determinism is not claimed; this repository's CI runs one platform and the plan says so.
