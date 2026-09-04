---
id: FR-046
title: "Lower a TypeSpec program to contract semantic IR 1.1.0"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
---
# [FR-046] Lower a TypeSpec program to contract semantic IR 1.1.0

## Description

The `typespec` frontend SHALL lower a compiled TypeSpec program and its package
manifest into one semantic IR document valid against
`schema/semantic/v1/semantic-ir.schema.json` at `contractVersion` `1.1.0`, so
that every IR value is carried by a declaration in the source or by the manifest
and none is inferred from a type's spelling.

## Inputs

- A TypeSpec entrypoint beneath a package root, compiled with the pinned `@typespec/compiler` 1.15.0
- The package manifest resolved by FR-047, supplying package identity, version, source roots, exports, mapping and profile versions, and the lock digest
- The Agent IX semantic decorator library `AgentIx.Semantic.Decorators`, declared in `src/compiler/frontend/typespec/lib/main.tsp` and implemented in `src/compiler/frontend/typespec/lib/lib.mjs`

## Outputs

- `src/compiler/frontend/typespec/lib/main.tsp` and `lib.mjs`: the `extern dec` declarations and their implementations, imported by a package's TypeSpec sources by relative path
- `src/compiler/frontend/typespec/frontend.mjs`: the `typespec` frontend, returning a `FrontendResult`
- `src/compiler/frontend/typespec/lower.mjs`: the pure lowering from a compiled `Program` plus a resolved package to an IR document
- An IR document whose `contractVersion` is `1.1.0` and whose `source.dialect` is `typespec`

## Behavior

### Decorator vocabulary

- The library SHALL declare exactly these decorators and no others: `@semanticIdentity`, `@role`, `@unknownPolicy`, `@unit`, `@multiplicity`, `@collection`, `@defaultKind`, `@relationship`, `@operations`, `@pre`, `@post`, `@clause`, and `@semanticReference`.
- `@role`, `@relationship`, `@clause`, `@pre`, and `@post` SHALL be repeatable; every other decorator SHALL be single-valued and a second application SHALL raise the diagnostic `agent-ix.compiler.DUPLICATE_DECORATOR` at the second application's locus.

### Identity

- The frontend SHALL derive a declaration's identity as `ix://<package identity>/<slot>/<name>`, where `<slot>` is `type` for a type declaration, `field` for a model property, `variant` for an enum member or union variant, `relationship`, `operation`, `clause`, or `constraint`, and `<name>` is the declaration's own name qualified by its owning declaration's name with a `.` separator for every slot except `type`.
- Where `@semanticIdentity` is applied, the frontend SHALL use its argument verbatim in place of the derived identity.
- If two declarations resolve to the same identity, then the frontend SHALL raise `agent-ix.compiler.DUPLICATE_IDENTITY` at the second declaration's locus, naming the first declaration's locus as a related locus.

### Structural kind

- The frontend SHALL classify each declaration in the package's namespace exactly once, by this closed table:

| TypeSpec declaration | IR `kind` | Additional IR members |
|---|---|---|
| `scalar X extends <built-in>` | `scalar` | `scalar` from the built-in mapping |
| `scalar X extends Y`, `Y` declared in the package | `alias` | `target` = identity of `Y` |
| `model X { … }` with properties and no indexer | `record` | `fields` |
| `model X is Array<T>` / `T[]` (integer indexer) | `sequence` | `items` = identity of `T` |
| `model X is Record<T>` (string indexer) | `map` | `values` = identity of `T` |
| `enum X { … }` | `enum` | `variants`, one per member, no `payloadType` |
| `union X { … }` | `union` | `variants`, one per variant, `payloadType` = identity of the variant type |
| `model X {}` carrying `@semanticReference(<identity>)` | `reference` | `target` = the decorator's argument |

