---
id: SR-021
title: "Evidence-method review of the semantic package and projection contract"
type: SpecReview
analysis: evidence
scope: "FR-019..026, NFR-008..012, spec/tests.md"
review_set: all
---
# Evidence-method review

## Summary

The matrix assigns static schema checks, unit tests, property tests, integration
tests, fuzzing, snapshots, analysis, and manual promotion evidence according to
the observable obligation. Invariants and round trips use properties; source,
adapter, and native-target boundaries use integration; hostile inputs use
negative and fuzz evidence; non-disruption and source promotion use inspection.

`quoin advise --json --repo . --mismatch-only` completed with no inconclusive
obligations. It reported 60 corpus-wide mismatches, 17 in the issue #9 slice.
Those 17 primarily arise when lexical property-shape rules recommend generic
unit/E2E tests for intentional inspection or analysis obligations. The matrix
retains the stronger, observable method and adds executable coverage where a
runnable oracle exists.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-034 | medium | The evidence advisor over-recommends generic tests for several specification-boundary and ownership obligations; no advice is inconclusive, and documented judgment plus the mixed-method matrix resolves each issue #9 obligation. | FR-019-AC-1..2, FR-021-AC-5..6, FR-024-AC-5..6, TC-130..202 |

## Evidence Portfolio

| Concern | Evidence |
|---|---|
| Schema shape and contract presence | JSON Schema/static validation |
| Identity, ordering, round trip, and compatibility invariants | Property tests |
| Backend and cross-language parity | Integration plus native build checks |
| Diagnostics and invalid input | Unit and negative golden tests |
| Markdown and generated representation stability | Snapshot and golden fixtures |
| Resource exhaustion and parser safety | Bounded fuzz/adverse tests |
| Supply chain and generation safety | SAST, dependency/SBOM inspection, sandbox checks |
| Normative promotion | Explicit human approval record at TC-199 |
