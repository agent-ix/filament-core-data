---
id: SR-102
title: "Risk and complexity review of the qualified Python generation route"
type: SpecReview
analysis: risk-complexity
scope: "US-013, FR-072..FR-080, NFR-026, NFR-027, spec/tests.md TC-845..944"
review_set: all
---
# Risk and complexity review

## Summary

Issue #23 qualifies an actively developed third-party generator —
`datamodel-code-generator` `0.76.0`, MIT, two published high-severity
code-injection advisories, derived floor `0.64.0` — as the Python side of the
semantic contract. It declares five immutable target profiles, an additive
schema preparation pass, two guards, a sandboxed subprocess runner, a
per-family qualification with a retained-gap register, an AST inspection of the
generated source, a committed package tree with provenance, and a strict
type-check plus runtime-validation gate: 100 test cases, 110 acceptance
criteria, nine FRs and two NFRs, on a branch whose permitted paths exclude
`schema/**`, `fixtures/**`, `src/compiler/**`, `conformance/**`, `spikes/**`,
`packages/**`, `package.json`, and `.github/**`.

The security posture is the strongest part of the set and is well grounded:
both advisories are quoted with their published ranges, the five-key refusal
register is derived from what the pinned version's own source binds rather than
from the advisories alone, and remote fetching is defended three independent
ways. That is not where the risk is.

**What most plausibly turns this red for reasons unrelated to a defect** is
environment drift landing inside byte-compared artefacts. `PROVENANCE.json`
carries the toolchain fingerprint — interpreter, Pydantic, msgspec, and
formatter versions — and sits inside the tree that FR-079-AC-4 and NFR-027-AC-3
compare byte-for-byte, so a CPython patch release or a `black` bump makes every
`--check` gate red with no generated Python byte changed (FND-1157). The
formatter question is the same hazard from the other side: FR-073 requires an
explicit `--formatters` precisely because the pinned version warns its defaults
become opt-in, but never says which value, and the two available answers trade
a dead pin against tracking `black`'s stable style (FND-1158). Two further
independent red-makers: `unattributed` annotations failing by default over an
attribution the generator gives no help with (FND-1159), and a committed unmet
count of 111 corpus rows that another branch owns (FND-1161).

**What is most likely to be quietly weakened under pressure** is the
fail-never-skip discipline and the strict type check. CI here is a Node-only
reusable workflow driving `make test` → `vitest run`; `.github/**` is a
prohibited path and `pyproject.toml` wires no pytest task, so nothing in this
ticket's Python half runs in CI at all, while FR-072-CON-4, FR-076-AC-11,
FR-080-AC-7 and NFR-026-AC-8 all require a hard failure when a pinned tool is
absent. The reconciliation that costs nothing is a skip, and that is exactly
what four constraints forbid (FND-1155). Second: FR-080 demands zero mypy
errors under strict settings over code no requirement permits anyone to edit —
FR-074-CON-1 bans post-processing generated source, FR-073-CON-1 bans relaxing a
profile option, FR-080-CON-1 bans `type: ignore` and per-module overrides — so
the only remaining lever is the scoped mypy configuration itself, which
FR-080-AC-2 does not constrain (FND-1162). Third: `unattributed` is the check
whose failure mode is a maintenance tax, and demoting it to a census row is a
one-line change no acceptance criterion notices (FND-1159).

**Where the complexity concentrates**: at the JS/Python seam, and in the
five-families × thirteen-documents cross-product. The guards, the preparation
pass, and the profiles are `.mjs`; the runner, the inspection, and the
validation are Python; FR-076 requires the Python runner to call the JS guards
before it spawns anything while FR-076-AC-3 asserts a spawn counter of zero
(FND-1156). Every published schema but one cross-references `common.schema.json`
by relative filename, and no requirement states how those refs resolve under
`--strict-refs` inside a scratch root that holds one document (FND-1160).

