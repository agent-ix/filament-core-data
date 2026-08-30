---
id: Task-017
title: "Pinned TypeSpec toolchain and semantic slice"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-016"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-014"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-089"
    type: verifies
---
# Task-017: Pinned TypeSpec toolchain and semantic slice

## Scope

Install exact dev-only TypeSpec dependencies, record native tool versions, and
author two modular packages containing every representative concept and semantic
edge required by FR-014.

## Subtasks

- [x] Pin compiler, official emitters/libraries, validators, and lockfile.
- [x] Record Rust, TypeScript, Python, Protobuf, and Arrow tool availability.
- [x] Author semantic-core plus domain/assurance package sources and mappings.
- [x] Compile valid sources and retain source-located invalid fixtures.

## Deliverables

- `spikes/typespec-feasibility/packages/`
- `spikes/typespec-feasibility/evidence/toolchain.json`
