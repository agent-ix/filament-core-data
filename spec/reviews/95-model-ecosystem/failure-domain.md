---
id: SR-180
title: "Failure-domain review of the baseline 1.2 producer and ecosystem contracts"
type: SpecReview
analysis: failure-domain
scope: "FR-102..FR-105, baseline-1-2.md ecosystem sections"
review_set: all
---
# Failure-domain review

## Summary

Targeted review of refusal, unavailable, incomplete, and unknown dispositions.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1606 | low | No defect found: every analyzed failure retains a stated non-fabricating disposition. | FR-102..FR-105 |

## Verdict

**PASS** — the contracts preserve, rather than erase, the meaningful failure
states. A missing exact-support observation produces unavailable/incomplete;
an unrelated missing observation cannot erase independently established truth.
Closed-inventory, cross-domain-digest, clock-family, and unresolved/circular
dependency failures all have a stated non-fabricating disposition.

## Failure dispositions

| Failure | Required disposition | Control |
| --- | --- | --- |
| Dangling relationship or closed-universe object | Refuse with endpoint/object identities | TC-1358 |
| Missing selected assessment input | Its own unavailable or incomplete disposition; no invented Boolean | TC-1359, TC-1362 |
| Clock mismatch | Refuse; do not invent elapsed-time mapping | TC-1360 |
| Cross-domain digest substitution | Refuse binding | TC-1363 |
| Missing/conflicting closed inventory import | Refuse; explicitly incomplete inventory retains unknown | TC-1364 |
| Metadata-only material submitted as live evidence | Refuse live-evidence claim | TC-1366 |
| Circular/unresolved dependency | Retain path and unknown | TC-1369 |
