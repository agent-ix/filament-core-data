---
id: Task-034
title: "Red suite, scope guard, and baselines"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-033"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-208"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-231"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-234"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-236"
    type: verifies
---
# Task-034: Red suite, scope guard, and baselines

## Scope

Establish the failing v1.1 assertions, the changed-path guard, and the byte baselines that every later task is measured against.

## Subtasks

- [ ] Record `pnpm spike:typespec:check` output and the sha256 of every `fixtures/semantic/v1/positive/*.json` on the base commit as committed baselines.
- [ ] Add a trace-tagged Vitest suite covering TC-203..247 with red assertions naming the absent v1.1 node or rule.
- [ ] Extend the changed-path guard to allow `agent_ix_core_data/` (second reader) and forbid `spikes/`, `src/`, generated packages, and any path outside the repository.
- [ ] Assert every v1 positive fixture validates under the current schema and that the v1 IR fixture (`contractVersion: "1.0.0"`) stays valid at every later commit.

## Deliverables

- Red TDD baseline with attributable failure reasons.
- Executable non-disruption guard and byte baselines.

## Notes

- The suite may be committed red only on the issue branch.
- No schema file changes in this task.
