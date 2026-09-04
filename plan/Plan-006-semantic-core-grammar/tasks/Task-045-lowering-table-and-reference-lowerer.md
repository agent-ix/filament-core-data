---
id: Task-045
title: "Lowering table, reference lowerer, and lowered fixture"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-043"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-044"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-034"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-267"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-268"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-269"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-270"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-271"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-272"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-279"
    type: verifies
---
# Task-045: Lowering table, reference lowerer, and lowered fixture

## Scope

Write `lowering.json`, the test-scoped reference lowerer, and the lowered FR-006 document, and prove structural parity with the issue #34 fixture.

## Subtasks

- [ ] `packages/semantic-core/lowering.json`: one row per grammar-model property with `loss: none`; completeness test against `inventory.json` and a mutation that records `loss` and must fail (TC-267, TC-272).
- [ ] `test/semantic-core-lowerer.ts`: identity minting, kernel definitions with the `kernel-scalar` extension, origins from `SourceLocus`, alias-per-constrained-field, `decimal`/`identity`/`doc` extensions, relations, operations, clauses from the clause-text map, enum variants, JsonObject open record (TC-268).
- [ ] Produce `fixtures/semantic-core/positive/config-version-lowered.json`; validate as `1.1.0` with Ajv and both IR readers (TC-279); structural comparison with `fixtures/semantic/v1/positive/config-version-v1-1.json` ignoring minted identities and semantic-core extensions (TC-269).
- [ ] `UnitSymbol` charset cases (TC-270) and Decimal lowering (TC-271).

## Deliverables

- Lowering table, lowerer, lowered fixture, tests.

## Notes

- The lowerer is evidence for issue #36, not the frontend.
- Clause text comes from the fixture's clause-text map.
