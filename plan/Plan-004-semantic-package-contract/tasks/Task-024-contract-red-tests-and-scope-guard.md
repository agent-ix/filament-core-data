---
id: Task-024
title: "Contract red tests and scope guard"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-195"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-198"
    type: verifies
---
# Task-024: Contract red tests and scope guard

## Scope

Create the test inventory and initial failing assertions for every required
contract family, while enforcing the issue's permitted and prohibited paths.

## Subtasks

- [x] Add a trace-tagged Vitest contract suite covering TC-130..202 with red assertions for missing artifacts.
- [x] Add a changed-path allowlist for requirements, schemas, fixtures, documentation, plans, reviews, and tests.
- [x] Assert compiler, publication, database, consumer, catalog, current Avro, and generated-source paths remain outside the issue diff.
- [x] Record the separate downstream gates named by the requirements.

## Deliverables

- Red TDD baseline with failure reasons attributable to absent issue #9 contracts.
- Executable non-disruption path guard.

## Notes

- The test inventory may be committed red only within the implementation branch; the final PR must be green.
- This task does not authorize edits to any guarded path.