Safe to build first, in this order: FR-072's advisory gate and `toolchain.json`
(self-contained, and its falsification tests are the cheapest real evidence in
the set); then FR-075's guards and the malicious-schema corpus, which need no
generator installed; then FR-073's profiles once the `--formatters` value and
the option-token source of truth are settled (FND-1158, FND-1163). FR-074,
FR-077, FR-078, FR-079, and FR-080 should not be tasked until the input model
(FND-1160), the seam (FND-1156), the fingerprint placement (FND-1157), and the
CI route (FND-1155) are decided, because each of those five requirements encodes
all four.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1155 | high | Nothing in this ticket's Python half can run where the repository's gates run, and the cheapest fix is the one four constraints forbid. `.github/build-test.yml` delegates to the `agent-ix/nodejs-actions` reusable workflow, which drives `make test` → `pnpm run test` → `vitest run`; there is no Poetry install, no pytest invocation, and `pyproject.toml`'s `[tool.poe.tasks]` declares only `version` and `info`. `.github/**` is a prohibited path (NFR-026 Scope, NFR-027-AC-5), so this branch cannot add the Python job. Yet FR-072-CON-4, FR-072-AC-5, FR-076-AC-11, FR-080-AC-7, FR-080-AC-8, NFR-026-AC-8, and NFR-027-AC-9 all require a hard failure with a provisioning message — never a skip — when a pinned tool is absent. Either the gates never execute outside a maintainer's laptop (in which case the whole qualification is unverified evidence) or they execute on a host without the `python-backend` group and turn a currently green pipeline red. The existing `tests/test_conformance_corpus.py` shows the precedent: Python suites in this repository already run only by hand. Name the execution route before tasking — a `make test-python` target the maintainer runs and the report records, or a CI change owned by a different ticket. | NFR-026 Scope, NFR-027-AC-5, NFR-027-AC-9, FR-072-AC-5, FR-072-CON-4, FR-076-AC-11, FR-080-AC-7, FR-080-AC-8, TC-849, TC-893, TC-932, TC-933, TC-939, ERR-071 |
| FND-1156 | high | The security guards and the process that must call them are on opposite sides of a runtime boundary, and the boundary is itself a spawn. FR-074 and FR-075 place `prepare.mjs`, `guard.mjs`, and `profiles.mjs` in JavaScript; FR-076 places `generate.py` in Python and requires it to call `assertSchemaSafe` and `assertArgvSafe` "before it spawns anything", while FR-076-AC-3 and TC-885 assert an instrumented spawn counter reading zero on a refused input. A Python process cannot call a Node module without spawning Node. The two exits are both costly: reimplement the five-key register, the `$ref` rules, and the option allow-list in Python — a second copy of a security-critical allow-list that FR-075's evidence (TC-873..882) does not cover and that FR-075-CON-1's no-narrowing rule cannot police across two files — or run the pipeline from Node and demote `generate.py` to a spawned worker, which makes AC-3's counter meaningless. The same seam splits `profileDigest`: FR-073 defines it in the `agent-ix-conformance-jcs-v1` form, whose only implementation is `conformance/oracle/json.mjs` under a prohibited path, while FR-076 and FR-079 record that digest from the Python side. Fix the ownership of each stage — and of the canonicaliser — before any module is written. | FR-074 Outputs, FR-075 Outputs, FR-076 Behavior, FR-076-AC-3, FR-076-CON-1, FR-076-CON-2, FR-073 Behavior, FR-079 Behavior, TC-880, TC-885, TC-894 |
| FND-1157 | high | The fingerprint is committed inside the artefact it fingerprints, so environment drift is indistinguishable from a regression. `PROVENANCE.json` lives under `python_backend/generated/<profile-id>/` and records the toolchain fingerprint, which FR-076 computes over the generator version, the interpreter version, the Pydantic and msgspec versions, the formatter versions, the profile digest, and the input schema digest. FR-079-AC-4 then reproduces that tree byte-for-byte and `--check` fails on any mutated committed file; NFR-027-AC-3 and FR-077-AC-8 apply the same rule to `report.json`, which also cites the fingerprint per verdict. A CPython patch release, a `pydantic` `2.12.6`, or a `black` patch therefore makes every `--check` gate in the ticket red while every line of generated Python is unchanged — and the recorded interpreter is already drifting: `pyproject.toml` constrains `python = ">=3.13,<3.14"` while the issue #4 evidence `toolchain.json` records `3.14.7`. Separate the environment record from the byte-compared tree, or state which fingerprint components participate in the comparison and which are informational. | FR-076 Behavior, FR-079 Outputs, FR-079-AC-3, FR-079-AC-4, FR-077-AC-2, FR-077-AC-8, NFR-027-AC-1, NFR-027-AC-3, TC-902, TC-919, TC-920, TC-941 |
| FND-1158 | high | The requirement that closes the formatter hole does not say what to close it with, and both available values carry a cost the spec does not price. FR-073 mandates an explicit `--formatters` because the pinned version warns its default external formatters become opt-in, and FR-076 fails on any warning the allow-list does not name — but no requirement fixes the value. The issue #4 spike ran `--formatters builtin`, which suppresses `black` and `isort` entirely; FR-072 nonetheless pins `black` and `isort` in the `python-backend` group and FR-076 folds "the formatter versions" into the fingerprint, so under `builtin` two pinned tools are fingerprinted while touching no byte, and under `black`/`isort` the committed tree tracks `black`'s stable style, which moves on its own calendar with no generator version change — the movement EC-076 names, arriving through the mitigation rather than through the default. The warning allow-list has the mirror problem: if the pinned `0.76.0` still emits the FutureWarning under an explicit `--formatters`, the allow-list must name it and FR-076-CON-3 then forbids removing it after the upstream stops emitting it. Declare the value, its rationale, and the fingerprint's treatment of unused formatters in FR-073. | FR-073 Behavior, FR-073-AC-2, FR-072 Outputs, FR-076 Behavior, FR-076-AC-7, FR-076-CON-3, EC-076, TC-854, TC-889 |
| FND-1159 | high | `unattributed` fails by default over an attribution nothing in the pipeline supports, and it is the check most likely to be quietly demoted. FR-078 attributes every permissive annotation to a schema pointer and fails on any it cannot place, and FR-078-AC-3 demands zero `degraded` and zero `unattributed` over every published `schema/semantic/v1/*.schema.json` under every declared profile. The generator emits no symbol-to-pointer provenance: attribution must be reconstructed from names the generator itself chooses, and it renames — anonymous subschemas become `Model`, `Model1`, …, non-identifier wire names are aliased, structurally identical models are deduplicated, and the issue #4 output already opens with `class Model(RootModel[Any]): root: Any`, a permissive annotation whose schema position is the document root. Five families times thirteen documents makes this a per-release reconciliation, and the pressure valve is one line: move `unattributed` from a failure to a census row, which FR-078's own census makes look principled and which no acceptance criterion except AC-9 would notice. If attribution must fail closed, task the name-mapping rule as its own piece of work with its own evidence, and state what the mapping does with `Model1`. | FR-078 Behavior, FR-078-AC-3, FR-078-AC-9, FR-078 Outputs, ERR-079, EC-072, TC-909, TC-915 |
| FND-1160 | high | The input is a set of cross-referencing documents, and every requirement treats it as one document. Twelve of the thirteen published `schema/semantic/v1/*.schema.json` documents `$ref` `common.schema.json#/$defs/…` by relative filename. FR-074 inherits `normalizeJsonSchemaForPython`, which localises only the refs keyed by a `$defs` entry's own `$id` plus the hard-coded `RecordString.json`, and is written for the single-file TypeSpec bundle — it also strips `$id`/`$schema` and injects `title` per `$defs` entry, which is bundle-specific behaviour. FR-073 then mandates `--strict-refs` so an unresolved pointer is an error rather than a fallback `Any`; FR-076 confines the input to a scratch root the runner owns; FR-075 refuses path-escaping refs; and FR-079 requires "one module per input schema document". Nothing states how a sibling-file `$ref` resolves under those four rules at once, yet FR-074-AC-3 generates from "the prepared published `common.schema.json`", FR-074-AC-8 ranges over every published document, and FR-078-AC-3 does the same under all five profiles. Decide bundle-first (one input, many modules) or a declared multi-document input with a stated ref rule before FR-074 is tasked; the choice changes FR-079's layout and FR-078's attribution. | FR-074 Inputs, FR-074 Behavior, FR-074-AC-3, FR-074-AC-8, FR-073 Behavior, FR-075 Behavior, FR-076 Behavior, FR-079 Behavior, FR-078-AC-3, TC-865, TC-870, TC-875, TC-909, TC-917 |
| FND-1161 | high | The independent oracle is not merely unavailable — it does not measure what this qualification is about, and its unmet count is a number another branch owns. `conformance/adapters/registry.json` declares `python-backend` `unavailable`, and `conformance/coverage.json` records 111 unmet rows against it. Those rows are IR documents with expected diagnostics: the adapter, once issue #52 unblocks from GAP-011, judges an IR *reader*, while FR-077 asks the corpus to judge "the generated Python surface" for constraint retention. Even fully wired, the corpus votes on a different artefact, so every verdict in `report.json` rests on expectations the same author writes in the probes — FR-077-CON-2 forbids weakening them, but nothing derives them from anything but this branch's reading of the contract. That is the self-oracle US-013 exists to avoid, and it should be stated in the report rather than implied by an unmet count. Separately, FR-077-AC-9 requires the unmet count to equal the rows the blocking dependency prevents; issue #20 adding a case moves 111, and this branch's committed report goes red for a reason that has nothing to do with Python. Record the unmet rows by their blocking dependency, not by a frozen total. | FR-077 Inputs, FR-077 Behavior, FR-077-AC-9, FR-077-CON-3, FR-077-CON-4, US-013 Context, EC-075, TC-903, TC-904 |
| FND-1162 | medium | The strict type check has no remedy the specification permits, so pressure will land on the one knob nothing constrains. FR-080-AC-1 requires zero mypy errors under `strict` over every generated module and example; FR-080-AC-2 forbids a `type: ignore` and a per-module override; FR-074-CON-1 forbids post-processing generated source; FR-073-CON-1 forbids relaxing a profile option; FR-078 forbids editing the output. Generated code from an upstream generator is not written to satisfy `strict` — `RootModel[Any]`, forward references resolved by `model_rebuild`, and msgspec's `Struct` metadata are the usual friction — and when it does not pass, every listed lever is closed except the "pinned mypy configuration scoped to the generated tree" that FR-080 itself introduces and that AC-2 constrains only per-module. A globally relaxed setting in that file is invisible to every criterion in the set. Enumerate the strict settings the configuration fixes, and give FR-080 the same escape the rest of the ticket has: a checker error a family cannot pass becomes a recorded verdict condition or a `gaps.json` row, not a configuration edit. | FR-080-AC-1, FR-080-AC-2, FR-080-CON-1, FR-080 Outputs, FR-073-CON-1, FR-074-CON-1, TC-926, TC-927 |
| FND-1163 | medium | Two hand-maintained mirrors of a large upstream CLI, neither derived from the CLI. FR-075-AC-6 refuses any option token the guard does not recognise, which means the guard carries the complete option set of `0.76.0` — the same surface FR-073-CON-2 enumerates thirteen prohibitions against and FR-075 adds twelve more to. Nothing checks either list against the installed distribution's own argument parser: FR-073-AC-8 does this for the target Python and Pydantic versions only, and FR-075-AC-2 does it for the five schema keys only. Two of the four tokens FR-073-AC-2 mandates — `--strict-refs` and `--no-allow-remote-refs` — appear nowhere in this repository's evidence; the issue #4 spike invoked `--input-file-type`, `--output-model-type`, `--target-python-version`, `--disable-timestamp`, `--strict-nullable`, `--use-standard-collections`, `--use-union-operator`, `--use-annotated`, `--formatters builtin`, and `--extra-fields forbid`, and nothing else. A profile carrying an option the pinned version does not accept fails at the first generation, and a bump silently invalidates the allow-list. Derive both lists from the installed parser, as FR-075-AC-2 already does for the key set, and add an acceptance criterion that every declared profile token is an option the pinned generator accepts. | FR-073-AC-2, FR-073-AC-8, FR-073-CON-2, FR-075 Behavior, FR-075-AC-6, FR-075-CON-3, FR-072-CON-2, TC-854, TC-856, TC-860, TC-878 |
| FND-1164 | medium | The evidence surface is a cross-product, and only half the requirements respect the split that keeps it affordable. FR-079 emits packages for demonstrated profiles only and records a reason for a `not-qualified` family, which is the right economy; but FR-078-AC-3 runs the inspection over every published document under all five profiles, FR-077-AC-1 requires every one of fourteen construct areas to declare an expected retention for all five families, and FR-080-AC-4 and AC-5 require, per family, a rejecting value for every retained constraint *and* an accepting value for every lost one. Against thirteen published documents and five families, that is several hundred committed expectations, each re-stated by FR-072-CON-2 on any version bump — for two families the ticket has already decided are not qualified for a validating surface (`dataclasses.dataclass`, `typing.TypedDict`). State the split once: probe-level measurement for all five families, whole-bundle inspection and validation for the demonstrated ones, and a per-family reason where a criterion does not apply. | FR-077-AC-1, FR-078-AC-3, FR-079-AC-6, FR-080-AC-3, FR-080-AC-4, FR-080-AC-5, FR-072-CON-2, TC-895, TC-909, TC-928, TC-930 |
| FND-1165 | low | The first defence a hostile document meets is the uncoded one. FR-074 requires `prepareForPython` to call `normalizeJsonSchemaForPython` first and leave it unaltered; that function throws a bare `Error("Forbidden executable Python schema extension: …")` on `x-python-import`, `customTypePath`, and `default_factory`, with no refusal code and no JSON pointer. FR-075 requires every refusal to name a code from the register and the pointer at which it was found, FR-075-AC-10 requires every code the guards can raise to appear in the register, and NFR-026-AC-1 asserts the corpus is refused "before any process is spawned" — satisfied either way, but a document carrying three of the five keys is refused by FR-043's throw rather than by FR-075's register, so the message and the register disagree on what refused it. Order `assertSchemaSafe` ahead of the inherited normalizer in FR-076's sequence, or state that the FR-043 throw is a declared second path with no code and exclude it from AC-10. | FR-074 Behavior, FR-075 Behavior, FR-075-AC-8, FR-075-AC-10, FR-076 Behavior, NFR-026-AC-1, TC-873, TC-880, TC-882 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| US-013 | High | Medium | Aggregates nine FRs and two NFRs; names its own principal risk (a family's defaults quietly widening the contract) and depends on an oracle that is unavailable and, when wired, judges a different artefact | Settle the input model, the JS/Python seam, the fingerprint placement, and the execution route before tasking (FND-1155..1157, FND-1160); state in the report that the verdicts are self-measured (FND-1161) |
| FR-072 | Low | High | Third-party upstream with an active release cadence and two published advisories; every bump re-runs the whole qualification per CON-2; ordered version comparison and licence assertion are simple and self-contained | Build first — it is the cheapest real evidence in the set; keep the floor derivation data-driven so a third advisory is a register row (FND-1163 for the bump cost) |
| FR-073 | Medium | High | Explicit `--formatters` with no declared value; two mandated option tokens unattested against the pinned CLI; `profileDigest` defined in a canonicalisation implemented only under a prohibited path | Declare the `--formatters` value and the fingerprint's treatment of unused formatters (FND-1158); derive the option list from the installed parser (FND-1163); decide the canonicaliser's owner (FND-1156) |
| FR-074 | High | Medium | Additive to a bundle-specific normalizer that strips `$id`, injects `title`, and localises only `$id`-keyed refs, applied to thirteen cross-referencing published documents under `--strict-refs`; purity and idempotence are testable and cheap | Decide bundle-first versus declared multi-document input before writing the pass (FND-1160); order the coded guard ahead of the inherited throw (FND-1165) |
| FR-075 | Medium | Medium | Security-critical allow-list that may need a second implementation across the runtime seam; a hand-maintained mirror of a large upstream CLI; the schema-key half is genuinely well grounded in the pinned source | Fix the runtime ownership first (FND-1156); derive both lists from the installed distribution (FND-1163); build the malicious-schema corpus early — it needs no generator installed |
| FR-076 | High | Medium | Subprocess sandbox, minimal environment, entry-point resolution, timeout and size limits, a stderr and warning allow-list against a version that warns by default, and a fingerprint that lands in a byte-compared artefact | Settle the guard call across the seam (FND-1156); split the fingerprint out of the compared tree (FND-1157); name the FutureWarning explicitly in the allow-list (FND-1158) |
| FR-077 | Medium | High | Verdicts are the artefact the rest of the program trusts, yet every expectation is authored on this branch; the unmet corpus count is owned by issue #20; five-family cross-product; report is byte-compared | Record unmet rows by blocking dependency rather than by a frozen count, and state the self-measurement limit in the report (FND-1161); apply the demonstrated-versus-measured split (FND-1164) |
| FR-078 | High | Medium | Attribution from generated symbols to schema pointers with no upstream provenance and a renaming generator; `unattributed` fails closed; the check's own failure mode is a maintenance tax | Task the name-mapping rule as its own work item with its own evidence, and state what it does with `Model`, `Model1`, and aliased fields, before AC-3 is claimed (FND-1159) |
| FR-079 | Medium | Medium | A committed generated tree byte-compared on a fingerprint that records the environment; layout depends on the unresolved input model; the non-publication half is well specified and cheap to verify | Resolve FND-1157 and FND-1160 first; keep the non-publication analysis criteria (AC-7, AC-8) as the first tasks — they are independent and immediately verifiable |
| FR-080 | High | Low | Strict type checking over code nobody is permitted to edit, with no declared remedy; per-family conforming and non-conforming values for retained and lost constraints alike | Enumerate the fixed strict settings and give a checker error a verdict-shaped disposition (FND-1162); scope AC-3..AC-5 to demonstrated families (FND-1164) |
| NFR-026 | Medium | Low | Advisory floor, three-layer remote-ref defence, non-executing inspection, instrumented sockets and spawns — all well grounded; the exposure is that its provisioning-failure metric has no place to run | Resolve the execution route (FND-1155); keep the instrumented-spawn criteria consistent with whichever side of the seam owns the guards (FND-1156) |
| NFR-027 | High | Medium | Byte-identical double generation against three declared sources of variation, plus `--check` over artefacts that carry the environment; changed-path guards pinned through sentinels; `.github/**` frozen | Split the fingerprint from the compared bytes (FND-1157); declare the formatter value (FND-1158); state where the gates execute given the frozen workflow path (FND-1155) |

