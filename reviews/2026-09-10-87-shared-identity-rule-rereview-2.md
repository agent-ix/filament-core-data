---
id: SR-182
title: "Code re-review — issue #87 shared identity rule (PR #96, second remediation)"
type: SpecReview
analysis: code-review
scope: "crates/extraction-frontend/tests/{identity,lower}.rs, spec/tests.md, spec/functional/FR-095-mint-package-identity-and-provenance.md, docs/semantic-data-system/contracts-v1.md, scripts/test-matrix-summary.mjs; against SR-181 FND-1598..FND-1603"
review_set: subset
---

# Code re-review — issue #87 shared identity rule (PR #96, second remediation)

## Summary

Re-reviewed PR #96 at `b622629` (four commits over the SR-181 head), checking
each SR-181 finding against the behaviour rather than the commit messages. The
traceability defect, the four stale fixture-path references and the missing
case-(b) tests are all fixed, and the four crate gates stay green. The matrix
row flips that close FND-1601 were not accompanied by a regeneration of the
Test Execution Summary, so `node scripts/test-matrix-summary.mjs --check` —
which `npm run lint` runs — now fails at the PR head and passes on `main`.

## Verdict

**FAIL** — one high: a repo lint gate that is green on `main` is red at the PR
head, and it is the gate whose stated purpose is that these counts are measured
rather than asserted.

## Gates

Run at `b622629` on toolchain 1.98.1:

| Gate | Result |
| --- | --- |
| `cargo +1.98.1 fmt -p agent-ix-extraction-frontend -- --check` | pass |
| `cargo +1.98.1 clippy --locked -p agent-ix-extraction-frontend --no-deps --all-targets -- -D warnings` | pass |
| `cargo +1.98.1 test --locked -p agent-ix-extraction-frontend --no-fail-fast` | pass — 26 binaries, 0 failures |
| `make extraction-frontend-check` | pass — every committed golden regenerates byte for byte |
| `node scripts/test-matrix-summary.mjs --check` (`npm run lint`) | **FAIL** — summary stale; passes at `origin/main` (`bb1bc4d`) |

`npm run lint` also aborts in `biome format` on this machine, because the
developer's `.worktrees/*/biome.json` files are nested root configurations. That
is a local environment artefact, not a property of the branch; the summary check
was therefore run on its own, and on a clean `main` worktree for comparison.

## SR-181 disposition

| SR-181 | Severity | Disposition |
| --- | --- | --- |
| FND-1598 | high | **fixed** — `tc_1353` and `tc_1354` both trace `FR-095-AC-16`, the criterion the matrix binds them to; no test now names a criterion the spec does not declare |
| FND-1599 | medium | **fixed** — all four references name `fixtures/identity-cases/identity-cases.json`; the only surviving mention of the vacated path is inside SR-181 itself, which is correct for a historical record |
| FND-1600 | medium | **fixed** — `tc_1334_distinct_names_with_one_slug_refuse_at_type_field_and_variant_levels` drives all three branches through the real lift and pins the locus to the later declaration in each |
| FND-1601 | medium | **partly fixed** — the 22 per-TC rows are `✅`, but the coverage rows and the range preamble still call the same rows pending; see FND-1605, and FND-1604 for the gate this flip broke |
| FND-1602 | low | **open** — not claimed resolved |
| FND-1603 | low | **open** — not claimed resolved |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1604 | high | The Test Execution Summary is byte-identical to `main` while the branch adds four matrix rows and flips 22 statuses, so `node scripts/test-matrix-summary.mjs --check`, one of the five checks in `npm run lint`, exits 1 at the PR head and 0 on `main` | spec/tests.md:2445-2457, scripts/test-matrix-summary.mjs:18, package.json:39 | implementation-bug-despite-evidence |
| FND-1605 | medium | The FR-093..FR-098 coverage rows and the issue #36 range preamble still name the 22 flipped rows as pending the issue #87 implementation and report 129 passed of 155, where the rows they summarise now read 151 passed and 4 blocked | spec/tests.md:93-98, spec/tests.md:268-273 | wrong-requirement |
| FND-1606 | medium | Eight normative and matrix locations, the contract's own case (b) included, state contract case (b) as two fields `created_at` and `created-at` on one record; the engine refuses `created-at` as `semantic.invalid-field-name` before any identity is minted, so that pair can never yield `UNSLUGGABLE_NAME`, and the new test asserts `created__at` instead | docs/semantic-data-system/contracts-v1.md:193, spec/functional/FR-093-lower-field-declarations-to-ir-fields.md:73, spec/functional/FR-093-lower-field-declarations-to-ir-fields.md:162, spec/functional/FR-095-mint-package-identity-and-provenance.md:118, spec/tests.md:1819 | wrong-requirement |
| FND-1602 | low | `Resolution::type_ref` converts an unsluggable target with `.ok()`, so a refusable name reaches the caller as an unresolved token; safe only because the same name always also raises a blocking `UNSLUGGABLE_NAME` in `lower_bundle` | crates/extraction-frontend/src/resolve.rs:135-137, crates/extraction-frontend/src/lower.rs:842 | correct-requirement-no-evidence |
| FND-1603 | low | The harness's `identity-cases` adapter still computes the refusal itself instead of letting `identity.mjs` refuse, so the node half of the shared table cannot detect a change in `mintIdentity`'s empty-part handling | scripts/extraction-frontend-harness.mjs:386, src/compiler/frontend/typespec/identity.mjs:43 | correct-requirement-no-evidence |

