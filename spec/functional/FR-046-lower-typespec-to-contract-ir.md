---
id: FR-046
title: "Lower a TypeSpec program to contract semantic IR 1.1.0"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-053"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-046] Lower a TypeSpec program to contract semantic IR 1.1.0

## Description

The `typespec` frontend SHALL lower a compiled TypeSpec program and its resolved
package into one semantic IR document valid against
`schema/semantic/v1/semantic-ir.schema.json` at `contractVersion` `1.1.0`, so
that every structural value in the document is carried by a declaration in the
source or by the manifest and none is inferred from a type's spelling.

## Inputs

- A `FrontendRequest` from FR-045, carrying the resolved package, the entrypoint, the limits, and the injected host
- The pinned `@typespec/compiler` 1.15.0 and `@typespec/versioning` 0.85.0 toolchain
- The semantic vocabulary and identity minting of FR-053

## Outputs

- `src/compiler/frontend/typespec/frontend.mjs`: the `typespec` frontend, returning a `FrontendResult`
- `src/compiler/frontend/typespec/host.mjs`: `restrictedHost({ host, roots, libraryRoot })`, the TypeSpec `CompilerHost` the frontend compiles through
- `src/compiler/frontend/typespec/lower.mjs`: the pure lowering from a compiled `Program` plus a resolved package to an IR document
- `test/fixtures/compiler/packages/**`: the TypeSpec package corpus every criterion below is exercised on, including the `assurance` package that covers every row of the structural-kind table
- An IR document whose `contractVersion` is `1.1.0` and whose `source.dialect` is `typespec`

## Behavior

### Compilation host

- The frontend SHALL compile the entrypoint through `restrictedHost`, which delegates to the injected host and refuses any read whose real path lies outside the package root, the declared search directories, the library root, and the pinned toolchain's own installation.
- If a read is refused, then the frontend SHALL raise `agent-ix.compiler.PATH_ESCAPE` naming the package-root-relative request.
- If the program requests a JavaScript module whose real path lies outside the library root and the pinned toolchain's installation, then `restrictedHost` SHALL refuse it and the frontend SHALL raise `agent-ix.compiler.UNTRUSTED_MODULE` at the importing statement's locus.
- If TypeSpec reports an error diagnostic, then the frontend SHALL return those diagnostics translated to registry codes and `ir: null`.

### Structural kind

- The frontend SHALL classify each named declaration in the package's namespace exactly once, by this closed table, applying the first row that matches:

| # | TypeSpec declaration | IR `kind` | Additional IR members |
|---|---|---|---|
| 1 | `model X {}` carrying `@semanticReference` | `reference` | `target` = the decorator's argument |
| 2 | `scalar X extends Y`, `Y` declared in the package | `alias` | `target` = identity of `Y` |
| 3 | `scalar X extends <built-in>` | `scalar` | `scalar` from the built-in mapping |
| 4 | `model X` with an integer indexer | `sequence` | `items` = identity of the indexer value |
| 5 | `model X` with a string indexer | `map` | `values` = identity of the indexer value |
| 6 | `model X { … }` with properties and no indexer | `record` | `fields` |
| 7 | `enum X { … }` | `enum` | `variants`, one per member, no `payloadType` |
| 8 | `union X { … }` | `union` | `variants`, one per variant, `payloadType` = identity of the variant type |