- The built-in scalar mapping SHALL be the closed table `boolean→boolean`, `int8|int16|int32|int64|integer|safeint|uint8|uint16|uint32|uint64→integer`, `float32|float64|float|decimal|decimal128|numeric→number`, `string|url→string`, `bytes→bytes`, `plainDate→date`, `utcDateTime|offsetDateTime|plainTime→datetime`, `duration→duration`.
- If a declaration's built-in base is outside that table, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_SCALAR_BASE` at the declaration's locus and SHALL NOT substitute a nearest match.
- If a declaration matches no row of the classification table, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_DECLARATION` at its locus.

### Roles and unknown policy

- The frontend SHALL set `roles` to the sorted, de-duplicated arguments of the declaration's `@role` applications, and to the empty array where there is none.
- The frontend SHALL set `unknownPolicy` to the argument of `@unknownPolicy`, and to `reject` where there is none.
- The frontend SHALL NOT derive a role from a declaration's name, namespace, or property names.

### Fields, multiplicity, presence, nullability, defaults, units

- The frontend SHALL derive a field's `multiplicity` as `{ lower: 0 }` when the property type is a collection and the property is optional, `{ lower: 1 }` when it is a collection and required, `{ lower: 0, upper: 1 }` when it is single-valued and optional, and `{ lower: 1, upper: 1 }` when it is single-valued and required.
- Where `@collection(ordered, unique)` is applied to a collection-typed property, the frontend SHALL set `multiplicity.ordered` and `multiplicity.unique` from its arguments; where it is applied to a single-valued property, the frontend SHALL raise `agent-ix.compiler.FLAGS_ON_NON_COLLECTION` at the decorator's locus.
- Where `@multiplicity(lower, upper?)` is applied, the frontend SHALL use its arguments in place of the derived bounds; if `upper` is present and less than `lower`, then the frontend SHALL raise `agent-ix.compiler.INVALID_MULTIPLICITY` at the decorator's locus.
- The frontend SHALL set `presence` to `required` when `multiplicity.lower >= 1` and to `optional` otherwise.
- The frontend SHALL set `nullable` to `true` if and only if the property's declared type is a union one of whose variants is the TypeSpec intrinsic `null`, and SHALL NOT read the spelling of a type name to decide it.
- The frontend SHALL set `defaultKind` to `none` and omit `defaultValue` where the property declares no TypeSpec default; where it declares one, the frontend SHALL set `defaultValue` to that value and `defaultKind` to `semantic`, or to the argument of `@defaultKind` where one is applied.
- If `@defaultKind` is applied to a property with no TypeSpec default, then the frontend SHALL raise `agent-ix.compiler.DEFAULT_KIND_WITHOUT_VALUE` at the decorator's locus.
- The frontend SHALL set `unit` from `@unit` and SHALL raise `agent-ix.compiler.UNIT_ON_NON_SCALAR` at the decorator's locus where the field's `typeRef` does not resolve, through aliases, to a `scalar` definition.
- If a property's type is not a declaration in the package or in a lock export, then the frontend SHALL raise `agent-ix.compiler.UNRESOLVED_TYPE_REF` at the property's locus.

### Constraints

- The frontend SHALL lower exactly the TypeSpec core constraint decorators `@minValue`, `@maxValue`, `@minValueExclusive`, `@maxValueExclusive`, `@pattern`, `@minLength`, `@maxLength`, `@minItems`, and `@format` to the closed IR keywords `min`, `max`, `exclusiveMin`, `exclusiveMax`, `pattern`, `minLength`, `maxLength`, `nonEmpty`, and `format`, and SHALL lower an `enum`-typed constraint declaration to `enumValues` and a `@collection(unique: true)` application to `unique`.
- The frontend SHALL derive each constraint identity as `ix://<package identity>/constraint/<owner slug>-<keyword slug>`, where the owner slug is the owning declaration's identity tail with `.` replaced by `-` and the keyword slug is the IR keyword in kebab case.
- The frontend SHALL derive each constraint's `diagnosticCode` as `agent-ix.<package name>.<OWNER>_<KEYWORD>` in upper snake case, matching the `diagnostic.code` pattern of `common.schema.json`.
- If a constraint's keyword is not applicable to its resolved subject under the FR-029 applicability table, then the frontend SHALL raise `agent-ix.compiler.CONSTRAINT_NOT_APPLICABLE` at the decorator's locus rather than emitting the constraint.

