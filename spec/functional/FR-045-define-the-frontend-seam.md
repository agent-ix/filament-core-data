---
id: FR-045
title: "Define the frontend seam and dialect registry"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-045] Define the frontend seam and dialect registry

## Description

The compiler SHALL reach every authoring dialect through one seam, so that a
frontend is selected by its declared `source.dialect` value rather than by the
call site, and a dialect the repository has not implemented is named and
refused rather than guessed at.

## Inputs

- A `FrontendRequest`: `{ dialect, resolution, entrypoint, limits, host }`, where
  - `dialect` selects the frontend and is never copied into the emitted document,
  - `resolution` is the FR-047 package-graph result, carrying the root package root, its manifest and digests, the selected profile, and the exported type identities of every resolved package,
  - `entrypoint` is the package-root-relative path of the dialect's entry file,
  - `limits` is the FR-049 limits record,
  - `host` is the injected file-system and module host of NFR-019 and NFR-020.
- The closed `frontendDialect` vocabulary of `schema/semantic/v1/common.schema.json`: `typespec` and `spec-bundle`
- Shared frontend fixture cases under `test/fixtures/compiler/shared/`

## Outputs

- `src/compiler/frontend/seam.mjs` exporting `FRONTEND_DIALECTS`, `selectFrontend(dialect)`, `isImplemented(dialect)`, `assertFrontendContract(dialect, result)`, and `runFrontend(request)`
- `src/compiler/dialects.mjs`, which reads the closed vocabulary from the published `common.schema.json`; it lives outside `frontend/` because no module under that directory may touch `node:fs`
- A `FrontendResult`: `{ ir, diagnostics }`, where `ir` is `null` whenever any diagnostic is blocking
- `src/compiler/frontend/typespec/frontend.mjs`, the implemented `typespec` frontend (FR-046, FR-053)
- `src/compiler/frontend/spec-bundle/frontend.mjs`, the declared-unimplemented `spec-bundle` frontend
- `test/fixtures/compiler/shared/cases.json`, the shared fixture manifest naming, per case, one source tree per dialect and the expected normalized IR
- `test/fixtures/compiler/shared/**`, the shared source trees those cases name

## Behavior

- The seam SHALL expose exactly the dialects named in the `frontendDialect` vocabulary and no other.
- If a caller names a dialect outside that vocabulary, then `selectFrontend` SHALL throw a `TypeError`, because a dialect that is not in the closed vocabulary is a defect in the calling program rather than in a compiled input.
- If a caller names a dialect the repository has registered but not implemented, then `runFrontend` SHALL return `{ ir: null, diagnostics: [one blocking diagnostic] }` whose code is `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` and whose message names the issue that owns the dialect.
- Every frontend SHALL return a `FrontendResult` for every input, defective or not.
- No frontend SHALL throw for a defect in a compiled input; an input defect is a diagnostic.
- Every frontend SHALL stamp `source.dialect` with its own dialect value.
- No frontend SHALL read `request.dialect` when stamping `source.dialect`, so a frontend cannot be made to claim another dialect's identity.
- Every frontend SHALL read every file through `request.host`, reaching the file system through no other route.
- The seam SHALL NOT import any module under `src/compiler/backends/`, so no target backend can influence which IR a frontend produces.
- The shared fixture harness SHALL run every case in `test/fixtures/compiler/shared/cases.json` through every *implemented* dialect for which the case supplies a source tree.
- The harness SHALL compare those results by the normalized serialization of FR-050 rather than by raw bytes.
- Where a shared case supplies a source tree for exactly one implemented dialect, the harness SHALL record that case as single-dialect rather than reporting cross-dialect agreement it did not observe.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-045-CON-1 | The seam SHALL NOT implement the `spec-bundle` frontend; that work is issue #36. The registration exists so the harness and the diagnostic exist before the frontend does. | Scope | Inspection |
| FR-045-CON-2 | A `FrontendResult` SHALL carry `ir: null` whenever any of its diagnostics is `blocking`, so no caller can consume a partial document as a complete one. | Safety | Property test |
| FR-045-CON-3 | No frontend SHALL read a decorator defined by `@typespec/json-schema`, `@typespec/protobuf`, `@typespec/openapi`, or any other target-facing library as the authority for an IR value. | Portability | Static analysis |
| FR-045-CON-4 | The seam SHALL distinguish a caller defect, which throws, from an input defect, which is a diagnostic; no input a package supplies can make the seam throw. | Safety | Fuzz |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-045-AC-1 | `FRONTEND_DIALECTS` equals the `frontendDialect` enum read from `common.schema.json`; a test that reads both fails when either changes alone. | Test |
| FR-045-AC-2 | `selectFrontend("json-schema")` throws a `TypeError` naming the value and the two permitted dialects. | Test |
| FR-045-AC-3 | `runFrontend` for `spec-bundle` returns `ir: null` and exactly one blocking diagnostic coded `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` whose message contains `#36`. | Test |
| FR-045-AC-4 | For a package whose TypeSpec sources fail to compile, the `typespec` frontend returns diagnostics and `ir: null` and does not throw. | Test |
| FR-045-AC-5 | Every shared fixture case runs through every implemented dialect it supplies, and each case's result is recorded as either cross-dialect agreement or single-dialect. | Test |
| FR-045-AC-6 | No file under `src/compiler/frontend/` imports a module under `src/compiler/backends/`, and no frontend imports `@typespec/json-schema`, `@typespec/protobuf`, or `@typespec/openapi`. | Analysis |
| FR-045-AC-7 | A frontend that returns a blocking diagnostic together with a non-null `ir` fails the seam's own contract test. | Test |
| FR-045-AC-8 | A `FrontendRequest` carrying a `resolution` for a package with two exports makes both export identities visible to the frontend, proving the seam and not the frontend owns package resolution. | Test |
| FR-045-AC-9 | Every read a frontend performs during a fixture compile is observed by the injected `host`, and a frontend that bypasses it fails the seam's own contract test. | Test |
| FR-045-AC-10 | Over 256 mutated inputs the seam returns a `FrontendResult` and never throws. | Fuzz |

## Dependencies

- **Upstream**: [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-053](./FR-053-declare-the-typespec-semantic-vocabulary.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), issue #36 spec-bundle frontend
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
