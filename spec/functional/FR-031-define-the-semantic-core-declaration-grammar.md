---
id: FR-031
title: "Define the semantic-core declaration grammar in TypeSpec"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
---
# [FR-031] Define the semantic-core declaration grammar in TypeSpec

## Description

The semantic-core package SHALL define the L3 declaration grammar as TypeSpec
models in namespace `AgentIx.Semantic.Core`, so that every Quire object module
imports one authoritative definition of a field, type reference, constraint,
relation, operation, clause reference, and enum value.

## Inputs

- The IR v1.1 node shapes (FR-027..030)
- The FR-040 edge vocabulary and the FR-029 closed keyword set
- The pinned TypeSpec compiler version (ADR-0005)

## Outputs

- `packages/semantic-core/main.tsp` (and sibling `.tsp` files) declaring the grammar
- A `package.json` for `@agent-ix/semantic-core` with `tspMain` and a `typespec` export, private until issue #11 publishes it
- A compiled program with zero diagnostics under the pinned compiler

## Behavior

- The package SHALL declare `Multiplicity { lower: int32; upper?: int32; ordered?: boolean; unique?: boolean }` with `lower` at least 0 and an absent `upper` meaning unbounded.
- The package SHALL declare `TypeRef { target: SemanticId | KernelScalar; multiplicity?: Multiplicity; unit?: UnitSymbol }`.
- The package SHALL declare `FieldDecl { name: Identifier; type: TypeRef; identity?: boolean; doc?: string; constraints?: ConstraintDecl[] }`.
- The package SHALL declare `ConstraintDecl` as a union discriminated on the FR-029 closed keyword set with the FR-029 typed operands per keyword.
- The package SHALL declare `RelationDecl { verb: Identifier; category: EdgeCategory; composite?: boolean; target: SemanticId; multiplicity?: Multiplicity }` where `EdgeCategory` is the seven-value FR-040 enumeration.
- The package SHALL declare `OperationDecl { name: Identifier; params: FieldDecl[]; returns?: TypeRef; pre?: ClauseRef[]; post?: ClauseRef[] }`.
- The package SHALL declare `ClauseRef { language: ClauseLanguage; clauseId: Identifier; sourceSpan: SourceLocus }` where `ClauseLanguage` admits `ocl`, `sysml`, `fretish`, or a namespaced `<ns>:<name>` string.
- The package SHALL declare `EnumValue { value: Identifier; doc?: string }`.
- The package SHALL declare `Identifier`, `SemanticId`, `UnitSymbol`, and `SourceLocus` as the scalars and model those declarations bottom out in, with `SemanticId` and `UnitSymbol` pattern-constrained.
- The package SHALL carry a `@versioned` `Versions` enum so a later grammar addition is an additive package version.
- The compiled package SHALL produce zero TypeSpec diagnostics under the pinned compiler.
- The package SHALL NOT declare any module vocabulary (`Entity`, `Endpoint`, `Process`, `Requirement`, or any other domain archetype).

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-031-CON-1 | The grammar SHALL live under `packages/semantic-core/` in this repository, separate from `spikes/`, which never imports it. | Integrity | Changed-path and import inspection |
| FR-031-CON-2 | Every model property SHALL bottom out in a kernel scalar, a declared model, or `SemanticId`, never in `unknown`, `Record<unknown>`, or an untyped `object`. | Integrity | Static scan of the compiled program |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-031-AC-1 | `tsp compile packages/semantic-core` under the pinned compiler exits 0 with zero diagnostics. | Test |
| FR-031-AC-2 | The compiled program declares exactly the nine grammar models (`Multiplicity`, `TypeRef`, `FieldDecl`, `ConstraintDecl`, `RelationDecl`, `OperationDecl`, `ClauseRef`, `EnumValue`, `KernelScalar`) plus the four support scalars/models, and no model named after a domain archetype. | Test |
| FR-031-AC-3 | `ConstraintDecl` admits exactly the eleven FR-029 keywords and rejects a twelfth in the emitted schema. | Test |
| FR-031-AC-4 | `RelationDecl.category` admits exactly the seven FR-040 categories. | Test |
| FR-031-AC-5 | No property in the compiled program resolves to `unknown` or an untyped record. | Test |
| FR-031-AC-6 | A grammar addition under a new `Versions` member compiles and the prior version's emitted schema is unchanged. | Test |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-033](./FR-033-emit-semantic-core-json-schema.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), Quoin issue #293, module tickets
