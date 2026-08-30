---
id: SR-006
title: "Risk and complexity review of the semantic architecture and contract census"
type: SpecReview
analysis: risk-complexity
scope: "StR-001, FR-001..013, NFR-001..005"
review_set: all
---
# Risk and complexity review

## Summary

Issues #8 and #10 have low runtime risk because they are documentation/read-only,
but the breadth and volatility of the contract census can create false
completeness. Immutable pins, explicit incomplete states, deterministic evidence,
fresh drift checks, and a no-migration boundary mitigate that risk.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-007 | medium | TypeSpec, package shape, identity details, and migration sequencing remain volatile; implementation must preserve their provisional labels and named resolution tickets. | FR-004, FR-005, FR-007, NFR-003 |

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

## Top Hazards

1. FR-009 — volatile or access-limited sources appear complete.
2. FR-011 — unproven equivalence is classified as fit.
3. FR-012 — audit recommendations are mistaken for migration approval.
4. FR-007 — an unproven TypeSpec or migration choice is presented as final.
5. NFR-005 — evidence collection changes the measured baseline.

## Failure-Domain Gaps

No open failure-domain gap remains in these issues; see
[failure-domain.md](./failure-domain.md). Runtime failure behavior remains for
the compiler specification and is not silently allocated to the census.
