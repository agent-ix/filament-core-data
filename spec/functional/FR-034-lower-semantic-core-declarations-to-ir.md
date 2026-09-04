---
id: FR-034
title: "Lower semantic-core declarations to IR v1.1 nodes"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
---
# [FR-034] Lower semantic-core declarations to IR v1.1 nodes

## Description

The specification SHALL define one lowering table from every semantic-core
grammar model to its IR v1.1 node with zero declared loss, and a fixture SHALL
prove it on the FR-006 `ConfigVersion` declarations.

## Inputs

- A `FieldDecl[]`, `RelationDecl[]`, `OperationDecl[]`, and `ClauseRef[]` set for one archetype instance
- The IR v1.1 schema and reader rules (FR-027..030)

## Outputs

- `packages/semantic-core/lowering.json`: model → IR node, property → property, with an explicit `loss` column that is `none` for every row
- A lowered `contractVersion: "1.1.0"` document for the FR-006 fixture that validates and reads clean

## Behavior

- `Multiplicity` SHALL lower to `field.multiplicity` (and `relationship.multiplicity`, `returns.multiplicity`) property-for-property.
- `TypeRef.target` SHALL lower to `field.typeRef`: a `SemanticId` becomes the identity, and a `KernelScalar` becomes the identity of a kernel scalar type definition in the package.
- `TypeRef.unit` SHALL lower to `field.unit`.
- The `UnitSymbol` pattern SHALL accept only case-sensitive UCUM unit symbols.
- `FieldDecl.identity` SHALL lower to a namespaced `agent-ix:identity` extension on the field.
- `FieldDecl.doc` SHALL lower to the field's documentation extension.
- `ConstraintDecl` SHALL lower to `constraint` with `appliesTo` set to the field's type identity and the same keyword and operands.
- `RelationDecl` SHALL lower to `relationships[]` with `composite` defaulting to `false` and `multiplicity` defaulting to `0..1`.
- `OperationDecl` SHALL lower to `operations[]`.
- `ClauseRef.clauseId` values in `pre`/`post` SHALL lower to the operation's `pre[]`/`post[]`, with the referenced clauses lowered to `clauses[]` and their `text` supplied by the extractor.
- `EnumValue` SHALL lower to `variant` on an `enum`-kind type definition.
- `KernelScalar.Decimal` SHALL lower to `scalar: number` with the `decimal` extension.
- `KernelScalar.JsonObject` SHALL lower to an open record with `unknownPolicy: preserve`.
- If a lowering row would drop a declared property, then the table SHALL record it as `loss`.
- If any lowering row records `loss`, then the fixture gate SHALL fail.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-034-CON-1 | The lowering table SHALL cover every property of every grammar model; an uncovered property fails the completeness check. | Integrity | Table-vs-program comparison |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-034-AC-1 | `lowering.json` has one row per grammar-model property and every row's `loss` is `none`. | Test |
| FR-034-AC-2 | The lowered FR-006 document validates against `semantic-ir.schema.json` as `1.1.0` and both IR readers return zero diagnostics. | Test |
| FR-034-AC-3 | The lowered FR-006 document equals `fixtures/semantic/v1/positive/config-version-v1-1.json` in normalized form, except for the `agent-ix:identity` and documentation extensions the grammar adds. | Test |
| FR-034-AC-4 | A `TypeRef.unit` of `Kg` (wrong case) or `kilograms` fails the `UnitSymbol` pattern; `kg`, `m/s`, and `ms` pass. | Test |
| FR-034-AC-5 | A `Decimal` lowering carries `precision` and `scale` in the extension and nothing else about the declaration is dropped. | Test |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: extraction frontend (issue #36), `agent-ix/quire-contract-ir#53`
