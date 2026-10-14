---
id: SR-9052
title: "QSL-754 filament-core-data PR 283 gap analysis: owner-nested member identities"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@c027ad4f8676b738e043b863a4dbd535bee094eb; FR-095-AC-6, AC-7, AC-19, AC-20, AC-21; crates/extraction-frontend/src/identity.rs, src/constructs.rs, tests/owner_nested.rs, tests/clauses.rs, tests/identity.rs; compared with agent-ix/quire-spec-language impl/business-model-meanings (qsl-semantics/src/model/intake.rs, state_machine.rs, process.rs) and QSpec FR-154 / TC-235 (cited by id)"
review_set: subset
---

## Summary

Public-repo redaction (disposition pass 1): wording that described the contents of the
private QSpec repository was replaced by id-only citations and references to public QSL
code. The unredacted review text is on the ticket.

Plan completion: not assessed

Ticket: QSL-754, items 1-5. `quire matrix` (quire 0.36.2, engine 0.50.2)
shows FR-095-AC-6, AC-7, AC-19, AC-20 and AC-21 tagged. The bindings are
TC-1251 at `clauses.rs:457`, TC-1252 at `identity.rs:49`, TC-1837 at
`owner_nested.rs:103,163`, TC-1838 at `:185,238` and TC-1839 at `:251,283`.
FR-095-AC-18 is untagged, but that predates this PR.

- Item 1 (FR-095 and identity.rs mint the nested form): met. The goldens
  show only identity spelling changes. The two TC-1837 tests check exact
  identities and that every member identity strips to `<owner>/` plus one
  member name. That check is not vacuous: it fails on a global-slot spelling,
  a wrong owner or a hyphenated name. The rewritten TC-1251 helper
  (`owner_nested_ok`) refuses an owner segment named `clause`, `state`,
  `transition` or `step`, so a reverted minter would fail it.
- Item 2 (transition member name): met, and the rule is sound. It agrees with QSpec FR-154
  (cited by id). QSL's `member_key` (state_machine.rs:39-54) checks only the
  member form. The `transition3` spelling the ticket cites comes from QSL's unit tests, and
  zero-based position matches them. Positions depend on row order, so
  inserting a row renames the transitions after it. FR-095 now
  states the positional rule, so this is a documented property, not a
  defect. The collision a position name can cause (state `transition0`) is
  refused and tested.
- Item 3 (name equality): met on the FCD side. The member name is the
  clauseId, state name or step name verbatim, and TC-1837 asserts
  `name`/`clauseId` equals the last segment.
- Item 4 (vectors): partly met. The collision vectors and the two-owner
  vector are present. The wrong-owner refusal is a QSL-side vector (QSpec TC-235, cited by id). FCD cannot mint a wrong owner, because the owner is always the
  declaring artifact's `ctx.id`. The TC-1837 structural test is the right
  FCD-side oracle, so that part is acceptable. The "lifted package is
  admitted" half is not met (FND-003).
- Item 5 (pins): QSL pins FCD 72527ab5 for both crates (qsl-semantics
  Cargo.toml). Every QSL test that runs FCD's lift uses the `architecture`
  fixture or a hand-written bundle with no clause, state machine or process:
  model_intake.rs:124 and :176 (architecture), :1485 (BUNDLE_UNIDENTIFIED),
  :1555 (the DUPLICATE_IDENTITY field/operation repro), variant_type.rs:857
  (EN_001 enumeration), and tests/it/composed_domain_models.rs:115-140
  (architecture copies whose edits touch only ids, ports and operations).
  The architecture golden has no clause, state, transition or step nodes, so
  the paired bump changes none of those lifts.
- Open point (d): the semantic-ir fixtures with hand-written old-style
  identities are reader inputs. The reader checks only uniqueness, so they
  are not minting evidence and need no change.

## Verdict

