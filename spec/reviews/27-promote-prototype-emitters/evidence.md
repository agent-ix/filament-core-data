---
id: SR-059
title: "Evidence review of the issue #27 prototype-emitter promotion"
type: SpecReview
analysis: evidence
scope: "spec/usecase/US-009-*.md, spec/functional/FR-040-*.md..FR-044-*.md, spec/non-functional/NFR-017-*.md, spec/non-functional/NFR-018-*.md, spec/tests.md TC-320..375"
review_set: all
---
# Evidence review

## Summary

The issue #27 slice carries 41 acceptance-criterion obligations (FR-040-AC-1..6,
FR-041-AC-1..7, FR-042-AC-1..6, FR-043-AC-1..6, FR-044-AC-1..6,
NFR-017-AC-1..5, NFR-018-AC-1..5), 12 NFR metrics, 14 named constraints, and 56
matrix rows (TC-320..375). `quoin advise --json` (2026-09-03) placed the 53
catalogued obligations: 1 inconclusive (FR-041-AC-3), 12 uncatalogued (the
NFR-017 and NFR-018 free-text metric methods), 10 mismatches. Seven of the ten
mismatches are the settled convention SR-040 recorded at FND-167 and FND-170 —
an `Analysis` cell paired with a `Static` row (FR-041-AC-6/TC-335,
FR-044-AC-2/TC-358+359, FR-044-AC-4/TC-362+363, FR-044-AC-5/TC-364,
NFR-017-AC-2/TC-367, NFR-017-AC-4/TC-369, NFR-017-AC-5/TC-370) — and warrant no
change; the advisor flags them because the `example` and `universal` property
shapes always recommend a Test class. The three that matter are NFR-018-AC-3
(`Inspection` against an `sca-sbom` recommendation matched on `licence` *and*
`third-party-dependency`), NFR-018-AC-4 (`Demonstration` behind a `Manual` row)
and NFR-018-AC-5 (`Inspection` for a negative over an event). The 14 constraints
do not appear in the advisor's obligation set at all, so their `Validation`
column was placed entirely by judgement.

The byte-identity obligations are typed correctly and are the strongest part of
the slice: FR-041-AC-2 (TC-331), FR-042-AC-1/AC-2 (TC-340, TC-341) and
FR-043-AC-1 (TC-349) are `Snapshot` against retained issue #4 goldens, and the
"twice, identically" and "unmutated input" criteria (FR-041-AC-4/TC-333,
FR-042-AC-3/TC-342, FR-043-AC-5/TC-354, NFR-017-AC-1/TC-366) are `Property`,
which is what the catalogue recommends (`metamorphic-testing` and
`property-based-testing` on `idempotence`). Negative gates are `Unit` over a
mutated input where they should be (TC-321, TC-325, TC-330, TC-344, TC-350,
TC-351), which is the FND-172 lesson applied.

