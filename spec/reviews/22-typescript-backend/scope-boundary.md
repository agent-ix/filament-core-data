---
id: SR-094
title: "Scope and boundary review of the TypeScript semantic codegen and validator backend"
type: SpecReview
analysis: scope-boundary
scope: "US-012, FR-063..071, NFR-024..025, spec/spec.md sections 2.1-2.2"
review_set: all
---
# Scope and boundary review

## Summary

Issue #22 owns one generation backend seam keyed on the published `target`
vocabulary (FR-063), a TypeScript projection of every IR `kind` (FR-064), an
ESM package with a closed file set and an empty external dependency closure
(FR-065), generated in-package runtime validators (FR-066), generated identity
and provenance metadata (FR-067), the backend's own IR admissibility reader and
declared-loss register (FR-068), its canonical form and IR-surface classifier
(FR-069), the `typescript-backend` conformance adapter (FR-070), and the
`generate` command with its committed fixtures (FR-071). NFR-024 fixes the
portability and determinism discipline; NFR-025 fixes the isolation discipline
with a permitted and a prohibited path list and a change range pinned at both
ends to history. It does not own the Rust or Python backends (#21, #23),
publication (#11), the `compiler-frontend` adapter (#52), or the contract
questions the corpus recorded as gaps (#9, #25).

The boundary is drawn well on the axis this program has been burned on most
often: the corpus, the oracle, the harness, the schemas, the fixtures, the spike
goldens and the frozen prototype backends are all read-only, `spec.md` §2.2 says
so in four bullets, and NFR-025 lists them path by path. The findings sit
elsewhere. Three are gate hygiene where the permitted list is *narrower* than
what FR-065 and FR-071 actually require, so the implementer meets a prohibition
mid-ticket and the temptation is to widen the list (FND-1080, FND-1081,
FND-1082). One is a genuine cross-branch hazard nobody owns: `coverage.json` is
machine-generated from the registry, three sibling branches each rewrite it, and
issue #20's TC-626 asserts it byte-for-byte against a live run (FND-1083). One
is an internal contradiction between two requirements' file sets (FND-1086).
The rest are allocation gaps — a published tarball that grows without the
manifest moving, a divergence register with no bound on its use, an
unstated converse of the seam's import ban, and three things §2.2 leaves open.

Acted on in the review pass: the two toolchain boundaries this analysis measured
— the root typecheck program reaching the committed fixture and the formatter
reaching it under a prohibited `biome.json` — were both closed by naming an
authoritative typecheck program and by making the generator's formatter this
repository's own pinned `biome`. The bundler contradiction was removed and the
three open doors in §2.2 were shut. The shared-artifact finding no single branch
can close was filed as `agent-ix/filament-core-data#63`. The per-finding record
is the disposition table at the end of this document.

## Boundary Allocation

Access is this ticket's, as NFR-025 declares it. "Read" means the artifact is an
input to a requirement and no byte of it moves.

| Artifact | Owner | This ticket's access | Note |
|---|---|---|---|
| `src/compiler/backends/seam.mjs`, `seam.d.mts` | #22 (FR-063) | write, new | The backend registry |
| `src/compiler/backends/targets.mjs`, `targets.d.mts` | #22 (FR-063) | write, new | Reads the `target` enum out of `common.schema.json` |
| `src/compiler/backends/typescript-v1/**` | #22 (FR-063..FR-071) | write, new | Fifteen modules and one `target-contract.json` |
| `src/compiler/backends/typescript.mjs`, `rust.mjs`, `type-names.mjs` | #27 (FR-042) | prohibited | Frozen prototype path; FR-042-CON-4 |
| `src/compiler/cli.mjs` | #19 (FR-052), extended by #22 (FR-071) | write, additive | One new verb; four existing verbs unchanged |
| `src/compiler/diagnostics.mjs` | #19 (FR-049) | write, additive | New `agent-ix.compiler.*` members only |
| `src/compiler/index.mjs`, `index.d.mts` | #19 (FR-052-CON-1) | prohibited | The narrow interface stays at fifteen symbols |
| `src/compiler/ir/**`, `compat/**`, `frontend/**`, `packages/**` | #19 | read-only | FR-068-CON-1 and FR-069-CON-1 forbid importing them |
| `src/compiler/inventory.json` | #27 (FR-040) | write, one clause | Discharges the TypeScript half of FR-042-CON-3 |
| `src/generated.ts`, `agent_ix_core_data/**` | Avro contract (#8) | prohibited | Unrelated published surface |
| `conformance/adapters/registry.json` | #20 (FR-037), row owned by #22 | write, one row | `status`, `command`, `rationale` |
| `conformance/adapters/typescript-backend/**` | #22 (FR-070) | write, new | The adapter process |
| `conformance/coverage.json` | #20 (FR-039), regenerated | write, generated | See FND-1083 |
| `conformance/divergences.json` | #20 (FR-037) | write, on divergence | See FND-1085 |
| `conformance/cases/**`, `bases/**`, `corpus.json`, `corpus.mjs` | #20 | prohibited | The yardstick |
| `conformance/oracle/**`, `runner/**`, `schema/**` | #20 | read-only | FR-070 imports `oracle/index.mjs` only |
| `conformance/thresholds.json`, `defects.json`, `contract-gaps.json`, `mutations.json`, `diagnostic-codes.json` | #20 | read-only | `diagnostic-codes.json` read by a test, not by `src/` |
| `schema/semantic/v1/**` | #9 | read-only | Contract authority |
| `fixtures/semantic/**`, `fixtures/semantic-core/**` | #9, #34, #35 | read-only | Includes the `typescript` target-contract row |
| `spikes/**` | #4, frozen by #27 | prohibited | Four committed goldens |
| `packages/semantic-core/**` | #35 | prohibited | The grammar |
| `docs/semantic-data-system/compiler-diagnostics.md` | Generated from `DIAGNOSTIC_CODES` | write, generated | Moves whenever a code is added |
| `docs/semantic-data-system/**` (everything else) | #8 | read-only | `contracts-v1.md` is FR-068's and FR-069's source |
| `package.json` | #11 gate | prohibited | Manifest fields and dependency blocks |
| `pnpm-lock.yaml`, `poetry.lock`, `pyproject.toml` | #11 gate | prohibited | No dependency added |
| `tsconfig.json`, `tsconfig.build.json`, `biome.json` | Repository | **unstated** | See FND-1080, FND-1081 |
| `test/**` | This ticket and prior ones | write | Suites and committed fixtures |
| `tests/**` | This ticket and prior ones | write | The Python half |
| `Makefile` | Shared | write, additive | Two new targets |
| `scripts/**` | #19 (FR-049, FR-051) | prohibited | `build-compiler-docs.mjs` is run, not edited |
| `spec/**`, `plan/**`, `reviews/**` | This ticket | write | The governed record |

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1080 | high | The committed generated fixture lands inside the root typecheck program, under compiler options that contradict the requirement it exists to prove. `tsconfig.json` sets `"include": ["src", "test", "scripts"]`, and `make lint` runs `tsc --noEmit -p tsconfig.json`, so every `.ts` file under `test/fixtures/backends/typescript/` is compiled by the repository's own program. That program does **not** set `exactOptionalPropertyTypes`, which FR-065 and FR-071 both name as the option that makes the absent-versus-`undefined` distinction real; FR-065's Outputs add a nested `test/fixtures/backends/typescript/tsconfig.json`, but a nested config governs nothing when the root config is the one `-p` names. Worse, FR-071 requires four **negative** type-level fixtures — a value read outside the successful branch, an unhandled union residue, a fourth optional/null form, and a removed export — each of which "fails to compile" by design. Placed under `test/`, each one turns `make lint` red. Neither requirement says where a deliberately-failing fixture lives or how its expected failure is asserted, and `tsconfig.json` is not in NFR-025's permitted list, so the implementer cannot exclude them without breaching the gate. | FR-065 Outputs, FR-065 Behavior ("Provenance and typechecking"), FR-071 Behavior ("The committed fixtures"), NFR-024-AC-11, NFR-025 Scope, `tsconfig.json`, `package.json` `scripts.lint` |
| FND-1081 | high | `biome.json` is prohibited, and the committed generated fixture must be formatted by a formatter that did not generate it. `make lint` runs `biome format .` over `"includes": ["**", …]` with four explicit exclusions, two of which (`test/fixtures/compiler/evolution/**`, `test/fixtures/compiler/compatibility/cases/**`) exist precisely because committed generated artefacts do not survive a formatter. FR-071 commits "the full expected generated package" under `test/fixtures/backends/typescript/`, and FR-065 fixes its bytes by a determinism requirement — so either the backend's emitted bytes happen to be byte-identical to biome's output for every construct, or `make lint` fails. Making the generator emit biome-formatted text is a real design obligation that no requirement states; excluding the path needs an edit to `biome.json`, which appears in neither NFR-025's permitted nor its prohibited list and so falls under "every other path" as prohibited. | FR-071 Behavior ("The committed fixtures"), FR-065 Behavior, NFR-024-AC-1, NFR-025 Scope, `biome.json`, `package.json` `scripts.lint` |
| FND-1082 | high | The tree-shaking and bundle-surface obligations depend on a bundler this repository cannot resolve, and adding one is prohibited. FR-065-CON-4 permits only "a bundler already pinned in this repository's lockfile" and forbids adding a dependency; NFR-025-AC-4 requires both lockfiles byte-unchanged. `esbuild@0.21.5`, `rollup@4.62.2` and `vite@5.4.21` are present in the pnpm store only as transitive dependencies of `vitest`, and neither `require.resolve("esbuild")` nor `require.resolve("rollup")` succeeds from the repository root under pnpm's strict layout. So FR-065's tree-shaking criterion, FR-065-AC on bundle surface, FR-071's bundle-surface record, and NFR-024-AC-12 rest on reaching into `node_modules/.pnpm/**` by path — an undeclared dependency on vitest's private closure that a vitest bump silently breaks. Either the measurement needs a definition that does not require a bundler, or the ticket needs a devDependency its own NFR forbids. | FR-065-CON-4, FR-065 Behavior ("Tree-shaking and loss"), FR-071 Behavior, NFR-024-AC-12, NFR-025-AC-4, `package.json` `devDependencies` |
| FND-1083 | high | `conformance/coverage.json` is a shared generated artifact that three sibling branches each rewrite, and issue #20's gate asserts it against a live run. `conformance/runner/differential.mjs` spawns every registry row that carries a `command`, `buildCoverage` records a per-adapter `{status, matched, unmet, failed}` row for all four slots, and TC-626 asserts `renderCoverage(run().coverage)` equals the committed bytes. Today every row reads `unavailable / 0 / 111 / 0` and `unmetCases` is 444. When issue #22 flips its row, the committed file must record #22's answers *and* the three still-unavailable rows; when #21 or #23 lands, the same file must record theirs. Whichever of #21, #22, #23 merges second produces a trunk whose committed `coverage.json` matches no run, and TC-626 goes red on `main` for a ticket that did nothing wrong — the merge-degradation family this program has now hit four times, in a fifth disguise. NFR-025 permits the path and says nothing about the hazard; no requirement in the bundle, and nothing in `spec.md` §2.2, allocates the reconciliation. | FR-070 Behavior (coverage regeneration), NFR-025 Scope, `conformance/runner/differential.mjs`, `test/conformance-corpus.test.ts` TC-626, TC-632, TC-634, `conformance/coverage.json` |
| FND-1084 | medium | Issue #20's suite acquires a runtime dependency on issue #22's adapter without either bundle saying so. Once the `typescript-backend` row carries a `command`, `run()` executes that process — and `test/conformance-corpus.test.ts` calls `run()` in TC-626, three times in TC-632, and again in a subprocess in TC-634. Issue #20's gate therefore executes issue #22's backend over 111 cases on every `make test`, and a slow, crashing, or non-deterministic adapter fails a suite that belongs to another ticket. TC-643 additionally walks every `.mjs` under `conformance/` asserting it contains no publish command, so issue #20's tree-half gate now ranges over a file issue #22 authored. The direction of the dependency is the right one — the adapter imports `src/`, `src/` imports nothing from `conformance/` (FR-068-CON-2 makes the code-register agreement a test rather than an import) — but the runtime coupling and its cost are unstated. | FR-070 Behavior, `test/conformance-corpus.test.ts` TC-626, TC-632, TC-634, TC-643, `conformance/runner/differential.mjs` `runAdapter` |
| FND-1085 | medium | `conformance/divergences.json` is permitted with no bound on its use, which makes "record, never absorb" enforceable only by good intent. FR-070 requires a disagreement to be registered with an owner, a verdict and a review date rather than resolved by editing the corpus, and FR-070-CON-3 repeats it. But `conformance/thresholds.json` sets `permittedDivergences: 0` for this adapter and is prohibited from moving, while the harness counts a case whose every problem is suppressed as **matched**. So a registered divergence with a distant `reviewBy` converts a failing case into a passing one, and nothing in the bundle caps how many entries this ticket may add, requires a divergence to be counted against the threshold, or says who other than the author assigns the verdict. SR-054 FND-831 recorded the unallocated-arbitration half of this against issue #20; the consuming half arrives here and is still unallocated. | FR-070 Behavior, FR-070-CON-3, `conformance/thresholds.json`, `conformance/runner/differential.mjs` (suppression counts as matched), SR-054 FND-831 |
| FND-1086 | medium | FR-065 and FR-066 disagree about the generated file set. FR-065 states the emitted set "SHALL be exactly `package.json`, `index.ts`, `types.ts`, `validators.ts`, `identity.ts`, `metadata.ts`, and `LICENSE`", declares that set closed, and gives the generated `exports` map subpath entries for exactly `types`, `validators`, `identity`, and `metadata`. FR-066's Outputs name an eighth generated module, "its generated `errors.ts` carrying the closed structural-code list", and FR-066-CON-5 requires that list to be generated into the package. One of the two is wrong: either the file set is eight and the `exports` map needs a fifth subpath, or the structural codes live inside `validators.ts`. As written, a conforming implementation of FR-066 violates FR-065's closed-set obligation. | FR-065 Behavior ("The file set", "The package manifest"), FR-066 Outputs, FR-066-CON-5 |
| FND-1087 | medium | The published tarball grows while every manifest metric reads zero. NFR-025 measures "changes to `package.json` `exports`, `main`, `module`, `types`, `files`" at zero and NFR-025-AC-8 asserts `npm pack --dry-run` "lists no generated-package file". Both hold — and both miss the actual movement. `package.json` `files` already contains `src/`, and `npm pack --dry-run` over this repository today lists 159 files of which 72 are under `src/`; the ticket adds roughly fifteen modules plus `target-contract.json` under `src/compiler/backends/typescript-v1/` straight into that tarball. `src/compiler/inventory.json`'s `shipping` note already declares that `src/compiler/**` ships as source only, so this is consistent rather than contradictory — but no requirement bounds it, no metric observes it, and the ticket's own AC is phrased so that it cannot. The committed fixture is safe (`test/` is not in `files`), which is worth stating positively where a reader will find it. | NFR-025 Measurement, NFR-025-AC-8, `package.json` `files`, `src/compiler/inventory.json` `shipping` |
| FND-1088 | low | The seam's import ban is stated in one direction only. FR-063 requires the seam to import no module under `src/compiler/frontend/`, "so no frontend can influence what a backend emits", and FR-063-AC-12 asserts it over `src/compiler/backends/`. The converse — that no module under `src/compiler/frontend/` may import a backend — is nowhere stated, and it is the direction that actually matters for the property being claimed: a frontend reaching into a backend is how target-specific behaviour leaks into lowering. The asserted check is also narrower than the prose: it inspects `backends/`, so the converse is not merely unstated but unmeasured. | FR-063 Behavior ("The backend contract"), FR-063-AC-12, FR-045 (the frontend seam) |
| FND-1089 | low | §2.2 does real work on four axes and leaves three open. It forbids publishing the generated package, generating a Rust or Python package, editing the corpus, deciding GAP-011, and rewriting the frozen prototype — each of which a reasonable implementer might otherwise do, so the section is not decoration. Three gaps remain. First, nothing forbids **adding a devDependency**; the prohibition lives only in NFR-025's metric table, and FND-1082 shows the ticket has a live motive to add one. Second, nothing bounds **registering a divergence** as an alternative to fixing the backend (FND-1085). Third, nothing forbids **declaring a construct `unsupported` or narrowing `supportedFeatures`** so that a case the backend cannot answer stops being its problem — FR-070 forbids adding `unsupportedBy` to a case, but `supportedFeatures` is the backend's own declaration and is unbounded. | `spec.md` §2.2, NFR-025 Measurement, FR-063 (`supportedFeatures`), FR-070 Behavior |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `schema/semantic/v1/semantic-ir.schema.json`, `common.schema.json` | Contract authority read by FR-063, FR-064, FR-068 | Guaranteed | Merged, frozen for this ticket by NFR-025 |
| `compiler-request.schema.json`, `output-manifest.schema.json`, `target-contract.schema.json` | The backend interface, already published and unimplemented | Guaranteed | FR-063 implements all three |
| `fixtures/semantic/v1/positive/target-contracts.json` `typescript` row | The qualification this backend must satisfy | Guaranteed | FR-063 Behavior; read, never edited |
| `docs/semantic-data-system/contracts-v1.md` | Prose contract from which FR-068 and FR-069 are implemented | Guaranteed, but **provisional** on issue #9 | Cited by FR-068, FR-069; its `status: provisional` is not acknowledged in either requirement |
| `conformance/oracle/index.mjs` import API | The adapter's only permitted route into the corpus | Guaranteed | FR-070 Behavior; `loadCorpus`, `loadCase`, `buildInput`, `buildBefore` |
| `conformance/diagnostic-codes.json` | Code vocabulary the backend's register must match | Guaranteed | FR-068-CON-2, asserted by a test, not imported |
| `conformance/thresholds.json` `typescript-backend` row | Promotion policy set by #20, prohibited from moving here | Guaranteed | 1.0 coverage, 1.0 pass rate, 0 divergences, 1.0 mutation score |
| GAP-011 (`reference` target resolution) | Open contract question | **Assumed** — issue #9 | FR-068 `REFERENCE_POLICY`; corpus cases REF-001..004 pin the other reading |
| GAP-003, GAP-004, GAP-006 | Open contract questions cited by FR-068 and FR-069 | **Assumed** — issue #9 | Cited, not resolved |
| GAP-010 (unknown-policy tightening direction) | Open contract question cited by FR-069 | **Assumed** — issue #25 | Cited, not resolved |
| Issue #52 `compiler-frontend` adapter | Sibling slot, stays `unavailable` | **Assumed** — issue #52 | Out of scope by `spec.md` §2.2; recorded as a coverage gap |
| Issues #21 and #23 | Concurrent branches on the same shared artifacts | **Assumed** — no coordination stated | FND-1083, FND-1084 |
| Issue #11 publication gate behind `agent-ix/quoin#290` | Downstream consumer of this evidence | Guaranteed closed | `spec.md` §2.2, NFR-025 Rationale |
| A bundler for the tree-shaking measurement | Toolchain | **Assumed and absent** | FND-1082 |
| `tsc` under `strict` + `exactOptionalPropertyTypes` | Toolchain for the type-level evidence | **Assumed, config unstated** | FND-1080 |
| `biome format` over the committed fixture | Toolchain gate | **Assumed, exclusion unstated** | FND-1081 |

The one boundary that matters most is held. Nothing in issue #22 edits the
corpus that judges it, the schemas it is measured against, the spike goldens, or
the frozen prototype backends; `spec.md` §2.2 says so and NFR-025 lists every
path. The dependency between `src/` and `conformance/` runs in the correct
direction and only once, through a declared import API, with the code-register
agreement expressed as a test rather than an import. The three high findings are
all the same shape from different sides: NFR-025's permitted list was written
from the requirements' *outputs* rather than from the repository's *gates*, so
`tsconfig.json`, `biome.json`, and a bundler dependency are each needed by a
requirement and prohibited by the constraint. That is the under-broad half of
the accretion defect issue #55 records, and the right repair is to settle each
one deliberately now — by moving the fixture out of the typechecked and
formatted tree, or by naming the config edit in the permitted list with a
rationale — rather than to widen the list when the implementation meets it.
FND-1083 is the one finding no edit to this bundle can close on its own: it
needs a decision between the three sibling branches about who regenerates
`conformance/coverage.json` and when.

## Review-pass disposition

| Finding | Disposition | Where |
|---|---|---|
| FND-1080 | Acted on | FR-071 owns `test/fixtures/backends/typescript/tsconfig.json` — the authoritative program, setting `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` and `noUnusedParameters` — and owns one edit to the root `tsconfig.json` adding `test/fixtures/backends/typescript` to its `exclude`. `tsconfig.json` joined NFR-025's permitted-path list with that single edit named, and NFR-025-AC-13 asserts every other member is byte-identical between the range's endpoints. The must-not-compile fixtures are checked by a separate invocation that asserts expected diagnostic codes. |
| FND-1081 | Acted on | `biome.json` stays prohibited and is not edited. Instead FR-071 owns `src/compiler/backends/format.mjs`, which renders generated text through this repository's exactly-pinned `@biomejs/biome` binary, as `conformance/tools/format-json.mjs` already does for JSON; FR-063 passes every emitted file through the injected `options.format` before computing its digest. Because the formatter is the repository's own, `biome format .` over the committed fixture is a no-op by construction, and NFR-024-AC-13 asserts it. |
| FND-1082 | Acted on | The bundler requirement is gone. FR-065-CON-4 states the static reachable-symbol walk and records the same measurement this review took; FR-065-AC-12, FR-067-AC-11, FR-071-CON-7 and NFR-024-AC-12 follow. Neither lockfile changes and the contradiction with NFR-025-AC-3 and AC-4 is closed. |
| FND-1083 | Filed | Correct that no edit to this bundle alone can close it. `agent-ix/filament-core-data#63` owns the reconciliation across `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`, `src/compiler/inventory.json` and the `spec/tests.md` execution summary, including whether `coverage.json` should be committed at all. What this bundle did do is remove every criterion of its own that depends on merge order: FR-070 states the slot delta, FR-070-CON-7 and FR-070-AC-20 forbid an absolute, NFR-025-AC-15 generalises it, and NFR-025's Rationale states that the shared artifacts are regenerated from the rebased tree rather than merged. |
| FND-1084 | Acted on | FR-070 now states that issue #20's suite spawns this adapter as a process once the slot is `available`, that the adapter is reached only through the declared import API of `conformance/oracle/index.mjs`, and that the dependency runs one way — `conformance/adapters/typescript-backend/` imports from `src/`, and no module under `src/` reads a file under `conformance/`, with the code-register agreement expressed as a test rather than an import. |
| FND-1085 | Acted on | `conformance/divergences.json` moved from NFR-025's permitted list to its **prohibited** list, and NFR-025's Rationale states the reason: a registered divergence converts a failing case into a matched one, so a permission to register divergences is a permission to pass. FR-070-CON-8 states that this work registers none, and NFR-025-AC-12 and FR-070-AC-18 assert the file byte-unchanged. A disagreement this work cannot close is reported in the pull request and left failing for the owner. |
| FND-1086 | Acted on | The emitted file set is eight, `errors.ts` included with its own `exports` subpath, stated identically in FR-065 and FR-066. |
| FND-1087 | Acted on | NFR-025-AC-14 was added and states it plainly: the modules this change adds under `src/compiler/` do appear in `npm pack --dry-run` because `package.json` `files` already carries `src/`, they ship as source with no runtime entry point, no `exports` entry and no dependency — which is what `src/compiler/inventory.json` already records for every module under that directory — and no generated package and no file under `test/fixtures/` appears in that listing. The metric that read zero now has a criterion beside it that can see the growth. |
| FND-1088 | Accepted | The direction this requirement can enforce is the one it states: FR-063 forbids the seam importing any module under `src/compiler/frontend/`, and FR-063-AC-12 asserts it. Constraining what a *frontend* may import is FR-045's subject, not this seam's, and adding a converse assertion here would put an obligation on a requirement this ticket does not own. Recorded rather than added. |
| FND-1089 | Acted on | `spec/spec.md` §2.2 gained four exclusions in this pass, closing the three doors this finding named and one more: adding a dependency to `package.json`, either lockfile or `pyproject.toml` — including a bundler, a property-test generator or a runtime validator; registering a divergence in `conformance/divergences.json`; narrowing a backend's declared `supportedFeatures` or declaring a corpus case `unsupportedBy` this backend to reduce the set of cases it must answer; and accepting a `conformance/thresholds.json` row, which stays `proposed` until the issue #11 publication gate acts on it. |
