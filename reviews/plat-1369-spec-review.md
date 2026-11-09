---
id: SR-16492
title: PLAT-1369 PR 343 spec-review
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; PR 343; spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md, spec/tests.md, spec/spec.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-149
    type: references
---

## Summary

Ticket: PLAT-1369. This reviews the four new FR-149 statement bullets,
FR-149-AC-6 to AC-9, TC-1903 to TC-1906 and the spec.md overview sentence.
EARS and integrity checks were run inline, and the sub-analyses were scoped
to statements and ACs. `quire validate --scope .` exits 0. Its advisory
warnings on the new bullets (non-singular on lines 52, 54 and 55,
agentless-passive on 54) follow the same pattern as the pre-existing
bullets. The one new kind of warning is mixed-modal on line 54. Each TC row
traces to exactly one new AC, and the TC ids do not collide with any
existing row. AC-6, AC-7 and AC-9 are atomic and each one can fail.

## Verdict

PASS with low findings only. AC-8's accept clause is worded as if all three
rule types carry a `pattern`. The lint-rule statement bullet mixes `SHALL`
and `may`.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | FR-149-AC-8 says "A `lint_rules` entry of each of the three `type` values with a string `pattern` is accepted", but only `section_body_pattern` has a `pattern` member in quire-rs `LintRule`. Two implementers could read the clause differently (a pattern on all three types, or on the rule that takes one). Suggested wording: "each of the three `type` values (a `section_body_pattern` with a string `pattern`) is accepted". | spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md:70 |
| FND-002 | low | The `lint_rules` statement bullet mixes `SHALL` and `may` ("may declare a string `annotation_pattern`"), and quire flags it [quality:mixed-modal]. Fix: state `annotation_pattern` as optional, as the same bullet already does for `archetypes`, `message` and `severity`. | spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md:54 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | AC-8 now reads "each of the three `type` values is accepted, with a string `pattern` on a `section_body_pattern` rule". |
| FND-002 | fixed | The bullet now says "its optional `annotation_pattern` SHALL be a string", and quire no longer reports mixed-modal on line 54. |
