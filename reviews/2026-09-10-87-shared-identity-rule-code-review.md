---
id: SR-180
title: "Code review — issue #87 shared identity rule (PR #96)"
type: SpecReview
analysis: code-review
scope: "crates/extraction-frontend/src/{identity,lower,diagnostics}.rs, crates/extraction-frontend/tests/{identity,lower,clauses,diagnostics,edges,fixtures,parity}.rs + parity/mod.rs, crates/extraction-frontend/fixtures/** (identity-cases.json, PROVENANCE.json, negatives/DUPLICATE_IDENTITY, negatives/DUPLICATE_TYPE_NAME, regenerated goldens), scripts/extraction-frontend-harness.mjs, docs/semantic-data-system/contracts-v1.md §Identity minting, test/fixtures/compiler/shared/cases.json, spec/tests.md; against FR-034, FR-053, FR-093..FR-096, FR-098, ERR-267, ERR-281, EC-161, TC-1223..TC-1354"
review_set: subset
---

# Code review — issue #87 shared identity rule (PR #96)

## Summary

Reviewed PR #96 (`spec/87-shared-identity-rule`) at `7fb4e61`, 75 files,
+1700/−312, against the newly authored `contracts-v1.md` §Identity minting and
the FR-093..FR-098 criteria it revises. The substance of the change is right —
the case-preserving slug, the `param/`→`field/` fold, the new
`DUPLICATE_IDENTITY` refusal and the un-ignored cross-frontend parity tests
(TC-1290, TC-1291) all hold up and pass — but the crate's own test gate is red
at the PR head on two counts, and `type_identity` refuses an unsluggable
declaration name by panicking rather than by raising `UNSLUGGABLE_NAME`.

## Verdict

**FAIL** — three high findings: `make extraction-frontend-test` fails at the
PR head (two independent failures), and a reachable panic replaces the
contract's blocking refusal.

## Gates

Run at `7fb4e61` on toolchain 1.98.1, as the Makefile invokes them:

| Gate | Result |
| --- | --- |
| `cargo +1.98.1 fmt -p agent-ix-extraction-frontend -- --check` | pass |
| `cargo +1.98.1 clippy --locked -p agent-ix-extraction-frontend --no-deps --all-targets -- -D warnings` | pass |
| `cargo +1.98.1 test --locked -p agent-ix-extraction-frontend --no-fail-fast` | **FAIL** — 2 failures (`tc_1285`, `tc_1327`), 10 ignored |
| `make extraction-frontend-check` | pass — every committed golden regenerates byte for byte |

`make extraction-frontend-test` stops at the `fixtures` binary, so a run that
reads only its tail sees one failure; the full `--no-fail-fast` run is what
surfaces the second.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1590 | high | The new root `fixtures/PROVENANCE.json` makes `fixtures/` itself a provenanced directory naming one file, so `tc_1285` checks the whole corpus against a one-entry list and fails | crates/extraction-frontend/fixtures/PROVENANCE.json:1, crates/extraction-frontend/tests/fixtures.rs:279 | implementation-bug-despite-evidence |
| FND-1591 | high | `tc_1327` fails: the new test's `#[trace]` carries three TC ids before the AC, which the repo's traceability gate rejects, leaving TC-1353 and TC-1354 with no accepted tag | crates/extraction-frontend/tests/identity.rs:190, crates/extraction-frontend/tests/toolchain.rs:830 | implementation-bug-despite-evidence |
| FND-1592 | high | `type_identity` panics on an unsluggable display name instead of raising the contract's blocking `UNSLUGGABLE_NAME`; a bundle with an artifact titled `_` referenced by another artifact's field aborts the lift | crates/extraction-frontend/src/identity.rs:153-157, crates/extraction-frontend/src/resolve.rs:135-137, crates/extraction-frontend/src/lower.rs:842 | implementation-bug-despite-evidence |
| FND-1593 | medium | `tc_1352`'s refusal row cannot catch FND-1592: it pre-guards the `type` slot with `slug(...)` and computes the expected refusal from `slug(part).is_err()` instead of from a minter, so the row passes whatever `type_identity` does | crates/extraction-frontend/tests/identity.rs:236, crates/extraction-frontend/tests/identity.rs:246 | correct-requirement-no-evidence |
| FND-1594 | medium | Contract case (b) is unimplemented: two distinct names with one slug raise `DUPLICATE_TYPE_NAME` (types) or `DUPLICATE_IDENTITY` (fields), not the `UNSLUGGABLE_NAME` the contract, ERR-267 and TC-1334 all require, and the section's known-deviations paragraph names only the two TypeSpec ones | docs/semantic-data-system/contracts-v1.md:196, crates/extraction-frontend/src/lower.rs:1118, spec/tests.md:2109 | wrong-requirement |
| FND-1595 | medium | `tc_1334` asserts three of its criterion's six clauses; nothing exercises `Status` beside `status`, `created_at` beside `created-at`, or the `a b`/`a_b` enumeration rows that FR-093-AC-13 names | crates/extraction-frontend/tests/lower.rs:1194-1253, spec/tests.md:1506 | correct-requirement-no-evidence |
| FND-1596 | medium | The parity projection was widened to materialize absent `relationships`/`operations`/`clauses` as `[]`, and the module header still claims "a member one frontend emits and the other omits stays a difference" | crates/extraction-frontend/tests/parity/mod.rs:9, crates/extraction-frontend/tests/parity/mod.rs:62-77 | wrong-requirement |
| FND-1597 | low | Rust `screaming` is not the contract's slug-based `UPPER_SNAKE`; it passes every character that is not `-`/`_` through, agreeing with `identity.mjs` only because the engine happens to refuse non-Identifier names | crates/extraction-frontend/src/lower.rs:367, src/compiler/frontend/typespec/identity.mjs:79 | correct-requirement-no-evidence |

