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
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
---
# [FR-034] Lower semantic-core declarations to IR v1.1 nodes

## Description

The semantic-core package SHALL define the lowering from one archetype
instance's declarations to IR v1.1 nodes as a table plus a test-scoped
reference lowerer, with zero declared loss, proven on the FR-006
`ConfigVersion` declarations.

## Inputs

- One archetype instance: `{ name, kind: record | enum, fields: FieldDecl[], relations: RelationDecl[], operations: OperationDecl[], clauses: ClauseRef[], enumValues: EnumValue[] }` supplied by a module
- A lowering context: the package identity `<org>/<repo>`, a `SourceLocus` per declaration, and a clause-text map `clauseId → text` (supplied by the extraction frontend in issue #36, and by the fixture author for this ticket)
- The IR v1.1 schema and both IR readers (FR-027..030, issue #34)

## Outputs

- `packages/semantic-core/lowering.json`: one row per grammar-model property (model, property, IR node, IR property, `loss`)
- `test/semantic-core-lowerer.ts`: the reference lowerer used by the tests
- `fixtures/semantic-core/positive/config-version-lowered.json`: the `contractVersion: "1.1.0"` document the lowerer produces from the FR-006 declaration set

## Behavior

- The lowerer SHALL mint identities as `ix://<org>/<repo>/type/<Name>`, `.../field/<Name>-<field>`, `.../relationship/<Name>-<verb>-<TargetName>`, `.../operation/<Name>-<name>`, `.../clause/<Name>-<clauseId>`, `.../constraint/<Name>-<field>-<keyword>`, and `.../type/<KernelScalar>` for kernel scalar definitions.
- The lowerer SHALL emit one kernel scalar type definition per `KernelScalar` member the instance uses, package-local, carrying the extension `ix://agent-ix/semantic-core/ext/kernel-scalar` (version `1.0.0`, `required: false`, payload `{ name }`) so cross-package equivalence is by kernel name.
- The lowerer SHALL set every node's `origin` from the declaration's `SourceLocus`.
- `Multiplicity` SHALL lower property-for-property to `field.multiplicity`, `relationship.multiplicity`, and `returns.multiplicity`; an absent `RelationDecl.multiplicity` lowers to `0..1` and an absent `composite` to `false`.
- `TypeRef.target` SHALL lower to `field.typeRef`: a `SemanticId` verbatim, a `KernelScalar` to that package-local kernel definition's identity.
- `TypeRef.unit` SHALL lower to `field.unit` verbatim.
- `TypeRef.decimal` SHALL lower to the extension `ix://agent-ix/semantic-core/ext/decimal` (version `1.0.0`, `required: true`, payload `{ precision, scale }`) on the field.
- `FieldDecl.nullable` SHALL lower to `field.nullable` (default `false`).
- `FieldDecl.default` SHALL lower to `defaultKind`/`defaultValue` (absent → `none`).
- `FieldDecl.identity` SHALL lower to the extension `ix://agent-ix/semantic-core/ext/identity` (version `1.0.0`, `required: false`, payload `{ identity: true }`).
- `FieldDecl.doc` and `EnumValue.doc` SHALL lower to `ix://agent-ix/semantic-core/ext/doc` (version `1.0.0`, `required: false`, payload `{ text }`).
- A `FieldDecl` with `constraints` SHALL lower its field's `typeRef` to a minted `alias` type definition `ix://<org>/<repo>/type/<Name><Field>` targeting the declared type, and each constraint to a `constraint` on that alias with `appliesTo` set to the alias identity, `diagnosticCode` `agent-ix.<repo>.<NAME>_<FIELD>_<KEYWORD>`, and the same keyword and operands.
- `RelationDecl` SHALL lower to `relationships[]` with `verb`, `category`, `composite`, `target`, and `multiplicity` verbatim.
- `OperationDecl` SHALL lower to `operations[]` with params lowered as fields, `returns` lowered with `nullable: false`, and `pre[]`/`post[]` set to the referenced `clauseId` values.
- Every `ClauseRef` reachable from the instance SHALL lower to one `clauses[]` entry with `language`, `clauseId`, `sourceSpan` when declared, `text` from the clause-text map, and origin from the span or, absent a span, a generated origin naming the lowerer.
- `EnumValue` SHALL lower to `variant` on an `enum`-kind type definition.
- `KernelScalar.JsonObject` SHALL lower to an open record definition with `unknownPolicy: preserve`.
- If a lowering row would drop a declared property, then the table SHALL record it as `loss`.
- If any lowering row records `loss`, then the fixture gate SHALL fail.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-034-CON-1 | The lowering table SHALL cover every property of every grammar model in `inventory.json`; an uncovered property fails the completeness check. | Integrity | Table-vs-program comparison |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-034-AC-1 | `lowering.json` has one row per grammar-model property, every row's `loss` is `none`, and a row recording `loss` fails the gate. | Test |
| FR-034-AC-2 | The lowered FR-006 document validates against `semantic-ir.schema.json` as `1.1.0` and both IR readers return zero diagnostics. | Test |
| FR-034-AC-3 | The lowered FR-006 document's fields (name, multiplicity, unit, nullable), relationships (verb, category, target, multiplicity), constraints (keyword, operands), and clauses (language, clauseId, text) equal those of `fixtures/semantic/v1/positive/config-version-v1-1.json` in a structural comparison that ignores minted identities and semantic-core extensions. | Test |
| FR-034-AC-4 | `UnitSymbol` rejects the empty string, `k g`, and `kg²` and accepts `kg`, `m/s`, `ms`, `10*3.m`; UCUM membership beyond the charset is a consumer concern and is not claimed. | Test |
| FR-034-AC-5 | A `Decimal` field lowers with the `decimal` extension carrying `precision` and `scale`, and the lowering table records no loss for `TypeRef.decimal`. | Test |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: extraction frontend (issue #36), `agent-ix/quire-contract-ir#53`
