---
id: SR-9051
title: "QSL-754 filament-core-data PR 283 code review with rust-review lane"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@c027ad4f8676b738e043b863a4dbd535bee094eb; crates/extraction-frontend/src/identity.rs, crates/extraction-frontend/src/constructs.rs, crates/extraction-frontend/src/lib.rs, crates/extraction-frontend/tests/*, crates/extraction-frontend/fixtures/*/expected/semantic-ir.json, conformance/coverage.json"
review_set: subset
---

## Summary

Ticket: QSL-754. Base `main` at 72527ab5, three commits. The diff changes
the clause, state, transition and step minters in `identity.rs` to
`<owner identity>/<member name>`. It adds `member_segment` for the
`^[A-Za-z][A-Za-z0-9_]*$` check, adds `UnsluggableReason` to `Unsluggable`,
reduces `NodeKind` to Constraint, Relationship and Variant, and passes the
row position into `transition_identity`.

Rust lane: no `unwrap`, `expect`, `panic!` or `unsafe` was added to src.
`member` composes `type_identity` and `member_segment` with `?`, so an
unsluggable owner or member refuses the whole identity. The transition
position comes from `decls.iter().enumerate()` over the engine's rows in row
order, so a refused earlier row does not shift later positions. No external
consumer constructs `Unsluggable` or uses the removed `NodeKind` variants.
QSL does not call these APIs, it only calls `lift`. No ticket ids appear in
src or spec text.

Goldens: the four regenerated `semantic-ir.json` files were compared leaf by
leaf against `origin/main`. Each has the same JSON paths as before, and every
changed leaf is a clause, state, transition or step `identity`, or a
transition's `from`/`to`. Nothing else drifted.

Gate: `fcd754-green2.log` (crate tests, clippy `-D warnings` and the golden
diff) is green at the head. The full `make test-rust` in `fcd754-gate.log`
ran before the tc_1755 fix and is red. FND-001 and FND-002 cover that run.

## Verdict

FINDINGS: one high, one medium, one low. FND-003 predates this PR. FND-001 blocks the merge. It is a one-hunk
revert. FND-002 blocks claiming a green gate. The minting code itself is
correct and idiomatic.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | Commit c57adb33 commits a regenerated `conformance/coverage.json` from the unprovisioned gate run. The `python-backend` adapter changed from matched 115 / failed 0 to matched 0 / failed 115 because `jsonschema` and poetry were missing. TC-626 ("regenerating the coverage account reproduces the committed file") and TC-634 in `test/conformance-corpus.test.ts` compare a fresh run to this file. So `make test-node` goes red on any provisioned machine, and the committed account wrongly says the Python backend fails every case. Revert the hunk. | conformance/coverage.json:324-329 |
| FND-002 | medium | The PR body says `rust-conformance` and `spec-to-targets` "do not touch this change". That holds for `rust-conformance`: the conformance corpus is TypeSpec cases, and nothing under `conformance/` references the extraction frontend. It does not hold for `spec-to-targets`. That target lifts the `business` bundle, the only fixture whose identities this PR changes, and runs every generator over the result. In the gate run, TypeScript, Rust and JSON Schema generated. Python never ran, and the recipe stopped before the `architecture --compile` half. The architecture half is unaffected because that fixture has no clause, state, transition or step. The Makefile says "an absent toolchain is a red suite, never a green one". That run also predates the tc_1755 fix. Before merge, run `make test-rust` and `make test-node` green on a host with the python-backend group installed. | Makefile:525-531, Makefile:335-345 |
| FND-003 | low | This problem predates the PR, which exposed it. `conformance/coverage.json` is generated output that every `make rust-conformance` run rewrites in place, and TC-626 and TC-634 pin it byte for byte. So a gate run dirties a tracked file, and an environment fault becomes a commit, as FND-001 shows. Under the value test, the account is a run report, not a source input. Generate it on demand and keep it out of git, or change TC-626 and TC-634 to compare two fresh runs. This is a separate change, not something for this PR. | conformance/runner/differential.mjs:35, test/conformance-corpus.test.ts:1457-1461 |

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-004 | high | Commit 4aaa1c7e copies the review artifacts into this public repository under `reviews/`. The pass-0 copies of the gap-analysis and spec-review files paraphrase the contents of the private QSpec repository: requirement rules, test-case run numbers and fixture vocabulary. Private content must not enter a public repo's history. Replace them with the redacted pass-1 files, which cite QSpec by id only, before merge. The PR squash-merges, but the branch commit stays reachable through the PR refs, so also re-push the branch so the leaked blobs are no longer on its head. | reviews/qsl-754-gap-analysis.md, reviews/qsl-754-spec-review-base.md |

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 4aaa1c7e: `git diff origin/main -- conformance` is empty; python-backend reads matched 115, failed 0 again |
| FND-002 | deferred | The PR body now lists exactly what ran. I checked it against `fcd754-fix-gate.log` at 4aaa1c7e with a clean tree: rust-check, build, clippy, test, doc-lint and extraction-frontend-test and -check are green, and the three `node --check` steps pass. The biome failures are on `fixtures/semantic/v1/reader-contract/k2-boundary.json` and `reviews/plat-990-e3bd0f72-disposition-index.json`. Both are identical to origin/main, and `biome format` fails on them there too, so they predate this PR. The PR also says test-node, rust-conformance and spec-to-targets did not run. The provisioned-host `make test-rust` and `make test-node` run is the merger's pre-merge step (QSL-754 item 8). |
| FND-003 | deferred | QSL-758 owns stopping the tracking of the generated coverage report. |
| FND-004 | fixed | 5a4be8b9: the branch was rebuilt from main (dc0302cf, c57adb33, c027ad4f, 5a4be8b9) and the old head 4aaa1c7e is on no remote ref; the committed reviews/ files are byte-identical to the redacted pass-1 files, and `git log -p origin/main..HEAD -- reviews` cites QSpec by id only |
