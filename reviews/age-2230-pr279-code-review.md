---
id: SR-259
title: AGE-2230 PR 279 payload helper code review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@a0aba06223b858555690e9a120b9dd7776ee170f; PR 279; crates/extraction-frontend/tests/payload.rs; snapshot-table fixture; FR-098-AC-9; FR-098-CON-3; FR-144-AC-12 and FR-144-AC-16 as context; Makefile and Cargo manifests"
review_set: subset
---

## Summary

Ticket: AGE-2230. Reviewed the immutable one-file PR 279 delta against base faed5ef1c920f26a138022e5b0a57d759ff05d38 using code-review and its Rust lane. The helper now interprets the committed Snapshot minimum operand `"1"` as a numeric bound, rejects versionNumber zero on a complete payload, and separately asserts required-field failures for the sparse payload.

## Verdict

**PASS** for this PR's scoped test-only change; no introduced defect found. This is not a repository-wide gate pass. The full crate test command stopped in unchanged backend tests because the worktree lacks `@typespec/compiler`; strict matrix reports 1,547 untagged criteria and 4 criteria tagged only by ignored tests. The exact changed test, visibility test, formatting, workspace Clippy and dependency policy passed.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

The changed helper at payload.rs:55-61 parses numbers or strings and the min/max branches at lines 153-154 compare actual numeric values. The committed fixture contains integer bound `"1"`; the test's values 0 and 1 are exactly representable. This fixture-specific derivation remains private under tests, and does not claim production exact numeric validation under FR-144. Existing production exact-number logic remains untouched.

The complete payload at lines 202-213 isolates the numeric failure and requires exactly one violation. The sparse payload at lines 215-228 independently checks all five other required fields and the absence of a parent violation. The original valid payload assertion remains. No ignored tests, warning suppressions, weakened CI lanes, source changes, or new dependency copies were introduced. Searches for numeric-bound helpers and f64 parsing in extraction tests and semantic-ir source found no existing equivalent test helper to reuse; semantic-ir's custom Json/parser is a different production boundary.

No applicable AssuranceProfile was found in spec/. Default Rust-style, repository CONTRIBUTING.md, Cargo manifests, deny policy and Makefile conventions were checked. The project-control skill supplied the Make-based gates. Standalone gap-analysis and spec-review were assessed and skipped under the reviewer applicability table: this delta changes only an existing test file, with no production/spec/plan change. The code review still checked its computed trace bindings and relevant acceptance text. No full repository assurance or plan-completion claim is made.

## Examined units

```yaml
{
  "clean": true,
  "scope": [
    {
      "id": "FR-098-AC-9",
      "path": "spec/functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md",
      "role": "examined",
      "excerpt": "Test (TC-1293) |"
    },
    {
      "id": "FR-098-CON-3",
      "path": "spec/functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md",
      "role": "examined",
      "excerpt": "Scope"
    },
    {
      "id": "FR-144-AC-12",
      "path": "spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md",
      "role": "context_only",
      "excerpt": "Test |"
    },
    {
      "id": "FR-144-AC-16",
      "path": "spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md",
      "role": "context_only",
      "excerpt": "Inspection |"
    }
  ],
  "findings": [],
  "bindings": [
    {
      "test_id": "tc_1293_a_snapshot_payload_validates_and_version_number_zero_fails_at_version_number",
      "ac_id": "FR-098-AC-9",
      "trace": "correct"
    },
    {
      "test_id": "tc_1338_the_payload_helper_lives_under_tests_only_and_is_unreachable_from_lift_and_inspect",
      "ac_id": "FR-098-CON-3",
      "trace": "correct"
    }
  ]
}
```

## Validation evidence

All paths below are under `/tmp/fcd-pr279-review/` on terra.

- `cargo fmt --all -- --check`: exit 0 (`fmt.log`).
- `make rust-clippy`: exit 0, workspace/all-targets/no-deps with `-D warnings` (`clippy.log`).
- `make extraction-frontend-deny`: exit 0, advisories/bans/licenses/sources OK; existing unmatched license allowances emitted warnings (`deny.log`). Initial sandbox attempt could not lock the advisory database; approved rerun passed.
- `make extraction-frontend-test`: exit 2 because backend TC-1292 tests could not import `@typespec/compiler` (`extraction-frontend-test.log`). It compiled the crate and passed earlier tests; it did not reach payload.rs before stopping. This is an environment limitation, not a passing full crate gate.
- `CARGO_TARGET_DIR="$PWD/node_modules/.cache/rust-target" cargo test --offline --locked -p agent-ix-extraction-frontend --test payload tc_1293 -- --exact tc_1293_a_snapshot_payload_validates_and_version_number_zero_fails_at_version_number`: exit 0, 1 passed, 2 filtered (`tc1293.log`).
- The payload test binary built from this head, invoked with `--exact tc_1338_the_payload_helper_lives_under_tests_only_and_is_unreachable_from_lift_and_inspect`: exit 0, 1 passed, 2 filtered (`helper-visibility.log`).
- `quire matrix --strict`: exit 1, 1,547 untagged and 4 ignored-only criteria (`matrix.log`). FR-098-AC-9 is tagged at payload.rs:174 and FR-098-CON-3 at payload.rs:270. No spec or trace tag changed, so those repository-wide gaps are outside this delta.
- `git diff --check` passed; tracked worktree remained clean at the reviewed SHA.

Installed tooling: `/home/peter/.local/bin/quoin` 0.28.3 and `/home/peter/.local/bin/quire` 0.36.2 (engine 0.50.2). The skill's `quoin write --types SpecReview` returned exit 1, `write requires <repo_dir>`; the installed CLI help supplied the valid `quoin write . --types SpecReview`, which returned the installed skeleton and schema. This mismatch was reported to the lead. Matrix output also reports existing duplicate archetype/inverse-edge module warnings.

## Artifact custody

No source edits, commits, pushes, merges, GitHub comments or Linear writes were performed. This PR-specific artifact has a separate id from SR-257, which reviews different PR 275 under the same AGE-2230 ticket. The dispatching lead owns tracker posting and artifact custody; review metadata is prepared in `review-data.json` for that purpose.
