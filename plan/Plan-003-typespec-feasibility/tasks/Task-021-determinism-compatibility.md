---
id: Task-021
title: "Determinism, compatibility, and isolation evidence"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-020"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-113"
    type: verifies
---
# Task-021: Determinism, compatibility, and isolation evidence

## Scope

Generate twice into clean temporary roots, fingerprint governed output, classify
controlled schema changes, record diagnostics/performance/size, and prove the
spike did not publish or touch canonical paths.

## Subtasks

- [x] Compare normalized and byte outputs across two clean generations.
- [x] Classify patch, additive, and breaking revisions with explicit rules.
- [x] Record diagnostic, duration, and size observations without production claims.
- [x] Inspect changed paths, packages, releases, and current Avro/generated controls.

## Deliverables

- `spikes/typespec-feasibility/evidence/compatibility.json`
- `spikes/typespec-feasibility/evidence/validation.json`