## Top hazards

1. FND-1155 — the gates have nowhere to run. CI is Node-only and `.github/**` is prohibited, while four requirements forbid skipping when a pinned tool is absent. Every falsification criterion in the ticket depends on resolving this, and the cheap resolution is the forbidden one.
2. FND-1157 / FND-1158 — the environment inside the byte-compared artefact. A CPython, `pydantic`, or `black` patch release makes `--check` red with no generated byte changed, and the formatter value that closes the FutureWarning is never stated. Together these are the most likely non-defect red.
3. FND-1156 / FND-1160 — the two structural questions the plan cannot defer. Which runtime owns each stage (and therefore whether the security allow-list exists twice), and whether the input is one bundle or thirteen cross-referencing documents. FR-074, FR-076, FR-078, and FR-079 each encode both answers.
4. FND-1159 / FND-1162 — the two checks with no permitted remedy. `unattributed` failing closed with no attribution mechanism, and strict mypy over code nobody may edit. Both will be reconciled by weakening the check rather than by fixing the cause, and in both cases the weakening is invisible to every acceptance criterion.
5. FND-1161 — the verdicts are self-measured. The corpus slot is unavailable, and even when issue #52 unblocks it, the adapter judges an IR reader rather than the fidelity of a generated Python surface. The qualification's verdicts should say so, since the rest of the program will treat them as measured against an independent oracle.

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | Execution route for the Python gates | A named target the maintainer runs, recorded in the report, or a CI change owned by a ticket permitted to touch `.github/**` — decided before any fail-never-skip criterion is implemented |
| 2 | Reproducibility of byte-compared artefacts | Environment record separated from the compared tree, or the fingerprint's compared components enumerated; `--formatters` value declared with its fingerprint treatment |
| 3 | Runtime ownership of the pipeline stages | One owner per stage stated in FR-074..FR-076, with the guard allow-list existing exactly once and the canonicaliser's home decided |
| 4 | Input model for the published schemas | Bundle-first or declared multi-document input, with the cross-file `$ref` rule stated against `--strict-refs` and the scratch-root confinement |
| 5 | Semantic-loss inspection | Symbol-to-pointer mapping specified and evidenced as its own work item before FR-078-AC-3 is claimed over five families |
| 6 | Qualification honesty | Unmet corpus rows recorded by blocking dependency, self-measurement limit stated in `report.json`, `gaps.json` dispositions carrying their reviewer |
| 7 | Type-check and validation escape | Strict settings enumerated in the pinned configuration; a checker error given a verdict-shaped disposition rather than a configuration edit |
| 8 | Evidence affordability | Probe-level measurement for all five families, whole-bundle inspection and runtime validation for demonstrated ones only |

