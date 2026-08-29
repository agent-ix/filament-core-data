---
id: SR-006
title: "Risk and complexity review of the semantic data architecture requirements"
type: SpecReview
analysis: risk-complexity
scope: "StR-001, FR-001..008, NFR-001..003"
review_set: all
---
# Risk and complexity review

## Summary

Issue #8 has low runtime risk because it is documentation-only, but FR-004,
FR-005, FR-006, and FR-007 carry architectural or policy volatility that could
misdirect later implementation. Provisional status, feasibility fallback, corpus
review, compatibility retention, and human promotion gates mitigate that risk.

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

## Top Hazards

1. FR-007 — an unproven TypeSpec or migration choice is presented as final.
2. FR-005 — generated packages accidentally absorb application framework concerns.
3. FR-004 — identity or extension semantics become coupled to one representation.
4. FR-003 — Quire, Quoin, module, compiler, and consumer ownership overlap.

## Failure-Domain Gaps

No open failure-domain gap remains in this issue; see
[failure-domain.md](./failure-domain.md). Runtime failure behavior remains for
the compiler specification and is not silently allocated here.
