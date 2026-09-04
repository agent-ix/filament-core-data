---
id: Task-046
title: "Kernel scope amendments"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-042"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-014"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-274"
    type: verifies
---
# Task-046: Kernel scope amendments

## Scope

Add one paragraph each to ARCH-005 (`metamodel.md`) and ADR-0002 stating that the small kernel includes the declaration grammar and that domain vocabulary stays in modules.

## Subtasks

- [ ] Amend `docs/semantic-data-system/metamodel.md` kernel section with one paragraph citing `packages/semantic-core/inventory.json`.
- [ ] Amend `docs/semantic-data-system/adr/0002-generated-package-ownership.md` with one paragraph.
- [ ] Record the manual inspection result for TC-274 in the plan log.

## Deliverables

- Two amendments.

## Notes

- Exactly one paragraph each; no other doc change.
