---
id: SR-16489
title: "Gap analysis of PLAT-1303 single-extent populations and quire-rs bump"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; PLAT-1303, PLAT-1305 (filament-core-data half); PR #340 head 77934234; spec/functional/FR-143, FR-091, FR-141; crates/extraction-frontend; tests/test_fixture_domain_expressions.py"
review_set: subset
---

## Summary

Ticket: PLAT-1303 (primary), PLAT-1305 (filament-core-data half). Planless
gap analysis over the PR diff. Plan completion: not assessed. Read
`quoin matrix --json` (quoin 0.29.1): FR-143-AC-6 and FR-091 criteria stay
tagged (TC-1785, TC-1841). Checked PLAT-1303's two items and PLAT-1305
against quire-rs `71a1f970`, filament-core-service `origin/main`, and the
frontend source.

## Verdict

**FAIL.** Item 1 of PLAT-1303 (single-extent populations) is implemented and
tested in this repository. Item 2 (construct references carrier) needs no
code here: the frontend admits references itself and never builds the
Filament snapshot. The carrier exists in quire-rs
(`SemanticSnapshot.construct_references`, passed by `attach_semantic`), but
its producer, filament-core-service, does not populate `constructReferences`
on `origin/main` (FND-002). PLAT-1305's filament-core-data half admits the
schema keys, but no requirement in this repository states what the frontend
does with an inline expression, and the lowering drops it (FND-001). The
code-review artifact SR-16488 FND-001 holds the reproduction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | No requirement or AC states how the frontend lowers or refuses a transition `guardExpression` or an operation `operationExpressions` entry, which quire-rs 71a1f970 now emits; FR-143-AC-6 still lists only clause-id guards | spec/functional/FR-143-lift-object-type-artifacts-to-their-constructs.md:125 |
| FND-002 | medium | PLAT-1303 item 2 stays unmet end to end: filament-core-service `origin/main` never sets `constructReferences` on the semantic snapshot, so closing PLAT-1303 on this PR leaves item 2 without an owner | PLAT-1303 item 2 |
| FND-003 | low | tests/test_fixture_domain_expressions.py carries no trace tag and backs no criterion, and tests `operationExpressions` on StateMachine only of the six schemas that gained it | tests/test_fixture_domain_expressions.py:61 |

## Scope

```yaml
scope:
- id: FR-143-AC-6
  path: spec/functional/FR-143-lift-object-type-artifacts-to-their-constructs.md
  role: examined
  excerpt: "In the `business` fixture, each of these yields one blocking `ARTIFACT_NOT_LOWERED` naming the declaration and emits no type of that artifact: a transition emitting `EN_001`; a step consuming `EV_999`; a transition emitting `EV_001, EV_001`; ... a population's `Members` table; ... an engine transition record whose trigger names no operation, and one whose guard names no clause; ..."
- id: FR-091
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "the activated normal/build dependency graph SHALL contain no path to `quire-code-extraction`, `quire-code-parse`, the `tree-sitter` runtime, or any tree-sitter language or grammar package."
- id: FR-141
  path: spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md
  role: context_only
  excerpt: "Named instance extents, ... a flat set of unique member type references, and a single `extent` (`closed` or `open`, QSpec FR-153/AD-006) for the population as a whole"
```

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-004 | low | spec/tests.md maps TC-1785 to FR-143-AC-12, but tc_1785's trace attribute still names FR-143-AC-6 only, so the computed matrix binds AC-12 to the schema tests alone and the refusal half of AC-12 is untraced | crates/extraction-frontend/tests/constructs.rs:1735 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | 59f534c6 adds the FR-143 refusal statement and FR-143-AC-12, mapped to TC-1785 and TC-1897; no id collision with main or open PR #84 |
| FND-002 | deferred | Not a filament-core-data change: the PR body now states item 2 is not done end to end, and PLAT-1362 (filament-core-service) owns setting constructReferences |
| FND-003 | fixed | 59f534c6 tags every test `Trace: TC-1897, FR-143-AC-12` (matrix binds all four) and parametrizes over all six operation types |
