---
id: Task-027
title: "Mapping, profile, and transformation schemas"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-026"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-022"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-147"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-148"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-149"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-150"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-151"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-152"
    type: verifies
---
# Task-027: Mapping, profile, and transformation schemas

## Scope

Define independently versioned mapping and profile contracts, preserving exact
transformation kind, authority, direction, effects, provenance, determinism,
loss, and failure semantics.

## Subtasks

- [x] Separate export, target, mapping, and profile selection fields and validation.
- [x] Define codec, lens, projection, extraction, rendering, aggregation, enrichment, and materialization variants.
- [x] Define get/put laws, aggregation windows, external effects, idempotency, and provenance.
- [x] Add permitted/undeclared-loss, pure/effectful, lens-law, and result-state fixtures.

## Deliverables

- Mapping, profile, and transformation schemas.
- Positive and adverse transformation corpus.

## Notes

- Generic mapping labels cannot substitute for variant-specific obligations.
