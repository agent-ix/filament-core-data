---
id: Task-061
title: "Promoted semantic-IR emitter and narrow build interface"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-060"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-331"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-332"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-333"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-334"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-335"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-336"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-337"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-338"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-339"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-340"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-341"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-342"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-343"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-344"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-345"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-346"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-347"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-348"
    type: verifies
---
# Task-061: Promoted semantic-IR emitter and narrow build interface

## Scope

Move the `$onEmit` semantic-IR emitter into `src/compiler/` behind one six-symbol interface, with the two ambient inputs made explicit.

## Subtasks

- [ ] `src/compiler/ir.mjs`: `buildSemanticIr(program, { generator, baseDir })` and `SEMANTIC_IR_SCHEMA_VERSION`. Walk with `navigateProgram`; keep only `AgentIx.Semantic` and descendants; order by `id` with a code-point comparison, never `localeCompare`; relativise loci against `baseDir` as `<path>:<line>`; record `synthetic` when there is no location.
- [ ] `src/compiler/compile.mjs`: `compileSemanticIr({ entrypoint, generator, baseDir })` over `NodeHost`, rejecting with the diagnostics rather than emitting a partial IR.
- [ ] `src/compiler/emitters/semantic-ir/index.mjs` and `package.json` (`@agent-ix/semantic-ir-emitter`, AGPL-3.0-only, private): `$onEmit` reading `context.options.generator`, defaulting to its own `name@version`.
- [ ] `src/compiler/index.mjs` exporting exactly the six symbols, and `src/compiler/index.d.mts` declaring them.
- [ ] `src/compiler/cli.mjs` with `emit-ir --entrypoint --generator --out`, serialising as `JSON.stringify(ir, null, 2)` plus one newline; `make compiler-emit-ir`.
- [ ] Tests TC-331..348, including the `tsp --emit <absolute path> --option "@agent-ix/semantic-ir-emitter.generator=<id>"` parity run and the two-locale collator check.

## Deliverables

- A compiler that reproduces `spikes/typespec-feasibility/generated/custom/semantic-ir.json` byte-for-byte.

## Notes

- `tsp` refuses a relative `--emit` path; the absolute path is what works, and the option key is the emitter package name. Both were verified before the requirement was written.
- The emitted IR is the issue #4 prototype shape, not a `semantic-ir.schema.json` document (FR-041-CON-2); reconciling them is issue #19.
