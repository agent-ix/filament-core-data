---
id: SR-029
title: "Integrity review of the semantic IR v1.1 revision"
type: SpecReview
analysis: integrity
scope: "spec/usecase/US-006-*.md, spec/functional/FR-020-*.md, spec/functional/FR-027-*.md..FR-030-*.md, spec/non-functional/NFR-013-*.md, spec/tests.md TC-203..236, spec/spec.md, spec/index.md"
review_set: all
---
# Integrity review

## Summary

US-006 is elaborated by FR-027..030, amends FR-020, and is constrained by
NFR-013 under StR-001. Every acceptance criterion, named constraint, and NFR-013
metric except one maps to TC-203..236; IDs are unique and the dependency graph
is acyclic. The revision is not yet single-interpretation: the spec never says
what distinguishes a v1 document from a v1.1 document under a schema that must
accept both, so FR-027-AC-6/NFR-013-AC-1 (v1 fixtures pass unchanged) and
FR-030 (the v1 dialect constant fails) cannot both be satisfied without an
unstated discriminator. Five further medium findings are ambiguities or textual
contradictions inside FR-027..029 (clause text carriage, two clause identities,
unresolved relationship targets, `unique` living in two nodes, and
FR-029-CON-1 permitting fixture edits that NFR-013-AC-1 forbids). No spec
artifact was edited by this review.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-055 | high | No requirement states how a v1 document and a v1.1 document are distinguished: the v1.1 `contractVersion` value is never given, NFR-013 scopes the change to `schema/semantic/v1/*.schema.json` (in-place) while FR-030-CON-1 and TC-231 speak of "the v1 schema" as a separate artifact, and FR-027-AC-6/NFR-013-AC-1 (v1 fixtures carrying the JSON Schema dialect URI validate unchanged) versus FR-030 (that URI fails "on a v1.1 document") only reconcile through an unstated discriminator. Two readers can implement `const "1.1.0"`, `enum ["1.0.0","1.1.0"]` with conditional rules, or a sibling `v1.1/` directory and all three satisfy the text. | FR-030, FR-030-CON-1, FR-027-CON-1, FR-027-AC-6, NFR-013-AC-1, TC-208, TC-228, TC-231 |
| FND-056 | medium | FR-028 says the IR "SHALL carry clause text opaquely" and lists "opaque text" as an input, but the enumerated `clauses[]` fields (`identity`, `language`, `clauseId`, `sourceSpan`, `origin`) contain no text property and AC-5 forbids a parsed-content property. Whether the clause body is carried inline or only reachable through `sourceSpan` has two valid readings, and US-006-EX-3 ("the IR carries a clauses[] entry ... and the source span") reads as the span-only interpretation. | FR-028, FR-028-AC-5, US-006-EX-3, TC-214 |
| FND-057 | medium | A clause carries both `identity` and `clauseId`; operation `pre[]`/`post[]` are said to hold "clause identities" without saying which, and no requirement makes `clauseId` unique within a type definition. EC-029 names the resulting mis-binding risk but no Behavior bullet or criterion closes it. | FR-028, FR-028-AC-4, EC-029, TC-212, TC-213 |
| FND-058 | medium | FR-028 Outputs promise a diagnostic for "unresolved targets", but no Behavior bullet defines target resolution (same package only, imported packages, self-reference as in EC-028) and no criterion or error row covers it; ERR-034 covers only category and non-record placement. | FR-028, ERR-034, EC-028, TC-210, TC-218 |
| FND-059 | medium | Collection uniqueness has two homes: FR-027 `multiplicity.unique` on the field and FR-029 constraint keyword `unique`. Neither requirement says which a declaration uses, whether both may appear, or what validation does when they disagree. | FR-027, FR-029 |
| FND-060 | medium | FR-029-CON-1 allows a v1 positive fixture to be "corrected in the same change", while FR-027-AC-6 and NFR-013-AC-1 require every v1 positive fixture to validate "unchanged"/"without edit". The conflict is vacuous today (no v1 positive fixture carries a constraint) but the texts contradict and TC-208 and TC-224 would disagree the first time it is not. | FR-029-CON-1, FR-027-AC-6, NFR-013-AC-1, TC-208, TC-224 |
| FND-061 | medium | FR-027 does not state whether a v1.1 field MUST carry `multiplicity`, whether `presence` and `nullable` stay required (they are required in v1), or whether a field carrying neither `presence` nor `multiplicity` is valid. "Derived view" is used for `presence` without saying whether the derived value is emitted, optional, or forbidden in normalized form, which TC-203's byte-identity check depends on. | FR-027, FR-027-CON-1, FR-027-AC-1, TC-203 |
| FND-062 | low | The amended FR-020 bullet says "a record type definition SHALL carry ... opaque clause nodes", but FR-028 allows `clauses[]` on any structural kind and restricts only `relationships[]` and `operations[]` to records. | FR-020, FR-028, FR-028-AC-7 |
| FND-063 | low | FR-029-AC-5 requires "no untyped `operands` path", yet `enumValues.values` items are untyped and `format.name` is "a namespaced format identifier" with no stated pattern; TC-223 cannot pass or fail unambiguously on those two paths. | FR-029, FR-029-AC-5, TC-223 |
| FND-064 | low | The NFR-013 metric "New IR nodes without both a golden and a negative fixture = 0" has no test case of its own; the NFR-013 coverage row lists TC-208 and TC-234..236, and TC-232 covers fixture pairing only indirectly through FR-020-AC-8. | NFR-013, TC-232 |
| FND-065 | low | FR-028 copies the category enumeration from quire-rs FR-040 without a version pin or a statement of which side is authoritative on divergence, and the relationship `multiplicity` field is not stated to reuse the FR-027 multiplicity object. | FR-028, FR-028-AC-2 |
| FND-066 | low | The boundary row `lower: 0, upper: 0` (valid, "empty-only multiplicity") is mapped to TC-206, whose statement is the `upper < lower` failure case; the valid boundary has no positive test. | FR-027, TC-206 |
| FND-067 | low | Traceability housekeeping: NFR-013 names FR-025 as upstream in prose but not in frontmatter relationships; US-006 uses the long `.../spec/usecase/US-005` target form while FR-027..030 and NFR-013 use the short `.../US-006` form; `spec/index.md` description still lists only architecture, census, and feasibility. | NFR-013, US-006, spec/index.md |

## Traceability Matrix

| US | FR/NFR | StR | Verification |
|---|---|---|---|
| US-006 (EX-1..4) | FR-027 (AC-1..7, CON-1..2) | StR-001 | TC-203..209 |
| US-006 | FR-028 (AC-1..8, CON-1..2) | StR-001 | TC-210..218 |
| US-006 | FR-029 (AC-1..6, CON-1..2) | StR-001 | TC-219..226 |
| US-006 | FR-030 (AC-1..4, CON-1..2) | StR-001 | TC-227..231 |
| US-006 | FR-020 (amended AC-7..8) | StR-001 | TC-232..233 |
| US-006 | NFR-013 (AC-1..4, 5 metrics) | StR-001 | TC-208, TC-234..236; metric 5 unmapped (FND-064) |

## Coverage Result

| Scope | Obligations | Matrix cases | Result |
|---|---|---|---|
| Issue #34 IR v1.1 | 25 FR criteria, 8 FR constraints, 4 NFR criteria, 5 NFR metrics | TC-203..236 | Mapped except NFR-013 metric 5; 1 high, 5 medium interpretation defects |
| Existing corpus | 202 cases | TC-001..202 | Untouched |
