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
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
---
# [FR-031] Define the semantic-core declaration grammar in TypeSpec

## Description

The semantic-core package SHALL define the L3 declaration grammar as TypeSpec
declarations in namespace `AgentIx.Semantic.Core`, so that every Quire object
module imports one authoritative definition of a field, type reference,
constraint, relation, operation, clause reference, and enum value.

## Inputs

- The IR node shapes (FR-027..030) and the IR `common.schema.json` patterns for `semanticIdentity` and `sourceLocus`
- The FR-040 edge categories, the FR-029 closed keyword set, and the FR-028 clause languages
- The pinned TypeSpec compiler (`@typespec/compiler` 1.15.0, ADR-0005)

## Outputs

- `packages/semantic-core/main.tsp` declaring the grammar, plus `package.json` (`@agent-ix/semantic-core`, `tspMain`, `publishConfig` for the internal registry) and `tspconfig.yaml`
- `packages/semantic-core/inventory.json`: the exact allowed declaration inventory below, used by the kernel scope test
- A compiled program with zero diagnostics under the pinned compiler

## Behavior

- The package SHALL declare exactly this inventory and nothing else: grammar models `Multiplicity`, `TypeRef`, `DecimalPolicy`, `DefaultDecl`, `FieldDecl`, `ConstraintDecl` (as a union of the eleven per-keyword models `MinConstraint`, `MaxConstraint`, `ExclusiveMinConstraint`, `ExclusiveMaxConstraint`, `PatternConstraint`, `MinLengthConstraint`, `MaxLengthConstraint`, `EnumValuesConstraint`, `NonEmptyConstraint`, `UniqueConstraint`, `FormatConstraint`), `RelationDecl`, `OperationDecl`, `ClauseRef`, `EnumValue`, `SourceLocus`; enums `KernelScalar`, `EdgeCategory`, `ConstraintKeyword`, `DefaultKind`; scalars `Identifier`, `SemanticId`, `UnitSymbol`, `ClauseLanguage`.
- `Multiplicity` SHALL be `{ lower: int32; upper?: int32; ordered?: boolean; unique?: boolean }` with `@minValue(0)` on both bounds; an absent `upper` means unbounded.
- `TypeRef` SHALL be `{ target: SemanticId | KernelScalar; multiplicity?: Multiplicity; unit?: UnitSymbol; decimal?: DecimalPolicy }` where `DecimalPolicy` is `{ precision: int32; scale: int32 }`.
- `FieldDecl` SHALL be `{ name: Identifier; type: TypeRef; identity?: boolean; nullable?: boolean; default?: DefaultDecl; doc?: string; constraints?: ConstraintDecl[] }` where `DefaultDecl` is `{ kind: DefaultKind; value?: unknown }` and `DefaultKind` enumerates `semantic`, `representation`, `migration`.
- Each per-keyword constraint model SHALL carry `keyword: ConstraintKeyword.<member>` and exactly the FR-029 operands for that keyword, so the emitted schema closes both the keyword set and each operand shape.
- `RelationDecl` SHALL be `{ verb: Identifier; category: EdgeCategory; composite?: boolean; target: SemanticId; multiplicity?: Multiplicity }`.
- `OperationDecl` SHALL be `{ name: Identifier; params: FieldDecl[]; returns?: TypeRef; pre?: ClauseRef[]; post?: ClauseRef[] }`.
- `ClauseRef` SHALL be `{ language: ClauseLanguage; clauseId: Identifier; sourceSpan?: SourceLocus }`.
- `EnumValue` SHALL be `{ value: Identifier; doc?: string }`.
- `SemanticId` SHALL carry the IR `semanticIdentity` pattern (`^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$`).
- `SourceLocus` SHALL have the IR `sourceLocus` shape (`sourceIdentity`, `path`, `startLine`, `startColumn`, `endLine?`, `endColumn?`).
- `Identifier` SHALL carry the pattern `^[A-Za-z_][A-Za-z0-9_]*$`.
- `UnitSymbol` SHALL carry the UCUM case-sensitive symbol charset pattern `^[!-~]+$` (printable ASCII, no whitespace).
- `ClauseLanguage` SHALL carry the pattern `^(quire|ocl|sysml|fretish|[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*)$`.
- `EdgeCategory`, `ConstraintKeyword`, and `ClauseLanguage` SHALL equal the IR schema's `relationship.category`, `constraint.keyword`, and clause-language sets respectively.
- The package SHALL carry its version in `package.json` as semver, where a grammar addition is a minor version and a removal a major version.
- The package SHALL be publishable to the internal registry (`publishConfig.registry`) and SHALL NOT be marked `private`, because the Quire object modules resolve `@agent-ix/semantic-core` as a versioned dependency rather than a repository path; FR-031-CON-1 governs where the grammar lives and who imports it, not whether it ships.
- The compiled package SHALL produce zero TypeSpec diagnostics under the pinned compiler.
- The package SHALL NOT declare a domain archetype (`Entity`, `Endpoint`, `Process`, `Requirement`, or any other module vocabulary) or an `Any`/`Unknown` scalar.

