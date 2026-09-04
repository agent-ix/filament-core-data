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
* **2026-09-03** — Issue #27: added US-009, FR-040 (prototype disposition inventory), FR-041 (promoted semantic-IR emitter and narrow build interface), FR-042 (TypeScript and Rust backends), FR-043 (governed Python JSON Schema adapter), FR-044 (frozen-spike replay with one declared evidence delta), NFR-017 (deterministic promoted compilation, including the retained Rust lockfile seeding fix), NFR-018 (non-disruptive promotion and clean rollback); spec.md scope updated. Ids skip US-008, FR-035..039 and NFR-015..016, which the parallel issue #20 conformance-corpus branch allocated first.
* **2026-09-04** — Issue #19: added US-010, FR-045 (frontend seam and dialect registry), FR-046 (TypeSpec lowering to contract IR 1.1.0 with the semantic decorator library), FR-047 (package graph resolution with exact JSON loci), FR-048 (lock, canonicalization, and v1 fingerprint), FR-049 (closed diagnostic registry, ordering, and limits), FR-050 (IR validation, normalization, and fingerprint), FR-051 (compatibility diff and IR schema-evolution projections), FR-052 (`compile`, `inspect`, and `diff` commands); NFR-019 (deterministic contract compilation), NFR-020 (bounded and safe compilation of untrusted inputs), NFR-021 (non-disruptive compiler core); spec.md scope updated. FR-046-CON-1 declares that the frozen FR-041 prototype IR is retained unchanged and the contract IR is a second lowering beside it, so no issue #4 golden is regenerated. Ids skip US-008, FR-035..039 and NFR-015..016, which the parallel issue #20 branch allocated first.
* **2026-09-04** — Issue #19 (follow-up): NFR-021 re-scoped from "the whole branch" to this change's own path set, fixed at both ends by history, after issue #20 measured the gate annexing a later ticket's paths and failing issue #19 for them; added NFR-021-AC-10 (a later change adds no path to this change's set) and TC-644. No permitted or prohibited path changed.
