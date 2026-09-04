---
type: log
title: "filament-core-data specification update log"
description: "Chronological log of structural changes to the requirements bundle."
---
# filament-core-data specification update log

## History

* **2026-08-29** — Initialized the semantic data architecture requirements bundle for issue #8.
* **2026-08-29** — Added the read-only Filament contract-census requirements for issue #10.
* **2026-08-29** — Added the pinned, isolated TypeSpec feasibility and structural-schema decision requirements for issue #4.
* **2026-08-30** — Added the issue #9 semantic IR, package, mapping, representation, generated-target, compatibility, and non-disruption requirements.
* **2026-09-03** — Issue #30: recorded the owner decision (TypeSpec is the structural source, ADR-0005). Removed the JSON Schema fallback and the "owns and funds the compensation" pass condition from FR-018 and US-004; retitled FR-018.
* **2026-09-03** — Issue #9: FR-019 and US-005 rewritten from the JSON Schema fallback to TypeSpec as the v1 structural source per ADR-0005; TC-199 resolved by the owner decision on issue #4. The 13 contract schemas are unchanged.
* **2026-09-03** — Issue #30 (follow-up): removed the remaining JSON Schema fallback mandate from FR-007 (behavior, AC-2), FR-008-AC-4, and US-002 (EX-1, AC-1); TC-026/TC-032/TC-036 retitled.
* **2026-09-03** — Issue #34 (Task-035): FR-030 manifest-target binding widened from the five-value generated-target enumeration to the declared registry (generated targets ∪ representation formats) because the frozen v1 manifest fixture selects `markdown`; TC-229/TC-230 retitled.
* **2026-09-03** — Issue #34: added US-006, FR-027 (multiplicity and units), FR-028 (relationships, operations, clauses), FR-029 (closed constraint vocabulary), FR-030 (source dialect and manifest target binding), NFR-013 (additive IR revision); amended FR-020 Behavior and AC-7/AC-8; spec.md scope updated for IR v1.1.
* **2026-09-03** — Issue #35: added US-007, FR-031 (declaration grammar in TypeSpec), FR-032 (kernel scalar library), FR-033 (JSON Schema projection with the #31 normalization pinned), FR-034 (lowering to IR v1.1 with zero loss; UCUM `UnitSymbol` carries SR-036 FND-113), NFR-014 (small kernel discipline); spec.md scope updated.
* **2026-09-03** — Issue #20: added US-008, FR-035 (conformance corpus, versioning, minimization, provenance), FR-036 (independent JSON-level semantic oracle), FR-037 (differential harness, adapter registry, divergence register), FR-038 (construct register with four case classes per row), FR-039 (coverage accounting, promotion thresholds, import API), NFR-015 (blessing-free deterministic evidence), NFR-016 (isolated corpus); spec.md scope updated. Ids were allocated against `main` at 8425a14; issue #27 had allocated none.
* **2026-09-03** — Issue #20 (review pass): SR-047..054 findings applied. The case input became an input bundle composing the published package, lock, mapping, profile, and consumer-policy schemas; expected diagnostics became `common.schema.json#/$defs/diagnostic` documents with the pointer as corpus metadata; a diagnostic-code register was added; the alias cycle and the depth bound were separated; `resultState` was made exhaustive and disjoint; the compatibility classification was scoped to the IR surface with a declared restrictiveness order; the harness lost its clock; the divergence register gained an owner and a verdict and a sibling contract-gap register; the `./conformance` package export was dropped to issue #11; and the construct register grew to 22 families with a justified `notApplicable` escape. TC rows became TC-280..341.