FINDINGS: one high (cross-repo, not caused by this PR), two medium, one low.
The PR does what items 1-3 ask. FND-003 means the ticket's stated outcome,
that QSL admits a lifted package carrying these nodes, is not reached by
this PR. It needs a follow-up ticket. Remove or measure the PR body's
"is admitted by QSL" claim.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-095-AC-21 says the refusal is raised "at their row" and the member lifts "to no definition". TC-1839 asserts only `refusal.locus.is_some()`, so a frontmatter or type-level locus passes. It also never asserts that the `_hold` state or `_pick` step is missing from the output. Assert the locus line equals the inserted row's line, and assert the absence. | crates/extraction-frontend/tests/owner_nested.rs:264-278 |
| FND-002 | low | FR-095-AC-20 says the earlier node's locus is in `related`. TC-1838 asserts only `duplicate.related.len() == 1`, so a `related` entry naming the later node, or any other node, passes. Assert the related locus is the operation, field, transition or clause declaration line. | crates/extraction-frontend/tests/owner_nested.rs:228-232 |
| FND-003 | high | No FCD-lifted package with a clause, state machine or process can be admitted by QSL today, with or without this PR. The PR body nevertheless says "so a lifted package that carries them is admitted by QSL". Cause 1: FCD slugs field, operation and parameter names (`created_at` to `Note/created-at`, FR-095 slot list). QSL's `read_field_member`, operation reader and parameter reader refuse any member segment outside `^[A-Za-z][A-Za-z0-9_]*$` (`is_artifact_segment`, intake.rs:1280-1307 and :2894-2908), so any underscored field is malformed-declaration. Cause 2: the business fixture's `FR-001` and `OP-001` ids fail `type_identity_segment`. As a result of the mixed rule, FCD's collision check also misses a state `created_at` beside a field `created_at`, because they mint `/created_at` and `/created-at`. This PR's four kinds use the verbatim member name, so field, operation and parameter names should follow the same rule. That needs a follow-up FCD ticket linked to QSL-754, plus an end-to-end vector that lifts a bundle with a clause, state machine and process through QSL. | spec/functional/FR-095-mint-package-identity-and-provenance.md:105-110 |
| FND-004 | medium | The TypeSpec frontend still mints `clause/<Name>-<clauseId>` (`identity.mjs:22`, `lower.mjs:1310`). The contract table now has two clause rules for one IR. The shared identity table (FR-095-AC-16) has no clause, state, transition or step rows, so nothing checks the two frontends against each other for these kinds. QSL consumes only the Rust lift (`lift_document`), so this does not block QSL-754. The difference is recorded in prose with no owning ticket. File one and link it. TypeSpec clause ids such as `left-invariant` do not fit the member-name pattern, so the fix is not a one-line change. | docs/semantic-data-system/contracts-v1.md:181, src/compiler/frontend/typespec/lower.mjs:1310 |

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-005 | medium | Reworded FR-095-AC-21 also says the refused owner's dependents raise `ARTIFACT_NOT_LOWERED`. The business fixture has such dependents: `FR-001` targets `SM_001`. TC-1839 asserts that the owner is absent and that the lift is blocked, but never asserts the dependents' `ARTIFACT_NOT_LOWERED`, so that clause of the AC has no test. Add the assertion, or drop the clause from AC-21. | crates/extraction-frontend/tests/owner_nested.rs:383-396 |

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 4aaa1c7e: TC-1839 asserts the locus `(path, start_line)` equals the declaring row for state, step and clause, asserts the owner identity is absent from `types`, and asserts the lift is blocked |
| FND-002 | fixed | 4aaa1c7e: TC-1838 asserts the locus is the later node's `(path, line)` and `related[0]` is the earlier node's, in all four cases; AC-20 states the owner node order that decides which node is later |
| FND-003 | deferred | QSL-754 items 6-7 (a second PR under QSL-754): pass field, operation and parameter names through unchanged, plus an end-to-end FCD-to-QSL admission test. The PR body no longer claims QSL admission; it says the business bundle is not admitted until that follow-up lands. |
| FND-004 | accepted-no-change | Planner ruling: the TypeSpec clause rule gets no ticket. QSL consumes only the Rust lift, and contracts-v1 records the difference. |
| FND-005 | fixed | 5a4be8b9: for both SM_001 cases, TC-1839 asserts an ARTIFACT_NOT_LOWERED naming FR-001 and SM_001; AC-21 names FR-001. FR-001 is the fixture's only artifact with a relationship targeting SM_001 or PR_001 |
