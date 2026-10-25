---
id: SR-11700
title: "IR-640 spec-review/failure-domain review"
type: SpecReview
analysis: failure-domain
scope: "filament-core-data PR 295; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md; docs/semantic-data-system/adr/0012-lift-dependency-feature-selection.md; docs/semantic-data-system/adr/index.md"
review_set: subset
---

## Summary

Reviewed frozen PR 295 at 582198895ab23b23df7f6c0509bfe54d45402407 against a684329400b7e28a8b867693ab6df4af72cd2d87. Only FR-091, ADR-0012 and the ADR index change. No manifest, lock, implementation or test changes. Existing FR-091/FR-099/NFR-033 and ADR-0006 contracts remain in force. No applicable AssuranceProfile or repository AGENTS.md/CLAUDE.md was found. The dispatch expressly preserves existing dependency pins, identity contracts and measured evidence; these user requirements override the generic checklist antipattern for those retained controls.

## Verdict

PASS — No defects found within this method scope.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Examined feature-unification, optional lock retention, same-package identity, compile activation, negative-control discrimination and failed first runs. Contract uses package identities/active graph rather than a lock string heuristic. Public Refused/Blocked/Written, legacy diagnostics, canonical identities and model/enum body_extraction remain real controls. The unrelated-edge qualification prevents promising global feature control; AC-12 premise defect is recorded under scope-boundary. No new callback, interpreter, traversal or effect boundary is added; existing bundle/refusal/limit and ADR-0006 injection contracts continue. Graph traversal must use the actual resolver graph, not a reimplemented Markdown parser.

Frozen head remains unchanged. No native aggregate or implementation qualification is claimed.
