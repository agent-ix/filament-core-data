---
id: Task-087
title: "The probe corpus, the per-family verdicts, and the retained-gap register"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-895"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-896"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-897"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-898"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-899"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-900"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-901"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-902"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-905"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-906"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-907"
    type: verifies
---
# Task-087: The probe corpus, the per-family verdicts, and the retained-gap register

## Scope

Measure what each family retains and loses, one construct at a time and then over the whole published set, and record a verdict and a gap register that a later reader can check.

## Subtasks

- [ ] Author one probe per named construct area, each with a detector and an expected retention for all five families.
- [ ] Implement `qualify.py`: generate every probe under every profile through the runner, measure through the inspection's reporting mode, and compute the verdicts.
- [ ] Emit `report.json` with the verdict, the declared-toolchain fingerprint, the profile digest, and the retained and lost constructs per family.
- [ ] Emit `gaps.json` with one row per construct and affected family, each with severity, closability, and disposition.
- [ ] Ground every `qualified-with-conditions` condition in a declared profile option or a preparation rule.
- [ ] Add the `--check` mode and prove a mutated expectation and a removed gap row both red the gate.

## Deliverables

- `python_backend/qualification/probes/*.json`
- `python_backend/runner/qualify.py`
- `python_backend/qualification/report.json`, `gaps.json`
- `tests/test_python_backend_qualify.py`

## Notes

- The verdict vocabulary is exactly `qualified`, `qualified-with-conditions`, `not-qualified`, and a static gate asserts no other verdict word appears anywhere.
- `uniqueItems` is lost by all five families and is the case FR-077-AC-12 exists for.
- No hand-written generator may appear as a disposition without a recorded reviewed P0 decision.
