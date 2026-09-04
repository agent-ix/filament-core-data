---
id: Task-072
title: "Frontend seam and dialect registry"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-398"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-399"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-400"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-401"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-402"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-403"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-404"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-405"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-406"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-407"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-408"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-409"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-410"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-411"
    type: verifies
---
# Task-072: Frontend seam and dialect registry

## Scope

One seam, two registered dialects, one implemented, and the shared fixture harness issue #36 will plug into.

## Subtasks

- [ ] `src/compiler/frontend/seam.mjs`: `FRONTEND_DIALECTS` read from `common.schema.json`, `selectFrontend` throwing a `TypeError` for a value outside the vocabulary, `runFrontend` returning a `FrontendResult`.
- [ ] `src/compiler/frontend/spec-bundle/frontend.mjs`: one blocking `FRONTEND_NOT_IMPLEMENTED` naming issue #36.
- [ ] The seam's own contract test: `ir` is null whenever any diagnostic is blocking; a frontend that returns both fails; no frontend reaches the file system except through `request.host`.
- [ ] `fixtures/compiler/shared/cases.json` and its source trees, with the harness recording each case as cross-dialect or single-dialect.
- [ ] Fuzz the seam over 256 mutated inputs and assert it never throws.

## Deliverables

- `seam.mjs`, the `spec-bundle` stub, the shared fixture harness, and their tests.

## Notes

- The harness reports single-dialect honestly. The issue #19 acceptance criterion on cross-frontend equivalence completes with issue #36, and `spec/tests.md` says so rather than claiming agreement it never observed.