- If `@semanticReference` is applied to a model that declares a property or an indexer, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_DECLARATION` at the model's locus.
- The built-in scalar mapping SHALL be the closed table `boolean→boolean`, `int8|int16|int32|int64|integer|safeint|uint8|uint16|uint32|uint64→integer`, `float32|float64|float|decimal|decimal128|numeric→number`, `string|url→string`, `bytes→bytes`, `plainDate→date`, `utcDateTime|offsetDateTime|plainTime→datetime`, `duration→duration`, resolved by walking the declaration's `baseScalar` chain and taking the first name the table names.
- If a declaration's built-in base is outside that table, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_SCALAR_BASE` at the declaration's locus and SHALL NOT substitute a nearest match.
- If a declaration matches no row of the classification table, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_DECLARATION` at its locus.
- Where a field, indexer, variant, or operation parameter is typed by a TypeSpec built-in scalar directly, the frontend SHALL emit one package-local kernel scalar definition `ix://<package identity>/type/<KernelScalar>` carrying the extension `ix://agent-ix/semantic-core/ext/kernel-scalar` (version `1.0.0`, `required: false`, payload `{ name }`), matching FR-034, and SHALL reference it.
- The kernel scalar names are those FR-032 closes: `boolean` lowers to `Boolean`, `integer` to `Integer`, `number` to `Decimal`, `string` to `String`, `bytes` to `Bytes`, `datetime` to `Timestamp`, `duration` to `Duration`, and `uuid` to `UUID`.
- No TypeSpec built-in maps to `uuid` or to `JsonObject`, so those two rows are unreachable from this frontend and the table records them as such; `JsonObject` is a record in the IR rather than a scalar, and FR-034 lowers it in the semantic-core path.
- If a built-in with no kernel scalar — `plainDate`, whose IR scalar is `date` — is used directly as a member type, then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_SCALAR_BASE` naming the absent kernel scalar, because a package-local definition it cannot name is not a definition; declaring a package scalar over it remains available and lowers normally.

### Roles, unknown policy, and fields

- The frontend SHALL set `displayName` to the declaration's own TypeSpec name, unqualified by its namespace.
- The frontend SHALL set `roles` to the sorted, de-duplicated arguments of the declaration's `@role` applications, and to the empty array where there is none.
- The frontend SHALL set `unknownPolicy` to the argument of `@unknownPolicy`, and to `reject` where there is none.
- The frontend SHALL derive a field's `multiplicity` as `{ lower: 0 }` when the property type is a collection and the property is optional, `{ lower: 1 }` when it is a collection and required, `{ lower: 0, upper: 1 }` when it is single-valued and optional, and `{ lower: 1, upper: 1 }` when it is single-valued and required.
- Where `@collection(ordered, unique)` is applied to a collection-typed property, the frontend SHALL set `multiplicity.ordered` and `multiplicity.unique` from its arguments.
- If `@collection` is applied to a single-valued property, then the frontend SHALL raise `agent-ix.semantic-ir.FLAGS_ON_NON_COLLECTION` at the decorator's locus.
- Where `@multiplicity(lower, upper?)` is applied, the frontend SHALL use its arguments in place of the derived bounds.
- If `@multiplicity` declares `lower >= 1` on an optional property, or `lower = 0` on a required one, then the frontend SHALL raise `agent-ix.compiler.MULTIPLICITY_CONTRADICTS_OPTIONALITY` at the decorator's locus rather than choosing one of the two.
- If `@multiplicity` declares `upper < lower`, then the frontend SHALL raise `agent-ix.semantic-ir.INVALID_MULTIPLICITY` at the decorator's locus.
- The frontend SHALL set `presence` to `required` when `multiplicity.lower >= 1` and to `optional` otherwise.
- The frontend SHALL set `nullable` to `true` if and only if the property's declared type is a union one of whose variants is the TypeSpec intrinsic `null`, and SHALL NOT read the spelling of a type name to decide it.
- The frontend SHALL set `defaultKind` to `none` and omit `defaultValue` where the property declares no TypeSpec default.
- Where a property declares a TypeSpec default, the frontend SHALL set `defaultValue` to that value and `defaultKind` to `semantic`, or to the argument of `@defaultKind` where one is applied.
- If `@defaultKind` is applied to a property with no TypeSpec default, then the frontend SHALL raise `agent-ix.compiler.DEFAULT_KIND_WITHOUT_VALUE` at the decorator's locus.
- The frontend SHALL set `unit` from `@unit`.
- If a field carrying `@unit` has a `typeRef` that does not resolve, through aliases, to a `scalar` definition, then the frontend SHALL raise `agent-ix.semantic-ir.UNIT_ON_NON_SCALAR` at the decorator's locus.
- If a property's type is neither a declaration in the package, nor a built-in scalar, nor an export of a resolved imported package, then the frontend SHALL raise `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF` at the property's locus.

### Envelope, ordering, and origins

- The frontend SHALL set `source.identity` to `ix://<package identity>/source/typespec`, `source.version` to the package version, `source.dialect` to `typespec`, and `source.digest` to the root package's `contentDigest` as FR-048 computes it.
- The frontend SHALL set the `package` block from the resolved package: `identity`, `version`, `manifestDigest`, `mappingVersions`, `profileVersions`, and `lockDigest`, each supplied by FR-047 and FR-048.
- The frontend SHALL emit `occurrences` as the empty array; occurrences are authored data, never compiled output.
- The frontend SHALL order `types` by `identity`, and every `fields`, `variants`, `constraints`, `relationships`, `operations`, `clauses`, and `extensions` array by `identity`, under a locale-independent code-point comparison.
- The frontend SHALL record every `origin` as `{ source: { sourceIdentity, path, startLine, startColumn } }`, where `sourceIdentity` is the document's `source.identity` and `path` is the declaration's file relative to the package root with `/` separators.
- Where a declaration comes from an imported package, whose file cannot be named by a package-root-relative path, the frontend SHALL record a generated origin naming the frontend and the imported package's source identity, because `sourceLocus.path` forbids `..`.
- If a declaration's source file lies beneath no declared root, then the frontend SHALL raise `agent-ix.compiler.SOURCE_OUTSIDE_PACKAGE` at the declaration's locus.
- If any emitted array exceeds `maxCollectionItems`, or the declaration count exceeds `maxNodes`, then the frontend SHALL raise the corresponding blocking limit diagnostic and stop.
- The frontend SHALL validate the emitted document under FR-050 before returning it, and SHALL return `ir: null` with the validation diagnostics rather than a document that fails its own schema.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-046-CON-1 | The prototype IR of FR-041 — `schemaVersion` `1.0.0`, the `{schemaVersion, generator, types}` envelope, and its `role`/`nullable` heuristics — SHALL remain exactly as promoted. This requirement adds a second, separate lowering; it does not edit `src/compiler/ir.mjs`, and the four issue #4 goldens are not regenerated. FR-041-CON-1 is therefore satisfied, and FR-041-CON-2's reconciliation is discharged by the contract path existing rather than by changing the prototype. | Compatibility | Golden comparison |
| FR-046-CON-2 | The lowering SHALL take every `role`, `nullable`, `unit`, `unknownPolicy`, `composite`, and relationship value from a decorator or from the closed structural tables above, and never from a declaration's name, namespace, or file path. | Correctness | Metamorphic test |
| FR-046-CON-3 | The frontend SHALL import only `@typespec/compiler` and `@typespec/versioning` from the pinned toolchain, and no target-facing TypeSpec library. | Portability | Static analysis |
| FR-046-CON-4 | The frontend SHALL reach the file system only through `restrictedHost`, which delegates to the injected host, so that no module under `src/compiler/frontend/` imports `node:fs`. | Security | Static analysis |
| FR-046-CON-5 | The lowering SHALL be a pure function of the compiled program and the resolved package, reading no clock, environment variable, hostname, or working directory. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-046-AC-1 | The IR produced for `test/fixtures/compiler/packages/assurance` validates against `semantic-ir.schema.json` with `contractVersion` `1.1.0` and `source.dialect` `typespec`, and produces zero diagnostics from the FR-050 reader. | Test |
| FR-046-AC-2 | Every row of the structural-kind table is exercised by a declaration in the fixture package and yields the stated `kind` and additional members; a model matching two rows takes the earlier one. | Test |
| FR-046-AC-3 | Every row of the built-in scalar mapping yields the stated IR `scalar`, and a declaration extending an unmapped built-in raises `UNSUPPORTED_SCALAR_BASE` at its locus. | Test |
| FR-046-AC-4 | A record named `AuditEvent` with no `@role` has `roles: []`, and a record named `Thing` with `@role("agent-ix:event")` has `roles: ["agent-ix:event"]`; neither value depends on the name. | Test |
| FR-046-AC-5 | A property typed `Text \| null` is `nullable: true` and a property typed `NullableText` (a declared alias of `Text`) is `nullable: false`, proving nullability is read from the type graph and not from the spelling. | Test |
| FR-046-AC-6 | The four multiplicity derivations (collection/single × optional/required) and the `@multiplicity` override each produce the stated bounds, and `presence` is derived from `lower` in every case. | Test |
| FR-046-AC-7 | `@collection` on a single-valued property raises `FLAGS_ON_NON_COLLECTION`, `@multiplicity(2, 1)` raises `INVALID_MULTIPLICITY`, and `@multiplicity(1)` on an optional property raises `MULTIPLICITY_CONTRADICTS_OPTIONALITY`, each at the decorator's line and column. | Test |
| FR-046-AC-8 | `@unit("s")` on a field resolving through an alias to a scalar is emitted; `@unit("s")` on a field resolving to a record raises `UNIT_ON_NON_SCALAR` at the decorator's locus. | Test |
| FR-046-AC-9 | A property with a TypeSpec default emits `defaultKind: "semantic"` and that `defaultValue`; `@defaultKind("migration")` overrides the kind; `@defaultKind` without a default raises `DEFAULT_KIND_WITHOUT_VALUE`. | Test |
| FR-046-AC-10 | A field typed by a built-in scalar directly emits the package-local kernel scalar definition with its `ext/kernel-scalar` extension, and the kernel-name table is complete against FR-032 with the rows this frontend cannot reach recorded as such. | Test |
| FR-046-AC-11 | A property typed by an export of a resolved imported package resolves, and one typed by an unexported type of that package raises `UNRESOLVED_TYPE_REF`. | Test |
| FR-046-AC-12 | `source.digest` equals the root package's `contentDigest`, and the `package` block equals the values FR-047 and FR-048 supply, asserted field by field. | Test |
| FR-046-AC-13 | `occurrences` is the empty array for every fixture package. | Test |
| FR-046-AC-14 | Every emitted array is sorted by `identity` under code-point comparison, and the order is unchanged when compared against `Intl.Collator` orderings for at least two distinct locales. | Property |
| FR-046-AC-15 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, and `backends/**` are byte-unchanged from `origin/main`, and the four committed issue #4 goldens are byte-unchanged. | Analysis |
| FR-046-AC-16 | No file under `src/compiler/frontend/` imports a target-facing TypeSpec library or `node:fs`, `package.json` gains no dependency, and every added manifest declares `AGPL-3.0-only`. | Analysis |
| FR-046-AC-17 | A package whose entrypoint imports a file outside its root raises `PATH_ESCAPE`, a package shipping a `.mjs` file that its sources import raises `UNTRUSTED_MODULE`, and every emitted `origin.source.path` is relative, `/`-separated, and free of `..`. | Test |
| FR-046-AC-18 | A declaration reached through an imported package carries a generated origin naming the frontend and that package's source identity, not a `..` path. | Test |
| FR-046-AC-19 | A lowering that would emit a document failing `semantic-ir.schema.json` returns `ir: null` with the validation diagnostics, proven by a fault-injected lowering. | Test |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-053](./FR-053-declare-the-typespec-semantic-vocabulary.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-041](./FR-041-promote-the-semantic-ir-emitter.md)
- **Downstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), issues #21, #22, #23
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
