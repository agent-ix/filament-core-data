---
id: Task-091
title: "NFR-026 and NFR-027 evidence and the three measured states"
type: Task
status: todo
track: E
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-936"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-937"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-938"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-939"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-940"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-941"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-942"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-943"
    type: verifies
---
# Task-091: NFR-026 and NFR-027 evidence and the three measured states

## Scope

Produce the instrumented security evidence, the reproducibility evidence, and the three-state verification the repository's standard requires.

## Subtasks

- [ ] Run the malicious corpus and the advisory gate together and assert zero spawns and zero generated files.
- [ ] Instrument sockets, filesystem access, the import machinery, and the emission ordering.
- [ ] Remove each declared tool in turn and assert its gate fails with a provisioning message.
- [ ] Scan every committed artefact this change adds for a clock, host, user, absolute path, patch interpreter version, or formatter version.
- [ ] Run the branch's own changed-path gate through `changedPathsOf` with this change's first and last sentinels.
- [ ] Measure three states: branch head; a scratch clone with the branch squash-merged and `origin/main` repointed so both the diff and the status are empty; and that clone with a real unrelated sibling commit on top.

## Deliverables

- `tests/test_python_backend_evidence.py`
- `test/python-backend.test.ts` (changed-path and artefact-scan half)

## Notes

- The branch-green number cannot see an accreting range; the third state is the one that catches it.
- Both endpoints of every range come from history, and every `git diff` passes `--no-renames`.
