---
id: SR-093
title: "Risk and complexity review of the TypeScript semantic codegen and validator backend"
type: SpecReview
analysis: risk-complexity
scope: "US-012, FR-063..071, NFR-024..025"
review_set: all
---
# Risk and complexity review

## Summary

Issue #22 asks for two different things under one ticket, and only one of them
is a code generator. The codegen half — FR-063 through FR-067, FR-071 — is
ordinary work: a target-keyed seam, a renderer over eight IR kinds, an ESM
package, generated validators, a metadata module, a CLI verb. It is large but it
is bounded, and every one of its obligations is decided inside this repository.

The other half is not. FR-068 and FR-069 require a second, independent
implementation of an IR admissibility reader, an RFC 8785 canonicalizer with
identity-sorted sets, and an IR-surface compatibility classifier, which must
then agree with `conformance/oracle/oracle.mjs` at **zero permitted
divergences** (`conformance/thresholds.json`). The thing being re-derived is
1,913 lines across `oracle/oracle.mjs`, `oracle/json.mjs`, and
`oracle/schema-layer.mjs`. The agreement is exact on four surfaces at once:
`resultState` for all 111 cases, a positional diagnostic key of
`[pointer, code, severity, locus]` over the 44 expected diagnostics, the
`normalized` byte string for all 111 cases, and `classification` for the 25
compatibility cases. FR-063..067 and FR-071 could be tasked tomorrow. FR-068 and
FR-069 are a ticket, and the bundle prices them as two requirements among
eleven.

Two of the four comparison-key members are not derivable from any published
artifact. `conformance/diagnostic-codes.json` carries no severity and no locus
rule, and 15 of its 30 codes are `provenance: "minted"` — new to the corpus, not
present in any contract document. FR-068's Description says the backend decides
"from the published contract alone"; for half the vocabulary and for both of
`severity` and `locus` that is not available, so the implementer will read the
corpus's expected blocks. That is legitimate conformance and it is the only
route open, but it is not what the requirement claims, and the difference
matters because independence is the entire evidentiary value of FR-070.

The second-order hazard follows from the first. An implementer who cannot reach
zero divergences from the contract will reach it from the corpus, one rule at a
time, and the run will go green with no second implementation behind it. The
bundle bans the two mechanical routes — importing the oracle (FR-068-CON-1,
FR-069-CON-1, FR-070-CON-1) and calling `oracleVerdict` (FR-070-AC-5) — and
those bans are checkable. Transcription and iterative tuning are not banned and
are not checkable, and nothing in the bundle records how far the first honest
attempt got. One committed number would: the divergence count of the first
corpus run, before any fix.

Three findings are contradictions rather than risks. The bundle-surface
measurement (FR-065-CON-4, FR-065-AC-12, NFR-024-AC-12) requires a bundler
"already pinned in this repository's lockfile"; `esbuild`, `rollup`, and `vite`
are in `pnpm-lock.yaml` only as vitest's transitive dependencies and are not
resolvable, and declaring one changes `package.json` and `pnpm-lock.yaml`, which
NFR-025-AC-3 and NFR-025-AC-4 assert byte-unchanged. FR-070-AC-8 hard-codes 333
remaining unmet cases, a figure that is only correct if issue #22 merges before
issues #21 and #23 — three branches exist right now and none controls the order.
And the repository's root `tsconfig.json` compiles everything under `test/`
with `noUnusedLocals` but without `exactOptionalPropertyTypes`, which is the
opposite of what FR-065-AC-8 and NFR-024-AC-11 need, while `tsconfig.json` is
not on NFR-025's permitted-path list.

Reversibility is genuinely good and NFR-025 makes it so, with one exception:
`conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`
and the `spec/tests.md` execution summary are functions of the merged tree
rather than of this branch, so reverting issue #22 alone leaves three generated
artifacts stating something no longer true. NFR-025-AC-10's restore rehearsal
will not see this while it runs on a tree where issue #22 is the only backend.

