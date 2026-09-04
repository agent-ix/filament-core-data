---
id: FR-063
title: "Declare the generation backend seam and the TypeScript target contract"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-063] Declare the generation backend seam and the TypeScript target contract

## Description

The compiler SHALL reach every generated target through one seam keyed on the
published `target` vocabulary, so that a caller submits a
`compiler-request.schema.json` document and receives an
`output-manifest.schema.json` document whichever target it names, and a target
the repository has not implemented is named with its owning issue rather than
guessed at.

## Inputs

- A `compiler-request.schema.json` document: `{ contractVersion, lockFingerprint, ir, profile, mappings, backend, outputRoot, limits }`
- The closed `target` vocabulary of `schema/semantic/v1/common.schema.json`: `json-schema`, `rust`, `typescript`, `python-pydantic-v2`, `python-dataclass`
- `schema/semantic/v1/output-manifest.schema.json` and `schema/semantic/v1/target-contract.schema.json`
- The committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`, read as the qualification this backend must satisfy
- The injected host of NFR-019 and NFR-020, through which every read is made

## Outputs

- `src/compiler/backends/seam.mjs` exporting `BACKEND_TARGETS`, `selectBackend(target)`, `isBackendImplemented(target)`, `assertBackendContract(backend)`, and `generateTarget(request, options)`
- `src/compiler/backends/seam.d.mts` declaring every added symbol
- `src/compiler/backends/typescript-v1/index.mjs` exporting `typescriptBackend`, the one implemented target
- `src/compiler/backends/typescript-v1/index.d.mts`
- `src/compiler/backends/typescript-v1/target-contract.json`, the `target-contract.schema.json`-valid declaration for the `typescript` target
- `src/compiler/backends/targets.mjs`, which reads the closed `target` vocabulary from the published `common.schema.json`; it lives outside `backends/typescript-v1/` because no module under a backend directory may touch `node:fs`
- `src/compiler/backends/targets.d.mts`
- An `output-manifest.schema.json` document for every request, defective or not

## Behavior

### The registry

- `BACKEND_TARGETS` SHALL equal the `target` enum read from the published `common.schema.json`, rather than a list restated in code.
- The seam SHALL register one entry for each of the five declared targets, whether or not that target is implemented.
- `selectBackend` SHALL return `{ backend, implemented }` for a target in the vocabulary.
- If a caller names a target outside the vocabulary, then `selectBackend` SHALL throw a `TypeError` naming the value and the five permitted targets, because a target outside the closed vocabulary is a defect in the calling program rather than in a compiled input.
- The `rust` target SHALL be registered as declared-unimplemented naming `agent-ix/filament-core-data#21`.
- The `python-pydantic-v2` and `python-dataclass` targets SHALL each be registered as declared-unimplemented naming `agent-ix/filament-core-data#23`.
- The `json-schema` target SHALL be registered as declared-unimplemented naming the upstream `@typespec/json-schema` emitter as its owner, because ADR-0005 makes that projection the official emitter's and not this repository's.
- `isBackendImplemented` SHALL return `true` for `typescript` and `false` for the other four.

### The request and the manifest

- `generateTarget` SHALL validate the request against `compiler-request.schema.json` before selecting a backend.
- If the request fails that validation, then `generateTarget` SHALL return a manifest with `state: "invalid"`, zero files, and one diagnostic per schema error located at the failing instance pointer.
- If the request names a registered but unimplemented target, then `generateTarget` SHALL return a manifest with `state: "unavailable"`, zero files, and exactly one blocking diagnostic coded `agent-ix.compiler.BACKEND_NOT_IMPLEMENTED` whose message names the issue that owns the target.
- `generateTarget` SHALL return an `output-manifest.schema.json`-valid document for every request, including every failing one.
- `generateTarget` SHALL NOT throw for any defect in a request document; a defect in a submitted document is a diagnostic.
- `generateTarget` SHALL set `requestFingerprint` to the digest of the canonicalized request under the FR-048 canonicalization.
- `generateTarget` SHALL set `normalizedFingerprint` to `fingerprintIr` of the request's `ir` member.
- `generateTarget` SHALL set `backend` to the selected backend's declared `identity`.
- Each `files[]` entry SHALL carry the `outputRoot`-relative path, the `sha256:` digest of the emitted bytes, the media type, and the non-empty set of semantic identities that entry renders.
- If a backend reports a state of `invalid`, `unsupported`, or `unavailable`, then `generateTarget` SHALL emit zero files and at least one diagnostic, as `output-manifest.schema.json` requires.

### The backend contract

- `assertBackendContract` SHALL reject a registered backend that does not expose `identity`, `version`, `supportedIrVersions`, `supportedFeatures`, and `generate`.
- `assertBackendContract` SHALL reject a backend whose returned manifest names a file path the request's `outputRoot` does not contain.
- If a request names a `contractVersion` the selected backend does not list in `supportedIrVersions`, then `generateTarget` SHALL return `state: "unsupported"` naming the version rather than attempting the generation.
- The `typescript` backend SHALL declare `supportedIrVersions` of exactly `["1.1.0"]`, because the prototype `1.0.0` document is the frozen FR-041 shape and is not a contract IR document.
- The seam SHALL write no file, so that file placement belongs to the caller and a package layout can change without editing a backend.
- The seam SHALL import no module under `src/compiler/frontend/`, so no frontend can influence what a backend emits.
- Every backend SHALL read each file through the injected host, reaching the file system through no other route.
- No backend SHALL read a clock, an environment variable, or a network socket.
- Every diagnostic code this requirement introduces SHALL be added as a member of `DIAGNOSTIC_CODES` in `src/compiler/diagnostics.mjs`, which the FR-049 registry already owns.
- No call site SHALL spell a diagnostic code as a string literal.

