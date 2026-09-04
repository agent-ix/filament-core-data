---
id: Task-100
title: "Backend seam, target registry, and the red suites"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-745"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-746"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-747"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-748"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-749"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-750"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-751"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-752"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-753"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-754"
    type: verifies
---
# Task-100: Backend seam, target registry, and the red suites

## Scope

Land the generation seam, the closed target registry, the declared TypeScript target contract, and the failing suite every later task turns green — before any code generator exists.

## Subtasks

- [ ] Author `src/compiler/backends/targets.mjs` and its `.d.mts`, reading the closed `target` vocabulary out of `schema/semantic/v1/common.schema.json` through the injected host rather than restating it, as `src/compiler/dialects.mjs` already does for `frontendDialect`.
- [ ] Author `src/compiler/backends/seam.mjs` and its `.d.mts` exporting `BACKEND_TARGETS`, `selectBackend(target)`, `isBackendImplemented(target)`, `assertBackendContract(backend)`, and `generateTarget(request, options)`, where `options` carries the injected `format(text, path)`.
- [ ] Register all five declared targets. Only `typescript` is implemented; `rust`, `python-pydantic-v2`, `python-dataclass` and `json-schema` are registered as declared-unimplemented naming their owning issue, on the `src/compiler/frontend/spec-bundle/` precedent.
- [ ] Make `selectBackend` throw a `TypeError` naming the value and the five permitted targets for a value outside the vocabulary — a caller defect — while every defect in a submitted request document is a diagnostic and never a throw.
- [ ] Validate the request against `compiler-request.schema.json` before dispatch; return `state: "invalid"` with one diagnostic per schema error at the failing instance pointer.
- [ ] Return an `output-manifest.schema.json`-valid document for every request including every failing one, computing `requestFingerprint` from the canonicalized request and `normalizedFingerprint` from the request's `ir`.
- [ ] Implement the `files[]` reconciliation, including the convention that a file rendering no type definition — `package.json` and `LICENSE` — carries the package's own identity minted as `ix://<owner>/<name>` so `semanticIdentities` is never empty.
- [ ] Add `BACKEND_NOT_IMPLEMENTED` and the other new members to `DIAGNOSTIC_CODES` in `src/compiler/diagnostics.mjs`, and regenerate `docs/semantic-data-system/compiler-diagnostics.md` with `node scripts/build-compiler-docs.mjs`.
- [ ] Author `src/compiler/backends/typescript-v1/index.mjs`, `index.d.mts` and `target-contract.json`, copying the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json` member for member — including the `runtime-schema-validator` runtime dependency and the `AGPL-3.0-or-later` licence string, neither of which this ticket corrects.
- [ ] Author `test/typescript-backend.test.ts` with the failing skeletons for TC-745..844, so every later task turns a real red gate green rather than adding a green one.

## Deliverables

- `src/compiler/backends/seam.mjs`, `seam.d.mts`
- `src/compiler/backends/targets.mjs`, `targets.d.mts`
- `src/compiler/backends/typescript-v1/index.mjs`, `index.d.mts`, `target-contract.json`
- New `DIAGNOSTIC_CODES` members and the regenerated `docs/semantic-data-system/compiler-diagnostics.md`
- `test/typescript-backend.test.ts` (failing skeleton)

## Notes

- `src/compiler/index.mjs` keeps exactly its fifteen symbols; the seam is reached by file path, as `src/compiler/inventory.json` records for every module under `src/compiler/`. Adding a sixteenth export fails FR-052-CON-1.
- `docs/semantic-data-system/compiler-diagnostics.md` is generated, not written. It is one of the four artifacts issues #21 and #23 also regenerate; on rebase it is regenerated from the rebased tree and never merged textually. Issue #63 owns the reconciliation.
- The target contract's `runtimeDependencies` names `runtime-schema-validator` while the generated package's third-party runtime dependency count is zero, and its licence string is `AGPL-3.0-or-later` where the programme mandates `AGPL-3.0-only` — issue #57. Both are the committed fixture's wording and are recorded here rather than silently corrected.
- Never weaken a gate to get green. If a skeleton assertion cannot be satisfied, the requirement is wrong and gets fixed, or the finding is escalated.