## Failure-domain gaps

No failure-domain review exists for issue #23; `spec/reviews/23-python-pydantic-backend/`
contains this review only. The edge-case rows carrying that load today are
EC-070..EC-078 in `spec/tests.md`, plus EC-068 inherited from FR-043. Of those,
EC-070 (closure stated with `unevaluatedProperties`) and EC-078 (the four
ECMAScript lookaheads in the `sourceLocus` pattern) are addressed directly by
FR-074's rewrites; EC-071 (a Pydantic dataclass profile omitting
`--extra-fields forbid`) and EC-077 (a shadowing `datamodel-codegen` on `PATH`)
are addressed by FR-073-AC-3 and FR-076-AC-9. EC-072 (a faithful `Any` treated
as a defect, "and the check is then disabled") is the row FND-1159 says is the
likely outcome rather than the guarded-against one, and no criterion detects the
disabling. EC-075 (unrun corpus rows read as passes) is addressed by
FR-077-AC-9 but not by FND-1161's deeper form, which is that the corpus judges a
different artefact. EC-076 (the formatter FutureWarning) is the row FND-1158
shows is only half-closed. Two failure domains have no edge-case row at all: the
JS/Python seam of FND-1156, and the environment-drift-inside-a-compared-artefact
shape of FND-1157. A failure-domain analysis over FR-072..FR-080 should be run
before `spec-to-plan`, specifically over the identity of the generation result —
which digest, which fingerprint, and which canonical form decides that two
generations are "the same" — since FND-1156, FND-1157, and FND-1160 each touch
that object from a different side.