### Relationships, operations, and clauses

- The frontend SHALL lower each `@relationship(verb, category, target, lower, upper?, composite?)` on a `record` declaration to one IR relationship, with `composite` defaulting to `false` and multiplicity defaulting to `{ lower: 0, upper: 1 }`.
- If `@relationship` is applied to a declaration whose kind is not `record`, then the frontend SHALL raise `agent-ix.compiler.NODES_ON_NON_RECORD` at the decorator's locus.
- The frontend SHALL lower each TypeSpec `op` declared in an interface carrying `@operations(<record>)` to one IR operation of that record, with `params` lowered as fields, `returns` lowered as `{ typeRef, multiplicity, nullable }`, and `pre`/`post` taken from the `@pre` and `@post` applications on the `op`.
- The frontend SHALL lower each `@clause(language, clauseId, text)` to one IR clause carrying a `sourceSpan` at the decorator's locus, and SHALL NOT parse `text`.
- If a `@pre` or `@post` argument names a `clauseId` the owning record does not declare, then the frontend SHALL raise `agent-ix.compiler.DANGLING_CLAUSE_REF` at the decorator's locus.

### Envelope, ordering, and origins

- The frontend SHALL set `source.identity` to `ix://<package identity>/source/typespec`, `source.version` to the package version, `source.dialect` to `typespec`, and `source.digest` to the SHA-256 of the package's source bytes under the canonicalization of FR-048.
- The frontend SHALL set the `package` block from the resolved package: `identity`, `version`, `manifestDigest`, `mappingVersions`, `profileVersions`, and `lockDigest`.
- The frontend SHALL emit `occurrences` as the empty array; occurrences are authored data, never compiled output.
- The frontend SHALL order `types` by `identity`, and every `fields`, `variants`, `constraints`, `relationships`, `operations`, `clauses`, and `extensions` array by `identity`, under a locale-independent code-point comparison.
- The frontend SHALL record every `origin` as `{ source: { sourceIdentity, path, startLine, startColumn } }`, where `path` is the declaration's file relative to the package root with `/` separators, and SHALL raise `agent-ix.compiler.SOURCE_OUTSIDE_PACKAGE` where the file does not lie beneath the package root.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-046-CON-1 | The prototype IR of FR-041 — `schemaVersion` `1.0.0`, the `{schemaVersion, generator, types}` envelope, and its `role`/`nullable` heuristics — SHALL remain exactly as promoted. This requirement adds a second, separate lowering; it does not edit `src/compiler/ir.mjs`, and the four issue #4 goldens are not regenerated. FR-041-CON-1 is therefore satisfied, and FR-041-CON-2's reconciliation is discharged by the contract path existing rather than by changing the prototype. | Compatibility | Golden comparison |
| FR-046-CON-2 | No IR value SHALL be derived from a declaration's name, namespace, or file path. Every `role`, `nullable`, `unit`, `unknownPolicy`, `composite`, and relationship value comes from a decorator or from the closed structural tables above. | Correctness | Test and static analysis |
| FR-046-CON-3 | The decorator library SHALL be imported by relative path from a package's TypeSpec sources; it SHALL NOT be added to `package.json` and SHALL NOT be resolved through a `file:` or `link:` specifier. | Maintainability | Dependency inspection |
| FR-046-CON-4 | The frontend SHALL import only `@typespec/compiler` and `@typespec/versioning` from the pinned toolchain, and no target-facing TypeSpec library. | Portability | Static analysis |
| FR-046-CON-5 | Every manifest the frontend adds SHALL declare `"license": "AGPL-3.0-only"`. | Legal | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-046-AC-1 | The IR produced for the `fixtures/compiler/packages/assurance` package validates against `semantic-ir.schema.json` with `contractVersion` `1.1.0` and `source.dialect` `typespec`, and produces zero diagnostics from the FR-050 reader. | Test |
| FR-046-AC-2 | Every row of the structural-kind table is exercised by a declaration in the fixture package and yields the stated `kind` and additional members. | Test |
| FR-046-AC-3 | Every row of the built-in scalar mapping yields the stated IR `scalar`, and a declaration extending an unmapped built-in raises `UNSUPPORTED_SCALAR_BASE` at its locus. | Test |
| FR-046-AC-4 | A record named `AuditEvent` with no `@role` has `roles: []`, and a record named `Thing` with `@role("agent-ix:event")` has `roles: ["agent-ix:event"]`; neither value depends on the name. | Test |
| FR-046-AC-5 | A property typed `Text \| null` is `nullable: true` and a property typed `NullableText` (a declared alias of `Text`) is `nullable: false`, proving nullability is read from the type graph and not from the spelling. | Test |
| FR-046-AC-6 | The four multiplicity derivations (collection/single × optional/required) and the `@multiplicity` override each produce the stated bounds, and `presence` is derived from `lower` in every case. | Test |
| FR-046-AC-7 | `@collection` on a single-valued property raises `FLAGS_ON_NON_COLLECTION`, and `@multiplicity(2, 1)` raises `INVALID_MULTIPLICITY`, each at the decorator's line and column. | Test |
| FR-046-AC-8 | `@unit("s")` on a field resolving through an alias to a scalar is emitted; `@unit("s")` on a field resolving to a record raises `UNIT_ON_NON_SCALAR` at the decorator's locus. | Test |
| FR-046-AC-9 | A property with a TypeSpec default emits `defaultKind: "semantic"` and that `defaultValue`; `@defaultKind("migration")` overrides the kind; `@defaultKind` without a default raises `DEFAULT_KIND_WITHOUT_VALUE`. | Test |
| FR-046-AC-10 | Each of the nine mapped core constraint decorators produces the stated keyword with typed operands, and the derived constraint identity and `diagnosticCode` match the documented derivations for a worked example. | Test |
| FR-046-AC-11 | `@maxLength` on a numeric scalar raises `CONSTRAINT_NOT_APPLICABLE` at the decorator's locus and emits no constraint. | Test |
| FR-046-AC-12 | Relationships, operations, and clauses lower with the stated defaults; `@relationship` on an enum raises `NODES_ON_NON_RECORD`; a `@pre` naming an undeclared `clauseId` raises `DANGLING_CLAUSE_REF`. | Test |
| FR-046-AC-13 | Two declarations resolving to the same identity raise `DUPLICATE_IDENTITY` at the second locus with the first as a related locus. | Test |
| FR-046-AC-14 | Every array in the emitted document is sorted by `identity` under code-point comparison, and the order is unchanged when compared against `Intl.Collator` orderings for at least two distinct locales. | Test |
| FR-046-AC-15 | `src/compiler/ir.mjs` is byte-unchanged from `origin/main`, and the four committed issue #4 goldens are byte-unchanged. | Analysis |
| FR-046-AC-16 | No file under `src/compiler/frontend/typespec/` imports a target-facing TypeSpec library, `package.json` gains no dependency, and every added manifest declares `AGPL-3.0-only`. | Analysis |
| FR-046-AC-17 | A declaration whose source file lies outside the package root raises `SOURCE_OUTSIDE_PACKAGE`, and every emitted `origin.source.path` is relative, `/`-separated, and free of `..`. | Test |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-041](./FR-041-promote-the-semantic-ir-emitter.md)
- **Downstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), issues #21, #22, #23
