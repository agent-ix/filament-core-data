---
id: Task-003
title: "Metamodel and data planes"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-002"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-004"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-013"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-014"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-015"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-016"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-049"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-050"
    type: verifies
---
# Task-003: Metamodel and data planes

## Scope

Document the compiler metamodel, reusable semantic kernel, data planes,
orthogonal classifications, identity rules, and dynamic/static extension model.

## Subtasks

- [x] Separate schema/compiler definitions from runtime semantic values.
- [x] Define meta, definition, execution/observation, and presentation planes with examples.
- [x] Separate structural kind, semantic role, definition, occurrence, and report concepts.
- [x] Define package, type, definition, and occurrence identities and version rules.
- [x] Specify open dynamic discovery and finite generated package behavior.

## Deliverables

- Semantic metamodel document
- Data-plane and identity tables
- Extension compatibility rules and examples

## Notes

- Keep exact field schemas provisional for issue #9.
- Do not introduce a universal EAV runtime envelope.
