---
id: Task-074
title: "TypeSpec structural lowering to contract IR 1.1.0"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-432"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-433"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-434"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-435"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-436"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-437"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-438"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-439"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-440"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-441"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-442"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-443"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-444"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-445"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-446"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-447"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-448"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-449"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-450"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-451"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-452"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-453"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-454"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-455"
    type: verifies
---
# Task-074: TypeSpec structural lowering to contract IR 1.1.0

## Scope

The lowering itself: the confined compilation host, the structural tables, fields, the envelope, ordering, and origins.

## Subtasks

- [x] `src/compiler/frontend/typespec/host.mjs`: `restrictedHost` wrapping the injected host as a TypeSpec `CompilerHost`, refusing reads outside the declared roots and JavaScript modules outside the library root and the pinned toolchain.
- [x] `src/compiler/frontend/typespec/frontend.mjs`: compile the entrypoint with `additionalImports` naming the library's absolute `main.tsp`, translate TypeSpec error diagnostics to registry codes, return a `FrontendResult`.
- [x] `src/compiler/frontend/typespec/lower.mjs`: the eight-row first-match structural-kind table, the built-in scalar table walked up the `baseScalar` chain, package-local kernel scalar definitions, `displayName`, roles, unknown policy.
- [x] Fields: multiplicity derivation and override, the optionality contradiction, presence, nullability from the union type graph, defaults, units.
- [x] Envelope: `source` and `package` blocks from the resolution and the digests, empty `occurrences`, identity ordering by code point, origins relative to the package root, generated origins for imported declarations.
- [x] Validate the emitted document under FR-050 before returning it; a fault-injected lowering returns `ir: null`.
- [x] Assert the frozen prototype path is byte-unchanged and the four issue #4 goldens still reproduce.

## Deliverables

- `host.mjs`, `frontend.mjs`, `lower.mjs`, and their tests.

## Notes

- FR-046-CON-1 is the declared reconciliation of FR-041-CON-2: the contract IR is a second lowering beside the prototype, and no golden moves.