### The declared qualification

- `src/compiler/backends/typescript-v1/target-contract.json` SHALL validate against `schema/semantic/v1/target-contract.schema.json`.
- That declaration SHALL carry the same member values as the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`, which is read and never edited.
- The backend SHALL honour the declared `unsupportedFeaturePolicy` of `fail` by emitting no file for a model carrying a declared loss.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-063-CON-1 | The seam SHALL NOT implement the `rust`, `python-pydantic-v2`, `python-dataclass`, or `json-schema` targets; those are issues #21 and #23 and the upstream emitter. The registrations exist so the manifest shape and the diagnostic exist before those backends do, as `frontend/spec-bundle` does for the input side. | Scope | Inspection |
| FR-063-CON-2 | The declared `runtime-schema-validator` runtime dependency of the committed `typescript` target row SHALL be satisfied by the generated in-package validator of [FR-066](./FR-066-generate-runtime-validators.md), so the generated package's third-party runtime dependency count is zero. That is strictly stronger than the declaration and the committed fixture is not edited to say so. | Portability | Dependency-closure test |
| FR-063-CON-3 | The seam SHALL distinguish a caller defect, which throws, from a document defect, which is a diagnostic; no request document a package supplies can make the seam throw. | Safety | Fuzz |
| FR-063-CON-4 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making a backend a runtime entry point remains issue #11. | Non-disruption | Manifest comparison |
| FR-063-CON-5 | The seam SHALL NOT import `src/compiler/backends/typescript.mjs` or `src/compiler/backends/rust.mjs`; those consume the frozen FR-041 prototype IR and are a different contract, and reusing them here would make a prototype-shaped document reachable through the contract seam. | Integrity | Static analysis |
| FR-063-CON-6 | The narrow build interface of FR-052 SHALL keep exactly its fifteen symbols; this seam is reached by file path, as `src/compiler/inventory.json` records for every module under `src/compiler/`. | Non-disruption | Export-set test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-063-AC-1 | `BACKEND_TARGETS` equals the `target` enum read from `common.schema.json`; a test that reads both fails when either changes alone. | Test |
| FR-063-AC-2 | `selectBackend("spec-bundle")` throws a `TypeError` naming the value and the five permitted targets. | Unit |
| FR-063-AC-3 | `generateTarget` for each of `rust`, `python-pydantic-v2`, `python-dataclass`, and `json-schema` returns `state: "unavailable"`, zero files, and one blocking `agent-ix.compiler.BACKEND_NOT_IMPLEMENTED` diagnostic naming that target's owning issue. | Unit |
| FR-063-AC-4 | A request missing a required member returns `state: "invalid"` with one diagnostic per schema error, each located at the failing instance pointer, and emits no file. | Unit |
| FR-063-AC-5 | Every manifest `generateTarget` returns — for a valid request, an invalid request, an unimplemented target, and a model carrying declared loss — validates against `output-manifest.schema.json`. | Property |
| FR-063-AC-6 | For the fixture request, `requestFingerprint` equals the digest of the canonicalized request and `normalizedFingerprint` equals `fingerprintIr` of its `ir`, both recomputed independently in the test. | Unit |
| FR-063-AC-7 | Each `files[]` entry of a successful generation names a path under `outputRoot`, a digest equal to the SHA-256 of its emitted bytes, a media type, and at least one semantic identity. | Integration |
| FR-063-AC-8 | A stub backend missing any one of `identity`, `version`, `supportedIrVersions`, `supportedFeatures`, or `generate` is rejected by `assertBackendContract`, once per omitted member. | Unit |
| FR-063-AC-9 | A stub backend returning a file path outside `outputRoot` is rejected by `assertBackendContract`. | Unit |
| FR-063-AC-10 | A request whose `contractVersion` is `1.0.0` against the `typescript` backend returns `state: "unsupported"` naming the version and emits no file. | Unit |
| FR-063-AC-11 | `src/compiler/backends/typescript-v1/target-contract.json` validates against `target-contract.schema.json` and its member values equal the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`. | Test |
| FR-063-AC-12 | No module under `src/compiler/backends/` imports a module under `src/compiler/frontend/`, and `seam.mjs` imports neither `backends/typescript.mjs` nor `backends/rust.mjs`. | Analysis |
| FR-063-AC-13 | Every read performed during a fixture generation is observed by the injected host, and a backend that bypasses it fails the seam's own contract test. | Test |
| FR-063-AC-14 | No module under `src/compiler/backends/typescript-v1/` matches `Date.now`, `new Date`, `process.env`, `process.cwd`, `node:fs`, `node:net`, or `node:https`. | Static |
| FR-063-AC-15 | Over 256 mutated request documents the seam returns an `output-manifest.schema.json`-valid manifest and never throws. | Fuzz |
| FR-063-AC-16 | Every diagnostic code this requirement emits is a member of `DIAGNOSTIC_CODES`, and the only modules under `src/compiler/backends/` that spell the literal prefix `agent-ix.` are the two declared closed registers — `DIAGNOSTIC_CODES` itself and the FR-068 admissibility register. | Static |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Downstream**: [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #21 Rust backend, issue #23 Python backend, issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
