---
id: Task-018
title: "Official emitter and diagnostic evidence"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-017"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-097"
    type: verifies
---
# Task-018: Official emitter and diagnostic evidence

## Scope

Run the exact official JSON Schema, Protobuf, and versioning paths over the pinned
slice; retain raw outputs and honest supported/limited/failed dispositions.

## Subtasks

- [x] Emit and validate modular JSON Schema 2020-12, retaining the raw reference defect and validation-only normalization.
- [x] Emit the declared Protobuf wire projection and validate syntax with protobufjs; retain absent native `protoc` as a P1 partial.
- [x] Exercise version/deprecation declarations and cross-package references.
- [x] Capture invalid/unsupported diagnostics with source loci and consequences.

## Deliverables

- `spikes/typespec-feasibility/generated/official/`
- `spikes/typespec-feasibility/evidence/official.json`
