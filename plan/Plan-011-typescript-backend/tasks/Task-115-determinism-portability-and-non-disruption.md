---
id: Task-115
title: "Determinism, portability, and the non-disruption gates"
type: Task
status: done
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-114"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-834"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-835"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-836"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-837"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-838"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-839"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-840"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-841"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-842"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-843"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-844"
    type: verifies
---
# Task-115: Determinism, portability, and the non-disruption gates

## Scope

Land the two quality gates: that the generated package is reproducible and framework-free, and that this change lands without moving anything it is judged against.

## Subtasks

- [x] Prove byte-identity across two runs, across two working directories, and under `LC_ALL=tr_TR.UTF-8` — the Turkish locale specifically, because dotted-I case folding is how a locale-dependent identifier mint shows itself.
- [x] Prove the packed artifacts are identical after normalizing exactly `mtime`, `uid`, `gid`, `uname` and `gname`.
- [x] Assert statically: every import specifier in generated source is relative; the generated `package.json` declares no dependency block; no type assertion, no `any` in a type position and no `@ts-expect-error` appears in generated source; no module under `typescript-v1/` calls `localeCompare`, reads a clock, an environment variable, `process.cwd()`, the filesystem or a socket; and every generated file carries the SPDX header.
- [x] Assert `biome format` over the committed generated TypeScript source fixture reports no change.
- [x] Build the NFR-025 change-set gate on the shared `changeRange(root, sentinels)` helper in `test/changed-paths.ts`, pinning **both** endpoints to history through sentinel files this change created. Pass `--no-renames` to every `git diff`.
- [x] Assert every path in this change's own set is permitted and none prohibited; that `package.json`, both lockfiles, `schema/**`, `fixtures/**`, `spikes/**`, `packages/**` and the frozen prototype backends are absent from that set; that `src/compiler/index.mjs` still exports exactly fifteen symbols; and that the only `tsconfig.json` edit is the one `exclude` entry.
- [x] Assert `conformance/divergences.json` is byte-unchanged.
- [x] Assert the `src/compiler/` modules this change adds ship as source in `npm pack --dry-run` — `package.json` `files` already carries `src/` — with no runtime entry point, no `exports` entry and no dependency, and that no generated package and no `test/fixtures/` file appears in that listing.
- [x] Rehearse the accretion property on a synthetic history in which an unrelated change lands on top, and confirm this change's path set does not grow.
- [x] Rehearse the quiet direction: every gate here still fails on the input it exists to catch after the branch is squashed onto the trunk and `origin/main` is repointed at it. The focused suite passes 17/17 in the real squash state.
- [x] Rehearse the restore: revert this change's commit range and confirm the full suite passes. The revert tree is byte-identical; with predecessor range repair `cf943af` applied first, the provisioned full suite passes 421/421.
- [x] Assert no criterion in the bundle asserts a whole-corpus absolute, by rehearsing a synthetic history in which a sibling backend lands first. A real sibling commit on top leaves #22's range unchanged and the focused suite passes 17/17.

## Deliverables

- The NFR-024 and NFR-025 gates in `test/typescript-backend.test.ts`

## Notes

- The merge-degrading guard family has four observed shapes and this repository has shipped four instances. Pin **both** endpoints of any change range to history — a commit that added a sentinel file — never to `origin/main` or a bare `HEAD`. `test/changed-paths.ts` has `changeRange(root, sentinels)` for exactly this; use it rather than writing a fifth private copy.
- Always pass `--no-renames`. Rename detection made deletions invisible to four test cases and four guards in issue #27.
- A gate whose baseline is unreadable must fail saying it did not run, never skip quietly.
- Trace-tag binding traps: a bare TC id in a comment binds to the NEXT symbol, so a comment explaining a deliberately-untagged test mints the very trace it disclaims. Write ids in comments only in a form the engine does not bind. A trace id on a container docstring or a plain helper binds nothing.
