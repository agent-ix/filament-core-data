---
id: Task-085
title: "The sandboxed, deterministic generator runner"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-883"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-884"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-885"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-886"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-887"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-888"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-889"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-890"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-891"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-892"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-893"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-894"
    type: verifies
---
# Task-085: The sandboxed, deterministic generator runner

## Scope

One entry point that guards first, generates inside a scratch root it owns, under stated limits and an allow-listed environment, and reproduces byte-for-byte.

## Subtasks

- [ ] Author `python_backend/limits.json` with the timeout, the kill grace period, the maximum input size, and the environment allow-list.
- [ ] Implement `generate()`: guards, size check, scratch root, entry-point resolution from distribution metadata, allow-listed environment with a fixed `PYTHONHASHSEED`, warnings as errors, stderr allow-list, and scratch removal on every outcome.
- [ ] Compute the toolchain fingerprint over the declared pins, the profile digest, and the input digest, and over nothing the host observes.
- [ ] Instrument spawn, socket, and filesystem access for the gates.
- [ ] Rehearse a shadowing `datamodel-codegen` earlier on `PATH`.
- [ ] Assert by source scan that no module under `src/compiler/` spawns a process or imports the generator.

## Deliverables

- `python_backend/runner/generate.py`, `python_backend/limits.json`
- `tests/test_python_backend_runner.py`

## Notes

- The runner lives outside `src/compiler/` because FR-043-AC-8 requires that gate to stay green.
- The generator is never imported in-process: the subprocess boundary is the sandbox.
- Output is copied to the caller-named path only after the enforcing inspection passes, so a refused generation leaves no partial package.
