---
id: SR-002
title: "Failure-domain review of the semantic data architecture record"
type: SpecReview
analysis: failure-domain
scope: "FR-001, FR-004, FR-006, FR-007"
review_set: all
---
# Failure-domain review

## Summary

The review covered extension failures, entity identity, transformation purity,
and topological termination. The initial draft omitted explicit identity,
side-effect, transform-failure, and supersession-cycle rules; those obligations
are now present and covered by TC-049..053.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-003 | low | Resolved: stable package/type/definition/occurrence identity, explicit transformation failure and effects, and acyclic supersession are now required and traced. | FR-001-AC-5, FR-004-AC-5..6, FR-006-AC-5..6, TC-049..053 |

## Failure-Domain Disposition

| Domain | Disposition |
|---|---|
| Extension points | Unknown, invalid, unavailable, and lossy mapping outcomes remain explicit and non-authoritative. |
| Entity identity | Package, type, definition, and occurrence identity are distinct from paths, labels, keys, and encodings. |
| Evaluation purity | Every transformation declares determinism, purity/effects, and external reads/writes. |
| Topology | Supersession is acyclic and has at most one current successor. |

Runtime retry, concurrency, and resource-limit behavior is deferred because this
issue implements no callback, compiler, registry, graph walker, or transform
runtime.
