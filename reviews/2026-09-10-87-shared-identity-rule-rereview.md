---
id: SR-181
title: "Code re-review — issue #87 shared identity rule (PR #96, remediation)"
type: SpecReview
analysis: code-review
scope: "crates/extraction-frontend/src/{identity,lower,resolve,edges,enumeration,scalars}.rs, crates/extraction-frontend/tests/{identity,lower,fixtures}.rs + parity/mod.rs, crates/extraction-frontend/fixtures/identity-cases/, docs/semantic-data-system/contracts-v1.md §Identity minting, spec/functional/FR-095, spec/tests.md; against SR-180 FND-1590..FND-1597"
review_set: subset
---

# Code re-review — issue #87 shared identity rule (PR #96, remediation)

## Summary

Re-reviewed PR #96 at `d7ea8c0` (commits `c39db08` and `d7ea8c0` over the
SR-180 head), verifying each SR-180 finding against the code and by
re-running the reproductions rather than by reading the commit messages. All
three high findings are fixed in substance, contract case (b) is now
implemented at all three levels, and every gate is green. The fix for FND-1591
introduced a new traceability defect: `tc_1354` traces `FR-095-CON-4`, which
does not exist, and `tc_1353` traces an AC the matrix does not name — both
accepted by the trace gate, which checks only the tag's form and the TC id.

## Verdict

**FAIL** — one high: two of the three tests backing FR-095-AC-16 trace ids the
requirement does not carry, one of which is absent from the spec entirely, and
the gate that was supposed to catch this passes.

## Gates

Run at `d7ea8c0` on toolchain 1.98.1:

| Gate | Result |
| --- | --- |
| `cargo +1.98.1 fmt -p agent-ix-extraction-frontend -- --check` | pass |
| `cargo +1.98.1 clippy --locked -p agent-ix-extraction-frontend --no-deps --all-targets -- -D warnings` | pass |
| `cargo +1.98.1 test --locked -p agent-ix-extraction-frontend --no-fail-fast` | pass — 26 binaries, 0 failures |
| `make extraction-frontend-check` | pass — every committed golden regenerates byte for byte |

## SR-180 disposition

| SR-180 | Severity | Disposition |
| --- | --- | --- |
| FND-1590 | high | **fixed** — `identity-cases.json` and its `PROVENANCE.json` moved under `fixtures/identity-cases/`, `TOP_LEVEL` widened to 12; `tc_1285` passes |
| FND-1591 | high | **fixed, with a new defect** — split into three tests, one TC id each; see FND-1598 |
| FND-1592 | high | **fixed** — `type_identity` and `alias_identity` return `Result`; verified by rerunning the reproduction |
| FND-1593 | medium | **fixed (Rust half)** — refusal rows now call the real minters and read `.err()`; the node half still routes through the harness guard (FND-1601) |
| FND-1594 | medium | **fixed** — case (b) implemented for types, fields and enumeration values; verified at all three levels |
| FND-1595 | medium | **open** — TC-1334 still unasserted, and the new case-(b) refusals ship with no test or fixture (FND-1600) |
| FND-1596 | medium | **fixed** — module header amended, and the projection keys on `kind == "record"` rather than on the presence of `fields` |
| FND-1597 | low | **fixed** — `screaming` is now `slug`-based, matching the contract's `UPPER_SNAKE`; its new `expect` is unreachable (verified) |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1598 | high | `tc_1354` traces `FR-095-CON-4`, which does not exist (FR-095 carries CON-1..3), and `tc_1353` traces `FR-053-AC-6` where the matrix names `FR-095-AC-16`; the trace gate accepts both because it validates only the tag's form and the TC id | crates/extraction-frontend/tests/identity.rs:201, crates/extraction-frontend/tests/identity.rs:207, crates/extraction-frontend/tests/toolchain.rs:820, spec/functional/FR-095-mint-package-identity-and-provenance.md:135 | correct-requirement-no-evidence |
| FND-1599 | medium | Four documents still name `crates/extraction-frontend/fixtures/identity-cases.json`, the path the FND-1590 fix vacated, including FR-095-AC-16 itself and the normative contract section | spec/functional/FR-095-mint-package-identity-and-provenance.md:75, spec/functional/FR-095-mint-package-identity-and-provenance.md:158, spec/tests.md:1524, docs/semantic-data-system/contracts-v1.md:131 | wrong-requirement |
| FND-1600 | medium | The three new case-(b) refusal paths have no test and no fixture; the suite is green with all three branches unexecuted, and TC-1334, whose criterion names exactly these cases, still asserts none of them | crates/extraction-frontend/src/lower.rs:748, crates/extraction-frontend/src/lower.rs:1144, crates/extraction-frontend/src/enumeration.rs:201, crates/extraction-frontend/tests/lower.rs:1194 | correct-requirement-no-evidence |
| FND-1601 | medium | 26 matrix rows across FR-093..FR-098 still read "🚧 pending the issue #87 shared-rule implementation" on a head where that implementation is delivered and every one of those tests passes | spec/tests.md:96, spec/tests.md:268-273 | wrong-requirement |
| FND-1602 | low | `Resolution::type_ref` converts an unsluggable target with `.ok()`, so a refusable name reaches the caller as an unresolved token; this is safe only because the same name always also raises a blocking `UNSLUGGABLE_NAME` in `lower_bundle` | crates/extraction-frontend/src/resolve.rs:135-137, crates/extraction-frontend/src/lower.rs:842 | correct-requirement-no-evidence |
| FND-1603 | low | The harness's `identity-cases` adapter still computes the refusal itself (`identity.slug(part).length === 0`) instead of letting `identity.mjs` refuse, so the node half of the shared table cannot detect a change in `mintIdentity`'s empty-part handling | scripts/extraction-frontend-harness.mjs:386, src/compiler/frontend/typespec/identity.mjs:43 | correct-requirement-no-evidence |

