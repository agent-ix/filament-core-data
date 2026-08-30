---
id: SR-005
title: "Evidence-method review of the semantic architecture and contract census"
type: SpecReview
analysis: evidence
scope: "StR-001, FR-001..013, NFR-001..005, spec/tests.md"
review_set: all
---
# Evidence-method review

## Summary

Every stakeholder, functional, and non-functional requirement now declares a
verification method and at least one concrete or queued evidence artifact.
Machine-checkable census records use tests, semantic parity and impact judgments
use analysis, and both non-disruption boundaries use diff/release inspection.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-006 | medium | The pinned Quoin 0.21.9 advisor, run with Quire 0.30.2, stopped because no active module in scope declares a traceability model; methods were confirmed by documented judgment and the advisor must be rerun after the governed module baseline lands. | quire-rs#385, TM-001 |
| FND-013 | low | Resolved: explicit `verification_method` and `evidence` metadata now covers StR-001, FR-001..013, and NFR-001..005; issue #10 test and report paths are queued by the complete matrix. | StR-001, FR-001..013, NFR-001..005, TM-001 |

## Method Disposition

| Obligation shape | Confirmed method | Evidence artifact |
|---|---|---|
| Required inventory, status, links, and forbidden text | Test / static analysis | Vitest architecture-contract suite |
| Authority, ownership, representation fit, and conflict meaning | Inspection / analysis | Completed SpecReview set |
| Identity and supersession invariants | Property | Generated relocation and acyclic-graph fixtures |
| Documentation-only delivery | Inspection and static diff check | Git diff, release inspection, repository-state record |
| Revision, pin, access, and drift snapshot | Test / inspection | `test/contract-census.test.ts`, `audit/filament-contract-census/snapshot.json` |
| Contract inventory and evidence loci | Test | `inventory.json`, source-locus validator, TC-059..063 |
| Parity, conflict, and missing-contract disposition | Analysis | `parity.json`, `conflicts.json`, TC-064..068 |
| Repository/concept impact and active overlap | Analysis | `impact.json`, TC-069..072 |
| Reproducibility and read-only delivery | Test / inspection | `validation.json`, final census SpecReview, TC-078..085 |

The historical advisor gap does not relax evidence and is not presented as an
independent advisor pass. Direct metadata inspection and the matrix confirm zero
missing methods or evidence paths; every issue #10 artifact is now retained and
all 35 census cases pass.
