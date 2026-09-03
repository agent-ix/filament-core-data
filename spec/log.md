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
* **2026-09-03** — Issue #34: added US-006, FR-027 (multiplicity and units), FR-028 (relationships, operations, clauses), FR-029 (closed constraint vocabulary), FR-030 (source dialect and manifest target binding), NFR-013 (additive IR revision); amended FR-020 Behavior and AC-7/AC-8; spec.md scope updated for IR v1.1.