Judgement was applied to the residue and is labelled as such below. Three
obligations rest on an oracle that cannot fail. FR-044-AC-6 and NFR-018-M-1..3
read `spikes/typespec-feasibility/evidence/validation.json`, whose four zero
counters are hard-coded literals at `run-experiment.mjs:1148-1151`, written by
the tool under test. NFR-017-AC-3, NFR-017-M-4 and the second clause of
FR-044-AC-3 assert behaviour on "a host whose crates.io index has advanced",
which `cargo check --offline --locked` (`run-experiment.mjs:763-775`) can never
observe because it consults no index. And FR-042's declared promotion oracle —
byte equality with goldens the promoted code itself produced — is a tautology
for any component dispositioned `retain`, while FR-040-AC-4 rejects inventory
records whose only evidence is that same golden. TC-374's `Manual` type is not
warranted: the repository already runs `git diff origin/main` inside vitest
(`test/semantic-core.test.ts:66`, `test/semantic-contract.test.ts:182`,
`:300`), and every assertion NFR-018-AC-4 states is mechanical.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-340 | high | The non-disruption claim is discharged by reading a constant the tool under test writes. FR-044-AC-6 (`Test`, TC-365 `Static`) asserts that `spikes/typespec-feasibility/evidence/validation.json` "still reports zero package publications, schema mutations, consumer mutations, and external repository mutations", but those four fields are literals in `run-experiment.mjs:1148-1151` — they are emitted as `0` whatever the run did, so the row cannot fail for the reason it exists. NFR-018-M-3 compounds it: "Corpus repository files changed", method `Changed-path gate`, is a fact about other repositories that a gate over this branch's diff cannot observe. Judgement: discharge the in-repo halves by the branch diff that TC-371 already runs (Analysis/`Static`), replace TC-365 with an assertion over the diff rather than over the JSON, and either declare the external-repository metric out of observable scope or give it an Inspection discharge naming who checked which repositories. | FR-044-AC-6, NFR-018, TC-365, TC-371, TC-375 |
| FND-341 | high | The reliability claim at the centre of NFR-017 has no runnable oracle. NFR-017-AC-3 (`Test`, TC-368 `Integration`), NFR-017-M-4 (`Retained-evidence check`) and the second clause of FR-044-AC-3 (`Test`, TC-361 `Integration`) all condition on "a host whose crates.io index has advanced past the minted versions" / "carries a newer `syn`". The spike runs `cargo check --offline --locked` (`run-experiment.mjs:763-775`); `--offline` means the index is never consulted, so the stated precondition is unobservable and the row passes identically on a stale index, a fresh one, and a machine with no index at all. Judgement: this is an Analysis obligation — the argument is that a committed `Cargo.lock` plus `--locked --offline` makes resolution index-independent — plus a `Unit`/`Integration` Test of the two branches FR-044 Behavior actually states (retained lock present, seeded; lock absent, generated once). Restate NFR-017-M-4 as a fact the gate can produce, e.g. "resolution steps that consult the crates.io index: 0". | NFR-017-AC-3, NFR-017, FR-044-AC-3, TC-361, TC-368 |
| FND-342 | medium | FR-040-AC-1 asserts "thirteen records, one per enumerated prototype component", but the Inputs enumerate three bullets, one of which is the unnumbered phrase "the generator, adapter, fixture, projection, evidence, and harness functions in `run-experiment.mjs`". Nothing in the spec lists thirteen components, so TC-320 can only assert a magic number and will pass over any thirteen records. The AC's second half ("a spike source path that exists in the tree or in the promotion commit's parent") also cannot be a filesystem check: FR-044-AC-4 requires `spikes/typespec-feasibility/emitter/` to be absent from the tree, so at least one record resolves only through `git show origin/main:<path>`. Judgement: enumerate the thirteen components in FR-040 Inputs, and state in TC-320 that resolution is against the merge base, not the working tree. | FR-040-AC-1, FR-044-AC-4, TC-320, TC-362 |
| FND-343 | medium | The promotion oracle is circular for retained components, and it is the evidence FR-040 forbids. FR-042 Behavior declares "Both backends SHALL reproduce the retained issue #4 goldens byte-for-byte; this equivalence is the promotion oracle", but the goldens under `spikes/typespec-feasibility/generated/custom/` were produced by the very generator functions being promoted (`emitTypeScript` at `run-experiment.mjs:154`, `emitRust` at `:252`). For a component dispositioned `retain` the equality detects a botched lift and nothing else; it cannot show the generator is correct on anything outside the one representative slice. FR-040-AC-4 meanwhile rejects any inventory record whose only evidence is "representative golden passed" — the promotion holds its inventory to a stricter standard than it holds itself. Judgement: keep TC-340/TC-341 `Snapshot` as regression protection but label the equality Analysis-grade in the inventory `limitation`, and let the behaviour rows (TC-344, TC-345, TC-347, TC-348) carry the independent evidence. | FR-042, FR-042-AC-1, FR-042-AC-2, FR-040-AC-4, TC-325, TC-340, TC-341, TC-346 |
| FND-344 | medium | The purity claim is wider than its oracle, and no oracle is named. FR-042 Behavior states each backend "SHALL read no file, no environment variable, and no clock" and FR-042-CON-2 forbids writes, but the only obligation is FR-042-AC-3's "neither writes to the filesystem during the call" (TC-343 `Unit`), which covers one of the four and says nothing about how a write would be detected. A test that simply calls the function and observes no new file proves nothing about a write to a path it did not look at. `quoin advise` recommends `integration-testing` for AC-3 on an `io-boundary` characteristic, which is the same signal. Judgement: split AC-3 — determinism stays `Property` (TC-342), purity becomes a `Unit` row naming the interception mechanism (a monkeypatched `node:fs`, a `process.env` proxy, a frozen clock) — and widen the criterion to the four sources the Behavior claims. | FR-042-AC-3, FR-042-CON-2, TC-342, TC-343 |
| FND-345 | medium | SR-040 FND-167 recurs across twelve obligations: authored `Test` with a `Static` row. FR-040-AC-1 (TC-320), FR-040-AC-3 (TC-322, TC-323), FR-040-AC-4 (TC-324), FR-040-AC-5 (TC-326), FR-040-AC-6 (TC-327), FR-041-AC-1 (TC-329), FR-042-AC-6 (TC-346), FR-043-AC-6 (TC-355), FR-044-AC-3 (TC-360), FR-044-AC-6 (TC-365), NFR-018-AC-1 (TC-371), NFR-018-AC-2 (TC-372). The Type decides which suite mints the evidence, and the same slice pairs `Analysis` with `Static` correctly seven times, so the split is inconsistent within one review set. Judgement: the file and diff readings (TC-320, TC-322, TC-323, TC-324, TC-326, TC-327, TC-346, TC-355, TC-360, TC-371, TC-372) should author `Analysis`; the export-set check (TC-329) is an executable assertion over an imported module and should type `Unit` alongside TC-330; TC-365 is settled by FND-340. | FR-040-AC-1, FR-040-AC-3, FR-040-AC-4, FR-040-AC-5, FR-040-AC-6, FR-041-AC-1, FR-042-AC-6, FR-043-AC-6, FR-044-AC-3, NFR-018-AC-1, NFR-018-AC-2, TC-320, TC-329, TC-346, TC-355, TC-360, TC-371, TC-372 |
| FND-346 | medium | Four matrix rows trace to an acceptance criterion that does not state their criterion, because the behaviour they check has no AC. TC-337 ("Only `AgentIx.Semantic` declarations enter the IR") traces to FR-041-AC-2, a byte-identity criterion; TC-347 ("Enums render as string-literal unions") traces to FR-042-AC-1 and TC-348 ("Optional and nullable fields wrap in `Option<…>`") to FR-042-AC-2, both golden-equality criteria; TC-356 ("No hand-written Python code generator exists under `src/compiler/`") traces to FR-043-AC-1, the Python-input byte-identity criterion. Each names a normative Behavior bullet — the namespace filter, the enum and Option rendering rules, "This repository SHALL NOT own a hand-written Python code generator" — that carries no obligation of its own. The evidence is real; it discharges the wrong thing, and if the golden is ever rebaselined these rows are counted as already satisfied. Judgement: add the four acceptance criteria. | FR-041, FR-042, FR-043, TC-337, TC-347, TC-348, TC-356 |
| FND-347 | medium | NFR-018-AC-5 is a negative over an event discharged by a scan of files. "No workflow, tag, or registry publication is triggered by the promotion" (`Inspection`, TC-375 `Static`) can be shown by reading `.github/workflows` and the tag list — that no publish job is wired and no tag was pushed — but a static scan cannot show that nothing fired, and NFR-018-M-1's stated method (`Registry and workflow inspection`) names a registry query that no test case carries. Judgement: split the obligation — `Static` for the workflow and tag scan (TC-375 as written), plus an `Inspection` discharge recording the registry check and who performed it. The advisor's `e2e-testing` recommendation here is a lexical hit on the word "workflow" and warrants nothing. | NFR-018-AC-5, NFR-018, TC-375 |
| FND-348 | medium | TC-374's `Manual` type and NFR-018-AC-4's `Demonstration` method are a weaker gate than the repository can already run. Every assertion the AC states is mechanical — the revert restores `spikes/typespec-feasibility/emitter/`, restores the `command` field of `evidence/custom.json`, and returns `spike:typespec:check` to its `origin/main` state — and the harness already shells out to git against `origin/main` inside vitest (`test/semantic-core.test.ts:66`, `test/semantic-contract.test.ts:182` and `:300`). A `git revert --no-commit` of the promotion range in a scratch worktree followed by three file assertions and one check run needs no human. Judgement: author `Test` and type TC-374 `Integration` (or `E2E`, since it drives the whole spike check); `Manual` is honest only if a human must decide something, and here nobody does. It is also the one row that would catch a promotion that cannot be backed out, which is NFR-018's whole purpose, so it is the worst row in the slice to leave unautomated. | NFR-018-AC-4, NFR-018, TC-374 |
| FND-349 | medium | NFR-018-AC-3 is compound and its halves need different methods. "Every added package manifest declares `\"license\": \"AGPL-3.0-only\"`" is a mechanical field read; "every third-party dependency the promotion relies on is already pinned and attributed by the existing manifests" is a human judgement about attribution. The AC is authored `Inspection` and TC-373 `Static` covers only the first half, so the attribution half has no discharge at all. `quoin advise` recommends `sca-sbom` (Analysis/`Static`) matched on both `licence` and `third-party-dependency`, which is the split showing through. Judgement: separate the two criteria, keep TC-373 `Static` for the licence fields, and give attribution an `Inspection` discharge. | NFR-018-AC-3, TC-373 |
| FND-350 | low | NFR-017-M-5 ("Unpinned transitive versions used by the retained Rust package", target 0, method `Lockfile seeding inspection`) maps to no test case — NFR-017's coverage row is TC-366..370, which discharge AC-1..AC-5 — and the stated method measures that seeding happened, not how many transitives are unpinned. NFR-017-M-6 ("New runtime dependencies added") is discharged only by TC-339, which sits under FR-041 and is absent from NFR-017's row list. Same shape as SR-040 FND-168. Judgement: state M-5 as "transitive crates resolved by `cargo check --locked` that are absent from the retained `Cargo.lock`: 0", which TC-360 can assert, and add TC-339 to NFR-017's row list. | NFR-017, TC-339, TC-360, TC-366, spec/tests.md |
| FND-351 | low | Two obligations are stated twice and traced twice, so one fact will mint two pieces of evidence that can disagree. FR-041-AC-4 ("Running the CLI twice over the same entrypoint yields byte-identical output", TC-333 `Property`) and NFR-017-AC-1 ("Two runs of the compiler CLI over the same entrypoint produce identical bytes", TC-366 `Property`) are the same sentence; FR-044-AC-2 (TC-358, TC-359 `Static`) and NFR-017-AC-2 (TC-367 `Static`) are the same `origin/main` diff over the retained-evidence paths. Judgement: keep one row each and trace both obligations to it, as the matrix already does for TC-268 and TC-346. | FR-041-AC-4, NFR-017-AC-1, FR-044-AC-2, NFR-017-AC-2, TC-333, TC-358, TC-359, TC-366, TC-367 |
| FND-352 | low | The US-009 coverage row (TC-335, TC-320, TC-357, TC-372) under-serves two acceptance examples. US-009-EX-3 ("every retained byte still matches, except deltas that were declared in advance") is traced only to TC-357, which asserts an exit code and not the byte set; the rows that carry the declared delta are TC-358 and TC-359. US-009-EX-4's second clause ("reverting the promotion commit restores the spike as the only generator") is TC-374 and appears nowhere in the row. Judgement: extend the US-009 row to TC-358, TC-359 and TC-374. | US-009, US-009-EX-3, US-009-EX-4, TC-357, TC-358, TC-359, TC-372, TC-374, spec/tests.md |
| FND-353 | low | FR-040-CON-1 is a rejection rule discharged by a scan. The constraint forbids a `retain` disposition over a capability whose `capabilities.json` disposition is `partial` unless the partiality is repeated in `limitation`; TC-328 is typed `Static`, which shows the inventory committed today is clean but cannot show the gate rejects a violating record. Same shape as SR-040 FND-172 (TC-258). Judgement: type TC-328 `Unit` over an in-test mutated record, exactly as TC-321 and TC-325 already do for the other two inventory rejection rules, and keep a `Static` scan of the real inventory if the real-file check is wanted as well. | FR-040-CON-1, TC-321, TC-325, TC-328 |
| FND-354 | low | NFR-018-AC-2 is a byte-identity criterion not typed `Snapshot`: "`exports`, `main`, `module`, and `types` are byte-identical to `origin/main`" is TC-372 `Static`, while every other byte-identity criterion in the slice is `Snapshot` (TC-331, TC-340, TC-341, TC-349) and `quoin advise` recommends `golden-approval-testing` on a `stable-output` characteristic. Judgement: `Static` is the right call here and the convention is not broken — the baseline is a git ref rather than a checked-in golden, and `test/semantic-contract.test.ts:300` already implements exactly this `git diff origin/main -- package.json` comparison. Recorded so the deviation reads as deliberate rather than as a missed `Snapshot`. | NFR-018-AC-2, TC-372, TC-331, TC-349 |
| FND-355 | low | FR-041-AC-3 is the slice's only inconclusive obligation — no applicability rule matched — so its method is judgement, not catalogue. Judgement: `Test`/`Unit` (TC-332 as authored) over a fixture TypeSpec source carrying an unresolved reference, asserting both halves the AC states. The second half ("writes no output file") is unfalsifiable as written unless the row names an output path that is checked for absence; a rejected promise trivially writes nothing to a path the test never names. Judgement: state the temporary output directory in TC-332 or the criterion cannot fail. | FR-041-AC-3, TC-332 |
| FND-356 | low | FR-041-CON-4's method cannot see the failure mode it exists for. The constraint forbids adding a runtime dependency and is validated by `Dependency inspection` (TC-339 `Static`), which compares the dependency blocks of `package.json`. But `package.json` `files` already ships `src/`, and every `@typespec/*` package is a `devDependency`; a promoted `src/compiler/` that imports `@typespec/compiler` therefore becomes a runtime dependency of the published package without any dependency block changing, and the inspection reports zero added. Judgement: extend TC-339 to assert that no file shipped by `files` imports a `devDependency`, or exclude `src/compiler/` from `files` and assert that instead. | FR-041-CON-4, FR-041-CON-2, TC-339, package.json |
| FND-357 | low | All twelve NFR-017 and NFR-018 metric methods are uncatalogued free text (`Repeat-run comparison`, `Branch diff against origin/main`, `Retained-evidence check`, `Lockfile seeding inspection`, `Dependency inspection`, `Registry and workflow inspection`, `Changed-path gate`, `package.json exports comparison`, `Licence inspection`, `Revert rehearsal`), so the auditor cannot check conformance against them, and every one draws the same lexical `performance-benchmarking` recommendation from `quantified-threshold` matching targets of `0` and `1`. NFR-018-M-6 also states a count ("Commits needed to revert the promotion") against a non-numeric target ("branch revert only"). Same shape as SR-040 FND-174/FND-175. Judgement: no plan change; recorded so a later catalogue pass can name the Static, Snapshot or Inspection method each maps to, and so the benchmark recommendations are not mistaken for gaps. | NFR-017, NFR-018 |
| FND-358 | low | None of the fourteen constraints appears in `quoin advise`'s obligation set (53 = 41 acceptance criteria + 12 metrics), so every constraint `Validation` value was placed by judgement with no catalogue check. Four name methods that are not catalogue classes at all — `Inventory test` (FR-040-CON-1/2, FR-042-CON-1/3), `Purity test` (FR-042-CON-2), `Retained-evidence diff test` (FR-044-CON-1), `Diff inspection` (FR-044-CON-2) — and FR-043-CON-2 names "Fixture test and issue #31 acceptance", the second half of which is an event in another repository rather than a verification method. Every constraint does carry a matrix row, so this is a vocabulary gap, not a coverage gap. Judgement: map each to a catalogue class when the constraints are next touched. | FR-040-CON-1, FR-040-CON-2, FR-042-CON-1, FR-042-CON-2, FR-042-CON-3, FR-043-CON-2, FR-044-CON-1, FR-044-CON-2 |

