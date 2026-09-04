---
id: Task-066
title: "Determinism and non-disruption gates"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-065"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-018"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-383"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-384"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-385"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-386"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-388"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-389"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-391"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-392"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-393"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-394"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-395"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-396"
    type: verifies
---
# Task-066: Determinism and non-disruption gates

## Scope

Run the cross-cutting gates over the finished tree.

## Subtasks

- [x] Repeat-run identity for the CLI, both backends, and the adapter (TC-383).
- [x] Collator-independence and explicit-`baseDir` checks (TC-385, TC-386).
- [x] Retained-evidence branch diff: exactly one file, exactly one field (TC-384).
- [x] Dependency inspection: no added dependency, exact `@typespec/*` pins, no `.npmrc`, no `file:`/`link:` (TC-388).
- [x] Manifest and packed-file comparison against `origin/main`, asserting the tarball delta is confined to `src/compiler/**` (TC-391, TC-392).
- [x] Licence inspection and dependency-set comparison (TC-393, TC-394).
- [x] Restore rehearsal: restoring every changed path from `origin/main` reproduces `origin/main`'s tree exactly (TC-395).
- [x] Confirm no workflow, tag, or publication step is added or triggered (TC-396).
- [x] Confirm the issue #42 couplings are named in the feasibility doc (TC-389).

## Deliverables

- Green determinism and non-disruption evidence for the whole change set.

## Notes

- TC-395 replaces the manual revert rehearsal SR-059 FND-348 flagged; the assertions are mechanical and the repo already runs `git diff origin/main` inside vitest.
