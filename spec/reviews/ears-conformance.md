---
id: SR-008
title: "EARS review of the semantic architecture, census, and TypeSpec gate"
type: SpecReview
analysis: ears-conformance
scope: "spec/stakeholder, spec/functional, spec/non-functional"
review_set: all
---
# EARS conformance review

## Summary

The current Quire grammar pass reports all 26 requirement-bearing documents clean
(100 percent, zero EARS findings). Semantic inspection of the new audit
obligations found no event/state confusion, vague response, or compound
requirement that would prevent one-to-one test mapping.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-009 | low | No EARS defect remains after naming the representation-guidance subject and splitting compound obligations into atomic statements. | FR-001, FR-005, FR-006, FR-007 |
| FND-015 | low | No EARS defect remains in the contract-census slice after canonicalizing collection start and keeping drift/access failure subjects on one atomic statement. | FR-009, FR-013 |
| FND-023 | low | No EARS defect remains in the feasibility slice after splitting compound IR/Protobuf/Arrow obligations and canonicalizing the report trigger. | FR-015, FR-016, FR-018 |

## Semantic Judgment

- Event-triggered statements use `When` for supersession and transformation
  failure events.
- State-triggered statements use `Until` for the provisional TypeSpec and Avro
  compatibility states.
- Unwanted conditions resolve to explicit validation or review failures in the
  Test Matrix.
- No vague performance, robustness, support, or handling claim appears in the
  requirement-bearing artifacts.
- Audit collection start uses `When`, continuous compatibility boundaries remain
  ubiquitous, and access/drift failures use explicit unwanted-condition forms.
- Feasibility source compilation and report creation use named event triggers;
  target preservation, failure, fallback, and promotion have explicit subjects.
