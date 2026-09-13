---
id: FR-063
title: "Declare the generation backend seam and target contracts"
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
# [FR-063] Declare the generation backend seam and target contracts

## Description

This requirement opens the bundle answering
[filament-core-data#22](https://github.com/agent-ix/filament-core-data/issues/22), the TypeScript semantic codegen
and validator backend.

The compiler SHALL reach every generated target through one seam keyed on the
published `target` vocabulary, so that a caller submits a
`compiler-request.schema.json` document and receives an
`output-manifest.schema.json` document whichever target it names — a manifest of
emitted files and their digests where the target is implemented and the document
generates, and a manifest naming the owning issue where it is not — rather than
a guess in either direction.

## Inputs

- A `compiler-request.schema.json` document: `{ contractVersion, lockFingerprint, ir, profile, mappings, backend, outputRoot, limits }`
- The closed `target` vocabulary of `schema/semantic/v1/common.schema.json`: `json-schema`, `rust`, `typescript`, `python-pydantic-v2`, `python-dataclass`
- `schema/semantic/v1/output-manifest.schema.json` and `schema/semantic/v1/target-contract.schema.json`
- The committed `typescript` and `json-schema` rows of `fixtures/semantic/v1/positive/target-contracts.json`, read as the qualification each implemented backend must satisfy
- The injected host of NFR-019 and NFR-020, through which every read is made
- The injected formatter `options.format(text, path)`, supplied by the caller and owned by [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)

## Outputs

- `src/compiler/backends/seam.mjs` exporting `BACKEND_TARGETS`, `selectBackend(target)`, `isBackendImplemented(target)`, `assertBackendContract(backend)`, and `generateTarget(request, options)`, where `options` carries the injected `format(text, path)` of [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- `src/compiler/backends/seam.d.mts` declaring every added symbol
- `src/compiler/backends/typescript-v1/index.mjs` exporting `typescriptBackend`
- `src/compiler/backends/typescript-v1/index.d.mts`
- `src/compiler/backends/json-schema-v1/index.mjs` exporting `jsonSchemaBackend`
- `src/compiler/backends/json-schema-v1/index.d.mts`
- `src/compiler/backends/typescript-v1/target-contract.json`, the `target-contract.schema.json`-valid declaration for the `typescript` target
- `src/compiler/backends/json-schema-v1/target-contract.json`, the `target-contract.schema.json`-valid declaration for the `json-schema` target
- `src/compiler/backends/targets.mjs`, which reads the closed `target` vocabulary from the published `common.schema.json`; it lives outside `backends/typescript-v1/` because no module under a backend directory may touch `node:fs`
- `src/compiler/backends/targets.d.mts`
- An `output-manifest.schema.json` document for every request, defective or not

## Behavior

### The registry

- `BACKEND_TARGETS` SHALL equal the `target` enum read from the published `common.schema.json`, rather than a list restated in code.
- The seam SHALL register one entry for each of the five declared targets, whether or not that target is implemented.
- `selectBackend` SHALL return `{ backend, implemented }` for a target in the vocabulary.
- If a caller names a target outside the vocabulary, then `selectBackend` SHALL throw a `TypeError` naming the value and the five permitted targets, because a target outside the closed vocabulary is a defect in the calling program rather than in a compiled input.
- Every registry entry SHALL name the issue or upstream component that owns its target, whether or not that target has an implementation today.
- The registry SHALL record `agent-ix/filament-core-data#22` as the owner of `typescript`.
- The registry SHALL record `agent-ix/filament-core-data#21` as the owner of `rust`.
- The registry SHALL record `agent-ix/filament-core-data#23` as the owner of `python-pydantic-v2` and of `python-dataclass`.
- The registry SHALL record `agent-ix/filament-core-data#85` as the owner of `json-schema`.
- The registry SHALL mark an entry carrying no implementation as declared-unimplemented, following the `frontend/spec-bundle` precedent on the input side.
- `isBackendImplemented` SHALL return `true` for a target whose entry carries an implementation and `false` for a target whose entry is declared-unimplemented, deciding from the registry rather than from a restated list, so that a later ticket registering its own backend needs no edit here.
- This requirement SHALL register `typescript` and `json-schema` as implementations, leaving the remaining targets declared-unimplemented.

### The request and the manifest

- `generateTarget` SHALL validate the request against `compiler-request.schema.json` before selecting a backend.
- If the request fails that validation, then `generateTarget` SHALL return a manifest with `state: "invalid"`, zero files, and one diagnostic per schema error located at the failing instance pointer.
- If the request names a registered but unimplemented target, then `generateTarget` SHALL return a manifest with `state: "unavailable"`, zero files, and exactly one blocking diagnostic coded `agent-ix.compiler.BACKEND_NOT_IMPLEMENTED` whose message names the issue that owns the target.
- `generateTarget` SHALL return an `output-manifest.schema.json`-valid document for every request, including every failing one.
- `generateTarget` SHALL NOT throw for any defect in a request document; a defect in a submitted document is a diagnostic.
- `generateTarget` SHALL set `requestFingerprint` to the digest of the canonicalized request under the FR-048 canonicalization.
- `generateTarget` SHALL set `normalizedFingerprint` to `fingerprintIr` of the request's `ir` member.
- `generateTarget` SHALL set `backend` to the selected backend's declared `identity`.
- Each `files[]` entry SHALL carry the `outputRoot`-relative path, the `sha256:` digest of the emitted bytes, the media type, and a non-empty set of semantic identities.
- A `files[]` entry for a file that renders one or more type definitions SHALL carry exactly the identities of the definitions it renders.
- A `files[]` entry for a file that renders no type definition SHALL carry the package's own identity, minted as `ix://<owner>/<name>` from the IR document's `package.identity`, because `output-manifest.schema.json` requires a non-empty set on every entry and `contracts-v1.md` requires every emitted file to reconcile.
- If a backend reports a state of `invalid`, `unsupported`, or `unavailable`, then `generateTarget` SHALL emit zero files and at least one diagnostic, as `output-manifest.schema.json` requires.

### The passing arms

- If a request names an implemented target, and the backend admits its `ir` with an admissibility result of `success`, and the backend can represent every construct that document carries, then `generateTarget` SHALL return `state: "success"`, one `files[]` entry per emitted file, and no blocking diagnostic.
- If that same request's admissibility result is `lossy`, then `generateTarget` SHALL return `state: "lossy"` with the same `files[]` entries and the admissibility diagnostics, because an admissibility result of `lossy` describes a document this backend can still generate from.
- If the backend reports a representability loss, then `generateTarget` SHALL return `state: "unsupported"` with zero files and the loss diagnostics, because the committed `typescript` target row declares an `unsupportedFeaturePolicy` of `fail`.
- `generateTarget` SHALL NOT return `state: "partial"`, because the published contract states no rule that assigns it.

### The injected formatter

- `generateTarget` SHALL pass every emitted file's text through `options.format(text, path)` before computing that file's digest, so that the digest a manifest records is the digest of the bytes a caller writes.
- `generateTarget` SHALL start no process, open no socket, and read no file of its own while formatting; the injected formatter is the caller's, and [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) owns the implementation this repository supplies.
- If a caller supplies no `options.format`, then `generateTarget` SHALL use an identity function and record that choice in no diagnostic, because an unformatted generation is a legitimate caller decision rather than a defect.

### The backend contract

- `assertBackendContract` SHALL reject a registered backend that does not expose `identity`, `version`, `supportedIrVersions`, `supportedFeatures`, and `generate`.
- `assertBackendContract` SHALL reject a backend whose returned manifest names a file path the request's `outputRoot` does not contain.
- If a request names a `contractVersion` the selected backend does not list in `supportedIrVersions`, then `generateTarget` SHALL return `state: "unsupported"` naming the version rather than attempting the generation.
- The `typescript` backend SHALL declare `supportedIrVersions` of exactly `["1.1.0"]`, because the prototype `1.0.0` document is the frozen FR-041 shape and is not a contract IR document.
- The `json-schema` backend SHALL declare `supportedIrVersions` of exactly `["1.1.0"]`.
- The seam SHALL write no file, so that file placement belongs to the caller and a package layout can change without editing a backend.
- The seam SHALL import no module under `src/compiler/frontend/`, so no frontend can influence what a backend emits.
- Every backend SHALL read each file through the injected host, reaching the file system through no other route.
- No backend SHALL read a clock, an environment variable, or a network socket.
- This requirement SHALL add every diagnostic code it introduces as a member of `DIAGNOSTIC_CODES` in `src/compiler/diagnostics.mjs`, which the FR-049 registry already owns.
- No call site SHALL spell a diagnostic code as a string literal.

### The declared qualification

- `src/compiler/backends/typescript-v1/target-contract.json` SHALL validate against `schema/semantic/v1/target-contract.schema.json`.
- That declaration SHALL carry the same member values as the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`, which is read and never edited.
- That declaration SHALL copy the row's `customSourceLicense` of `AGPL-3.0-or-later` verbatim, without correcting it to the `AGPL-3.0-only` the programme mandates, because `agent-ix/filament-core-data#57` records that disagreement and owns it; silently fixing a published fixture on the way through a backend is how a contract defect stops being visible.
- The backend SHALL honour the declared `unsupportedFeaturePolicy` of `fail` by emitting no file for a model carrying a representability loss.

### Target-selected command requests

- When the `generate` command receives `--target`, the command SHALL select the
  registered target before constructing `request.backend`.
- The command SHALL copy `identity`, `version`, `supportedIrVersions`, and
  `supportedFeatures` from the selected implementation into `request.backend`.
- If the selected target is declared-unimplemented, then the command SHALL
  still construct a schema-valid request using that target's registry identity
  and let the seam return its `BACKEND_NOT_IMPLEMENTED` diagnostic.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-063-CON-1 | This requirement SHALL NOT implement the `rust`, `python-pydantic-v2`, or `python-dataclass` targets; those belong to issues #21 and #23. | Scope | Inspection |
| FR-063-CON-2 | The declared `runtime-schema-validator` runtime dependency of the committed `typescript` target row SHALL be satisfied by the generated in-package validator of [FR-066](./FR-066-generate-runtime-validators.md), so the generated package's third-party runtime dependency count is zero. That is strictly stronger than the declaration and the committed fixture is not edited to say so. The consequence is recorded here rather than left to be discovered: the backend ships a self-declaration naming a runtime dependency it does not have, a reader comparing the declaration with the dependency closure will find them disagreeing, and correcting the fixture belongs to whoever owns `fixtures/semantic/v1/positive/target-contracts.json` and not to this ticket. The same fixture's `customSourceLicense` of `AGPL-3.0-or-later` is copied verbatim for the same reason and is recorded as `agent-ix/filament-core-data#57`. | Portability | Dependency-closure test |
| FR-063-CON-3 | The seam SHALL distinguish a caller defect, which throws, from a document defect, which is a diagnostic; no request document a package supplies can make the seam throw. | Safety | Fuzz |
| FR-063-CON-4 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making a backend a runtime entry point remains issue #11. | Non-disruption | Manifest comparison |
| FR-063-CON-5 | The seam SHALL NOT import `src/compiler/backends/typescript.mjs` or `src/compiler/backends/rust.mjs`; those consume the frozen FR-041 prototype IR and are a different contract, and reusing them here would make a prototype-shaped document reachable through the contract seam. | Integrity | Static analysis |
| FR-063-CON-6 | The narrow build interface of FR-052 SHALL keep exactly its fifteen symbols; this seam is reached by file path, as `src/compiler/inventory.json` records for every module under `src/compiler/`. | Non-disruption | Export-set test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-063-AC-1 | `BACKEND_TARGETS` equals the `target` enum read from `common.schema.json`; a test that reads both fails when either changes alone. | Test |
| FR-063-AC-2 | `selectBackend("spec-bundle")` throws a `TypeError` naming the value and the five permitted targets. | Unit |
| FR-063-AC-3 | A target registered as declared-unimplemented returns `state: "unavailable"`, zero files, and one blocking `agent-ix.compiler.BACKEND_NOT_IMPLEMENTED` diagnostic naming its registered owner, exercised over a synthetic registration so the criterion does not depend on which targets a sibling ticket has since implemented. | Unit |
| FR-063-AC-4 | A request missing a required member returns `state: "invalid"` with one diagnostic per schema error, each located at the failing instance pointer, and emits no file. | Unit |
| FR-063-AC-5 | Every manifest `generateTarget` returns — for a valid request, an invalid request, an unimplemented target, and a model carrying declared loss — validates against `output-manifest.schema.json`. | Property |
| FR-063-AC-6 | For the fixture request, `requestFingerprint` equals the digest of the canonicalized request and `normalizedFingerprint` equals `fingerprintIr` of its `ir`, both recomputed independently in the test. | Unit |
| FR-063-AC-7 | Each `files[]` entry of a successful generation names a path under `outputRoot`, a digest equal to the SHA-256 of its formatted bytes, a media type, and a non-empty identity set — the rendered definitions' identities for a file that renders definitions, and the package identity for `package.json` and `LICENSE`, which render none. | Integration |
| FR-063-AC-8 | A stub backend missing any one of `identity`, `version`, `supportedIrVersions`, `supportedFeatures`, or `generate` is rejected by `assertBackendContract`, once per omitted member. | Unit |
| FR-063-AC-9 | A stub backend returning a file path outside `outputRoot` is rejected by `assertBackendContract`. | Unit |
| FR-063-AC-10 | A request whose `contractVersion` is `1.0.0` against the `typescript` backend returns `state: "unsupported"` naming the version and emits no file. | Unit |
| FR-063-AC-11 | `src/compiler/backends/typescript-v1/target-contract.json` validates against `target-contract.schema.json` and its member values equal the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`. | Test |
| FR-063-AC-12 | No module under `src/compiler/backends/` imports a module under `src/compiler/frontend/`, and `seam.mjs` imports neither `backends/typescript.mjs` nor `backends/rust.mjs`. | Analysis |
| FR-063-AC-13 | Every read performed during a fixture generation is observed by the injected host, and a backend that bypasses it fails the seam's own contract test. | Test |
| FR-063-AC-14 | No module under `src/compiler/backends/typescript-v1/` matches `Date.now`, `new Date`, `process.env`, `process.cwd`, `node:fs`, `node:net`, or `node:https`. | Static |
| FR-063-AC-15 | Over 256 mutated request documents the seam returns an `output-manifest.schema.json`-valid manifest and never throws. | Fuzz |
| FR-063-AC-16 | Every diagnostic code this requirement emits is a member of `DIAGNOSTIC_CODES`, which lives in `src/compiler/diagnostics.mjs` and outside `src/compiler/backends/`; and the only two modules under `src/compiler/backends/` that spell the literal prefix `agent-ix.` are `typescript-v1/admit.mjs`, which declares the FR-068 admissibility register, and `typescript-v1/loss.mjs`, which declares the FR-068 representability register. | Static |
| FR-063-AC-17 | A request naming `typescript` over a fixture document the backend admits with `success` and can fully represent returns `state: "success"`, one `files[]` entry per emitted file, and no blocking diagnostic. | Integration |
| FR-063-AC-18 | A request over a document whose admissibility result is `lossy` returns `state: "lossy"` with the same file set a `success` document of the same shape produces, while a document carrying a representability loss returns `state: "unsupported"` with zero files. | Unit |
| FR-063-AC-19 | Every entry of the registry names an owning issue or upstream component, and `isBackendImplemented` agrees with the presence of an implementation on that entry for all five targets. | Unit |
| FR-063-AC-20 | Every emitted file's `files[]` digest equals the SHA-256 of the text after `options.format` ran, and a generation given a formatter that uppercases its input produces digests that differ from the same generation given the identity formatter. | Unit |
| FR-063-AC-21 | `seam.mjs` and every module it imports below the injected formatter start no child process, asserted by an instrumented `node:child_process` during a fixture generation. | Test |
| FR-063-AC-22 | The `json-schema` registry entry is implemented, owned by `agent-ix/filament-core-data#85`, and a CLI request for it carries the registered backend declaration rather than the TypeScript declaration. | Test (TC-1360) |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Downstream**: [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #85 JSON Schema backend, issue #21 Rust backend, issue #23 Python backend, issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions this requirement records rather than decides**: `agent-ix/filament-core-data#57`, the committed target contract's `AGPL-3.0-or-later` against the programme's `AGPL-3.0-only`; and the `runtime-schema-validator` runtime dependency the same row declares. Neither is corrected here. `agent-ix/filament-core-data#59` records that the closed issue #9 can no longer own the contract-gap register and asks for a live owner.
