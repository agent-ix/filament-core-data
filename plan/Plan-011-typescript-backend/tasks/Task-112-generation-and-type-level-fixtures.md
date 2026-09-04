---
id: Task-112
title: "The generation fixture, the type-level fixtures, and the typecheck program"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-111"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-825"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-830"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-831"
    type: verifies
---
# Task-112: The generation fixture, the type-level fixtures, and the typecheck program

## Scope

Land the committed evidence: one small generated package, the type-level fixtures that prove the type surface, the strict program they are checked under, and the archive listing.

## Subtasks

- [x] Author `test/fixtures/backends/typescript/tsconfig.json` setting `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` and `noUnusedParameters`.
- [x] Add `test/fixtures/backends/typescript` to the root `tsconfig.json` `exclude` — exactly one line, and nothing else in that file. The root config includes `test`, sets `noUnusedLocals`, does not set `exactOptionalPropertyTypes`, and is what `make lint` runs, so the fixtures cannot sit inside it.
- [x] Commit the generation fixture: the smallest IR document exercising all eight kinds, and the package generated from it. Every deliberate change to FR-064 through FR-067 rewrites this package, so its size is its maintenance cost.
- [x] Author the type-level fixtures checked by `tsc --noEmit`: narrowing after a successful validation, exhaustive variant handling through a `never` check, the four optional/null forms, and a removed export failing to compile.
- [x] Run the four must-not-compile fixtures through a separate invocation asserting the expected diagnostic codes, so a fixture that fails for the wrong reason is caught.
- [x] Author `test/fixtures/backends/typescript/bundle-surface/**`: the single-type entry modules and the committed reachable-symbol record, which fails when the reachable set grows.
- [x] Implement the self-computed archive listing — path, size and content digest — as the default packed-artifact comparison, normalizing exactly `mtime`, `uid`, `gid`, `uname` and `gname` and nothing else. Keep `npm pack --dry-run --json` as an optional cross-check only, because `npm` reads ambient configuration and this ecosystem points it at a private registry.

## Deliverables

- `test/fixtures/backends/typescript/**` — `tsconfig.json`, the generation fixture, the type-level fixtures, `bundle-surface/**`
- One line added to the root `tsconfig.json` `exclude`

## Notes

- The committed generated package is a **regression baseline, not an oracle**. Its oracles are the conformance run of Task-114 and the ajv differential of Task-108. The corpus draws the same distinction as `provenance.blessedFromRun`; state it in the fixture's README rather than leaving a reader to assume.
- `tsconfig.json` is permitted for exactly this one edit and nothing else in the file. Widening that permission later is how a permitted-path list accretes — issue #55 records what that looks like.
