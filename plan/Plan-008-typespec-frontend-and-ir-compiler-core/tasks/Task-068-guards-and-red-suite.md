---
id: Task-068
title: "Guards, changed-path allowlists, and the red suite"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-590"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-591"
    type: verifies
---
# Task-068: Guards, changed-path allowlists, and the red suite

## Scope

Author the guards before any implementation file exists, so the branch cannot go green by accident, and scope the six pre-existing changed-path gates that would otherwise fail on paths this ticket legitimately adds.

## Subtasks

- [x] Measure the branch baseline: run the suite on this worktree and record which cases fail and why, so the starting number is measured rather than assumed.
- [x] Scope the six changed-path allowlists on `main` — `test/typespec-feasibility.test.ts`, `test/contract-census.test.ts`, `test/semantic-architecture.test.ts`, `test/semantic-contract.test.ts`, `test/semantic-core.test.ts`, `test/semantic-ir-v1-1.test.ts` — and the two in `test/compiler.test.ts`, adding exactly the paths this ticket writes: `test/fixtures/compiler/`, `scripts/`, `plan/Plan-008-typespec-frontend-and-ir-compiler-core/`, `test/compiler-core.test.ts`, `docs/semantic-data-system/compiler-diagnostics.md`, `docs/semantic-data-system/ir-compatibility-policy.md`. Each amendment is an enumeration of what this branch touches, never a widening that would let an unrelated path through.
- [x] Add `test/compiler-core.test.ts` with the TC-398..619 trace inventory and the NFR-021 permitted/prohibited assertions (TC-590..597), all using `git diff --no-renames`.
- [x] Record the `origin/main` baselines the later tasks compare against: `src/compiler/{ir,compile,identity}.mjs`, `src/compiler/emitters/**`, `src/compiler/backends/**`, `src/compiler/inventory.json`, the four committed issue #4 goldens, `package.json` metadata, and every file under `conformance/`.
- [x] Wire `node scripts/test-matrix-summary.mjs --check` into `pnpm run lint` so the Test Execution Summary is computed from the rows rather than asserted.

## Deliverables

- Six scoped allowlists, a red `test/compiler-core.test.ts`, and a matrix-summary check in lint.

## Findings

Measured on `origin/main` at 51febd4 with a clean `pnpm install` and `poetry
install`: **168 of 173 passed, 5 failed**. `main` is not 173/173; that figure was
measured on the #27 branch before it merged. All five failures are issue #27
gates in `test/compiler.test.ts` that assert properties of
`git diff origin/main...HEAD` which hold only while the branch under test *is*
the promotion. Filed as issue #48 and repaired here, each restated as the state
fact it was really protecting, with an inline comment recording what it used to
assert. The repairs strengthen the gates: the licence check now covers every
manifest under `src/compiler/` rather than only the added ones, and the mutation
prohibition names the three protected fixture trees individually rather than
prohibiting all of `fixtures/`.

## Notes

- Plan-007's Task-067 found that `git diff --name-only origin/main...HEAD` applies rename detection and hid the emitter moves from every gate. `--no-renames` everywhere, from the first commit.
