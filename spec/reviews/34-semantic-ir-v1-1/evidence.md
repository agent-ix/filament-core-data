---
id: SR-031
title: "Evidence-method review of the semantic IR v1.1 revision"
type: SpecReview
analysis: evidence
scope: "US-006, FR-020 (amended), FR-027..030, NFR-013, spec/tests.md TC-203..236"
review_set: all
---
# Evidence-method review

## Summary

The issue #34 slice carries 31 obligations (FR-020-AC-7..8, FR-027-AC-1..7,
FR-028-AC-1..8, FR-029-AC-1..6, FR-030-AC-1..4, NFR-013-AC-1..4) and 34 matrix
rows (TC-203..236). `quoin advise --json` (2026-09-03) placed every obligation:
zero inconclusive, zero uncatalogued, 8 mismatches. All 8 mismatches are the
same lexical pattern SR-021 recorded as FND-034: the `property_shapes=example`
rule recommends `unit-testing` / `bdd-spec-by-example` for obligations authored
`Analysis` or `Inspection`. The 23 non-mismatched obligations agree with the
catalog: round trips (FR-020-AC-7, FR-027-AC-1, FR-028-AC-1) land on
`property-based-testing` / `golden-approval-testing` and the matrix types them
`Property`; universal validation rules land on `property-based-testing` and the
matrix types them `Unit` over fixed fixtures, which the authored `Test` covers;
NFR-013-AC-2 lands on `golden-approval-testing` and TC-234 is `Snapshot` with a
baseline the spike's `--check` mode already compares against.

Judgement was applied to the residue and is labelled as such below. Four of the
mismatches are real: the authored `Inspection` cell disagrees with the `Static`
matrix row that is planned to discharge it, and the catalog reserves
`inspection` for obligations with no executable oracle. One obligation
(FR-020-AC-8) plans an integration oracle the repository cannot yet produce. One
NFR-013 metric maps to no test case. Two advisor recommendations are lexical
false positives and are recorded so nobody plans a suite on their word.
TC-233's missing generator is already FND-106 (SR-027) and is not repeated.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-075 | medium | FR-020-AC-8 is authored `Analysis` while TC-232 is typed `Integration` across "two independent schema readers"; the advisor recommends Test (`example`). The repository has one reader (Ajv in `test/`, the same single reader that discharged TC-191's "independent reader"), and no second validator dependency exists. Judgement: either name the second reader and author `Test`, or keep `Analysis` and retype TC-232 so the plan does not promise evidence no suite can produce. | FR-020-AC-8, TC-232, TC-191 |
| FND-076 | medium | FR-029-AC-5, FR-030-AC-4, NFR-013-AC-3, and NFR-013-AC-4 are authored `Inspection`, but their rows TC-223, TC-230, TC-235, TC-236 are typed `Static` (automated). The catalog's `inspection` applies when there is `no-executable-oracle` and is discharged through the inspections registry, not a tagged test; each of these four has a mechanical oracle (schema path scan, shared `$ref`, `cases.json` entry, changed-path diff — TC-195 already runs the same gate as `Static`). Judgement: author `Analysis` (Static evidence) so the cell and the row name the same discharge. The same split appears in FR-028-CON-2 and FR-030-CON-2 (`Schema inspection` vs `Static` at TC-214/TC-230). | FR-029-AC-5, FR-030-AC-4, NFR-013-AC-3, NFR-013-AC-4, FR-028-CON-2, FR-030-CON-2, TC-223, TC-230, TC-235, TC-236 |
| FND-077 | medium | NFR-013's fifth metric (new IR nodes without both a golden and a negative fixture: 0, method `Fixture inventory`) maps to no test case; the NFR-013 coverage row lists TC-208 and TC-234..236, and the only inventory-shaped row, TC-232, traces FR-020-AC-8 alone. The Overview requires every metric to map. Judgement: add NFR-013 to TC-232's traces or add a `Static` inventory row. | NFR-013, TC-232, spec/tests.md |
| FND-078 | low | FR-027-AC-7, FR-028-AC-8, and FR-029-AC-6 (config-service FR-006 expressible "with zero declared loss") are authored `Analysis` with `Analysis` rows TC-209, TC-218, TC-226; the advisor recommends Test on `example`. Judgement: `Analysis` stands, because the loss inventory is a judgement, but none of the three names the artifact the analysis is recorded against. A committed v1.1 fixture lifting FR-006 `ConfigVersion` would make the expressibility half executable and give the loss table a locus. | FR-027-AC-7, FR-028-AC-8, FR-029-AC-6, TC-209, TC-218, TC-226 |
| FND-079 | low | Type-column inconsistency for executable fixture checks: FR-029-AC-1 (authored `Test`) is typed `Static` at TC-219 and FR-028-AC-5 (authored `Test`) is typed `Static` at TC-214, while the sibling fixture-validation rows TC-204..207, TC-211..213 are `Unit`. Both kinds are executable, but the Type decides which suite and tag produce the evidence; pick one convention for "fixture validates against the schema". | FR-029-AC-1, FR-028-AC-5, TC-214, TC-219 |
| FND-080 | low | Two advisor recommendations are lexical false positives and warrant no suite: `fuzzing` for FR-028-AC-5 matched `characteristics=parser` on the words "parsed clause content" in an obligation whose point is that the IR does not parse; `formal-analysis-smt` for FR-027-AC-3 matched `consistency` on a presence-vs-multiplicity check that TC-205 covers as a Unit negative. Recorded so the recommendations are not mistaken for gaps. | FR-028-AC-5, FR-027-AC-3, TC-205, TC-214 |

## Evidence Portfolio

| Concern | Evidence |
|---|---|
| Multiplicity, relationship, and full v1.1 document round trips | Property tests (TC-203, TC-210, TC-233) |
| Field, relationship, operation, clause, constraint, and dialect validation rules | Unit positive and negative fixtures (TC-204..207, TC-211..213, TC-215..217, TC-220..222, TC-225, TC-227..229) |
| Schema shape: closed keyword paths, no parsed-clause property, shared target enumeration | Static schema checks (TC-214, TC-219, TC-223, TC-224, TC-230) |
| v1 fixtures under v1.1; v1 fixture under v1 | Integration over the existing fixture suite (TC-208, TC-231) |
| Spike output non-disruption | Snapshot against the spike's checked-in `--check` baseline (TC-234) |
| Compatibility classification and changed-path gate | Static (TC-235, TC-236) |
| Two-reader agreement on new nodes | Integration (TC-232), pending a second reader (FND-075) |
| config-service FR-006 expressibility | Analysis (TC-209, TC-218, TC-226), pending a named fixture (FND-078) |
