---
id: SR-191
title: "Integrity review of the baseline 1.2 producer and ecosystem contracts"
type: SpecReview
analysis: integrity
scope: "FR-106..FR-111, baseline-1-2.md ecosystem sections, spec/tests.md TC-1373..TC-1387"
review_set: all
---
# Integrity review

## Summary

Targeted review of identity, digest, truth, and historical-result separation.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1682 | low | No defect found: no identity or truth-domain collapse remains in the reviewed requirements. | FR-106..FR-111 |

## Verdict

**PASS** — identity and truth domains remain distinct. The contract does not
equate a member with an observation record, a role with a component or runtime
instance, a static closure with an assessment binding, a producer canonical
digest with a native raw-byte digest, or stale/affected reachability with a
violated behavioral claim. Historical result bytes are immutable.

## Integrity controls

| Invariant | Evidence |
| --- | --- |
| Presence, multiplicity, default, ordered, and unique do not collapse | FR-106-AC-5 / TC-1373 |
| Relationship and field declarations do not substitute | FR-107-AC-2 / TC-1375 |
| Presence, null, and value are distinct | FR-108-AC-1 / TC-1376 |
| Record and member identities remain distinct | FR-108-AC-4 / TC-1378 |
| Named digest domains cannot substitute | FR-109-AC-5 / TC-1381 |
| Role/component/runtime identities do not collapse | FR-110-CON-2 / TC-1383 |
| Reachability and stale evidence are not falsehood | FR-111-CON-1..2 / TC-1387 |