### Grammar rules the reader enforces

JSON Schema 2020-12 cannot express cross-property rules, so the semantic-core
reader (a test-scoped module beside the IR reader) SHALL enforce them and each
rule SHALL have a negative fixture:

- `Multiplicity.upper` SHALL be at least `lower`.
- `ordered`/`unique` SHALL appear only when `upper` is absent or greater than 1.
- A `TypeRef` whose `target` is `KernelScalar.Decimal` SHALL carry `decimal`.
- A `TypeRef` whose `target` is not `KernelScalar.Decimal` SHALL NOT carry `decimal`.
- `TypeRef.unit` SHALL appear only when `target` is a `KernelScalar` other than `Boolean`, `Bytes`, `JsonObject`, `String`, `UUID`.
- `OperationDecl.returns` SHALL NOT carry `unit`.
- Within one declaration set, `FieldDecl` and `OperationDecl` SHALL be unique by `name`, `params` by `name`, `RelationDecl` by (`verb`, `target`), `EnumValue` by `value`, and `ClauseRef` by `clauseId`, where a `clauseId` shared between `pre` and `post` names one clause.
- `FieldDecl.identity: true` SHALL appear only on a field whose multiplicity is `1..1` and whose target is not `JsonObject`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-031-CON-1 | The grammar SHALL live under `packages/semantic-core/` in this repository, compiled with the root-installed TypeSpec toolchain, separate from `spikes/`, which never imports it. | Integrity | Changed-path and import inspection |
| FR-031-CON-2 | Every model property SHALL bottom out in a kernel scalar, a declared model, or `SemanticId`, never in `unknown`, `Record<unknown>`, or an untyped `object`, with the single exception of `DefaultDecl.value`, whose shape the target scalar decides. | Integrity | Static scan of the compiled program |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-031-AC-1 | `pnpm exec tsp compile packages/semantic-core` under the pinned compiler exits 0 with zero diagnostics. | Test |
| FR-031-AC-2 | The compiled program's declaration set equals `inventory.json` exactly; adding `Entity` or `Any` to the source makes the scope test fail naming the declaration. | Test |
| FR-031-AC-3 | `ConstraintKeyword` and the eleven constraint models match the FR-029 keyword set and operand shapes, and the emitted schema rejects a twelfth keyword. | Test |
| FR-031-AC-4 | `EdgeCategory`, `ConstraintKeyword`, and `ClauseLanguage` equal the IR schema's enumerations in a contract test. | Test |
| FR-031-AC-5 | No property in the compiled program resolves to `unknown` or an untyped record except `DefaultDecl.value`. | Analysis |
| FR-031-AC-6 | Adding one model at a new minor version changes only that model's emitted file and the bundle index; every previously emitted file is byte-identical. | Test |
| FR-031-AC-7 | Each reader-enforced grammar rule has one negative fixture the reader rejects at the declaration's locus, and the FR-006 declaration set reads clean. | Test |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-033](./FR-033-emit-semantic-core-json-schema.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), Quoin issue #293, module tickets
