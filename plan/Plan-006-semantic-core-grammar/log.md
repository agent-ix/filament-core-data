---
type: log
title: "Plan-006 — Update Log"
description: "Chronological log of changes to the Plan-006 bundle."
---
# Plan-006 — Update Log

## History

* **2026-09-03** — Plan created from the validated issue #35 specification (US-007, FR-031..034, NFR-014, TC-248..279, SR-037..044) with seven tasks: red baseline, grammar package on the critical path, projection and reader in parallel, lowering join, doc amendments, review gate.
* **2026-09-03** — Tasks 041–046 done. Grammar package `packages/semantic-core/` (21 models incl. the eleven constraint models, `ConstraintDecl` union, 4 enums, 4 scalars; `inventory.json`) compiles clean on TypeSpec 1.15.0 from the root toolchain; official JSON Schema projection committed with `toolchain.json` (30 files; #31 normalization recorded as a no-op — the grammar emits no relative `$id`; output piped through biome so `pnpm format` is idempotent); FR-006 declaration set, 36 shape negatives (≥1 per declaration), 14 reader-rule negatives; `kernel-scalars.json`; `test/semantic-core-reader.ts`; `lowering.json` (62 rows, all `loss: none`) and `test/semantic-core-lowerer.ts` producing `config-version-lowered.json`, validated by both IR readers (Python reader gained `--read/--export`) and structurally equal to the issue #34 fixture; ARCH-005 and ADR-0002 amended one paragraph each. TC-274 manual inspection: both amendments are exactly one paragraph and name the grammar and the module-vocabulary rule — pass. Spec gap closed during implementation: FR-034 now states an absent `TypeRef.multiplicity` lowers to `1..1`. Vitest 114/114, pytest 4/4, lint clean, `make semantic-core-check` green. Task-047 (review, gap analysis, PR) remains.