Safe to build first, in this order: the seam and the target contract (FR-063);
`canonical.mjs` alone, checked against all 111 `normalized` strings, because it
is the smallest surface with the widest comparison and it fails fast; then
`admit.mjs` against the 41 `invalid` cases; then the renderer, package, and
validators (FR-064..067) against the 70 `success` cases; then `classify.mjs`
against the 25 compatibility cases; then the adapter (FR-070) and the CLI and
fixtures (FR-071) last. FR-069's classifier and FR-068's package-context rules
(`UNRESOLVED_IMPORT`, `PACKAGE_CYCLE`, `STALE_LOCK`, `UNKNOWN_MAPPING_TARGET`,
`UNDECLARED_LOSS`, `UNKNOWN_REQUIRED_EXTENSION`) should not be tasked until
FND-1071 and FND-1072 are decided.

Acted on in the review pass: the three findings this analysis identified as
contradictions rather than risks — the unsatisfiable bundle-surface measurement,
the merge-order-dependent counts and the wrong typecheck program — were all
closed before tasking, as it recommended. The two derivation gaps it measured
were filed as `agent-ix/filament-core-data#61` and #62, and its disclosure
proposals were adopted verbatim: a per-code derivation ledger and a committed
first-run divergence count. The size finding is accepted rather than closed, and
the reason is recorded below. The per-finding record is the disposition table at
the end of this document.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1070 | high | The requirement is right and the budget is absent — the FND-716 shape, one layer down. FR-068 and FR-069 re-derive the decision logic of `conformance/oracle/oracle.mjs` (1,484 lines), `oracle/json.mjs` (253) and `oracle/schema-layer.mjs` (176), and must agree with it at `permittedDivergences: 0` on four surfaces simultaneously: `resultState` across 111 cases, a positional `[pointer, code, severity, locus]` key across 44 expected diagnostics, `normalized` bytes across 111 cases, and `classification` across 25. Nothing in the bundle bounds that cost or stages it, and the two requirements sit in a list of eleven as though they were peers of FR-067. Under cost pressure the thing that gets sacrificed is not the schedule, it is independence — which is the only property FR-070's evidence rests on. Split FR-068 and FR-069 into their own plan track with their own gate, landing and measured before any codegen task starts, or into their own ticket. | FR-068, FR-069, FR-070-AC-1, `conformance/thresholds.json`, US-012 Priority and Risk |
| FND-1071 | high | Two of the four comparison-key members cannot be derived from the published contract, so FR-068's stated method cannot produce them. `compare()` keys a diagnostic on `canonical([pointer, code, severity, locus])` (`conformance/corpus.mjs:153`), and 32 of the 44 expected diagnostics carry a `locus`. `conformance/diagnostic-codes.json` records `code`, `decidedBy`, `rule`, `sources` and `citation` for each of its 30 codes and carries **no severity member and no locus-derivation rule**; the oracle derives `locus` from the nearest ancestor's `origin.source` or `sourceSpan` "when structurally usable", a rule stated in no contract document. FR-068 states an `owner` rule and states nothing about `locus` or about which codes are `error`. An implementer will therefore read severities and loci off the corpus's expected blocks. State that route explicitly in FR-068 — the corpus's expected blocks are a declared input for `severity` and `locus` — or raise the missing derivation rules as a contract gap against `agent-ix/filament-core-data#9` alongside GAP-003. | FR-068 Description, FR-068 Behavior (Diagnostic form and order), FR-068-AC-2, FR-070-AC-1, `conformance/corpus.mjs` `diagnosticKey`, `conformance/diagnostic-codes.json` |
| FND-1072 | high | Half the code vocabulary is corpus-minted, so "a second implementation written from the contract" is true of at most half the rules, and nothing records which half. `conformance/diagnostic-codes.json` marks 15 of 30 codes `provenance: "minted"` — `SCHEMA_VIOLATION`, `INVALID_DOCUMENT`, `UNRESOLVED_ELEMENT_TYPE`, `UNRESOLVED_VARIANT_PAYLOAD`, `UNRESOLVED_OCCURRENCE_DEFINITION`, `ALIAS_CYCLE`, `DEPTH_LIMIT_EXCEEDED`, `DUPLICATE_FIELD_NAME`, `V1_1_NODE_IN_V1_0`, `UNRESOLVED_IMPORT`, `PACKAGE_CYCLE`, `STALE_LOCK`, `UNKNOWN_MAPPING_TARGET`, `UNDECLARED_LOSS`, `UNKNOWN_REQUIRED_EXTENSION` — and `SCHEMA_VIOLATION`'s own `citation` is the phrase "All identifiers below are rooted at", which entails nothing about the rule. FR-068-CON-2 requires bijection with that register, so those 15 spellings are copied by hand from the corpus. Two cheap mitigations turn an unprovable claim into a checkable disclosure: a per-code derivation ledger in `admit.mjs` recording, for each of the 30, whether its rule was read from a published clause or from the corpus register; and a committed first-run divergence count — the number of cases that disagreed on the first corpus run before any fix — which is the only honest measure of independence, because after the first run every change is tuning. | FR-068 Description, FR-068-CON-2, FR-068-AC-9, FR-070-CON-1, FR-070-AC-6, `conformance/diagnostic-codes.json` |
| FND-1073 | high | The bundle-surface measurement is unsatisfiable as specified, and satisfying it breaks the non-disruption gate. FR-065-CON-4 requires "a bundler already pinned in this repository's lockfile, adding no dependency to either lockfile", and FR-065-AC-12 and NFR-024-AC-12 both turn on bundling a fixture package. `esbuild@0.21.5`, `rollup@4.62.2` and `vite@5.4.21` are in `pnpm-lock.yaml` only as transitive dependencies of `vitest`; under pnpm's isolated layout none of the three is resolvable — `import('esbuild')`, `import('rollup')` and `import('vite')` each fail `ERR_MODULE_NOT_FOUND` from the repository root, and top-level `node_modules` holds only the eight declared devDependencies plus `vitest`. They resolve only through `createRequire(require.resolve('vitest/package.json'))` into `node_modules/.pnpm/vite@5.4.21_@types+node@22.20.0/`, a store path that embeds the exact version and peer hash and that moves when `vitest`'s own caret range `^1.4.0` resolves differently. Declaring a bundler instead changes `package.json` and `pnpm-lock.yaml`, which NFR-025-AC-3 and NFR-025-AC-4 assert byte-unchanged. Replace the bundling with a static reachable-module-graph analysis over the generated ESM — which for a `sideEffects: false` package of named exports is what tree-shaking reduces to and is the check FR-065-CON-3 already prefers elsewhere — or state the vitest-internal resolution and pin `vitest` exactly. | FR-065-CON-4, FR-065-AC-12, FR-071-AC-11, NFR-024-AC-12, NFR-025-AC-3, NFR-025-AC-4 |
| FND-1074 | high | Three of this ticket's outputs are functions of the merged tree, and two requirements hard-code a figure that assumes a merge order nobody controls. `git worktree list` shows `spec/21-rust-serde-backend`, `spec/22-typescript-backend` and `spec/23-python-pydantic-backend` all live now. `conformance/coverage.json` carries one row per adapter and a single `unmetCases` integer computed from the registry, and each branch flips its own row and regenerates the file. FR-070's Behavior says "111 fewer unmet cases than the committed 444" and FR-070-AC-8 asserts "333 unmet cases": both are correct only if issue #22 merges first. If issue #21 lands first the committed base is 333 and the correct result is 222, and FR-070-AC-8 fails on a branch that did nothing wrong — the merge-degrading shape this repository has now shipped four times. The same coupling applies to `docs/semantic-data-system/compiler-diagnostics.md` (regenerated from `DIAGNOSTIC_CODES`, which all three branches extend), to the `spec/tests.md` execution summary, and to `src/compiler/inventory.json`. State the figure as "the `typescript-backend` row's `unmet` falls from 111 to 0 and the total falls by 111", read from the regenerated account as FR-070-CON-6 already requires, and never as an absolute. | FR-070 Behavior (Accounting), FR-070-AC-8, FR-070-CON-6, NFR-025 Scope, NFR-025-AC-10 |
| FND-1075 | medium | The typecheck obligation is a five-fold increase in suite runtime and no requirement bounds it. 70 of the 111 corpus cases expect `resultState: "success"`, and FR-065-AC-8 and FR-070-AC-10 each require every admitted model to be generated and typechecked under `tsc --noEmit`. One `tsc --noEmit -p tsconfig.json` over this repository takes 2.35s measured; 70 separate program invocations is on the order of 160s added to a `make test` that currently completes in about 30s. The decision logic itself is not the cost — `make conformance` runs the oracle over all 111 cases in 0.49s. Require one `tsc` program over all generated packages, or the TypeScript compiler API with a shared program and host, and state the bound; alternatively typecheck a declared representative subset in `make test` and the full 70 behind a separate target, which the requirement must say rather than leave to the implementer. | FR-065-AC-8, FR-070-AC-10, NFR-024-AC-11, NFR-020 |
| FND-1076 | medium | The generated fixtures are typechecked twice under two different configurations, and the one that runs in `make lint` is the wrong one. The root `tsconfig.json` sets `include: ["src", "test", "scripts"]` with `noUnusedLocals` and `noUnusedParameters` and **without** `exactOptionalPropertyTypes`, and `make lint` runs `tsc --noEmit -p tsconfig.json`. A probe `.ts` file placed under `test/fixtures/` was compiled by that invocation and rejected with `TS6133: 'unusedLocal' is declared but its value is never read`; a nested `tsconfig.json` beside it does not remove it from the parent's `include`. So every committed generated artifact under `test/fixtures/backends/typescript/` must additionally satisfy two unused-symbol rules that generated dispatch tables and validator signatures commonly violate, while the flag FR-065-AC-9 relies on to make absent-versus-`undefined` real is absent from that run. `tsconfig.json` is not on NFR-025's permitted-path list, so the fixture cannot be excluded there either. Name the authoritative typecheck invocation and its config file explicitly in FR-065 and FR-071, and confirm the generated output is clean under `noUnusedLocals` and `noUnusedParameters` as well. | FR-065-AC-8, FR-065-AC-9, FR-071 Outputs, NFR-024-AC-11, NFR-025 Scope |
| FND-1077 | medium | The classifier surface is five times the size the requirement states, and one case makes ignorance load-bearing. FR-069-AC-13 says "The five compatibility cases of the conformance corpus"; there are **25** — `kind: "compatibility"` across the corpus — carrying `breaking` 12, `conditional` 7, `patch` 3, `additive` 1, `invalid` 1 and `unknown` 1. The `unknown` row is the awkward one: FR-069 makes `unknown` the catch-all for "a change the rules do not model", so the backend must model *exactly* the change kinds the oracle models. A backend that classifies one change kind more than the oracle does turns that case's `unknown` into something specific and diverges — a better implementation failing the gate. Correct the count, and state that the modelled-change set is itself part of the agreement rather than an implementation detail. | FR-069-AC-13, FR-069 Behavior (Classification), FR-070 Behavior (The adapter) |
| FND-1078 | medium | The open contract questions are ranked wrongly by the bundle: GAP-011 is the one it guards and GAP-004 is the one that can move everything. GAP-011's blast radius really is one constant — FR-068-CON-3 and FR-068-AC-12 make that checkable, and it touches four cases (REF-001..004). GAP-004 does not: `contracts-v1.md` names `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere, FR-069 has `canonical.mjs` publish its own definition, and `normalized` is compared **byte-for-byte on all 111 cases** and is the input to the fingerprint FR-067 exports into every generated file's banner. If issue #9 later defines the algorithm differently — a different set-path list, UTF-16 rather than code-point key order — every case, every fingerprint and every committed generated fixture moves at once. Rank the volatility as GAP-004 first, GAP-006 and GAP-003 second (both shape the answer's form), GAP-011 third, GAP-010 fourth (one classification rule), and carry a plan task that pins the 13 `IDENTITY_SET_PATHS` and the key-ordering rule as declared data with the gap cited, so the later change is a data edit. | FR-069 Behavior (Canonicalization), FR-069-CON-3, FR-067 Behavior, FR-068 Behavior (The GAP-011 reference policy), `conformance/contract-gaps.json` |
| FND-1079 | low | The generation fixture is a golden the implementation mints, and the packed-artifact check reaches ambient tooling. FR-071-AC-1 requires `generate` over the committed fixture IR to write "the committed expected package byte for byte", and that expected package can only have been produced by the generator it checks. It is a legitimate regression baseline and it is not an oracle, and the bundle does not say which — a distinction this repository already had to make explicit as `provenance.blessedFromRun`. It also means every deliberate change to any of FR-064 through FR-067 rewrites the whole committed package, so the fixture's size is its maintenance cost. Separately, FR-071's `npm pack --dry-run --json` starts `npm`, which reads ambient npm configuration and, in this ecosystem, may be pointed at a private registry; the requirement's own "or an equivalent listing of path, size, and content digest" is the safer branch and should be the stated default. State that the fixture is a regression baseline whose oracle is the conformance run, keep it to one small IR document, and prefer the self-computed archive listing. | FR-071-AC-1, FR-071-AC-8, FR-071 Behavior (The packed artifact), NFR-024-AC-4 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| US-012 | Medium | Medium | Aggregates a bounded codegen half and an unbounded oracle-agreement half under one story; its own risk section names the tuning hazard but no requirement bounds it | Split the two halves in the plan (FND-1070); record the first-run divergence count as the independence measure (FND-1072) |
| FR-063 | Low | Low | Seam over a closed five-value vocabulary read from the published schema; four declared-unimplemented registrations following the `frontend/spec-bundle` precedent | Task first; it is the cheapest slice and unblocks everything else |
| FR-064 | Medium | Low | Eight kinds x three field axes x three unknown policies; identifier minting and collision; recursion through `map`/`sequence`/`payloadType` | Drive from the 70 `success` cases rather than from hand-written examples; the collision and reserved-word paths need their own fixtures |
| FR-065 | High | Medium | Bundle-surface measurement unsatisfiable as written; two competing typecheck configurations; `tsconfig.json` is a prohibited path | Replace bundling with static module-graph reachability (FND-1073); name the authoritative typecheck invocation (FND-1076) |
| FR-066 | Medium | Low | Eleven constraint keywords x applicability through aliases; four presence/nullability decisions; three unknown policies; a declared recursion bound; no third-party validator permitted | Generate the check table from the applicability data rather than by hand; drive negatives from `fixtures/semantic/v1/negative/` and the 38 negative cases |
| FR-067 | Low | Medium | Depends on FR-069's canonical form for the fingerprint, so GAP-004 movement rewrites every banner | Keep the fingerprint computation in one place behind `digestOf` (FND-1078) |
| FR-068 | High | High | ~1,900 lines of decision logic re-derived at zero permitted divergences; `severity` and `locus` underivable from the contract; 15 of 30 codes corpus-minted; six package-context rules read documents the IR does not carry | Own plan track with its own gate (FND-1070); declare the corpus expected blocks as an input for `severity` and `locus` (FND-1071); derivation ledger plus first-run divergence count (FND-1072) |
| FR-069 | High | High | `normalized` compared byte-for-byte on all 111 cases against an algorithm the contract names and never defines; 25 compatibility cases not 5; `unknown` requires matching the oracle's modelling boundary exactly | Build and check `canonical.mjs` first and alone (fails fast, widest coverage); correct the case count and state the modelled-change set as part of the agreement (FND-1077); pin the set paths as data (FND-1078) |
| FR-070 | High | Medium | Hard-coded 333/444 figures across three concurrent branches; independence bans cover the mechanical routes only; `coverage.json` regenerated by whichever branch merges last | Express the accounting relatively and read it from the regenerated account (FND-1074); add the first-run divergence figure as committed evidence (FND-1072) |
| FR-071 | Medium | Medium | 70 `tsc` invocations inside `make test`; a full generated package as a committed golden; `npm pack` reaching ambient npm configuration | Single shared `tsc` program and a stated runtime bound (FND-1075); one small fixture, self-computed archive listing (FND-1079) |
| NFR-024 | Medium | Medium | AC-12 depends on an unresolvable bundler; AC-11's flag is absent from the invocation `make lint` actually runs | Resolve FND-1073 and FND-1076 before either AC is tasked |
| NFR-025 | Medium | Medium | Permitted list omits `tsconfig.json`; three of the permitted files are functions of the merged tree rather than of this branch, so a revert leaves them stating something untrue | Note the generated-artifact exception in Scope, and rehearse the restore on a tree carrying a sibling backend (FND-1074, FND-1076) |

