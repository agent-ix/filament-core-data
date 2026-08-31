---
id: SR-018
title: "Failure-domain review of the semantic package and projection contract"
type: SpecReview
analysis: failure-domain
scope: "FR-019..026, NFR-008..012, spec/tests.md"
review_set: all
---
# Failure-domain review

## Summary

The contract distinguishes stable semantic identity from source paths and
generated names; rejects package cycles while preserving recursive type graphs;
and keeps invalid, unsupported, unavailable, partial, lossy, and incompatible
outcomes distinct. Pure transforms cannot perform hidden external effects, and
effectful transforms must retain provenance. Unknown required extensions fail;
declared optional extensions remain namespaced and preserved.

Hostile recursion, reference expansion, input size, and diagnostic volume are
now bounded with deterministic termination evidence. No empty model or silent
coercion is an accepted recovery path.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-031 | low | No open failure-domain gap remains after adding deterministic resource-limit termination and the shared diagnostic envelope. | NFR-010, FR-024-AC-7, TC-200, TC-202 |

## Failure Dispositions

| Failure | Required disposition |
|---|---|
| Import cycle or lock conflict | Reject and report every conflicting locus |
| Recursive semantic type | Preserve graph identity; do not treat as package cycle |
| Unsupported target feature | Reject or declare permitted loss; never silently coerce |
| Missing version, import, adapter, or identity | Emit diagnostics and no target artifact |
| Hostile expansion or resource exhaustion | Terminate within declared limits with stable code |
| Unknown extension | Reject if required; preserve if namespaced and optional |
