---
id: SR-16070
title: "Spec review — verbatim field, operation and parameter names in identity minting (FR-095)"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; spec/functional/FR-095-mint-package-identity-and-provenance.md, docs/semantic-data-system/contracts-v1.md, spec/tests.md at e020b1e"
review_set: subset
evaluated_revision: "e020b1ef5e1ed49d7cedb6305f4b06d73fef214f"
relationships:
  - target: ix://agent-ix/filament-core-data/FR-095
    type: reviews
  - target: ix://agent-ix/filament-core-data/FR-093
    type: reviews
  - target: ix://agent-ix/filament-core-data/FR-053
    type: reviews
---

## Summary

Ticket: STD-292. PR filament-core-data#302 changes FR-095 and the
`contracts-v1.md` Identity minting section so that both frontends mint field,
operation and operation parameter identities from the verbatim name, refuse a
name outside `^[A-Za-z][A-Za-z0-9_]*$` as `UNSLUGGABLE_NAME`, and keep slugging
the `<Field>` of a constrained-field alias. It adds FR-095-AC-23 and TC-1850.
Checked against FCD main 0439946, the identity fixture
`crates/extraction-frontend/fixtures/identity-cases/identity-cases.json`,
`crates/extraction-frontend/tests/identity.rs`, FR-034, FR-053 and FR-093, and
against QSpec #378 (7b56ed2).

## Verdict

Not mergeable as is: two major findings. The FR-095 change agrees with QSpec
#378 on the rule, the regex, the slugged alias and the field/state collision,
which is raised at the later member in both specs. But the same PR leaves
FR-093 and the contract's own prose and case (b) example stating the old
slugged rule, so the corpus now contradicts itself on fields `created_at` and
`created__at`. Gates: `quire validate` output is identical to main (0
failures, 61 warnings, none in FR-093/FR-095/tests.md); FR-146 is clean.
TC-1850 and FR-095-AC-23 are unique across open PRs (#292, #84). Planner note
(not a finding): the follow-up code changes more than the `created_at` rows.
`identity-cases.json` has a field row `Snap Shot` → `Snapshot/Snap-Shot` and an
operation row `find By Id` → `Repository/find-By-Id`, and `identity.rs:119-123`
asserts the operation one. Under this rule each of these becomes an
`UNSLUGGABLE_NAME` refusal row. No golden IR in the repo carries a hyphenated
nested member segment.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | FR-093 still requires `UNSLUGGABLE_NAME` at the later of two field rows "whose slugs coincide (`created_at` beside `created__at`)", and FR-093-AC-13 (TC-1334, tests.md permutation row FR-093-AC-13 Prohibited, ERR-267, EC-161) asserts it. FR-095's amended case (b) and FR-095-AC-23 say the same two fields mint two identities and raise nothing. The two requirements contradict each other. | spec/functional/FR-093-lower-field-declarations-to-ir-fields.md:74, spec/functional/FR-093-lower-field-declarations-to-ir-fields.md:160, spec/functional/FR-095-mint-package-identity-and-provenance.md:173, spec/tests.md:1651 |
| FND-002 | high | `contracts-v1.md` §Identity minting, which FR-095 says it yields to, still says "Every name part of every slot is slugged" (line 170). Its case (b) still gives `created_at` beside `created__at` as "distinct names, one slug" refused `UNSLUGGABLE_NAME` (line 240). Both contradict the paragraph this PR amends at line 197. | docs/semantic-data-system/contracts-v1.md:170, docs/semantic-data-system/contracts-v1.md:240 |
| FND-003 | medium | The contract now makes the TypeSpec frontend refuse a field, operation or parameter name outside the member-name rule ("on both sides"), but FR-053 (the TypeSpec frontend's requirement) has no SHALL or AC for it. FR-053 still only refuses names "slugging to one identity". FR-095-AC-23's "on both minters" checks minting only, so the TypeSpec refusal of, for example, a property `_tmp` has no requirement and no test. | spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:65, docs/semantic-data-system/contracts-v1.md:197-200 |
| FND-004 | low | The amended DUPLICATE_IDENTITY bullet opens "under distinct names with distinct slugs" but now gives the example "a field and an operation of the same owner sharing one name", which is one name, not distinct names. | spec/functional/FR-095-mint-package-identity-and-provenance.md:134 |
| FND-005 | medium | The new field/operation/parameter refusal bullet says the frontend raises `UNSLUGGABLE_NAME` and mints no identity. It does not say what happens to the declaring artifact. The parallel clause/state/step bullet says the artifact "SHALL lift to no definition", and AC-23 asserts only the diagnostic, so whether the owner of `_tmp` still lifts is left open. | spec/functional/FR-095-mint-package-identity-and-provenance.md:123, spec/functional/FR-095-mint-package-identity-and-provenance.md:173 |
| FND-006 | low | FR-095-AC-23 and TC-1850 say the alias "stays" `FR-001Created-at`. That is change-relative wording; the criterion should state the value. | spec/functional/FR-095-mint-package-identity-and-provenance.md:173, spec/tests.md:1372 |

## Dispositions

Round 1, against head a6a58f8addd4b1b4517e6358370b9988a671c014.

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | - |
| FND-002 | fixed | - |
| FND-003 | fixed | - |
| FND-004 | fixed | - |
| FND-005 | fixed | - |
| FND-006 | fixed | - |