## Top hazards

1. **FND-1070 / FND-1072 — the independence claim.** FR-070's whole evidentiary
   value is that the backend was written independently of the oracle. The
   mechanical routes are banned and checkable; transcription and per-rule tuning
   are neither, and no artifact records how far the first honest attempt got.
   One committed number — the first-run divergence count — converts this from a
   claim into evidence, and it costs nothing.
2. **FND-1071 — `severity` and `locus`.** Both are members of the comparison key
   and neither is derivable from any published artifact. Until this is settled,
   FR-068's stated method and FR-070's zero-divergence target are in direct
   conflict, and every hour spent looking for the rule in `contracts-v1.md` is
   wasted.
3. **FND-1073 — the bundler.** Three requirements turn on a measurement that
   cannot be performed with what is installed, and performing it breaks two
   non-disruption criteria. This is a contradiction, not a risk; it resolves by
   changing the measurement, not by adding a dependency.
4. **FND-1074 — the absolute figures.** `333` and `444` are correct for exactly
   one of the six possible merge orders of three live branches. This is the
   merge-degrading defect class this repository has now shipped four times, in a
   fifth disguise: not a moving ref this time, but a constant that assumes one.
5. **FND-1075 / FND-1076 — the `tsc` obligations.** Seventy program invocations
   at 2.35s each inside a 30s suite, checked by a configuration that lacks the
   flag the requirement depends on and carries two the generated code must now
   satisfy. Both are cheap to fix before tasking and expensive to discover during
   implementation.

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | Independence of the second implementation | Derivation ledger per code, plus a committed first-run divergence count taken before any fix |
| 2 | Derivability of the comparison key (`severity`, `locus`) | Corpus expected blocks declared as an input for both, or the missing rules raised as a contract gap on issue #9 |
| 3 | Scope and staging of FR-068 and FR-069 | Own plan track with its own gate, landing and measured before any codegen task starts |
| 4 | Merge-order coupling across issues #21, #22 and #23 | Every count expressed relatively and read from the regenerated account; restore rehearsal run on a tree carrying a sibling backend |
| 5 | Bundle-surface and typecheck measurements | Static module-graph reachability in place of a bundler; the authoritative `tsc` invocation and config named in the requirement |
| 6 | Suite runtime | One shared `tsc` program over all generated packages, with a stated bound |
| 7 | Canonicalization volatility (GAP-004) | `IDENTITY_SET_PATHS` and the key-ordering rule pinned as declared data with the gap cited beside them |
| 8 | Committed generated golden | One small fixture, declared a regression baseline rather than an oracle, with the conformance run named as its oracle |

