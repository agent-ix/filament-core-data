---
id: SR-16507
title: QSL-2737 PR 361 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@35a1af39f6fc87f9ddface92b7c1d140844ec82d; PR 361; spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md, spec/functional/FR-142-declare-one-construct-per-object-type.md, spec/functional/FR-059-answer-the-conformance-corpus-from-rust.md, spec/functional/FR-068-decide-and-report-ir-admissibility.md, spec/tests.md, crates/semantic-ir/src/constructs.rs, crates/semantic-ir/tests/model_document.rs, crates/extraction-frontend/tests/constructs.rs"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-141
    type: references
---

## Summary

Ticket: QSL-2737. Planless gap analysis. `quire matrix --scope . --format tsv`
(quire 0.52.0, engine 0.62.2) exited 0. FR-141-AC-3 is `tagged` with one
binder, `tc_1742_unresolved_subsets_and_widening_redefines_raise_their_codes`
(crates/extraction-frontend/tests/constructs.rs:255), which still holds: it
names a missing field of another type, which the widened rule still refuses.
FR-142-CON-1 is tagged only by crates/extraction-frontend/tests/constructs.rs:530.

The four new tests in crates/semantic-ir/tests/model_document.rs carry
`/// Trace: FR-142, FR-059` or `/// Trace: FR-142-CON-1, FR-059` doc comments.
quire reports `trace-id-outside-marker` for each ("a comment never binds"), so
they bind no criterion. This doc-comment form is the file's existing convention
(its older tests carry `/// Trace: FR-141`), and FR-059-CON-5 forbids
semantic-ir any dependency, so a `#[trace]` attribute is not available there.
That form is not raised as a finding. The cited ids are: FR-142 covers construct
kinds and FR-059 the corpus adapter, but the subsets rule is owned by FR-141
(member table, Behavior, AC-3; TC-1742 is the code's `exercisedBy` in
conformance/diagnostic-codes.json).

Reverse gap: the one changed production line (constructs.rs:747-749) has an
owning rule in contracts-v1.md:316 and FSpec model-complete.md "Subsets". No
stub, no placeholder, and no coverage inflation found in the diff.

Plan completion: not assessed

## Verdict

PASS WITH FINDINGS. One medium finding: the new owning-type admission is bound
to no acceptance criterion, and the new tests name requirements that do not own
the rule.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The owning-type `subsets` admission this PR adds is stated by no acceptance criterion. Its tests cite FR-142/FR-059, which do not own the subsets rule, instead of FR-141-AC-3. The only binder of FR-141-AC-3 (tc_1742) never exercises an owning-type target, so the matrix shows no AC covering the new behavior. | crates/semantic-ir/tests/model_document.rs:72, crates/semantic-ir/tests/model_document.rs:87, spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:90, crates/extraction-frontend/tests/constructs.rs:255 |
