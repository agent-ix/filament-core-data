---
id: FR-045
title: "Define the frontend seam and dialect registry"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: "depends_on"
---
# [FR-045] Define the frontend seam and dialect registry

## Description

The compiler SHALL reach every authoring dialect through one seam, so that a
frontend is selected by its declared `source.dialect` value rather than by the
call site, and a dialect the repository has not implemented is named and
refused rather than guessed at.

## Inputs

- A `FrontendRequest`: `{ dialect, packageRoot, entrypoint, sourceIdentity, packagePath, limits }`
- The closed `frontendDialect` vocabulary of `schema/semantic/v1/common.schema.json`: `typespec` and `spec-bundle`
- Shared frontend fixture cases under `fixtures/compiler/shared/`

## Outputs

- `src/compiler/frontend/seam.mjs` exporting `FRONTEND_DIALECTS`, `selectFrontend(dialect)`, and `runFrontend(request)`
- A `FrontendResult`: `{ ir, diagnostics }`, where `ir` is `null` whenever any diagnostic is blocking
- `src/compiler/frontend/typespec/frontend.mjs`, the implemented `typespec` frontend (FR-046)
- `src/compiler/frontend/spec-bundle/frontend.mjs`, the declared-unimplemented `spec-bundle` frontend
- `fixtures/compiler/shared/cases.json`, the shared fixture manifest naming, per case, one source tree per dialect and the expected normalized IR

## Behavior

- The seam SHALL expose exactly the dialects named in the `frontendDialect` vocabulary and no other.
- If a caller names a dialect outside that vocabulary, then `selectFrontend` SHALL throw a usage error naming the value and the permitted set.
- If a caller names a dialect the repository has registered but not implemented, then `runFrontend` SHALL return `{ ir: null, diagnostics: [one blocking diagnostic] }` whose code is `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` and whose message names the issue that owns the dialect.
- Every frontend SHALL return a `FrontendResult` for every input, defective or not.
- No frontend SHALL throw for an input defect; an input defect is a diagnostic.
- Every frontend SHALL stamp `source.dialect` with its own dialect value.
- No frontend SHALL accept `source.dialect` as a parameter.
- The seam SHALL NOT import any module under `src/compiler/backends/`, so no target backend can influence which IR a frontend produces.
- The shared fixture harness SHALL run every case in `fixtures/compiler/shared/cases.json` through every *implemented* dialect for which the case supplies a source tree.
- The harness SHALL compare those results by the normalized serialization of FR-050 rather than by raw bytes.
- Where a shared case supplies a source tree for exactly one implemented dialect, the harness SHALL record that case as single-dialect rather than reporting cross-dialect agreement it did not observe.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-045-CON-1 | The seam SHALL NOT implement the `spec-bundle` frontend; that work is issue #36. The registration exists so the harness and the diagnostic exist before the frontend does. | Scope | Inspection |
| FR-045-CON-2 | A `FrontendResult` SHALL carry `ir: null` whenever any of its diagnostics is `blocking`, so no caller can consume a partial document as a complete one. | Safety | Test |
| FR-045-CON-3 | No frontend SHALL read a decorator defined by `@typespec/json-schema`, `@typespec/protobuf`, `@typespec/openapi`, or any other target-facing library as the authority for an IR value. | Portability | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-045-AC-1 | `FRONTEND_DIALECTS` equals the `frontendDialect` enum read from `common.schema.json`; a test that reads both fails when either changes alone. | Test |
| FR-045-AC-2 | `selectFrontend("json-schema")` throws naming the value and the two permitted dialects. | Test |
| FR-045-AC-3 | `runFrontend` for `spec-bundle` returns `ir: null` and exactly one blocking diagnostic coded `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` whose message contains `#36`. | Test |
| FR-045-AC-4 | For a package whose TypeSpec sources fail to compile, the `typespec` frontend returns diagnostics and `ir: null` and does not throw. | Test |
| FR-045-AC-5 | Every shared fixture case runs through every implemented dialect it supplies, and each case's result is recorded as either cross-dialect agreement or single-dialect. | Test |
| FR-045-AC-6 | No file under `src/compiler/frontend/` imports a module under `src/compiler/backends/`, and no frontend imports `@typespec/json-schema`, `@typespec/protobuf`, or `@typespec/openapi`. | Analysis |
| FR-045-AC-7 | A frontend that returns a blocking diagnostic together with a non-null `ir` fails the seam's own contract test. | Test |

## Dependencies

- **Upstream**: [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), [FR-041](./FR-041-promote-the-semantic-ir-emitter.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), issue #36 spec-bundle frontend