## Method recommendations

Only obligations whose recommendation differs from what was authored, or whose
row Type differs from the criterion, are listed. Everything absent agrees with
the catalogue and with the matrix.

| Obligation | Authored | Row (Type) | Recommended method / class | Recommended Type | Source |
|---|---|---|---|---|---|
| FR-040-AC-1 | Test | TC-320 (Static) | Analysis over the merge-base tree | Static | FND-342, FND-345 |
| FR-040-AC-3 | Test | TC-322, TC-323 (Static) | Analysis | Static | FND-345 |
| FR-040-AC-4 | Test | TC-324 (Static), TC-325 (Unit) | Analysis for the field read; `unit-testing` for the rejection | Static + Unit | FND-345 |
| FR-040-AC-5 | Test | TC-326 (Static) | Analysis | Static | FND-345 |
| FR-040-AC-6 | Test | TC-327 (Static) | Analysis | Static | FND-345 |
| FR-040-CON-1 | Inventory test | TC-328 (Static) | `unit-testing` over a mutated record | Unit | FND-353 |
| FR-041-AC-1 | Test | TC-329 (Static), TC-330 (Unit) | `unit-testing` (advisor) | Unit for both | FND-345 |
| FR-041-AC-3 | Test | TC-332 (Unit) | judgement — no rule matched; `unit-testing` with a named output path | Unit | FND-355 |
| FR-041-CON-4 | Dependency inspection | TC-339 (Static) | Analysis extended to the shipped `files` set | Static | FND-356 |
| FR-042-AC-1, AC-2 | Test | TC-340, TC-341 (Snapshot) | `golden-approval-testing`, recorded as Analysis-grade for `retain` components | Snapshot | FND-343 |
| FR-042-AC-3 | Test | TC-342 (Property), TC-343 (Unit) | `property-based-testing` for determinism; `integration-testing` with a named interception oracle for purity | Property + Unit | FND-344 |
| FR-042-AC-6 | Test | TC-346 (Static) | Analysis | Static | FND-345 |
| FR-043-AC-6 | Test | TC-355 (Static) | Analysis | Static | FND-345 |
| FR-044-AC-3 | Test | TC-360 (Static), TC-361 (Integration) | Analysis for the lockfile diff; Analysis for index-independence plus `unit-testing` of the seed/generate branches | Static + Unit | FND-341, FND-345 |
| FR-044-AC-6 | Test | TC-365 (Static) | Analysis over the branch diff, not over `validation.json` | Static | FND-340 |
| NFR-017-AC-3 | Test | TC-368 (Integration) | Analysis (index-independence argument) | Static | FND-341 |
| NFR-017-M-4 | Retained-evidence check | TC-368 | restate the metric; the method cannot produce it | Static | FND-341 |
| NFR-017-M-5 | Lockfile seeding inspection | none | Analysis over `cargo check --locked` resolution vs the retained lock | Static | FND-350 |
| NFR-018-AC-1 | Test | TC-371 (Static) | Analysis | Static | FND-345 |
| NFR-018-AC-2 | Test | TC-372 (Static) | Analysis (git-ref baseline, not a golden) | Static | FND-345, FND-354 |
| NFR-018-AC-3 | Inspection | TC-373 (Static) | `sca-sbom` (Analysis) for licences; Inspection for attribution | Static + Inspection | FND-349 |
| NFR-018-AC-4 | Demonstration | TC-374 (Manual) | Test — scripted revert rehearsal in a scratch worktree | Integration | FND-348 |
| NFR-018-AC-5 | Inspection | TC-375 (Static) | Analysis for the workflow and tag scan; Inspection for the registry query | Static + Inspection | FND-347 |
| NFR-018-M-3 | Changed-path gate | TC-371 | unobservable from this branch; declare scope or give it an Inspection | Inspection | FND-340 |
| (no obligation) | — | TC-337, TC-347, TC-348, TC-356 | rows need acceptance criteria of their own | unchanged | FND-346 |

