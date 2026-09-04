---
id: Task-062
title: "TypeScript and Rust generation backends"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-061"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-042"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-349"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-350"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-351"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-352"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-353"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-354"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-355"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-356"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-357"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-358"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-359"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-360"
    type: verifies
---
# Task-062: TypeScript and Rust generation backends

## Scope

Promote the two hand-rolled generators as pure functions from IR to source text.

## Subtasks

- [ ] `src/compiler/backends/typescript.mjs` exporting `emitTypeScript(ir)`.
- [ ] `src/compiler/backends/rust.mjs` exporting `emitRust(ir)`.
- [ ] Add the missing-base guard to both backends and the base-chain cycle guard to `emitRust`; these are the only behavioural additions, and the goldens must still match byte-for-byte.
- [ ] Golden comparisons against the committed `typescript/index.ts` and `rust/src/lib.rs` (TC-349, TC-350).
- [ ] Purity assertions: repeat-call identity plus no filesystem, environment, clock, or network access (TC-351, TC-352).
- [ ] Rendering assertions: `#[serde(rename)]`, enum unions, `Option<…>` and `?` (TC-355..357).

## Deliverables

- Two pure backends whose output equals the committed issue #4 bytes.

## Notes

- Both backends rewrite the strings `getTypeName` renders. FR-042-CON-5 records that a compiler upgrade can therefore change output while the IR test still passes; both golden comparisons are part of any version bump.