## Verification performed

Each fix was checked against the behavior, not the diff.

**FND-1592 — fixed.** The SR-180 reproduction (artifact `FR-005` titled `_`,
referenced by a second artifact's field type token) now refuses instead of
aborting:

```
agent-ix.extraction-frontend.UNSLUGGABLE_NAME: name `_` slugs to the empty
string; no identity segment can be minted from it (spec/functional/FR-005-overlay.md:1:1)
```

`type_identity` and `alias_identity` return `Result`; the four surviving
`expect` sites (`lower_record`, `lower_enum`, `json_object_record`,
`scalars::definitions`) each take a name validated upstream or a constant.

**FND-1594 — fixed at all three levels.** One bundle exercising every branch:

```
UNSLUGGABLE_NAME: artifact FR-002 name `Config__Version` and earlier name
  `Config_Version` both slug to `Config-Version`; …
UNSLUGGABLE_NAME: field `created__at` and earlier field `created_at` both slug
  to `created-at`; …
UNSLUGGABLE_NAME: value `a_b` and earlier value `a b` of enumeration Marks both
  slug to the variant identity …/variant/Marks-a-b; …
```

`Status` beside `status` in the same bundle raises nothing, which is what the
contract requires of distinct names with distinct slugs. `DUPLICATE_TYPE_NAME`
is still raised for equal verbatim names, so the existing negative fixture and
its golden are unchanged.

**FND-1597 — fixed, and the new `expect` is unreachable.** `screaming` is now
`slug(name).expect(…).replace('-', "_").to_ascii_uppercase()`. The only
caller-supplied argument that could slug empty is the constraint keyword, and
`diagnostic_code` runs before the applicability check — but the engine refuses
a punctuation-only keyword first (`semantic.unknown-constraint-keyword:
constraint "***: 1" uses a keyword outside the closed set`), so the lowering
never sees one. Verified by lift.

**FND-1590 — fixed.** `tc_1285` passes; `fixtures/identity-cases/` is its own
provenance row set and the corpus is no longer checked against it.

## FND-1598 detail

`toolchain.rs:820` asserts that each `#[trace]` id after the first matches
`<FR|NFR|US>-NNN-AC-N` and that the TC id appears somewhere in `spec/tests.md`.
It does not check that the AC exists or that it is the AC the matrix binds the
row to. So:

- `tc_1353` traces `FR-053-AC-6`. FR-053-AC-6 exists and is topical, but
  `spec/tests.md` binds TC-1353 to `FR-095-AC-16`, and FR-053's own coverage
  row does not list TC-1353.
- `tc_1354` traces `FR-095-CON-4`. FR-095 carries CON-1, CON-2 and CON-3 only.
  The row binds to nothing.

FR-095-AC-16's evidence column reads `Test (TC-1352, TC-1353, TC-1354)`; after
the fix exactly one of those three traces to it. The three tests also share one
body (`assert_shared_identity_cases_agree_with_typespec_identity_minter`), which
is defensible — the table walk does cover TC-1354's alias row and TC-1353's node
comparison — but it makes the AC citations the only thing distinguishing them,
so the citations have to be right.

## Notes

- The identity work itself is now correct and internally consistent: every slot
  case-preserving-slugged, `param/` folded into `field/`, cross-kind collisions
  refused as `DUPLICATE_IDENTITY`, slug collisions refused as
  `UNSLUGGABLE_NAME`, `UPPER_SNAKE` matching `identity.mjs`.
- No lint, coverage or advisory threshold was weakened; no `todo!`,
  `unimplemented!`, `dbg!`, `unsafe` or new `#[allow]` under `src/`.
- FND-1598 and FND-1599 are one-line corrections each. FND-1600 is the only
  finding that needs new test code.
