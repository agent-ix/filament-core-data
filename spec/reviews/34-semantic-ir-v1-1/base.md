---
id: SR-027
title: "Base review of the semantic IR v1.1 revision"
type: SpecReview
analysis: base
scope: "US-006, FR-020 (amended), FR-027..030, NFR-013, spec/tests.md TC-203..236"
review_set: all
---
# Base specification review

## Summary

The issue #34 specification adds one user story, four functional requirements,
one non-functional requirement, two FR-020 criteria, and 34 test cases that
extend the v1 semantic IR to v1.1 additively. Every new acceptance criterion and
constraint (39) maps to at least one test case; no test case traces to an
absent criterion; Quire reports zero errors and zero grammar findings across
the bundle. The bundle is ready for the seven analyses and for planning.

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | Pass | US-006, FR-027..030, NFR-013, TC-203..236 are sequential after the highest ids on every remote branch; AC/CON ids follow `<parent>-AC-N` / `<parent>-CON-N` |
| User story quality | Pass | US-006 has the As/I want/So that shape, four Given/When/Then examples, options, constraints, dependencies, priority, and traceability |
| Functional requirement quality | Pass | Each FR names inputs, outputs, EARS-shaped behavior, constraints with validation, measurable ACs, and upstream/downstream dependencies |
| Coverage (Rule 1) | Pass | 39/39 criteria and constraints → TC-203..236 (script over the matrix, 2026-09-03) |
| Option permutation (Rule 2) | Pass | Multiplicity × nullable × default, collection flags, clause language, and source dialect rows added |
| Constraint boundary (Rule 3) | Pass | FR-027..030 CON rows plus multiplicity min/below-min/inverted and operand min/below-min |
| Error path (Rule 4) | Pass | ERR-032..039 |
| State transition (Rule 5) | Pass | v1 document under v1.1 schema; v1.1 document under v1 schema |
| Edge case (Rule 6) | Pass | EC-027..031 |
| Cross-referencing | Pass | FR → US-006 `implements`; NFR-013 → US-006 `constrains`; body links are relative paths; `quire validate` resolves every link |

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-105 | low | US-006 has no acceptance-criteria table; the installed US archetype treats the illustrative examples plus linked FRs as the binding elaboration (same disposition as FND-030 for US-005). The matrix maps EX-1..4 to TC-203, TC-210, TC-214, TC-220. | US-006, spec/tests.md |
| FND-106 | low | TC-233 (Property) needs a generator for v1.1 IR documents that the repository does not have; recorded in Coverage Gaps so the missing generator surfaces at implementation rather than being downgraded to a Unit example. | FR-020-AC-7, TC-233 |
| FND-107 | low | The `Type` column uses `Analysis` for TC-209, TC-218, TC-226, matching 13 existing rows; the spec-matrix skill's vocabulary table omits the value while the installed manifest accepts it. No change; noted so the manifest stays the authority. | TC-209, TC-218, TC-226 |

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| IDs, structure, and EARS grammar | Pass | Quire: zero errors, zero grammar warnings on the full bundle |
| Requirement clarity and atomicity | Pass | One `shall` per statement in FR-027..030 and NFR-013 after the grammar pass |
| Complete traceability | Pass | 39/39 criteria and constraints mapped; TC-203..236 |
| Failure, transition, boundary, and option coverage | Pass | ERR-032..039, EC-027..031, permutation and boundary rows |
| Additive, non-disruptive scope | Pass | NFR-013; no spike, backend, or corpus change permitted |
| Analyses | Pass after remediation | SR-028..034 in this directory; dispositions below |

## Dispositions of analysis findings

Applied to the specification on 2026-09-03 before planning:

| Theme | Findings | Change |
|---|---|---|
| v1/v1.1 discriminator | FND-051, FND-055, FND-068, FND-081, FND-089 | FR-030 names `contractVersion: "1.1.0"`, one schema file accepting both versions, and version-conditional dialect and multiplicity rules; FR-027-CON-1 / FR-030-CON-1 reworded; TC-246 added |
| Normalized-form materialization | FND-044, FND-061, FND-085 | FR-027: `1.1.0` documents materialize multiplicity/presence/nullable; `1.0.0` documents gain no bytes |
| Clause text carrier and binding | FND-045, FND-046, FND-056, FND-057, FND-094 | FR-028: `text` property, `sourceSpan` conditional on source origin, `pre[]`/`post[]` bind by `clauseId`, `clauseId` unique per type; TC-241 |
| Target resolution and composite cycles | FND-047, FND-050, FND-058 | FR-028: resolve against document or lock exports; composite graph acyclic; self-reference allowed; TC-239, TC-240 |
| Kind resolution for unit/flags | FND-048, FND-096 | FR-027: resolve through aliases; flags on `1..1` fail; UCUM symbol; TC-237 |
| Keyword applicability | FND-049, FND-059, FND-063 | FR-029: per-keyword applicability and typed `enumValues` items; regex must compile; TC-244, TC-245 |
| Additive vs classifier | FND-052, FND-060, FND-083 | FR-029-CON-2 scoped to post-v1.1 revisions with the v1 → v1.1 narrowing justified; multiplicity and relationship change classes added to FR-027/FR-028; TC-238, TC-243 |
| Second reader | FND-075, FND-082 | FR-020-AC-8 names the Ajv and Python `jsonschema` readers and becomes `Test` |
| Verification method alignment | FND-076, FND-077, FND-079 | Inspection → Analysis where a static oracle exists; TC-219 retyped Unit; NFR-013-AC-5 + TC-247 for fixture inventory |
| FR-040 authority, language registry | FND-071, FND-084, FND-090, FND-091 | FR-028 names quire-rs FR-040 as authority with a contract test (TC-242); core language set owned here |
| EARS shape | FND-095, FND-097, FND-098, FND-100, FND-101, FND-102, FND-104 | MAY → If/then SHALL fail; two-SHALL descriptions split; NFR-013 subject reworded; validator named as agent |
| Housekeeping | FND-062, FND-067, FND-074, FND-092, FND-093 | NFR-013 permitted paths listed and FR-025 edge added; US-006 short-form targets; index description; worked-example fixture named |

Not changed: FND-070 (verification-order between FR-020-AC-7/8 and FR-027..029 is a planning
constraint: those two criteria close the slice), FND-073 (#35 lowering table is a #35 obligation),
FND-086/087/088 (register entries), FND-106 (generator gap stays recorded).
