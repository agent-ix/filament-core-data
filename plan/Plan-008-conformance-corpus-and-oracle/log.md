---
type: log
title: "Plan-008 — Update Log"
description: "Chronological log of changes to the Plan-008 bundle."
---
# Plan-008 — Update Log

## History

* **2026-09-03** — Plan created from the validated issue #20 specification (US-008, FR-035..039, NFR-015, NFR-016, TC-280..319 and TC-398..419, SR-047..054) with nine tasks: schemas and guards, corpus machinery, the oracle on the critical path, two parallel case-authoring tasks, the harness beside them, coverage and import API as the join, determinism evidence, and the review gate.
* **2026-09-03** — Tasks 048–055 done. `conformance/` carries 4 contract-valid input bundles, 111 cases across 22 construct-register families (26 positive, 39 negative, 23 boundary, 23 evolution; 14 schema-decided, 72 cross-field, 25 compatibility), the four conformance schemas composing the published v1 schemas, the oracle with its pinned schema layer and 30-code register (15 reused verbatim from `reader-cases.json`), the differential harness with four declared adapter slots, and the coverage, threshold, mutation, defect, contract-gap, and divergence registers. Every corpus gate passes, the oracle agrees with all 111 authored expectations, the mutation score is 22/22, and the harness exits 0 with 444 unmet rows and zero passes because every adapter is unavailable. Design decisions taken during implementation and folded back into the spec: the input is a bundle rather than a bare IR document; the expected diagnostic is the published `common.schema.json` diagnostic with the RFC 6901 pointer beside it; the schema layer collapses a `oneOf` cascade to the deepest failing location, then to a failing ancestor carrying more than one reported descendant; `package.json` is left byte-identical to `main` because issue #9's gate requires it, so the Make targets call `node` directly; and `corpus.json` and `coverage.json` are rendered through the pinned formatter so `make lint` and the byte comparison in FR-039-AC-1 agree. Two cross-field rules were removed as unreachable — the schema closes both the constraint-keyword and edge-category vocabularies before the cross-field layer runs. Task-056 (review, gap analysis, PR) remains.
