---
id: SR-16504
title: QSL-2253 PR 360 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@cfd8b6dcbaea63a514a85b0f67e3fdfff7cd5e58; PR 360; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, spec/functional/FR-147-carry-tuple-value-types-and-union-variant-payloads.md, spec/tests.md, crates/semantic-ir/tests/tuple_union.rs, test/tuple-union.test.ts, fixtures/semantic/v1/tuple-union/cases.json"
review_set: subset
---

## Summary

Ticket: QSL-2253. Planless gap analysis. `quire matrix --scope .` reports
FR-147-AC-15 tagged (crates/semantic-ir/tests/tuple_union.rs:234) and
FR-146-AC-2 tagged. FR-147-AC-6 is `untagged`, and it was untagged on origin/main
too: the only tags for it are a Rust `//` comment and a TS `Traces:` doc comment,
and quire does not count either form. This is the repo's existing convention
and is not caused by this PR.

TC-1886 (Rust tc_1886_... and TS "TC-1886 admits ...") checks the variant
payload and the tuple position, each directly and through the alias `Tick` ->
Clock. The controls are a unit payload (`ix://filament/unit/ms`) and a nullary
variant: the fixture's `Shape` has one nullary case and every admitted document
is built from it. The tests can fail: the payload cases would fail against
origin/main's refusal. The Rust position case would fail against the removed
constructs.rs check. The shared vectors `clock-position` and
`clock-variant-payload` (cases.json) and `clock-variant-admitted`
(clock-cases.json) are now `admits` / `[]`, and TC-1885 replays them in both
suites.

The semantic-value half of QSL-2253 (filament-semantic-value) is not in this
PR. The PR body and commits make no claim about it and say "refs", not
"closes". That is correct: PR 360 may claim only the filament-core-data half.

## Verdict

PASS with one medium coverage finding.

Plan completion: not assessed

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-147-AC-15 and TC-1886 now say the normalized form keeps the Clock type reference, which covers the payload as well as the position. Both suites check normalization only for the direct Clock position. No test normalizes a Clock payload or an aliased one. The Rust check is a whole-text `contains("ix://filament/native/Clock")`, which does not look at the position itself. | crates/semantic-ir/tests/tuple_union.rs:266-268, test/tuple-union.test.ts:253-260, spec/functional/FR-147-carry-tuple-value-types-and-union-variant-payloads.md:299 |
