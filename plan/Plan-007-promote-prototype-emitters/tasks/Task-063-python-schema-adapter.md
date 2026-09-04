---
id: Task-063
title: "Python JSON Schema adapter and pinned constants"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-061"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-361"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-362"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-363"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-364"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-365"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-366"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-367"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-368"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-369"
    type: verifies
---
# Task-063: Python JSON Schema adapter and pinned constants

## Scope

Promote the JSON Schema adapter that prepares the official bundle for `datamodel-code-generator`, and nothing else of the Python path.

## Subtasks

- [x] `src/compiler/backends/python-schema.mjs` exporting `normalizeJsonSchemaForPython(schema)`, `DATAMODEL_CODEGEN_VERSION`, and `PYDANTIC_VERSION`.
- [x] Keep the forbidden-key rejection closed over `x-python-import`, `customTypePath`, `default_factory`, at any depth (TC-362, TC-363).
- [x] Golden comparison against the committed `python/input.schema.json` (TC-361).
- [x] Purity and input-immutability assertions (TC-366).
- [x] Assert no module under `src/compiler/` spawns a process, so the generator invocation is demonstrably left to issue #23 (TC-369).

## Deliverables

- A governed adapter with its pins, and no promoted Python code generator.

## Notes

- FR-043-CON-3: this adapter strips `$id` while FR-033 absolutises it. They are two consumers of the same issue #31 defect — a single-file generator input versus published addressable schemas — and neither moves to match the other.
