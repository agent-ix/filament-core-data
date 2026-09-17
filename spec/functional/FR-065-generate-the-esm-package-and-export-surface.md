---
id: FR-065
title: "Generate the ESM package and its stable export surface"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-067"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-065] Generate the ESM package and its stable export surface

## Description

The TypeScript backend SHALL assemble the rendered modules into one complete,
side-effect-free ESM package whose export surface is named, statically
analysable, and closed over its own files, so that a consumer can bundle one
type without acquiring the rest and no framework enters the dependency closure.

## Inputs

- The resolved model of [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), which `buildModel` produces
- The rendered declarations of [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md)
- The rendered validators and the rendered structural-code register of [FR-066](./FR-066-generate-runtime-validators.md)
- The rendered identity and fingerprint metadata of [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md)
- The admissibility result and any representability loss of [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- The IR document's `package.identity` and `package.version`
- The seven prohibited dependency categories of `schema/semantic/v1/target-contract.schema.json#/properties/prohibitedDependencies`: `ui`, `orm`, `sqlalchemy`, `tauri`, `network-client`, `database-migration`, `application-service`

## Outputs

- `src/compiler/backends/typescript-v1/package-layout.mjs` exporting `renderPackage(model)`
- `src/compiler/backends/typescript-v1/package-layout.d.mts`
- A file map from `outputRoot`-relative path to text, returned to the caller and written by nobody here
- No test fixture and no configuration file: the authoritative typecheck configuration at `test/fixtures/backends/typescript/tsconfig.json` and the single root `tsconfig.json` `exclude` entry are [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)'s, and this requirement only states what they must assert

## Behavior

### The file set

- The emitted file set SHALL be exactly `package.json`, `index.ts`, `types.ts`, `validators.ts`, `errors.ts`, `identity.ts`, `provenance.ts`, and `LICENSE` — eight files. The provenance module was named `metadata.ts` until [FR-137](./FR-137-spell-semantic-identity-and-provenance-alike-in-every-package.md) repaired the ADR-0007 naming swap.
- The generated `errors.ts` SHALL carry the closed structural validation-code register and the `ValidationError` and `ValidationResult` shapes that [FR-066](./FR-066-generate-runtime-validators.md) renders, so that a consumer can switch on a validation code without importing the validators.
- `renderPackage` SHALL treat that set as closed, so that an added or removed file is a visible change in the output manifest rather than an implementation detail.
- Every emitted path SHALL be relative to the request's `outputRoot`, carrying no `..` segment, no absolute prefix, and no backslash.

### The package manifest

- The generated `package.json` SHALL declare `"type": "module"`.
- The generated `package.json` SHALL declare `"sideEffects": false`, because a side-effecting module cannot be dropped by a bundler.
- The generated `package.json` SHALL declare `"license": "AGPL-3.0-or-later"`.
- The generated `package.json` SHALL declare a `version` equal to the IR document's `package.version`.
- The generated `package.json` SHALL declare an `exports` map carrying a `"."` entry and one subpath entry for each of `types`, `validators`, `errors`, `identity`, and `metadata`.
- Every `exports` entry SHALL list its `types` condition before its `default` condition, because a condition map is matched in declaration order.
- The generated `package.json` SHALL declare no `dependencies` member.
- The generated `package.json` SHALL declare no `peerDependencies` member.
- The generated `package.json` SHALL declare no `optionalDependencies` member.
- `renderPackage` SHALL derive the generated package name from the IR document's `package.identity` by replacing the single `/` separator with `__` and prefixing the result with `@agent-ix/semantic-`, so that the identity is recoverable from the name by one stated inverse.
- This requirement SHALL NOT publish the generated package to any registry; publication is issue #11 behind the quoin#290 sign-off gate.

### The export surface

- `index.ts` SHALL re-export every public symbol by name.
- `index.ts` SHALL NOT emit a wildcard re-export, because only a named surface can be asserted against and diffed.
- `renderPackage` SHALL record the identities a file renders in the output manifest's `files[].semanticIdentities`, so that a removed export is visible in a manifest diff without reading the source.
- `renderPackage` SHALL record the package's own identity for `package.json` and for `LICENSE`, which render no type definition, following the convention [FR-063](./FR-063-declare-the-generation-backend-seam.md) declares.
- The generated modules SHALL be free of import cycles among themselves.
- The export surface SHALL be the union of two sets and nothing else: the identity-derived exports, one per type definition the model carries, and the fixed API surface.
- The fixed API surface SHALL be exactly the discriminant constant, the branded-reference constructor, one `validate<Type>` per exported type, `ValidationError`, `ValidationResult`, the structural-code register, and the identity, identity-fields, metadata, roles, extension, occurrence, and relationship maps.
- An exported name outside those two sets SHALL fail the export-set test, so that the surface stays closed without forbidding the package its own API.

### Dependency closure

- No generated module SHALL import a specifier that is not relative, so that the package's external dependency closure is empty.
- No generated module SHALL name a package belonging to any of the seven prohibited dependency categories.
- The generated package SHALL require no third-party validator at run time, because [FR-066](./FR-066-generate-runtime-validators.md) generates the validator in-package.

### Formatting

- `renderPackage` SHALL emit text in one declared style: tab indentation, double-quoted strings, terminating semicolons, and one declaration per statement.
- That style SHALL be the style `biome.json` already configures for this repository, so that the formatter [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) injects has nothing to change and `biome format .` over the committed generated fixture is a no-op.
- `renderPackage` SHALL run no formatter of its own, because the seam of [FR-063](./FR-063-declare-the-generation-backend-seam.md) applies the injected one and computes each digest over the formatted bytes.
- The declared style SHALL be what discharges the issue's "deterministic formatted output" deliverable; determinism alone is a weaker claim, because two runs of a consistently unformatted generator also agree.

### Provenance and typechecking

- Every generated file SHALL carry an `SPDX-License-Identifier: AGPL-3.0-or-later` header.
- Every generated file SHALL carry a banner naming the backend identity, the backend version, and the IR fingerprint it was generated from.
- The generated `LICENSE` SHALL be the AGPL-3.0-or-later text this repository already ships, copied rather than restated.
- The generated package SHALL typecheck with zero errors under `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`, because `exactOptionalPropertyTypes` is what makes the absent-versus-`undefined` distinction of FR-064 real rather than nominal, and the two unused-symbol rules are what the repository's own configuration already applies to everything it compiles.
- The authoritative configuration for that typecheck SHALL be `test/fixtures/backends/typescript/tsconfig.json`, named here so that no reader has to infer which of two configurations governs.
- The root `tsconfig.json` SHALL exclude `test/fixtures/backends/typescript`, because its `include` names `test`, it does not set `exactOptionalPropertyTypes`, and `make lint` runs it — so a generated package left inside that program would be checked under weaker options than this requirement demands, and the deliberately-uncompilable fixtures of [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) would fail the repository's own lint.
- The suite SHALL typecheck every generated package as one TypeScript program through the compiler API rather than as one process per package, because 70 of the 111 corpus cases are admitted and one `tsc` process over this repository already costs about two seconds.

### Reachable surface and loss

- A consumer importing one exported type and its validator SHALL reach that type's generated symbols and no generated symbol of a type it does not reference, measured by a static reachable-symbol walk over the generated package's own import and export graph.
- The walk SHALL start at one named entry export, follow relative import specifiers and named re-exports, and collect the top-level bindings it reaches.
- The walk SHALL assert its four enabling conditions before collecting anything: the package declares `sideEffects: false`, it imports nothing outside itself, it re-exports only by name, and every export is a top-level binding whose initializer has no side effect.
- If any one of those four conditions does not hold, then the walk SHALL fail, so that the measurement cannot pass over a package for which it means nothing.
- The walk SHALL be what this requirement measures instead of a bundle, because no bundler resolves in this repository: `esbuild`, `rollup`, and `vite` reach the lockfile only as transitive dependencies of `vitest` under `node_modules/.pnpm/**`, and NFR-025 freezes both lockfiles against adding one.
- If the model carries a representability loss, then `renderPackage` SHALL return an empty file map together with the loss diagnostics, because the declared `unsupportedFeaturePolicy` for the `typescript` target is `fail`.
- If the admissibility result is `lossy` and the model carries no representability loss, then `renderPackage` SHALL return the full file map, because a `lossy` admissibility answer describes a document this backend can still generate from.
- `renderPackage` SHALL write no file, so that the caller decides where a package lands.
- `renderPackage` SHALL return the same file map for the same model on every call.

## Emitted set (ADR-0007)

[ADR-0007](../../docs/semantic-data-system/adr/0007-emitted-set-contract.md) specifies
the emitted set as five concepts realised idiomatically per language, not as a
filename contract. This section names where each concept lands in this target, as
that decision requires.

| ADR-0007 concept | Where it lands in this target |
|---|---|
| Types | `types.ts` |
| Validation | `validators.ts` — emitted rather than inferred, because TypeScript types erase at runtime |
| Diagnostics | `errors.ts` |
| Semantic identity | `identity.ts` — identity, kind, roles, extensions, relationships, occurrences, and the per-field descriptors |
| Provenance | `provenance.ts`, exporting `PROVENANCE` |

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-065-CON-1 | The generated package SHALL NOT be added to this repository's `pnpm-lock.yaml`, `package.json` `workspaces`, or `packages/`; it is produced into a caller-named directory and is not a workspace member. | Non-disruption | Change-set diff |
| FR-065-CON-2 | The generated `package.json` SHALL carry no `overrides`, no `file:` or `link:` specifier, and no version upper bound, matching this repository's dependency policy. | Portability | Manifest inspection |
| FR-065-CON-3 | The prohibited-dependency check SHALL be a static assertion over the generated source's import specifiers, not a runtime probe, so that it holds for a package nobody has executed. | Security | Static analysis |
| FR-065-CON-4 | The reachable-surface measurement SHALL be a static walk over the generated package's own import and export graph, adding no dependency to either lockfile. No bundler is available to do it: `esbuild`, `rollup`, and `vite` sit in `pnpm-lock.yaml` only as transitive dependencies of `vitest`, neither `import("esbuild")` nor `import("rollup")` resolves from the repository root, and declaring one would change `package.json` and `pnpm-lock.yaml`, which NFR-025 asserts unchanged. For a package that declares `sideEffects: false`, imports nothing outside itself, and re-exports only by name, the walk computes what a tree-shaker retains. | Non-disruption | Lockfile comparison |
| FR-065-CON-5 | Every *type-derived* export of the generated package SHALL trace to a semantic identity the IR carries, leaving the package's fixed API surface — the closed list this requirement declares — as the only other permitted source of a public name, so that the export set is bounded without forbidding the package the names its own API needs. | Traceability | Export-set test |
| FR-065-CON-6 | The emitted `LICENSE` SHALL be AGPL-3.0-or-later with no carve-out, so that a generated file lacking its SPDX header fails the licence gate. This is the *generated package's* licence, which the programme mandates; it is a different member from the `customSourceLicense` of the committed target-contract fixture, which also reads `AGPL-3.0-or-later` since `agent-ix/filament-core-data#140`. | Licence | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-065-AC-1 | Generating the fixture package emits exactly the eight declared files — `package.json`, `index.ts`, `types.ts`, `validators.ts`, `errors.ts`, `identity.ts`, `provenance.ts`, and `LICENSE` — and no other path. | Integration |
| FR-065-AC-2 | The generated `package.json` declares `type`, `sideEffects`, `license`, `version`, and `exports` with the declared values, and parsing it yields no `dependencies`, `peerDependencies`, or `optionalDependencies` member. | Unit |
| FR-065-AC-3 | Every `exports` entry lists `types` before `default`, asserted over the parsed key order rather than the source text. | Unit |
| FR-065-AC-4 | The generated package name round-trips: applying the stated inverse to the emitted name reproduces the IR document's `package.identity`. | Property |
| FR-065-AC-5 | `index.ts` contains no `export *` form, and the set of names it re-exports equals the union of the public names of the five generated source modules — `types.ts`, `validators.ts`, `errors.ts`, `identity.ts`, and `provenance.ts`. | Unit |
| FR-065-AC-6 | Every `import` specifier in every generated module begins with `./` or `../`, over every fixture model. | Static |
| FR-065-AC-7 | No generated module names `react`, `react-dom`, `@tauri-apps/api`, `typeorm`, `prisma`, `sequelize`, `sqlalchemy`, `express`, `axios`, `node-fetch`, or any package in the seven prohibited categories. | Static |
| FR-065-AC-8 | Every generated package for every conformance-corpus model that FR-068 admits typechecks with zero errors under `test/fixtures/backends/typescript/tsconfig.json`, which sets `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`, compiled as one program through the TypeScript compiler API. | Compile |
| FR-065-AC-9 | Assigning `undefined` to an optional-and-not-nullable generated property fails that typecheck, proving `exactOptionalPropertyTypes` is in force. | Compile |
| FR-065-AC-10 | Every generated file begins with the SPDX header and the banner naming the backend identity, its version, and the IR fingerprint. | Snapshot |
| FR-065-AC-11 | The generated `LICENSE` is byte-identical to this repository's committed `LICENSE`. | Test |
| FR-065-AC-12 | The reachable-symbol walk from an entry export of one type and its validator, over a fixture package of ten types, reaches that type's generated symbols and no generated symbol of the other nine; and the walk fails loudly when any one of its four enabling conditions is removed from the fixture, so it cannot pass over a package for which it means nothing. | Integration |
| FR-065-AC-13 | A model carrying a representability loss yields an empty file map and the loss diagnostics and writes nothing, while a model whose admissibility result is `lossy` and whose constructs are all representable yields the full eight-file map. | Unit |
| FR-065-AC-14 | `renderPackage` called twice on the same model returns identical file maps, and writes no file during either call. | Test |
| FR-065-AC-15 | The generated modules have no import cycle, asserted over the parsed import graph. | Static |
| FR-065-AC-16 | The manifest's `files[].semanticIdentities` for `types.ts` equals the set of identities the model declares, so a removed export changes the manifest. | Unit |
| FR-065-AC-17 | This branch adds no entry to `pnpm-lock.yaml` and changes no byte of `package.json`. | Analysis |
| FR-065-AC-18 | Running the repository's pinned `biome format` over the committed generated fixture reports no change, so the declared style and the repository's formatter agree by construction rather than by luck. | Static |
| FR-065-AC-19 | The manifest entry for `package.json` and the entry for `LICENSE` each carry exactly the package's own identity, minted from `package.identity`, and neither carries an empty set. | Unit |
| FR-065-AC-20 | The generated package's exported name set equals the identity-derived exports plus the declared fixed API surface, and an added export outside both sets fails the export-set test. | Unit |
| FR-065-AC-21 | The root `tsconfig.json` excludes `test/fixtures/backends/typescript`, and `tsc --noEmit -p tsconfig.json` over this repository reports no diagnostic from a file under that directory. | Static |
| FR-065-AC-22 | Typechecking every admitted corpus model's generated package completes as one compiler-API program, and the suite records the count of packages that program covered. | Integration |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Shared machine-generated artifacts**: the single `exclude` line this requirement adds to the root `tsconfig.json` is a shared-file edit, and `agent-ix/filament-core-data#63` records that three concurrent backend tickets each regenerate or edit the same shared artifacts. The edit is regenerated or reapplied on rebase rather than merged.
