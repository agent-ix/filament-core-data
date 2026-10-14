---
id: SR-9053
title: "QSL-754 filament-core-data PR 283 spec review: FR-095, tests.md, contracts-v1"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@c027ad4f8676b738e043b863a4dbd535bee094eb; spec/functional/FR-095-mint-package-identity-and-provenance.md (Outputs, Behavior slot list and member-name rules, AC-6, AC-7, AC-19..21), spec/tests.md (TC-1243, TC-1251, TC-1252, TC-1837..1839), docs/semantic-data-system/contracts-v1.md (Identity minting)"
review_set: subset
---

## Summary

Public-repo redaction (disposition pass 1): wording that described the contents of the
private QSpec repository was replaced by id-only citations and references to public QSL
code. The unredacted review text is on the ticket.

Ticket: QSL-754. FR-095 now states the nested form for clause, state,
transition and step. It also states the verbatim member-name rule with its
`UNSLUGGABLE_NAME` refusal, the positional transition name, and the
collision rule under `DUPLICATE_IDENTITY`. Each new statement has an AC
(AC-19, AC-20, AC-21) and a TC row (TC-1837..1839). AC-6 and AC-7 match the
code: the old AC-6 grammar (`state/`, `transition/`, ...) is gone and AC-7's
example is `SM_001/placed`. The rule agrees with QSpec FR-154 (cited by id) and
with QSL's public `member_identity_name` (qsl-semantics/src/model/intake.rs). contracts-v1 matches
FR-095 and records the TypeSpec clause difference, which SR-9052 FND-004
covers. FCD text cites no QSpec text. `quire validate` passes FR-095 and
tests.md.

## Verdict

FINDINGS: one medium, three low. None blocks the merge on its own. FND-001
should be settled in this PR, because the PR is what removed FCD's only
check for that case.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-095 does not say what happens to two transition rows of one machine with equal `from`, `to` and `trigger`. Before this PR they minted the same `transition/<Name>-<from>-<to>-<trigger>` identity and FCD blocked with `DUPLICATE_IDENTITY` at the later row. With positional names they mint `transition0` and `transition1`, so FCD now lifts both without a diagnostic, and only QSL refuses the package. Either add a statement, AC and test that the frontend refuses equal transition rows, or state that FCD leaves the check to the consumer. | spec/functional/FR-095-mint-package-identity-and-provenance.md:116 |
| FND-002 | low | TC-1241 still says operation parameters lower "under field/<Name>-<operation>-<param>". That is the pre-nesting grammar, which FR-095 replaced with `<Name>/<operation>/<param>`. This PR rewrote TC-1243 and TC-1251 to fix the same stale wording but left this row. | spec/tests.md:1048 |
| FND-003 | low | FR-095-AC-21's "lift to no definition" is ambiguous. It can mean the refused state or step row is left out, or that the whole state machine or process lifts to no definition. The two readings give different tests (SR-9052 FND-001). Name which one. | spec/functional/FR-095-mint-package-identity-and-provenance.md:167 |
| FND-004 | low | The member-name refusal statement covers a clause `clauseId`, a state name and a step name. AC-21 and TC-1839 exercise only a state and a step, so the clause branch of the statement has no criterion. Add a non-member `clauseId` case to AC-21, if the engine admits one, or say why it cannot be reached. | spec/functional/FR-095-mint-package-identity-and-provenance.md:121 |

## New findings (disposition pass 2)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-005 | low | Two places in public text ascribe a rule to a QSpec requirement: the FR-095 statement on transition rows ("refusing equal rows is the consumer's rule", followed by a QSpec id) and the comment in TC-1840. Public text should cite QSpec by id only, never state what it requires. Nothing new is disclosed, because QSL's public code implements the same refusal (qsl-semantics/src/model/normalize.rs:1617). Cite that public QSL behaviour, or drop the parenthetical. This does not block the merge. | spec/functional/FR-095-mint-package-identity-and-provenance.md:122, crates/extraction-frontend/tests/owner_nested.rs:294 |

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 4aaa1c7e: FR-095 states that the frontend does not compare transition rows semantically; new AC-22 and TC-1840 (tagged, `owner_nested.rs:292`) assert that equal rows lift as transition0..transition3 with no diagnostic |
| FND-002 | fixed | 4aaa1c7e: TC-1241 now reads `<Name>/<operation>/<param>` |
| FND-003 | fixed | 4aaa1c7e: AC-21 names the whole state machine or process as lifting to no definition |
| FND-004 | fixed | 4aaa1c7e: AC-21, TC-1839 and the test cover a clause `_tight` located at its fence |
