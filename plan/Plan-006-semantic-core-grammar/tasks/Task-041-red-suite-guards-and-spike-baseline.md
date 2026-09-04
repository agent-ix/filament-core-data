---
id: Task-041
title: "Red suite, guards, and spike baseline"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-040"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-014"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-275"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-278"
    type: verifies
---
# Task-041: Red suite, guards, and spike baseline

## Scope

Establish the failing issue #35 assertions, extend the changed-path guards for `packages/semantic-core/` and `fixtures/semantic-core/`, and record the spike baseline.

## Subtasks

- [ ] Add `test/semantic-core.test.ts` with trace-tagged red assertions for TC-248..279 naming the absent artifact.
- [ ] Extend the five changed-path guards (four prior issues plus issue #34) with `packages/semantic-core/`, `fixtures/semantic-core/`, `test/semantic-core*.ts`, `Makefile`; add the issue #35 guard forbidding `spikes/`, `src/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (TC-275).
- [ ] Record the `spikes/` diff guard and spike generated-output digests as the TC-278 baseline.

## Deliverables

- Red baseline with attributable failures.
- Guards and spike baseline.

## Notes

- No package file exists yet after this task.
- `package.json` may gain `scripts` only; the lockfile must not change.
