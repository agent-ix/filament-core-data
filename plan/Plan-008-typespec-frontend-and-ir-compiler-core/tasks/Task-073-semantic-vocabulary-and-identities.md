---
id: Task-073
title: "Semantic decorator vocabulary and identity minting"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-053"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-412"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-413"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-414"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-415"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-416"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-417"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-418"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-419"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-420"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-421"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-422"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-423"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-424"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-425"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-426"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-427"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-428"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-429"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-430"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-431"
    type: verifies
---
# Task-073: Semantic decorator vocabulary and identity minting

## Scope

The fifteen decorators, their argument validation, and the one identity minting rule shared with FR-034.

## Subtasks

- [x] `src/compiler/frontend/typespec/lib/main.tsp` and `lib.mjs`: the fifteen `extern dec` declarations and their `$decorators` implementations, each storing into a program state map, each validating its arguments at its own locus.
- [x] `lib/package.json` declaring `AGPL-3.0-or-later`.
- [x] `src/compiler/frontend/typespec/identity.mjs`: `slug`, `mintIdentity` for each of the seven slots exactly as FR-034 mints them, `constraintDiagnosticCode`, and the `UNSLUGGABLE_NAME` collision check.
- [x] A shared identity table driving both the minting code and its test, so the FR-034 correspondence is one table rather than two lists.
- [x] `src/compiler/frontend/typespec/vocabulary.mjs`: read the state maps, apply repeatability, and raise `DUPLICATE_DECORATOR`.
- [x] Constraint lowering: the nine core decorators to the closed keywords, the minted alias for a constrained property, `appliesTo`, and the derived `diagnosticCode`.
- [x] Relationships, operations, and clauses with the FR-034 defaults; the four extensions plus `@semanticExtension`; `UNSUPPORTED_LOSS` for an enum member value.
- [x] The metamorphic rename property: renaming every declaration changes only identities and display names.

## Deliverables

- The decorator library, `identity.mjs`, `vocabulary.mjs`, and their tests.

## Notes

- SR-072 FND-620: this is where the two TypeSpec authoring surfaces are reconciled. The minting rules and the constraint-alias rule are FR-034's, rooted at the package identity.
