---
id: Task-019
title: "Semantic IR and experimental native emitters"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-017"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-104"
    type: verifies
---
# Task-019: Semantic IR and experimental native emitters

## Scope

Traverse the TypeSpec program into a versioned deterministic IR and generate
ordinary Rust, TypeScript, Arrow, Markdown, and mapping artifacts inside the
disposable spike boundary. Route normalized JSON Schema through pinned
`datamodel-code-generator` for Python rather than promoting the hand-written
prototype.

## Subtasks

- [x] Preserve source/package/identity/role/type/constraint/provenance metadata in IR.
- [x] Emit deterministic Rust/Serde and TypeScript prototypes plus Pydantic and dataclass packages through the established pinned generator.
- [x] Emit Arrow and Markdown mappings with authority, fidelity, and loss metadata.
- [x] Compare custom JSON/Protobuf mappings with official outputs and retain mismatches.

## Deliverables

- `spikes/typespec-feasibility/emitter/`
- `spikes/typespec-feasibility/generated/custom/`
- `spikes/typespec-feasibility/evidence/custom.json`
