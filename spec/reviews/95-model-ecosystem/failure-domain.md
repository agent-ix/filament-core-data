---
id: SR-190
title: "Failure-domain review of the baseline 1.2 producer and ecosystem contracts"
type: SpecReview
analysis: failure-domain
scope: "FR-106..FR-111, baseline-1-2.md ecosystem sections"
review_set: all
---
# Failure-domain review

## Summary

Targeted review of refusal, unavailable, incomplete, and unknown dispositions.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1681 | low | No defect found: every analyzed failure retains a stated non-fabricating disposition. | FR-106..FR-111 |

## Verdict

**PASS** — the contracts preserve, rather than erase, the meaningful failure
states. A missing exact-support observation produces unavailable/incomplete;
an unrelated missing observation cannot erase independently established truth.
Closed-inventory, cross-domain-digest, clock-family, and unresolved/circular
dependency failures all have a stated non-fabricating disposition.

## Failure dispositions

| Failure | Required disposition | Control |
| --- | --- | --- |
| Source cannot carry authored field or relationship distinction | Named loss/refusal; never derive or invent it | TC-1373, TC-1375 |
| Dangling relationship or closed-universe object | Refuse with endpoint/object identities | TC-1376 |
| Missing selected assessment input | Its own unavailable or incomplete disposition; no invented Boolean | TC-1377, TC-1380 |
| Clock mismatch | Refuse; do not invent elapsed-time mapping | TC-1378 |
| Cross-domain digest substitution | Refuse binding | TC-1381 |
| Missing/conflicting closed inventory import | Refuse; explicitly incomplete inventory retains unknown | TC-1382 |
| Metadata-only material submitted as live evidence | Refuse live-evidence claim | TC-1384 |
| Circular/unresolved dependency | Retain path and unknown | TC-1387 |