## Verification performed

**FND-1598 — fixed.** `crates/extraction-frontend/tests/identity.rs` now carries
`#[trace("TC-1353", "FR-095-AC-16")]` and `#[trace("TC-1354", "FR-095-AC-16")]`.
`FR-095-CON-4`, which does not exist, is gone; `FR-053-AC-6`, which the matrix
does not bind, is gone. FR-095-AC-16's evidence column names TC-1352, TC-1353
and TC-1354, and all three now trace to it. TC-1354's matrix row also names
FR-093-AC-12, which `tc_1333` covers, so nothing is left unbacked.

**FND-1599 — fixed.** A repository-wide search for the vacated path returns one
hit, in SR-181's own findings table.

**FND-1600 — fixed, and the assertions are the right ones.** The new test writes
three scratch bundles and lifts each through `lift_at`. Each asserts exactly one
`UNSLUGGABLE_NAME` and pins its locus to the *later* declaration — the second
document for the type case, line 15 for the field case (the second field row of
the generated table), line 15 for the variant case (the second `## Values` row).
So a regression that refused at the earlier declaration, or that raised twice,
turns the test red rather than passing on the count alone.

**FND-1604 — reproduced three ways.** In a clean detached worktree at
`origin/main` (`bb1bc4d`) the check exits 0. At `d7ea8c0` and at `b622629` it
exits 1 with `spec/tests.md execution summary is stale`. The committed table is
identical at all three commits (`Unit 485 | 389 | 96`, total `1205 | 902 | 303`),
while the rows at `b622629` compute to `Unit 488 | 392 | 96`, total
`1209 | 908 | 301`. The four new rows TC-1351..1354 account for the totals and
the 22 flips for the passed count. Regenerating with
`node scripts/test-matrix-summary.mjs` is the whole fix.

This was already true at `d7ea8c0`; SR-181 ran the four crate gates and did not
run the repo's own lint check, so it recorded a green board that was not green.
It is reported here as of the current head.

**FND-1606 — reproduced.** The pair is the contract's own worked example of case
(b) and is restated in seven further places. A bundle with fields `created_at`
and `created-at` on one record:

```
agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC: semantic.invalid-field-name:
field name "created-at" is not an Identifier (spec/functional/FR-001.md:15:1)
agent-ix.extraction-frontend.ARTIFACT_NOT_LOWERED: artifact FR-001 lowers to no
definition: its fields are unavailable (row-errors: lines 15)
```

The frontend never reaches identity minting, so the stated outcome is
unobservable in the spec-bundle dialect. The mechanism is real and now tested —
`created_at` beside `created__at` does refuse with `UNSLUGGABLE_NAME` — so the
fix is to restate the example in a pair the dialect admits, not to change the
code. FR-053-AC-10, the TypeSpec statement of the same rule, names no example
pair, so the eight locations above are the whole of it.

## Notes

- The identity work is unchanged since `d7ea8c0` and remains correct: every slot
  case-preserving-slugged, `param/` folded into `field/`, cross-kind collisions
  refused as `DUPLICATE_IDENTITY`, slug collisions as `UNSLUGGABLE_NAME`.
- Two tests sharing one TC id is an established idiom here (28 TC ids in this
  crate are traced by more than one test), so the second `tc_1334` is not a
  matrix violation.
- No lint, coverage or advisory threshold was weakened; no `todo!`,
  `unimplemented!`, `dbg!`, `unsafe` or new `#[allow]` under `src/`.
- FND-1604 is one command. FND-1605 is a text edit in `spec/tests.md`. FND-1606
  spans eight locations — `contracts-v1.md` case (b), FR-093's behaviour bullet
  and AC-13, FR-095's case (b) bullet, and `spec/tests.md` at TC-1334, the
  FR-093-AC-13 boundary row, ERR-267 and EC-161 — because the same example was
  restated in each.
