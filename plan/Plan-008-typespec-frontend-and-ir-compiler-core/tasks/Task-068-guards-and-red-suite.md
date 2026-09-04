---
id: Task-068
title: "Guards, changed-path allowlists, and the red suite"
type: Task
status: pending
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

- [ ] Measure the branch baseline: run the suite on this worktree and record which cases fail and why, so the starting number is measured rather than assumed.
- [ ] Scope the six changed-path allowlists on `main` — `test/typespec-feasibility.test.ts`, `test/contract-census.test.ts`, `test/semantic-architecture.test.ts`, `test/semantic-contract.test.ts`, `test/semantic-core.test.ts`, `test/semantic-ir-v1-1.test.ts` — and the two in `test/compiler.test.ts`, adding exactly the paths this ticket writes: `fixtures/compiler/`, `scripts/`, `plan/Plan-008-typespec-frontend-and-ir-compiler-core/`, `test/compiler-core.test.ts`, `docs/semantic-data-system/compiler-diagnostics.md`, `docs/semantic-data-system/ir-compatibility-policy.md`. Each amendment is an enumeration of what this branch touches, never a widening that would let an unrelated path through.
- [ ] Add `test/compiler-core.test.ts` with the TC-398..619 trace inventory and the NFR-021 permitted/prohibited assertions (TC-590..597), all using `git diff --no-renames`.
- [ ] Record the `origin/main` baselines the later tasks compare against: `src/compiler/{ir,compile,identity}.mjs`, `src/compiler/emitters/**`, `src/compiler/backends/**`, `src/compiler/inventory.json`, the four committed issue #4 goldens, `package.json` metadata, and every file under `conformance/`.
- [ ] Wire `node scripts/test-matrix-summary.mjs --check` into `pnpm run lint` so the Test Execution Summary is computed from the rows rather than asserted.

## Deliverables

- Six scoped allowlists, a red `test/compiler-core.test.ts`, and a matrix-summary check in lint.

## Notes

- Plan-007's Task-067 found that `git diff --name-only origin/main...HEAD` applies rename detection and hid the emitter moves from every gate. `--no-renames` everywhere, from the first commit.
