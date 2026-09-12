---
id: SR-175
title: "Evidence-method review of the shared identity rule (issue #87)"
type: SpecReview
analysis: evidence
scope: "docs/semantic-data-system/contracts-v1.md §Identity minting, FR-034, FR-053, FR-093, FR-094, FR-095, FR-096, FR-098, FR-099, spec/tests.md TC-1223..TC-1354 rows, docs/semantic-data-system/extraction-frontend-diagnostics.md"
review_set: all
---
# Evidence-method review

## Summary

The #87 spec commit (`86320f0`, CR-087-1) touches 21 obligations: FR-095-AC-6,
AC-7, AC-14, AC-16, CON-4; FR-093-AC-4, AC-5, AC-12, AC-13; FR-094-AC-11;
FR-096-AC-2; FR-098-AC-6, AC-7; FR-099's evidence target; and the one-sentence
citations in FR-034 and FR-053. Every obligation names a method and a TC id
(TC-1223, 1224, 1241, 1251, 1252, 1290, 1291, 1333, 1334, 1347 retitled;
TC-1351..1354 new); none is `TBD`. The producers the methods assume were
checked against the tree: `crates/extraction-frontend/src/identity.rs`
(lowercase slug, `param_identity`, `type/<Name>.<field>` alias — the pre-#87
rule), `src/compiler/frontend/typespec/identity.mjs` (the rule the contract
now states), `test/compiler-core.test.ts` TC-417/TC-421/TC-427 (green, pinning
the TypeSpec side's `UNSLUGGABLE_NAME` on a slug collision),
`scripts/extraction-frontend-harness.mjs` (the NFR-032 `gate` with its
permitted and prohibited tables), `crates/extraction-frontend/tests/docs.rs`
TC-1271 (renders the registry page from `Code::ALL`), `tests/fixtures.rs`
TC-1288 (one `negatives/<CODE>/` per `Code::ALL` member), and
`node scripts/test-matrix-summary.mjs --check` (exits 1 on this branch).

Two obligations cannot be produced as written. FR-095-AC-16's node test has no
permitted home: NFR-032 prohibits `test/*.test.ts`, FR-098-AC-10 pins
`test/compiler-core.test.ts` byte-unchanged, and the harness classifies the
new `identity-cases.json` as unclassified, so TC-1310, TC-1294, TC-1299 and
TC-1313 go red on the #87 range or get widened at implementation time. And the
contract's closing rule (`DUPLICATE_IDENTITY` when two declarations mint one
identity) is contradicted by FR-053's own sentence and by green TC-421, which
pin `UNSLUGGABLE_NAME` for the same input on the TypeSpec side; the shared
table that AC-16 makes the one-rule evidence records expected identities only
and cannot observe either collision or empty-slug behaviour. Five further
findings cover the empty-part contradiction, the un-evidenced second case of
EC-161, TC-1354's producer, the green rows this spec-only commit turns red,
and the third implementation (FR-034's lowerer) the table does not bind.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-1550 | high | FR-095-AC-16 (TC-1353) requires "a node test against `src/compiler/frontend/typespec/identity.mjs`" and FR-095 Outputs add `test/fixtures/compiler/shared/identity-cases.json`, but no location for either passes the standing change-set gates: `scripts/extraction-frontend-harness.mjs` PROHIBITED lists `test/*.test.ts` (line 217) and PERMITTED admits under `shared/` only `cases.json`, `spec-bundle/**`, and `typespec/records-and-scalars/**` (lines 190–192), so `identity-cases.json` is unclassified and the `gate` verb exits non-zero (TC-1310, NFR-032-AC-1); FR-098-AC-10 (TC-1294) states "`test/compiler-core.test.ts` [is] byte-unchanged" and the change set outside the crate "is exactly `cases.json`, `test/fixtures/compiler/shared/typespec/records-and-scalars/`, and files under `test/fixtures/compiler/shared/spec-bundle/`"; FR-099-CON-1 / FR-099-AC-5 (TC-1299) say "exactly six paths"; NFR-032-AC-4 (TC-1313) counts "files added under `shared/typespec/` outside `records-and-scalars/`". The #87 commit restates none of them, so the gates either go red on the #87 range or are widened ad hoc at implementation and then measure whatever was widened (the SR-164 FND-1441 escape). Fix in the spec: FR-095-AC-16 names the node test file; NFR-032's permitted list, the harness PERMITTED table, FR-098-AC-10 and FR-099-CON-1/AC-5 admit exactly `identity-cases.json` and that one test file for #87, or state that those gates measure the #36 sentinel range only and give #87 its own change-set row. | FR-095-AC-16, FR-095 Outputs, FR-098-AC-10, FR-099-CON-1, FR-099-AC-5, NFR-032-AC-1, NFR-032-AC-4, TC-1353, TC-1310, TC-1294, TC-1299, TC-1313, scripts/extraction-frontend-harness.mjs | wrong-requirement |
| FND-1551 | high | The contract's closing rule ("If two declarations mint one identity, the frontend raises `DUPLICATE_IDENTITY` … If a name slugs to the empty string, the frontend raises `UNSLUGGABLE_NAME`") is contradicted by one of the three implementations it names as "unchanged". FR-053 line 65 reads "If slugging two distinct declaration names produces one identity, then the frontend SHALL raise `agent-ix.compiler.UNSLUGGABLE_NAME` at the later declaration's locus", `lower.mjs` lines 327–341 do exactly that, and TC-421 (FR-053-AC-10, `A_b`/`A__b`) is green pinning it; the spec-bundle side files the same input as `DUPLICATE_IDENTITY` (FR-095 "If two declarations of one lift mint the same identity…", ERR-281, EC-161's `created_at`/`created-at`, TC-1351). The wire codes also differ by namespace — FR-053 `agent-ix.semantic-ir.DUPLICATE_IDENTITY`, FR-095/FR-096 `agent-ix.extraction-frontend.DUPLICATE_IDENTITY` — and the contract sentence names neither. So "one rule" has two green-or-pending evidence rows asserting different codes for one declaration pair, and the AC-16 table (rows of `package`, `slot`, `parts`, expected `identity`) cannot observe it: TC-1291 compares a case with no collision. The commit message's "FR-053 text unchanged otherwise" left the contradiction in place. Fix: the contract states the collision outcome per frontend (or FR-053's sentence is restated to `DUPLICATE_IDENTITY` and TC-421 retitled and marked pending), and the contract names the two wire codes it admits. | docs/semantic-data-system/contracts-v1.md §Identity minting, FR-053 Identity minting, FR-053-AC-10, FR-095 Node identities, FR-096 The registry, ERR-281, EC-161, TC-421, TC-1351 | wrong-requirement |
| FND-1552 | medium | The contract states both "Each part is slugged, empty parts are dropped" and "If a name slugs to the empty string, the frontend raises `UNSLUGGABLE_NAME` at that declaration". `identity.mjs` `mintIdentity` filters empty parts silently (`slug("--")` is `""`, dropped); `identity.rs` `slug` returns `Err(Unsluggable)` and FR-095-AC-7 (TC-1252) asserts "`slug("--")` is `Unsluggable`". Two implementations of one rule give one input two outcomes, both spec'd, and the AC-16 table has no column for a refusal, so TC-1352/TC-1353 can never carry the row. Honest evidence: the contract picks one sentence (drop or refuse) or states that an empty part is unreachable in TypeSpec because every declaration name is an `Identifier`, and the table gains a `refuses` column (or AC-7 states the divergence and its reason). | contracts-v1.md §Identity minting, FR-095 Node identities, FR-095-AC-7, FR-095-AC-16, TC-1252, TC-1352, TC-1353 | wrong-requirement |
| FND-1553 | medium | EC-161's second case, "a name whose slug equals another's (`created_at`, `created-at`)", is bound to TC-1352 and TC-1353, which assert minted identities against the table and raise no diagnostic; no row produces `DUPLICATE_IDENTITY` for a `field/` or `variant/` collision. FR-095 Outputs promise "the collision check that raises `DUPLICATE_IDENTITY` over every minted identity of one lift", but the only fixture is the alias-versus-type case (`negatives/DUPLICATE_IDENTITY`, TC-1351), and FR-098-AC-4's one-directory-per-code inventory admits no second bundle. Worse, FR-093 still reads "If two rows of one enumeration slug to the same value under FR-095's case-preserving slug (`a b` and `a_b` …), then the frontend SHALL raise `DUPLICATE_TYPE_NAME` at the second row" (ERR-261, TC-1334), which files the contract's `DUPLICATE_IDENTITY` case under another code. Fix: EC-161's second case traces to a constructed-bundle test (a `constructed.json` under `negatives/DUPLICATE_IDENTITY/`, the FR-098 form) that asserts `DUPLICATE_IDENTITY` for two field rows slugging alike, and FR-093's enumeration-row sentence is reconciled with the contract. | EC-161, ERR-261, FR-093 Enumerations, FR-095 Outputs, FR-095 Node identities, FR-098-AC-4, TC-1334, TC-1351, TC-1352, TC-1353 | correct-requirement-no-evidence |
| FND-1554 | medium | FR-095-CON-4 (TC-1354, `Static`) is "`git diff --stat origin/main -- src/compiler packages conformance schema` is empty for the change". That is a one-shot rehearsal with no producer: it is not an `#[ignore]`d crate test, not a harness verb, and not in `make extraction-frontend-evidence`; before merge it measures whatever `origin/main` holds that day, after the squash merge `origin/main` contains the change and the diff is empty for every branch. NFR-032 already defines the honest form (the sentinel range through `changeRange`, harness `gate`), and TC-1299 already pins `src/compiler/**`, `packages/**`, `schema/**` byte-unchanged, so three of the four paths are duplicated and only `conformance/**` is new. Fix: CON-4 cites TC-1299 and adds `conformance/**` to the NFR-032 prohibited table (harness PROHIBITED), or TC-1354 names the harness verb that measures the #87 range. | FR-095-CON-4, TC-1354, TC-1299, NFR-032-AC-1, scripts/extraction-frontend-harness.mjs | correct-requirement-no-evidence |
| FND-1555 | medium | The spec-only commit turns green rows red without marking them. TC-1271 (FR-096-AC-13, `tests/docs.rs`) renders `extraction-frontend-diagnostics.md` from `Code::ALL` (26 variants) and the page now says "27 codes" with a `DUPLICATE_IDENTITY` row; TC-1288 (FR-098-AC-4, `tests/fixtures.rs`) requires one `negatives/<CODE>/` per `Code::ALL` member and a bundle for a code the enum lacks; both stay `✅ passed` in the matrix. TC-1260's title still counts "the five error-blocking codes" while FR-096-AC-2 now lists six. And `negatives/DUPLICATE_TYPE_NAME` (titles `Status` and `status`, golden message "whose slug `status` is already taken") becomes a positive under the new rule, yet FR-098's inventory sentence for it is unchanged and no row says the fixture is re-authored to "both titled `Status` under distinct ids" as FR-093-AC-13 now requires. Fix: mark TC-1271 and TC-1288 pending on CR-087-1, retitle TC-1260, and state the re-authored `DUPLICATE_TYPE_NAME` fixture in FR-098's inventory. | FR-096-AC-2, FR-096-AC-13, FR-098-AC-4, FR-098 Inventory, FR-093-AC-13, TC-1260, TC-1271, TC-1288, docs/semantic-data-system/extraction-frontend-diagnostics.md | correct-requirement-no-evidence |
| FND-1556 | medium | The contract names three implementations, "the semantic-core lowering (FR-034), the TypeSpec frontend (FR-053, `identity.mjs`), and the spec-bundle extraction frontend (FR-095, `identity.rs`)", and FR-034's new sentence says FR-053 and FR-095 implement its rule "unchanged"; but FR-095-AC-16's table binds `identity.rs` and `identity.mjs` only. FR-034's lowerer (`test/semantic-core-lowerer.ts`) mints inline — `${base}/field/${owner}-${name}` verbatim, `diagnosticCode` from `owner.toUpperCase()` with no slug — and is tied to `identity.mjs` only by TC-427's differential over the FR-006 package, whose names are all `Identifier`s (slug is the identity there). No row asserts the third implementation against the `Config Version` / `created_at` / `core.data` rows the table is required to carry. Fix: bind the lowerer to `identity-cases.json` as a third reader in AC-16, or the contract states that FR-034's grammar admits only `Identifier` names so TC-427 is its evidence and drops "unchanged" for that implementation. | contracts-v1.md §Identity minting, FR-034 Identity sentence, FR-053-CON-1, FR-095-AC-16, TC-427, TC-1352, TC-1353, test/semantic-core-lowerer.ts | correct-requirement-no-evidence |
| FND-1557 | low | `node scripts/test-matrix-summary.mjs --check` exits 1 on this branch (Static 271/233/38, Unit 487/382/105, Property 128/70/58, Snapshot 68/34/34 against the recorded 270/485/128/68 rows), and `make lint` runs it, so the lint gate is red at the spec commit; the log entry admits "the Test Execution Summary counts are not recomputed here". Separately, TC-1353 adds `FR-053-AC-6` to its trace while the FR-053 summary row stays `✅ Complete` on TC-417 — whose expectations are a hand-written list in `test/compiler-core.test.ts`, the form AC-6's "computed by a shared table rather than by two hand-written lists" excludes — so AC-6 is simultaneously complete and pending. Fix: regenerate the summary; mark the FR-053 row `🚧 TC-1353 pending` or drop AC-6 from TC-1353. | spec/tests.md Test Execution Summary, FR-053-AC-6, TC-417, TC-1353, spec/log.md CR-087-1 | correct-requirement-no-evidence |

## Method Disposition

| Obligation shape | Authored | Confirmed | Evidence artifact that can be produced here |
|---|---|---|---|
| Minting under the shared rule on fixtures (FR-093-AC-4/5/12, FR-094-AC-11, FR-095-AC-6/7) | Test / Property | Test / Property | retitled `#[trace]` tests over the re-cut `expected/` goldens of `config-version-table`, `business`, `lower`, `clauses` |
| Shared identity table (FR-095-AC-16, FR-053-AC-6) | Test | Test, once the node test has a permitted path (FND-1550) and the table gains a refusal column or the contract drops one sentence (FND-1552); FR-034's lowerer bound or excused (FND-1556) | `identity-cases.json` read by a crate test and one named node test; planted-row control |
| Collision refusal (FR-095-AC-14 second half, FR-096-AC-2, ERR-281, EC-161) | Test / Snapshot | Snapshot for the alias case; a constructed-bundle Test for the slug-collision case (FND-1553); the TypeSpec side's code reconciled first (FND-1551) | `negatives/DUPLICATE_IDENTITY/expected/diagnostics.json` + `constructed.json` |
| Case-only names are distinct (FR-093-AC-13, FR-095-AC-14 first half) | Test | Test, with the `DUPLICATE_TYPE_NAME` fixture re-authored (FND-1555) | `tests/lower.rs` TC-1334/TC-1347 over a `Status`/`status` positive bundle |
| Cross-frontend parity (FR-098-AC-6/7) | Test | Test | `tests/parity.rs` TC-1290/TC-1291 un-ignored; `cases.json` with both dialects; `node` subprocess |
| Registry growth (FR-096-AC-2/13, FR-098-AC-4) | Test / Snapshot | Test, rows marked pending until the enum grows (FND-1555) | `tests/diagnostics.rs`, `tests/docs.rs`, `tests/fixtures.rs` |
| Blast radius (FR-095-CON-4) | Static analysis | Static via the NFR-032 sentinel range (FND-1554) | harness `gate` with `conformance/**` prohibited; or TC-1299 citation |
| Change-set gates disturbed by #87 (FR-098-AC-10, FR-099-CON-1/AC-5, NFR-032-AC-1/4) | Static | Static, after the permitted lists are restated (FND-1550) | harness PERMITTED table + `test/changed-paths.ts` `changeRange` |
| Evidence target skip list (FR-099) | Static | Static | `make extraction-frontend-evidence` with `EXTRACTION_BLOCKED_TESTS` reduced to TC-1292 |
| One-sentence citations (FR-034, FR-053) | — | Inspection | the contract section exists; no test can bind a citation |

## Open gaps

- FR-095-AC-16's node test and `identity-cases.json` have no path the NFR-032,
  FR-098-AC-10 and FR-099-CON-1 gates admit (FND-1550).
- Slug-collision outcome differs by frontend in the requirement text and in
  green evidence (FND-1551); empty-part outcome differs in the contract's own
  two sentences (FND-1552). The AC-16 table observes neither.
- TC-1271, TC-1288 are red at the spec commit and still `✅ passed`; the
  matrix summary is stale and `make lint` fails (FND-1555, FND-1557).
