---
id: Task-081
title: "The closed generator diagnostic registry"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-080"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-690"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-691"
    type: verifies
---
# Task-081: The closed generator diagnostic registry

## Scope

Land `diagnostics.mjs`, the registry every other module in the slice emits through. SR-080 FND-931 records that this module is the slice's first task while FR-058's completeness criteria are its last; only the module lands here.

## Subtasks

- [x] Write the deeply frozen `agent-ix.rust-backend.*` registry with the 21 entries FR-058 declares, each carrying severity, blocking flag, owner and rule.
- [x] Write `diagnostic(entry, …)`, which throws on an unregistered entry, and the 120-code-point `fragment` truncation.
- [x] Write the FR-049 ordering key and the order-then-truncate limit application.
- [x] Add the static scan asserting no live generator path spells a code as a string literal.

## Deliverables

- `src/compiler/backends/rust-serde/diagnostics.mjs`

## Notes

The reader's `agent-ix.semantic-ir.*` set is a separate closed set and lands in Track C.