## Measurements taken for this review

| Fact | Value | How |
|---|---|---|
| Oracle decision logic to be re-derived | 1,913 lines | `wc -l conformance/oracle/oracle.mjs oracle/json.mjs oracle/schema-layer.mjs` |
| Corpus cases | 111 across 22 families | `find conformance/cases -name '*.json' \| wc -l` |
| Cases expecting `success` / `invalid` | 70 / 41 | `expected.resultState` census |
| Compatibility cases | 25 (`breaking` 12, `conditional` 7, `patch` 3, `additive` 1, `invalid` 1, `unknown` 1) | `kind` and `expected.classification` census |
| Expected diagnostics, and how many carry a `locus` | 44, of which 32 | census over `expected.diagnostics` |
| Severity values in expected diagnostics | `error` only | same census |
| Registered codes, minted vs frozen | 30 total, 15 `minted` / 15 `frozen` | `conformance/diagnostic-codes.json` `provenance` census |
| Severity or locus rule in the code register | absent | key census over the 30 rows |
| `esbuild` / `rollup` / `vite` resolvable from the repository | no — `ERR_MODULE_NOT_FOUND` for all three | `node -e "import('<pkg>')"` |
| Same three resolvable through `vitest` | yes, via `node_modules/.pnpm/<name>@<version>_<peerhash>/` | `createRequire(require.resolve('vitest/package.json'))` |
| `make conformance` wall time | 0.49s | `/usr/bin/time make conformance` |
| One `tsc --noEmit -p tsconfig.json` | 2.35s | `/usr/bin/time npx tsc --noEmit -p tsconfig.json` |
| A `.ts` file under `test/fixtures/` compiled by the root config | yes, and rejected for `TS6133` under `noUnusedLocals` | probe file, since removed |
| `exactOptionalPropertyTypes` in the root `tsconfig.json` | absent | `tsconfig.json` |
| Live sibling worktrees | `spec/21-rust-serde-backend`, `spec/23-python-pydantic-backend` | `git worktree list` |

