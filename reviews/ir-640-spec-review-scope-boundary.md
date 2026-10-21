---
id: SR-11701
title: "IR-640 spec-review/scope-boundary review"
type: SpecReview
analysis: scope-boundary
scope: "filament-core-data PR 295; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md; docs/semantic-data-system/adr/0012-lift-dependency-feature-selection.md; docs/semantic-data-system/adr/index.md"
review_set: subset
---

## Summary

Reviewed frozen PR 295 at 582198895ab23b23df7f6c0509bfe54d45402407 against a684329400b7e28a8b867693ab6df4af72cd2d87. Only FR-091, ADR-0012 and the ADR index change. No manifest, lock, implementation or test changes. Existing FR-091/FR-099/NFR-033 and ADR-0006 contracts remain in force. No applicable AssuranceProfile or repository AGENTS.md/CLAUDE.md was found. The dispatch expressly preserves existing dependency pins, identity contracts and measured evidence; these user requirements override the generic checklist antipattern for those retained controls.

## Verdict

CONDITIONAL — Findings require explicit disposition.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The AC premises the guarantee on the only normal dependency path, but excludes parsers from the entire normal/build graph. An unrelated build-dependency edge can activate excluded parser packages while satisfying that premise. Restrict the premise to the only normal/build path, consistent with the unrelated-edge exception. | FR-091-AC-12; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |

## Coverage

The owner is extraction-frontend, consuming quire-rs Markdown/filesystem extraction with a contract-tested dependency boundary. FR-091 is core; FR-099 CLI is core and unchanged; NFR-033 dependency/toolchain qualification is cross-cutting; ADR-0006 injected JS producer remains the process boundary. Upstream defaults and unrelated consumer feature edges remain external. QSL/CG ordinary adoption is integration work, not a new owner layer. One introduced consumer-premise mismatch must be fixed.

Frozen head remains unchanged. No native aggregate or implementation qualification is claimed.
