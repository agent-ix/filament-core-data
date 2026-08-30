---
id: SR-005
title: "Evidence-method review of the semantic data architecture requirements"
type: SpecReview
analysis: evidence
scope: "FR-001..008, NFR-001..003, spec/tests.md"
review_set: all
---
# Evidence-method review

## Summary

Authored methods and planned evidence fit this documentation-only delivery:
machine-checkable inventories use static tests, semantic judgments use structured
inspection or analysis, and final non-disruption uses diff and release evidence.
The deterministic advisor could not complete because the active module corpus
does not yet expose the required traceability model.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-006 | medium | The pinned Quoin 0.21.9 advisor, run with Quire 0.30.2, stopped because no active module in scope declares a traceability model; methods were confirmed by documented judgment and the advisor must be rerun after the governed module baseline lands. | quire-rs#385, TM-001 |

## Method Disposition

| Obligation shape | Confirmed method | Evidence artifact |
|---|---|---|
| Required inventory, status, links, and forbidden text | Test / static analysis | Vitest architecture-contract suite |
| Authority, ownership, representation fit, and conflict meaning | Inspection / analysis | Completed SpecReview set |
| Identity and supersession invariants | Property | Generated relocation and acyclic-graph fixtures |
| Documentation-only delivery | Inspection and static diff check | Git diff, release inspection, repository-state record |

This tooling gap does not relax evidence: the methods remain explicit in each AC
and all 53 cases remain mapped. It prevents a claim that the catalog advisor
independently confirmed them, so that claim is deliberately absent.
