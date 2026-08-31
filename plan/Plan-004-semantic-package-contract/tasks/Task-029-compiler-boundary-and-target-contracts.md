---
id: Task-029
title: "Compiler boundary and target contracts"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-025"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-159"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-160"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-161"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-162"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-163"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-164"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-179"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-180"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-184"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-200"
    type: verifies
---
# Task-029: Compiler boundary and target contracts

## Scope

Define schemas for compiler requests, output manifests, diagnostics, backend
capabilities, and Rust/TypeScript/Python/JSON Schema target expectations. Do not
implement or select a production backend.

## Subtasks

- [x] Define locked request, output file, output manifest, and normalized fingerprint envelopes.
- [x] Define stable diagnostic codes, causal chains, related loci, and blocking dispositions.
- [x] Define target API/runtime behavior and prohibited dependency contracts.
- [x] Document upstream qualification, retained-custom ownership, and AGPL-3.0-or-later requirements.
- [x] Add unsupported-feature, empty-model, untyped-widening, manifest, and diagnostic parity fixtures.

## Deliverables

- Compiler boundary, output-manifest, diagnostic, capability, and target-contract schemas.
- Backend qualification and licensing guidance.

## Notes

- Python targets use qualified Pydantic v2 and dataclass generation; no authored decorators or custom `@` tags.
- Any custom backend implementation remains in the separate reusable AGPL repository.
