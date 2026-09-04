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

- The rendered declarations of [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md)
- The rendered validators of [FR-066](./FR-066-generate-runtime-validators.md)
- The rendered identity and fingerprint metadata of [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md)
- The admitted model and any declared loss of [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- The IR document's `package.identity` and `package.version`
- The seven prohibited dependency categories of `schema/semantic/v1/target-contract.schema.json#/properties/prohibitedDependencies`: `ui`, `orm`, `sqlalchemy`, `tauri`, `network-client`, `database-migration`, `application-service`

## Outputs

- `src/compiler/backends/typescript-v1/package-layout.mjs` exporting `renderPackage(model)`
- `src/compiler/backends/typescript-v1/package-layout.d.mts`
- A file map from `outputRoot`-relative path to text, returned to the caller and written by nobody here
- `test/fixtures/backends/typescript/tsconfig.json`, the strict configuration the generated package is typechecked under
- `test/fixtures/backends/typescript/bundle-surface/**`, the entry modules the tree-shaking measurement bundles

## Behavior

### The file set

- The emitted file set SHALL be exactly `package.json`, `index.ts`, `types.ts`, `validators.ts`, `identity.ts`, `metadata.ts`, and `LICENSE`.
- That set SHALL be closed, so that an added or removed file is a visible change in the output manifest rather than an implementation detail.
- Every emitted path SHALL be relative to the request's `outputRoot`, carrying no `..` segment, no absolute prefix, and no backslash.

### The package manifest

- The generated `package.json` SHALL declare `"type": "module"`.
- The generated `package.json` SHALL declare `"sideEffects": false`, because a side-effecting module cannot be dropped by a bundler.
- The generated `package.json` SHALL declare `"license": "AGPL-3.0-only"`.
- The generated `package.json` SHALL declare a `version` equal to the IR document's `package.version`.
- The generated `package.json` SHALL declare an `exports` map carrying a `"."` entry and one subpath entry for each of `types`, `validators`, `identity`, and `metadata`.
- Every `exports` entry SHALL list its `types` condition before its `default` condition, because a condition map is matched in declaration order.
- The generated `package.json` SHALL declare no `dependencies` member.
- The generated `package.json` SHALL declare no `peerDependencies` member.
- The generated `package.json` SHALL declare no `optionalDependencies` member.
- The generated package name SHALL be derived from the IR document's `package.identity` by replacing the single `/` separator with `__` and prefixing the result with `@agent-ix/semantic-`, so that the identity is recoverable from the name by one stated inverse.
- This requirement SHALL NOT publish the generated package to any registry; publication is issue #11 behind the quoin#290 sign-off gate.

### The export surface

- `index.ts` SHALL re-export every public symbol by name.
- `index.ts` SHALL NOT emit a wildcard re-export, because only a named surface can be asserted against and diffed.
- The export set SHALL be recorded in the output manifest's `files[].semanticIdentities`, so that a removed export is visible in a manifest diff without reading the source.
- The generated modules SHALL be free of import cycles among themselves.

### Dependency closure

- No generated module SHALL import a specifier that is not relative, so that the package's external dependency closure is empty.
- No generated module SHALL name a package belonging to any of the seven prohibited dependency categories.
- The generated package SHALL require no third-party validator at run time, because [FR-066](./FR-066-generate-runtime-validators.md) generates the validator in-package.

### Provenance and typechecking

- Every generated file SHALL carry an `SPDX-License-Identifier: AGPL-3.0-only` header.
- Every generated file SHALL carry a banner naming the backend identity, the backend version, and the IR fingerprint it was generated from.
- The generated `LICENSE` SHALL be the AGPL-3.0-only text this repository already ships, copied rather than restated.
- The generated package SHALL typecheck with zero errors under `tsc` with `strict` and `exactOptionalPropertyTypes` enabled, because `exactOptionalPropertyTypes` is what makes the absent-versus-`undefined` distinction of FR-064 real rather than nominal.

### Tree-shaking and loss

- Importing one exported type and its validator from the built package SHALL yield a bundle that names that type's generated symbols and none of the generated symbols of the types it does not reference.
- If the admitted model carries a declared loss, then `renderPackage` SHALL return an empty file map together with the loss diagnostics, because the declared `unsupportedFeaturePolicy` for the `typescript` target is `fail`.
- `renderPackage` SHALL write no file, so that the caller decides where a package lands.
- `renderPackage` SHALL return the same file map for the same model on every call.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-065-CON-1 | The generated package SHALL NOT be added to this repository's `pnpm-lock.yaml`, `package.json` `workspaces`, or `packages/`; it is produced into a caller-named directory and is not a workspace member. | Non-disruption | Change-set diff |
| FR-065-CON-2 | The generated `package.json` SHALL carry no `overrides`, no `file:` or `link:` specifier, and no version upper bound, matching this repository's dependency policy. | Portability | Manifest inspection |
| FR-065-CON-3 | The prohibited-dependency check SHALL be a static assertion over the generated source's import specifiers, not a runtime probe, so that it holds for a package nobody has executed. | Security | Static analysis |
| FR-065-CON-4 | The bundle-surface measurement SHALL use a bundler already pinned in this repository's lockfile, adding no dependency to either lockfile. | Non-disruption | Lockfile comparison |
| FR-065-CON-5 | The generated package SHALL NOT re-export a symbol whose identity the IR does not carry, so that every public name traces to a semantic identity. | Traceability | Export-set test |
| FR-065-CON-6 | The emitted `LICENSE` SHALL be AGPL-3.0-only with no carve-out, so that a generated file lacking its SPDX header fails the licence gate. | Licence | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-065-AC-1 | Generating the fixture package emits exactly the seven declared files and no other path. | Integration |
| FR-065-AC-2 | The generated `package.json` declares `type`, `sideEffects`, `license`, `version`, and `exports` with the declared values, and parsing it yields no `dependencies`, `peerDependencies`, or `optionalDependencies` member. | Unit |
| FR-065-AC-3 | Every `exports` entry lists `types` before `default`, asserted over the parsed key order rather than the source text. | Unit |
| FR-065-AC-4 | The generated package name round-trips: applying the stated inverse to the emitted name reproduces the IR document's `package.identity`. | Property |
| FR-065-AC-5 | `index.ts` contains no `export *` form, and the set of names it re-exports equals the union of the public names of the four generated modules. | Unit |
| FR-065-AC-6 | Every `import` specifier in every generated module begins with `./` or `../`, over every fixture model. | Static |
| FR-065-AC-7 | No generated module names `react`, `react-dom`, `@tauri-apps/api`, `typeorm`, `prisma`, `sequelize`, `sqlalchemy`, `express`, `axios`, `node-fetch`, or any package in the seven prohibited categories. | Static |
| FR-065-AC-8 | The generated package typechecks with zero errors under `tsc` with `strict` and `exactOptionalPropertyTypes` enabled, for every conformance-corpus model that FR-068 admits. | Compile |
| FR-065-AC-9 | Assigning `undefined` to an optional-and-not-nullable generated property fails that typecheck, proving `exactOptionalPropertyTypes` is in force. | Compile |
| FR-065-AC-10 | Every generated file begins with the SPDX header and the banner naming the backend identity, its version, and the IR fingerprint. | Snapshot |
| FR-065-AC-11 | The generated `LICENSE` is byte-identical to this repository's committed `LICENSE`. | Test |
| FR-065-AC-12 | Bundling an entry module that imports one type and its validator from a fixture package of ten types produces a bundle naming that type's generated symbols and none of the other nine types' generated symbols. | Integration |
| FR-065-AC-13 | A model carrying a declared loss yields an empty file map and the loss diagnostics, and writes nothing. | Unit |
| FR-065-AC-14 | `renderPackage` called twice on the same model returns identical file maps, and writes no file during either call. | Test |
| FR-065-AC-15 | The generated modules have no import cycle, asserted over the parsed import graph. | Static |
| FR-065-AC-16 | The manifest's `files[].semanticIdentities` for `types.ts` equals the set of identities the model declares, so a removed export changes the manifest. | Unit |
| FR-065-AC-17 | This branch adds no entry to `pnpm-lock.yaml` and changes no byte of `package.json`. | Analysis |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
