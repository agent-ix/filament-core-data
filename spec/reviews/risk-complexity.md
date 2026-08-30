---
id: SR-006
title: "Risk and complexity review of the architecture, census, and TypeSpec gate"
type: SpecReview
analysis: risk-complexity
scope: "StR-001, FR-001..018, NFR-001..007"
review_set: all
---
# Risk and complexity review

## Summary

Issues #8 and #10 have low runtime risk because they are documentation/read-only,
but the breadth and volatility of the contract census can create false
completeness. Immutable pins, explicit incomplete states, deterministic evidence,
fresh drift checks, and a no-migration boundary mitigate that risk.
Issue #4 remains isolated but is technically high-risk: official emitters cover
schema/wire surfaces while native domain packages, analytical mappings, and a
stable semantic IR may require maintained custom compiler code.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-007 | medium | TypeSpec, package shape, identity details, and migration sequencing remain volatile; implementation must preserve their provisional labels and named resolution tickets. | FR-004, FR-005, FR-007, NFR-003 |
| FND-021 | medium | Custom TypeScript/Python/Rust/Arrow generation can make the demo pass while transferring substantial API-churn and semantic-parity cost into `filament-core-data`; the report must price that ownership and may still recommend no-go. | FR-016, FR-018-AC-2, NFR-007 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| StR-001 | Low | Low | Durable governance record | Root index and full review set |
| FR-001 | Low | Low | Navigation and supersession | Static inventory and graph properties |
| FR-002 | Medium | Low | Multi-authority semantics | Accepted authority ADR and scenario review |
| FR-003 | Medium | Medium | Cross-repository ownership | Explicit owner/non-owner table and companion ticket |
| FR-004 | Medium | High | Novel metamodel and identity vocabulary | Provisional detail, corpus review, issue #9 |
| FR-005 | Medium | High | Cross-language generated package topology | Feasibility gate and independent package versions |
| FR-006 | Medium | Medium | Many formats and transformation semantics | Best-fit profiles, explicit loss/failure, provenance |
| FR-007 | High | High | Tool choice and staged migrations across active consumers | JSON Schema fallback and mandatory human gates |
| FR-008 | Medium | Medium | Existing ADR conflict disposition | One conflict register and explicit supersession rules |
| NFR-001 | Low | Low | Traceability drift | Automated index, link, and status checks |
| NFR-002 | Low | Low | Context loss | Standalone-review demonstration |
| NFR-003 | Low | Low | Accidental disruption | Documentation-only diff and no-publication gate |
| FR-009 | Medium | High | Branch, board, PR, corpus, auth, and API state changes during collection | Immutable revisions, complete-enumeration evidence, and pre-sign-off refresh |
| FR-010 | Medium | Medium | Heterogeneous schema/DTO/generated/persisted surfaces | Typed inventory records, explicit state enum, source-locus validation |
| FR-011 | Medium | Medium | Semantic equivalence and lossiness require judgment | Field parity, conflict default, rationale and confidence |
| FR-012 | Medium | High | Effort and migration sequencing overlap active work | Source-cited overlaps, separate human promotion decision |
| FR-013 | Low | Medium | Stale or incomplete evidence could look accepted | Drift invalidation and unresolved-decision register |
| NFR-004 | Medium | Low | Reproducibility across volatile/manual evidence | Deterministic normalization and explicit manual-assessment metadata |
| NFR-005 | Low | Low | Audit changes measured systems | Zero-change diff, repository, release, and catalog gate |
| FR-014 | Medium | Medium | Representative slice and modular package identity may omit a decisive semantic edge | Census-derived required type inventory and exact source pins |
| FR-015 | High | High | Official emitter feature/version skew and representation-specific limits | Exact versions, invalid fixtures, direct diagnostics, partial/fail dispositions |
| FR-016 | High | High | Custom IR and three native emitters can become a private compiler | Disposable scope, explicit maintenance-cost decision, production re-specification |
| FR-017 | High | Medium | Demo compile success may hide cross-language semantic mismatch | Shared positive/negative goldens, native builds, compatibility classifier |
| FR-018 | High | High | Tool enthusiasm or sunk cost biases source selection | Mechanical pass rule, JSON Schema fallback, independent human promotion |
| NFR-006 | Medium | Low | Spike leaks into published/canonical paths | Exact lock, clean-run determinism, changed-path and publication gates |
| NFR-007 | Medium | Medium | Adverse output is normalized away | Raw evidence, explicit consequence/confidence, unchanged-requirement review |

## Top Hazards

1. FR-009 — volatile or access-limited sources appear complete.
2. FR-011 — unproven equivalence is classified as fit.
3. FR-012 — audit recommendations are mistaken for migration approval.
4. FR-007 — an unproven TypeSpec or migration choice is presented as final.
5. FR-016 — a custom emitter demo conceals production ownership and churn.
6. FR-018 — a partial P0 result is promoted because the spike is already built.
7. NFR-006 — experimental output leaks into a canonical or published package.
8. NFR-005 — evidence collection changes the measured baseline.

## Failure-Domain Gaps

No open requirement-level failure-domain gap remains in these issues; see
[failure-domain.md](./failure-domain.md). Runtime failure behavior remains for
the production compiler specification and is not silently allocated to the spike.
