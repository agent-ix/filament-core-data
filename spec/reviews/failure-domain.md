---
id: SR-002
title: "Failure-domain review of the semantic architecture and contract census"
type: SpecReview
analysis: failure-domain
scope: "FR-001, FR-004, FR-006, FR-007, FR-009..013, NFR-004..005"
review_set: all
---
# Failure-domain review

## Summary

The review covered extension failures, entity and inventory identity,
transformation purity, external collection failure, drift, and topological
termination. Audit inputs cannot silently truncate or collapse unknown states,
and the census has stable audit identifiers and deterministic ordering.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-003 | low | Resolved: stable package/type/definition/occurrence identity, explicit transformation failure and effects, and acyclic supersession are now required and traced. | FR-001-AC-5, FR-004-AC-5..6, FR-006-AC-5..6, TC-049..053 |
| FND-011 | low | Resolved: unavailable, access-denied, capped, paginated, rate-limited, dirty, and drifting audit inputs have explicit incomplete/failure states and cannot be treated as complete. | FR-009, FR-010, FR-013, TC-057..058, TC-061, TC-075, TC-088 |

## Failure-Domain Disposition

| Domain | Disposition |
|---|---|
| Extension points | Unknown, invalid, unavailable, and lossy mapping outcomes remain explicit and non-authoritative. |
| Entity identity | Package, type, definition, and occurrence identity are distinct from paths, labels, keys, and encodings. |
| Evaluation purity | Every transformation declares determinism, purity/effects, and external reads/writes. |
| Topology | Supersession is acyclic and has at most one current successor. |
| Audit identity | Every contract has one stable audit identifier; evidence locus and semantic identity remain separate. |
| External collection | Tool/API failure, access failure, and incomplete pagination remain explicit with coverage and confidence consequences. |
| Audit purity | Issue #10 may add audit evidence and validators only; every examined source remains unchanged. |
| Drift topology | Contract-affecting drift invalidates the affected evidence until it is refreshed. |

Runtime retry and concurrency policy remains deferred because neither issue
implements a callback, compiler, registry, graph walker, or transform runtime.
The census does require complete enumeration or an explicit incomplete result;
it never retries into a silent success state.