## Review-pass disposition

| Finding | Disposition | Where |
|---|---|---|
| FND-1070 | Accepted | The finding is correct and the requirement is not narrowed for it. FR-068 and FR-069 do re-derive decision logic the oracle also carries, at zero permitted divergences, and shrinking either would buy a cheaper ticket by weakening the only evidence the backend has. What the pass added instead is the honesty apparatus this finding's own remedy asks for: FR-068's per-code derivation ledger (FR-068-AC-20, FR-068-AC-21) and FR-070's committed first-run divergence count (FR-070-CON-8, FR-070-AC-17), so the cost shows up as a measured number rather than as silent tuning. The staging recommendation — canonicalization first against all 111 `normalized` strings, then admissibility against the `invalid` cases, then codegen, then classification — is carried into issue #22's plan as its track structure rather than into the requirements. |
| FND-1071 | Acted on, and filed | FR-068 now states both rules explicitly — every registered admissibility code carries severity `error` and `blocking` true, and a diagnostic's `locus` is the nearest enclosing node's `origin.source` or a clause's `sourceSpan`, omitted where unusable — and records that neither appears in a published contract document, citing `agent-ix/filament-core-data#61`, which this review pass filed. The reading is declared rather than invented, which is the same posture the bundle takes on GAP-011. `agent-ix/filament-core-data#56` is cited beside it for the `sourceLocus` pattern's own defect. |
| FND-1072 | Acted on | Both disclosures were adopted. FR-068 requires a per-code derivation ledger recording, for each of the thirty codes, whether its rule was read from a published clause — naming the clause — or from the corpus's own register, with six stated obligations and FR-068-AC-20 and FR-068-AC-21 checking completeness. FR-070 requires the committed first-run divergence count and states why it is the only honest measure: after the first run every change is tuning. |
| FND-1073 | Acted on | FR-065-CON-4, FR-065-AC-12, FR-067-AC-11, FR-071's Behavior and FR-071-CON-7 and NFR-024-AC-12 all became the static reachable-symbol walk, and each records the measurement this analysis took. No dependency is added to either lockfile and the contradiction with NFR-025-AC-3 and AC-4 is gone. |
| FND-1074 | Acted on, and filed | Every absolute is gone from FR-070; the requirement states the slot delta read from the regenerated coverage account, FR-070-CON-7 and FR-070-AC-20 forbid a recurrence, and NFR-025-AC-15 asserts across the whole bundle that no criterion names a figure a sibling merge can falsify, rehearsed on a synthetic history in which a sibling lands first. The reconciliation across `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`, `src/compiler/inventory.json` and the `spec/tests.md` execution summary is `agent-ix/filament-core-data#63`. |
| FND-1075 | Acted on | FR-065-AC-22, FR-070's typecheck obligation and NFR-024-AC-11 now require **one** TypeScript program over every generated package, invoked through the compiler API, rather than one process per case, and the requirement says so rather than leaving the shape to the implementer. |
| FND-1076 | Acted on | FR-071 owns `test/fixtures/backends/typescript/tsconfig.json`, which sets `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` and `noUnusedParameters`, and owns the single root-`tsconfig.json` `exclude` entry that keeps the generated fixture and the must-not-compile fixtures out of `make lint`'s program. `tsconfig.json` joined NFR-025's permitted paths with that one edit named, and NFR-025-AC-13 asserts nothing else in it moved. |
| FND-1077 | Acted on | FR-069-AC-13's count was corrected to the 25 compatibility cases the corpus carries, and FR-069 now exports `MODELLED_CHANGES` as data with FR-069-CON-7 forbidding it from being narrowed to match the yardstick — so a backend modelling more change kinds than the oracle is a recorded dependency rather than a silent divergence. |
| FND-1078 | Acted on, and cited | FR-069 now ranks GAP-004 as the highest-volatility question, records that `normalized` is compared byte-for-byte on all 111 cases and feeds the fingerprint FR-067 stamps into every generated banner, and FR-069-CON-6 pins the thirteen `IDENTITY_SET_PATHS` and the key-ordering rule as declared data in one place so a later definition is a data edit. GAP ownership was corrected throughout: `agent-ix/filament-core-data#9` is closed, so the bundle cites the gap row plus `agent-ix/filament-core-data#59`. |
| FND-1079 | Acted on | FR-071 makes the self-computed archive listing — path, size, content digest — the stated default and `npm pack --dry-run --json` an optional cross-check, because `npm` reads ambient configuration this ecosystem points at a private registry. FR-071 also labels the committed generated package a regression baseline whose oracle is the FR-070 conformance run and the FR-066 differential check, and bounds the fixture IR to the smallest document exercising all eight kinds. |
