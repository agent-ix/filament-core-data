---
id: Task-060
title: "Guards, changed-path allowlist, and red suite"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-044"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-018"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-379"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-390"
    type: verifies
---
# Task-060: Guards, changed-path allowlist, and red suite

## Scope

Author the guards before any promoted file exists, so the branch cannot go green by accident.

## Subtasks

- [ ] Extend the `allowed` changed-path array in `test/typespec-feasibility.test.ts` (TC-123/TC-124) with `src/compiler/`, `tsconfig.json`, `tsconfig.build.json`, `plan/Plan-007-promote-prototype-emitters/`, and `test/compiler.test.ts`. This array, not NFR-017's prose, is the gate that actually runs.
- [ ] Add `test/compiler.test.ts` with the TC-320..397 trace inventory comment and the changed-path assertions for the NFR-017 permitted and prohibited lists (TC-390).
- [ ] Add the assertion that every path the branch changes is covered by the allowlist (TC-379).
- [ ] Record the `origin/main` baselines the later tasks compare against: the four committed goldens (`semantic-ir.json`, `typescript/index.ts`, `rust/src/lib.rs`, `python/input.schema.json`), the committed `Cargo.lock`, and `evidence/custom.json`.

## Deliverables

- Amended isolation allowlist and a red `test/compiler.test.ts`.

## Notes

- The allowlist amendment is the fix for SR-056 FND-281, SR-058 FND-323 and SR-061 FND-381: three analyses independently found that the promotion regresses a green NFR-006 gate that no requirement owned.
