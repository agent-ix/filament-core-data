---
id: SR-16456
title: "IR-991 PR 312 incremental gap analysis"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@d3080d6f24f05428b35c1a450b2ab78a055b0930; FR-146-AC-1..9; PR #312 reader and test diff"
review_set: subset
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-146", type: references }
---
# SR-16456: IR-991 PR 312 incremental gap analysis

## Summary

Planless, diff-scoped check of FR-146 reader criteria against the computed Quire Test Matrix and new tests. The new tests exercise the intended behavior, but their TC identifiers in function names are not recognized FR trace binders. `quire matrix --scope . --format json` on the exact head reports AC-1 tagged through the prior IR-990 test and AC-2/3/4/5/6/9 untagged. AC-7/8 are excluded to IR-993 and also remain untagged.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-146-AC-2 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | crates/semantic-ir/tests/model_document.rs:284 |
| FND-002 | medium | FR-146-AC-3 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | crates/semantic-ir/tests/clock_units.rs:12 |
| FND-003 | medium | FR-146-AC-4 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | crates/semantic-ir/src/unit_graph.rs:144 |
| FND-004 | medium | FR-146-AC-5 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | crates/semantic-ir/src/unit_graph.rs:58 |
| FND-005 | medium | FR-146-AC-6 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | crates/semantic-ir/tests/model_document.rs:284 |
| FND-006 | medium | FR-146-AC-9 remains untagged in the computed Test Matrix: new tests carry TC names but no recognized `FR-146-AC-*` trace binder. | test/clock-units.test.ts:189 |

## Coverage

- AC-1: tagged, with the prior IR-990 Rust test.
- AC-2/3/4/5/6/9: behavioral tests are present in Rust and TypeScript, but no computed binder; adding accepted trace tags to those tests is needed to connect these criteria to evidence.
- AC-7/8: excluded to IR-993; no completion is claimed here.
- Reverse gap: the new graph, Clock and quantity behaviors are owned by FR-146. No unsupported new behavior or stub was found in the changed production paths.
- Plan completion: not assessed. Optional semantic review was not requested; the check above only assesses binder presence and direct test assertions. No aggregate gates were run by this reviewer.

## Verdict

FAIL for incremental traceability: six in-scope FR-146 acceptance criteria remain untagged at the exact reviewed head. This is a traceability finding; the new focused tests themselves assert real behavior.

## Dispositions

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | FR-146-AC-2 now has 11 recognized binders in the computed matrix. |
| FND-002 | fixed | FR-146-AC-3 now has 6 recognized binders. |
| FND-003 | fixed | FR-146-AC-4 now has 19 recognized binders. |
| FND-004 | fixed | FR-146-AC-5 now has 8 recognized binders. |
| FND-005 | fixed | FR-146-AC-6 now has 13 recognized binders. |
| FND-006 | fixed | FR-146-AC-9 now has 5 recognized binders. |

### Round 1 evidence

The exact head `578541ff119b8ba49cf02ffc2f941516f56eaca0` adds only 48 trace comments across five test paths and byte-exact copies of the original SR-16455/16456 files. No production code, test assertion, fixture, spec, lock or gate file changed. Direct comparison of computed matrix JSON against reviewed head `d3080d6f24f05428b35c1a450b2ab78a055b0930` has exactly six changed criteria: AC-2/3/4/5/6/9, each now `tagged` with 11/6/19/8/13/5 binders. AC-7/8 remain `untagged` and excluded to IR-993. All other 2182 criterion records are byte-equivalent after JSON parsing. `git diff --check` passes.

- FND-001 after excerpt: `// FR-146-AC-2: exact reader assertions below.` at `crates/semantic-ir/tests/clock_units.rs:97`.
- FND-002 after excerpt: `// FR-146-AC-3: exact reader assertions below.` at `crates/semantic-ir/tests/clock_units.rs:11`.
- FND-003 after excerpt: `// FR-146-AC-4: exact reader assertions below.` at `crates/semantic-ir/tests/clock_units.rs:41`.
- FND-004 after excerpt: `// FR-146-AC-5: exact reader assertions below.` at `crates/semantic-ir/tests/clock_units.rs:41`.
- FND-005 after excerpt: `// FR-146-AC-6, FR-146-AC-9: exact reader assertions below.` at `crates/semantic-ir/tests/model_document.rs:370`.
- FND-006 after excerpt: `// FR-146-AC-6, FR-146-AC-9: exact reader assertions below.` at `crates/semantic-ir/tests/model_document.rs:370`.