## Failure scenarios

**FND-1590.** `identity-cases.json` and a `PROVENANCE.json` naming only it were
added at `fixtures/` root. `provenanced_dirs()` therefore includes the fixtures
root, and `documents(dir, &stop)` walks every document beneath it that is not
under a nested provenanced directory. The first such document fails:

```
tc_1285 ... FAILED
negatives/LIMIT_MAX_CLAUSE_BYTES/constructed.json is not named in
PROVENANCE.json (named: {"identity-cases.json"})
```

Note that the `matches!(document, "PROVENANCE.json" | "constructed.json")`
skip compares a path relative to `dir`, so a `constructed.json` two levels
down is no longer skipped. Moving `identity-cases.json` into its own
subdirectory restores the invariant the test encodes.

**FND-1591.** `#[trace("TC-1352", "TC-1353", "TC-1354", "FR-095-AC-16")]` on
`tc_1352`. The gate reads everything after the first id as the AC list:

```
tc_1327 ... FAILED
tests/identity.rs::tc_1352_shared_identity_cases_agree_with_typespec_identity_minter
traces `TC-1353", "TC-1354", "FR-095-AC-16`, not an <FR|NFR|US>-NNN-AC-N form
```

TC-1353 and TC-1354 are consequently unbacked: the matrix rows exist, the
assertions exist, and no accepted tag connects them.

**FND-1592.** Reproduced against the PR head. A bundle holding `FR-005` titled
`_` (an Identifier, so it clears the `UNNAMEABLE_ARTIFACT` gate) and `FR-006`
with a field whose type token is `_`:

```
make extraction-frontend-lift BUNDLE=<bundle> OUT=<out>
thread 'main' panicked at crates/extraction-frontend/src/identity.rs:156:33:
validated declaration name: Unsluggable { name: "_" }
```

`lower_bundle` guards its own call (`slug` → `UNSLUGGABLE_NAME` → `continue`),
but `Resolution::type_ref` reaches `type_identity` with an `ArtifactRef`
`display_name` that is documented as "the `title` verbatim" and is never
validated on that path. `edges.rs` is safe only incidentally, because
`relationship_identity` slugs the same name and returns `Result` first. Before
this change `type_identity` did not slug and could not panic; the contract
(`identity-cases.json` row `{"kind":"refusal","parts":["_"]}`) says the answer
is a blocking `UNSLUGGABLE_NAME`. `type_identity` and `alias_identity` should
return `Result<String, Unsluggable>` like their five siblings.

**FND-1594.** Reproduced. Two artifacts titled `Config_Version` and
`Config__Version` (distinct names, one slug) give
`DUPLICATE_TYPE_NAME ... whose slug `Config-Version` is already taken`; two
fields `created_at` and `created__at` on one record give
`DUPLICATE_IDENTITY: identity `ix://…/field/ConfigVersion-created-at` is
already minted by an earlier node`. Both refuse, so no wrong document is
written — but the code a consumer sees is not the one the shared contract
fixes, and the contract is the artifact both frontends are supposed to
implement unchanged. Either the section's case (b) should be restated as the
two codes the frontends actually raise, or the Rust deviation should join the
two TypeSpec deviations already filed as #94.

**FND-1596.** `cases.json`'s deleted reason recorded four differences and
stated that "the projection was not widened to hide any of the four". Three
were fixed by the identity rule; the fourth (the spec-bundle record carrying
`clauses: []`/`operations: []`/`relationships: []` where the TypeSpec record
omits them) is now normalized away in `strip`. TC-1290's criterion was updated
to name the normalization, so this is declared rather than hidden — but the
module header two lines above the new code still asserts the opposite, and the
`or_insert` is keyed on the presence of a `fields` member, which is a
record-shaped heuristic rather than a node kind.

## Notes

- The identity rewrite itself is coherent: every slot slugged case-preserving,
  `param/` folded into `field/` with the collision that fold creates caught by
  the new `DUPLICATE_IDENTITY` pass, `NodeKind::ALL` and `Code::ALL` arities
  updated together, and the registry page regenerated to 27 codes.
- `identity_collisions` runs over every node of every admitted definition,
  which is the right granularity given that identity parts are not recoverable
  from an identity.
- TC-1290 and TC-1291 pass un-ignored; the shared `records-and-scalars` case is
  now genuinely two-dialect and byte-identical under the projection.
- 22 matrix rows across FR-093..FR-098 still read "🚧 pending the issue #87
  shared-rule implementation" on the commit that delivers it. TC-1334 is
  honestly pending (FND-1595), but TC-1351..TC-1354 have passing tests and
  should not be reported as pending once FND-1591 is fixed.
- `crates/extraction-frontend/src/**` carries no `todo!`, `unimplemented!`,
  `dbg!`, `unsafe` or new `#[allow]`; no lint, coverage or advisory threshold
  was weakened.
