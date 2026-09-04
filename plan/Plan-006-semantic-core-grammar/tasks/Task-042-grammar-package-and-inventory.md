---
id: Task-042
title: "Grammar package and inventory"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-041"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-248"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-249"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-251"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-252"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-253"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-254"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-273"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-276"
    type: verifies
---
# Task-042: Grammar package and inventory

## Scope

Author `packages/semantic-core/main.tsp`, `package.json`, `tspconfig.yaml`, and `inventory.json`, compiled with the root TypeSpec 1.15.0 toolchain.

## Subtasks

- [x] Declare the FR-031 inventory exactly: `Multiplicity`, `TypeRef`, `DecimalPolicy`, `DefaultDecl`, `FieldDecl`, the eleven `*Constraint` models and the `ConstraintDecl` union, `RelationDecl`, `OperationDecl`, `ClauseRef`, `EnumValue`, `SourceLocus`; enums `KernelScalar`, `EdgeCategory`, `ConstraintKeyword`, `DefaultKind`; scalars `Identifier`, `SemanticId`, `UnitSymbol`, `ClauseLanguage` with the FR-031 patterns.
- [x] Write `inventory.json` listing every declaration by kind and name; add the compiled-program inventory test using the compiler API (TC-249, TC-273) including a mutation run that injects `Entity` and `Any` and expects failure.
- [x] Vocabulary parity test against `schema/semantic/v1/semantic-ir.schema.json` for `EdgeCategory`, `ConstraintKeyword`, `ClauseLanguage` (TC-251).
- [x] Untyped-property scan (TC-252), package placement and no-spike-import scan (TC-254), `tspconfig.yaml` official-emitter check (TC-276).
- [x] Additivity check: add a throwaway model at a bumped minor version in a temp copy, regenerate, assert prior files byte-identical (TC-253). Add `make semantic-core-compile`.

## Deliverables

- Compiling grammar package with zero diagnostics.
- `inventory.json` and the inventory/parity/scan tests.

## Notes

- `DefaultDecl.value` is the only `unknown`-typed property, by FR-031-CON-2.
- No `@versioned`; the version is `package.json` semver.
