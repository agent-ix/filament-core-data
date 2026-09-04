---
id: Plan-006
title: "Semantic-core L3 declaration grammar and kernel scalar library"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-033"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-034"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-014"
    type: references
---
# Implementation Plan: Semantic-core declaration grammar

Issue: `agent-ix/filament-core-data#35`. Reviews: SR-037..044 under
`spec/reviews/35-semantic-core-grammar/`. Predecessor bundle: Plan-005 (IR v1.1).

## Requirements Summary

### Stakeholder and User Requirements

- [x] **StR-001:** Keep the shared kernel small and governed while every module gets one declaration grammar.
- [x] **US-007:** Let module maintainers declare archetypes against one shared grammar and a closed scalar set.

### Functional Requirements

- [x] **FR-031:** Grammar declarations in `packages/semantic-core/` with an exact inventory, IR-aligned patterns, closed vocabularies, and reader-enforced cross-property rules.
- [x] **FR-032:** `kernel-scalars.json` representation table, `unitAllowed`, decimal policy, no `Any`.
- [x] **FR-033:** Official JSON Schema emission, pinned #31 normalization recorded in `toolchain.json`, FR-006 `FieldDecl[]` fixture, per-model negatives, byte-identical `check`.
- [x] **FR-034:** `lowering.json`, reference lowerer, identity minting, alias-per-constrained-field, lowered FR-006 document validated by both IR readers.

### Non-Functional Requirements

- [x] **NFR-014:** Kernel equals the inventory; ARCH-005/ADR-0002 one-paragraph amendments; no spike, backend, lockfile, workspace, or corpus change; official emitters only.

## Dependency Graph

```text
Task-041 -> Task-042 -> Task-043 -> Task-045 --\
                    \                          +-> Task-047
                     +-> Task-044 ------------/
Task-041 -> Task-046 -------------------------/
```

- Task-041 fixes the red suite, the changed-path guard for `packages/` and `fixtures/semantic-core/`, and the spike baseline before any package file exists.
- Task-042 lands the compiled grammar and `inventory.json`; every later task reads the compiled program.
- Task-043 (projection and fixtures) and Task-044 (scalar table and grammar reader) touch disjoint files and run in parallel after Task-042.
- Task-045 needs the emitted schemas (for the fixture) and the reader (for clean reads) and so follows both.
- Task-046 (amendments) depends only on the inventory existing to cite.
- Task-047 is the closing gate: code review, gap analysis, PR.

### Cross-cutting constraints

- NFR-014 permits `packages/semantic-core/**`, `fixtures/semantic-core/**`, the two one-paragraph doc amendments, `spec/`, `test/`, `tests/`, `Makefile` targets, `package.json` scripts, `plan/`, `reviews/`, `spec/reviews/`.
- No `pnpm-workspace.yaml`, no `pnpm-lock.yaml` change, no `spikes/`, `src/`, or corpus edit. Compile with the root-installed `@typespec/compiler` 1.15.0 (`pnpm exec tsp compile packages/semantic-core`).
- Custom emitters are prohibited; the semantic-core reader and reference lowerer are test-scoped TypeScript under `test/`.

## The Seams

The grammar lives in `packages/semantic-core/main.tsp` with `tspconfig.yaml`
selecting `@typespec/json-schema` only. Emitted schemas land in
`packages/semantic-core/generated/json-schema/` with `toolchain.json`. The
inventory, scalar table, and lowering table are JSON beside the source. The
compiled-program inventory test uses the TypeSpec compiler API from
`test/`. Fixtures attach under `fixtures/semantic-core/{positive,negative}/`.
The lowered FR-006 document is compared with the issue #34
`config-version-v1-1.json` and validated by `test/semantic-ir-v1-1-reader.ts`
and `tests/semantic_ir_reader.py`.

## Test Plan

- [x] **TC-275, TC-278:** changed-path guard, spike byte-identity.
- [x] **TC-248, TC-249, TC-251..254, TC-273, TC-276:** compile, inventory, vocabulary parity, no untyped property, additive regeneration, package placement, official emitters.
- [x] **TC-250, TC-259, TC-261..266:** keyword schema, fixture targets, emitted files, FR-006 fixture validation, negatives, determinism, toolchain pin, normalization isolation.
- [x] **TC-255..258, TC-260, TC-277:** scalar table, reader rules, `Any` rejection, corpus family, grammar-rule negatives.
- [x] **TC-267..272, TC-279:** lowering table, lowerer, structural parity, `UnitSymbol`, decimal lowering, loss gate, two-reader validation.
- [x] **TC-274:** amendments.

### Entrance Criteria

- US-007, FR-031..034, NFR-014, TC-248..279, SR-037..044 validate with Quire (done 2026-09-03).
- `pnpm test` 87/87 and `poetry run pytest` 4/4 on the base commit.

### Exit Criteria

- All 32 issue #35 cases pass; the 247 prior cases pass unchanged.
- `spike:typespec:check` diff empty; `pnpm-lock.yaml` unchanged; no `spikes/`, `src/`, or corpus path in the diff.
- Code review and gap analysis report no blocking finding; PR carries a "mergeable" comment.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-041** Red suite, guards, and spike baseline — Medium.
- **A2 = Task-042** Grammar package and inventory — Hard; exit: zero diagnostics, inventory equality, vocabulary parity.
- **A3 = Task-043** JSON Schema projection, toolchain pin, and fixtures — Hard; exit: FR-006 fixture validates, negatives fail, regeneration byte-identical.
- **A4 = Task-045** Lowering table, reference lowerer, lowered fixture — Hard; exit: structural parity with `config-version-v1-1.json`, both readers clean.

### Track B: Parallel after the grammar

- **B1 = Task-044** Kernel scalar table and grammar reader — Medium; exit: reader rejects every grammar-rule negative, table complete.
- **B2 = Task-046** ARCH-005 and ADR-0002 amendments — Small.

### Track C: Gate

- **Gate = Task-047** Review, gap analysis, PR — closes when the "mergeable" comment is posted.

## Parallel Execution Summary

```text
time ->  Task-041 -> Task-042 -> Task-043 -> Task-045 --\
                              Task-044 ---------------+-> Task-047
                     Task-046 ------------------------/
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-041 | A | NFR-014 | TC-275, TC-278 | done |
| Task-042 | A | FR-031 | TC-248, TC-249, TC-251..254, TC-273, TC-276 | done |
| Task-043 | A | FR-033 | TC-250, TC-259, TC-261..266 | done |
| Task-044 | B | FR-032, FR-031 | TC-255..258, TC-260, TC-277 | done |
| Task-045 | A | FR-034 | TC-267..272, TC-279 | done |
| Task-046 | B | NFR-014 | TC-274 | done |
| Task-047 | Gate | US-007, NFR-014 | — | todo |

## Coordination Rules

- Task-042 alone edits `main.tsp` and `inventory.json`; later tasks add JSON tables, fixtures, generated output, and tests.
- The reader and lowerer are test evidence under `test/`; nothing under `packages/semantic-core/` executes.
- Regenerate the projection only through `make semantic-core-generate`; commit `generated/` and `toolchain.json` together.
- Merge sequencing: Tasks 041..046 on `spec/35-semantic-core-l3-grammar`, then `/code-review` and `/gap-analysis`, then the "mergeable" comment and squash merge verified on the tree.