## Evidence Portfolio

| Concern | Evidence |
|---|---|
| Every prototype component carries a disposition, a target and a limitation | Static reads of `src/compiler/inventory.json` (TC-320, TC-322, TC-323, TC-324, TC-326, TC-327), pending the enumeration in FND-342 |
| The disposition set stays closed and golden-only justifications are rejected | Unit over mutated records (TC-321, TC-325); TC-328 pending FND-353 |
| The build interface is narrow | Static export scan (TC-329) plus the seventh-export Unit (TC-330); both `Unit` per FND-345 |
| The promoted emitter reproduces the retained IR | Snapshot against `generated/custom/semantic-ir.json` (TC-331), with the namespace filter at TC-337 pending an AC (FND-346) |
| Three IR production routes agree | Integration across programmatic, `tsp --emit` and CLI (TC-334) |
| Compiler determinism | Property over two runs (TC-333, TC-366); duplicated per FND-351 |
| Diagnostics on an uncompilable entrypoint | Unit (TC-332), output-path assertion pending FND-355 |
| Backends reproduce the issue #4 goldens | Snapshot (TC-340, TC-341, TC-349) — regression protection, not qualification (FND-343) |
| Backend purity | Property for determinism (TC-342, TC-354); TC-343 pending the oracle in FND-344 |
| Backend and adapter error paths | Unit over mutated inputs (TC-344, TC-350, TC-351) |
| Python adapter normalization | Unit (TC-352, TC-353) and Snapshot (TC-349) |
| No hand-written Python generator | TC-356, tracing to an AC that does not state it (FND-346) |
| The frozen spike still replays | Integration (TC-357); the declared delta is TC-358, TC-359, TC-367 |
| Retained lockfile determinism | Static diff (TC-360); the drifted-index claim has no oracle (FND-341) |
| The `file:` dependency and emitter package are gone | Static (TC-362, TC-363, TC-364, TC-370) |
| Nothing shipped, nothing mutated | Static changed-path and export-surface gates (TC-371, TC-372); TC-365 and the registry half unsound per FND-340 and FND-347 |
| Licence posture | Static manifest scan (TC-338, TC-373); attribution undischarged per FND-349 |
| The promotion can be backed out | TC-374, manual today and automatable per FND-348 |
