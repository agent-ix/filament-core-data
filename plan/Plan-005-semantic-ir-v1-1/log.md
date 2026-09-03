---
type: log
title: "Plan-005 — Update Log"
description: "Chronological log of changes to the Plan-005 bundle."
---
# Plan-005 — Update Log

## History

* **2026-09-03** — Plan created from the validated issue #34 specification (US-006, FR-027..030, NFR-013, FR-020-AC-7/8, TC-203..247, SR-027..034) with seven tasks: a red baseline, the version discriminator on the critical path, two parallel node-family tasks, a join on the `ConfigVersion` worked example, and a closing two-reader gate.
* **2026-09-03** — Task-034 done: four changed-path guards extended for issue #34, v1 fixture digest baseline recorded, `test/semantic-ir-v1-1.test.ts` added with baseline/guard cases green and the schema inventory case red. Host note: `test/contract-census.test.ts` locus check is bound to the macOS paths recorded in the census snapshot and fails on this Linux host; `spike:typespec:check` diverges at `Cargo.lock` under cargo 1.94.1 on this host. Both pre-date the branch; TC-234 is discharged by the spikes/ diff guard.
* **2026-09-03** — Task-035 done: `contractVersion` enum `1.0.0|1.1.0` in one schema file, `source.dialect` conditional on it (`typespec|spec-bundle` under 1.1.0), generated-target and representation-format registries defined once in `common.schema.json` and referenced by manifest, target-contract, and representation schemas. Finding: the frozen v1 manifest fixture selects `markdown`, so manifest targets bind to the declared registry (targets ∪ formats), not the five-value enum alone; FR-030 amended. TC-227..230, TC-246 green.
* **2026-09-03** — Task-036 done: `multiplicity`/`unit` on `field`, `1.1.0` requires multiplicity via a root conditional, cross-field rules (derived presence, bounds, flags, unit-on-scalar through aliases, unresolved typeRef) and the normalized serialization in `test/semantic-ir-v1-1-reader.ts`; golden `semantic-ir-v1-1.json` extended; reader-cases.json added; multiplicity/unit corpus families. TC-203..208, TC-237, TC-238 green.
* **2026-09-03** — Task-037 done: `constraint` is a `oneOf` over six keyword groups with typed, closed operands; applicability, ISO-vs-number bound operands, and ecma-262 regex compilation live in the reader; one golden constraint per keyword; vocabulary and v1 → v1.1 (`additive`, node list) corpus entries. TC-219..225, TC-235, TC-244, TC-245 green.
* **2026-09-03** — Task-038 done: `relationship`, `operation`, `clause` node schemas on `typeDefinition` (record-only for the first two), opaque clause `text` with conditional `sourceSpan`, reader rules for target resolution against document or lock exports, composite acyclicity, `clauseId` uniqueness and binding, param/identity uniqueness, language form; FR-040 registry parity test reads the installed `spec-artifacts-iso` manifest; nine node-family corpus entries. TC-210..217, TC-239..243 green.
