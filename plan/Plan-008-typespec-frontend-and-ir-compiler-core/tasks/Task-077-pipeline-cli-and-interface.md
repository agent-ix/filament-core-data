---
id: Task-077
title: "Pipeline, commands, and the narrow interface"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-547"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-548"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-549"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-550"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-551"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-552"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-553"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-554"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-555"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-556"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-557"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-558"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-559"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-560"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-561"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-562"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-563"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-564"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-565"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-566"
    type: verifies
---
# Task-077: Pipeline, commands, and the narrow interface

## Scope

Join both tracks behind one orchestration and three verbs.

## Subtasks

- [x] `src/compiler/pipeline.mjs`: `compilePackage` running resolve, lock, frontend, validate, write, stopping at the first blocking phase, returning `{ ir, lock, diagnostics, state }`.
- [x] `src/compiler/inspect.mjs`: the deterministic summary record and its canonical JSON form.
- [x] `src/compiler/cli.mjs`: the `compile`, `inspect`, and `diff` verbs with their flags, `emit-ir` untouched, exit codes 0/1/2, usage text, `.tmp`-then-rename writes, `DEFAULT_LIMITS` applied.
- [x] Extend `src/compiler/index.mjs` to exactly fifteen symbols and `index.d.mts` to declare each one; assert `package.json` metadata is unchanged.
- [x] `make compiler-compile`, `make compiler-inspect`, `make compiler-diff`.

## Deliverables

- `pipeline.mjs`, `inspect.mjs`, the extended CLI and interface, the Makefile targets, and their tests.

## Notes

- SR-066 FND-507: `compilePackage` gets its own module outside the frozen `compile.mjs`, and its phase order is asserted by an instrumented recorder rather than implied by a CLI sentence.
