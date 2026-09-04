---
id: SR-103
title: "Scope and boundary review of the qualified Python generation route"
type: SpecReview
analysis: scope-boundary
scope: "US-013, FR-072..FR-080, NFR-026, NFR-027, TC-845..TC-944, spec/spec.md sections 2.1-2.2"
review_set: all
---
# Scope and boundary review

## Summary

Issue #23 owns the Python generation route around an upstream generator it does
not own: the pinned toolchain and its advisory floor (FR-072), five immutable
per-family target profiles (FR-073), an additive schema-preparation pass on top
of the merged `normalizeJsonSchemaForPython` (FR-074), two refusal guards and a
closed refusal register (FR-075), a sandboxed subprocess runner (FR-076), a
per-family qualification with verdicts and a retained-gap register (FR-077), a
non-executing generated-source inspection (FR-078), an unpublished package
layout with provenance and examples (FR-079), and static plus runtime
verification of every generated surface (FR-080). NFR-026 fixes the security
discipline and NFR-027 the reproducibility and non-disruption discipline, both
over the same permitted and prohibited path lists. It does not own the
`datamodel-code-generator` itself, the conformance corpus (issue #20), the
`python-backend` adapter slot (issue #52, blocked on GAP-011), publication
(issue #11), consumer migration, or the Rust and TypeScript backends (issues
#21, #22); `spec.md` section 2.2 says so in three bullets and US-013's
constraints repeat them.

The outward boundary is drawn well. FR-076-CON-1 places the runner outside
`src/compiler/` for exactly the right reason, FR-074-CON-3 and FR-074-AC-10 pin
FR-043's byte-golden, FR-077-CON-3 and FR-077-AC-10 keep the corpus unedited,
and FR-079's four publication criteria and NFR-027-AC-5/AC-10 hold the issue #11
gate. The findings sit on three other edges. The first is the seam this ticket
invents inside itself: the Node adapter and the Python runner are declared as
two halves with no stated call direction, no entry point, and one obligation
(FR-076's "call `assertSchemaSafe` before it spawns anything") that the language
split makes unsatisfiable as written. The second is execution: every gate this
bundle adds on the Python side has no declared path into `make test` or CI,
because the two files that would wire it are prohibited. The third is the
permitted and prohibited lists themselves, which are internally inconsistent,
do not reach the trees FR-077 and FR-079 create, and silently require this
ticket to extend three earlier tickets' merged allow-lists. None of the
findings moves work into or out of issue #23 by itself.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1166 | high | The Node adapter and the Python runner are two halves with no declared call direction, and one obligation is unsatisfiable as written. FR-073 puts `loadProfiles`, `profileById` and `profileDigest` in `python_backend/adapter/profiles.mjs`, FR-074 puts `prepareForPython` in `prepare.mjs`, and FR-075 puts `assertSchemaSafe` and `assertArgvSafe` in `guard.mjs` — all Node ESM. FR-076 puts `generate(schema, profile_id, out_dir)` in `python_backend/runner/generate.py` and requires that the runner "SHALL call `assertSchemaSafe` and `assertArgvSafe` from FR-075 before it spawns anything". A Python function cannot call a Node module without spawning `node`, so either the runner spawns before its own no-spawn precondition (contradicting FR-076-AC-3's instrumented spawn counter reading zero on a refusal), or the guards run on the Node side and the runner is not the caller — in which case no requirement names the component that orchestrates prepare → guard → generate → inspect → emit, and none says who parses `profiles.json` or computes the digest that FR-073 requires the runner to record with every result. The same split reappears in FR-076's Outputs, which make the `GenerationResult` carry the `preparation` record produced on the Node side, and in FR-078, whose Python `inspect_generated(files, schema)` must attribute annotations to pointers of a document the Node pass rewrote. | FR-073 Outputs, FR-074 Outputs, FR-075 Outputs, FR-076 Behavior (first bullet), FR-076 Outputs, FR-076-AC-3, FR-076-CON-2, FR-078 Outputs, TC-883, TC-885 |
| FND-1167 | high | The pinned generator version has three records and no stated authority, and the bump procedure crosses two paths this ticket may not change. FR-072 creates `python_backend/toolchain.json` recording `0.76.0` and `2.12.5`. FR-043 already exports those two values from `src/compiler/backends/python-pins.mjs`, which NFR-026 lists as prohibited, and FR-043-AC-7 already binds them to `spikes/typespec-feasibility/evidence/toolchain.json`, which is prohibited here and frozen by issue #27's retained-evidence guards. FR-072-AC-8 requires all of them to agree, so the record is consistent — but FR-072-CON-2 requires a version bump to "update `toolchain.json`, re-run the qualification, and restate every per-family verdict", and a bump that leaves `python-pins.mjs` and the frozen spike evidence behind fails FR-072-AC-8 and FR-043-AC-7 while a bump that changes them is prohibited by NFR-026. No requirement says which record is authoritative after this ticket, or which ticket owns a future bump. | FR-072 Behavior, FR-072-AC-8, FR-072-CON-2, FR-043-AC-7, FR-043 Outputs, NFR-026 Scope (prohibited), NFR-027-AC-4, TC-852 |
| FND-1168 | high | FR-077's conformance-corpus obligation is issue #52's work, and the reciprocal obligation issue #20 wrote for this ticket is never accepted. FR-077 Inputs name "the conformance corpus of FR-035 and its `python-backend` adapter slot" and FR-077 Behavior requires the qualification to "run the conformance corpus against the generated Python surface where the `python-backend` adapter slot is available". US-013's Context and `spec.md` 2.2 both state that wiring that slot is issue #52 and blocked on GAP-011, and FR-077-CON-3 plus NFR-026 forbid touching `conformance/**` — where the adapter and its registry command would live. The behavior is therefore unreachable for the whole of this ticket, and FR-077-AC-9's account degenerates to zero rows run and every row unmet. Meanwhile FR-037-CON-1 and FR-037-CON-2 (merged) require the `python-backend` adapter to be startable as a process by a registry command and to emit an `adapter-result.schema.json` document; nothing in FR-072..FR-080 obliges this ticket to expose either, so the seam SR-054 FND-829 recorded as owner-less on both sides is still owner-less on both sides. | FR-077 Inputs, FR-077 Behavior (corpus bullet), FR-077-AC-9, FR-077-CON-3/CON-4, FR-037-CON-1, FR-037-CON-2, US-013 Context, `spec.md` 2.2, TC-905 |
| FND-1169 | high | The bundle both forbids and requires executing generated code, and never orders the two. NFR-026's Statement requires the generated source to be inspected "without executing it", its Rationale says importing a module to check whether it is safe runs it first, its metric table sets "Generated modules imported or executed by the inspection" to zero, and FR-078-CON-3 and FR-078-AC-7 instrument the import machinery to prove it. FR-079-AC-2 then requires every generated package to "import cleanly under the pinned interpreter", FR-079-AC-5 and FR-080-AC-3/AC-4 construct values through the generated models, and FR-080-AC-9 executes a deliberately weakened generated model. Both positions are defensible — inspect before you trust, then run what you have inspected — but no requirement states that the FR-078 inspection is a precondition of the FR-079 import, no requirement says what happens when FR-078 passes and the import still executes schema-derived code, and NFR-026's zero-execution metric is written over the whole change rather than over the inspection alone. The decision to run generated code in the test interpreter is real and is allocated to nobody. | NFR-026 Statement, NFR-026 Rationale, NFR-026 Measurement, NFR-026-AC-5, FR-078-CON-3, FR-078-AC-7, FR-079-AC-2, FR-079-AC-5, FR-080-AC-3, FR-080-AC-9, TC-937, TC-938 |
| FND-1170 | high | The Python half of this ticket's gates has no declared execution path, and the two files that would give it one are prohibited. `make test` delegates to `pnpm run test` (vitest) and `make lint` to `pnpm run lint`, which is where every existing `--check` regeneration gate is wired, through `scripts/*.mjs` entries in the `package.json` `scripts` block. NFR-026 prohibits `package.json` outright and `.github/**`, and its permitted list names neither `scripts/**` nor any pytest target; the Makefile is permitted but has no Python test target at all. Yet FR-072's advisory gate, FR-076's runner, FR-078's inspection, FR-080's `mypy` and runtime validation, NFR-026-AC-1's malicious-schema corpus, and NFR-027-AC-3's report `--check` are all Python-side or `--check`-shaped, and NFR-026-AC-8 and FR-080-AC-8 require every one of them to run rather than skip. Which target runs them, and whether CI runs them at all, is unstated. The interaction with `pyproject.toml`'s existing `testpaths = ["tests"]` and `filterwarnings = ["error"]` — the latter turning FR-076's allow-listed generator warnings into unconditional failures — is likewise unallocated, although `pyproject.toml` is at least permitted. | NFR-026 Scope (permitted, prohibited), NFR-026-AC-8, FR-072-AC-5, FR-076-AC-11, FR-080-AC-7, FR-080-AC-8, FR-080-CON-2, NFR-027-AC-3, `Makefile`, `package.json` `scripts`, `pyproject.toml` `[tool.pytest.ini_options]`, TC-939 |
| FND-1171 | high | This ticket must extend three earlier tickets' merged allow-lists, and no requirement says so. `test/semantic-contract.test.ts` (issue #9), `test/semantic-core.test.ts` (issue #35), and `test/semantic-ir-v1-1.test.ts` (issue #34) each compute their change set with `changedPathsFrom(root, "origin/main")` — a moving baseline — and assert every changed path against an enumerated cumulative allow-list. None of those lists names `python_backend/`, so this branch turns three merged gates red until it extends them, which is exactly the convention NFR-016 states ("the cumulative changed-path allow-lists that the earlier tickets' gates carry in `test/*.test.ts`, which every ticket extends"). NFR-026 and NFR-027 never mention the obligation; `test/**` is permitted, so the edit is allowed but unallocated, and NFR-027-AC-6's "every guard this change adds" does not reach a guard this change only amends. The same three lists, plus `Makefile` and `biome.json`, are contended by the in-flight issue #21 and issue #22 branches, and nothing sequences them. | NFR-026 Scope (permitted `test/**`), NFR-027-AC-4, NFR-027-AC-6, NFR-016 Scope, `test/semantic-contract.test.ts` TC-195..198, `test/semantic-core.test.ts` TC-275, `test/semantic-ir-v1-1.test.ts`, `test/changed-paths.ts`, TC-942 |
| FND-1172 | medium | NFR-026 and NFR-027 gate the same path set with two different rules, and a third category of paths passes one and fails the other. NFR-026-AC-9 is a deny-list check ("No path this branch changes falls under the prohibited list") and NFR-027-AC-4 is an allow-list check ("No path this branch changes falls outside the permitted list"), while NFR-027's Scope says its lists are "as NFR-026". The two are not equivalent: `tsconfig.json`, `tsconfig.build.json`, `scripts/**`, `docs/**`, `README.md`, and `.gitignore` appear on neither list, so each is permitted by NFR-026-AC-9 and forbidden by NFR-027-AC-4. TC-939 and TC-942 encode the two checks separately, so the disagreement reaches the test suite rather than being resolved in the spec. NFR-016 and NFR-019 both state the deny-list gloss explicitly ("meaning this branch changes no byte of them"); NFR-026's Scope omits it, leaving the prohibition on `src/compiler/**` and `schema/**` ambiguous between "changes no byte" and "does not read", which FR-074 and FR-077 must both do. | NFR-026 Scope, NFR-026-AC-9, NFR-027 Scope, NFR-027-AC-4, NFR-016 Scope, NFR-019 Scope, TC-939, TC-942 |
| FND-1173 | medium | NFR-026's security discipline does not formally reach the trees FR-077 and FR-079 create. Its "Applies to" names `python_backend/adapter/**`, `python_backend/runner/**`, `profiles.json`, `refusals.json`, and the dependency group; it omits `python_backend/qualification/**`, `python_backend/generated/**`, and `python_backend/examples/**`, which are precisely the generated and generated-adjacent artefacts the import allow-list, the module-level-statement rule, and the non-execution rule exist to govern. NFR-027's "Applies to" is `python_backend/**` and so does cover them. A reader asking whether NFR-026-AC-6's import allow-list binds the committed `generated/` tree, or only the file map inside a run, gets two different answers depending on which requirement is consulted. | NFR-026 Scope (applies to), NFR-026-AC-5, NFR-026-AC-6, NFR-027 Scope, FR-077 Outputs, FR-079 Outputs |
| FND-1174 | medium | The promotion thresholds issue #20 wrote for this ticket and the verdicts this ticket produces are two vocabularies with nothing binding them. FR-039 requires `thresholds.json` to declare, for issue #23, the required construct-register coverage, corpus pass rate, permitted divergence count, and mutation-detection score, "each with the issue that owns it", and to declare them before the backend is promoted. FR-077 produces `qualified`, `qualified-with-conditions`, and `not-qualified` per family, computed from its own probe corpus. No requirement in FR-072..FR-080 mentions `thresholds.json`, no requirement says whether a `qualified` verdict satisfies a threshold row or is independent of it, and with the corpus adapter unavailable (FND-1168) the corpus pass rate and mutation score cannot be measured here at all. SR-054 FND-830 recorded this from the other side; it is still unreciprocated. | FR-039 Behavior (thresholds), FR-039-AC-2, FR-077 Behavior (verdicts), FR-077 Outputs, SR-054 FND-830, `spec.md` 2.2 |
| FND-1175 | medium | Authority over the generated Python package's shape is split between merged contracts and this ticket. FR-005 defines the generated-package contract and FR-024 the generated-target contracts, and FR-079 lists FR-024 as an Input — then declares its own layout independently: one package per profile, one module per input document, a sorted `__all__`, a `PROVENANCE.json` field set, and a SHA-256 content fingerprint over the file map in canonical order. No requirement states that FR-079's layout conforms to FR-024's target contract, which fields of `PROVENANCE.json` are the contract's and which are this ticket's, or whether the fingerprint is the FR-021 v1 fingerprint canonicalization or a new one. Issue #11 inherits whichever definition survives, and `python_backend/generated/` is explicitly outside every published manifest, so the divergence would not be caught by any packaging gate here. | FR-079 Inputs, FR-079 Behavior, FR-079-AC-3, FR-079-AC-9, FR-024, FR-005, FR-021 (fingerprint canonicalization), TC-919, TC-925 |
| FND-1176 | low | "Upstream fixes are preferred" is an allocation the requirements do not carry. Issue #23's deliverables say the repository implements "only a thin deterministic AGPL pre/post-processing adapter for retained gaps; upstream fixes are preferred", and FR-077 requires a register row to "name the upstream issue or the reviewed decision it awaits" only where a schema rewrite *cannot* close a gap. FR-074's `unevaluatedProperties` rewrite is the opposite case — a gap the owned pass does close, caused by the pinned generator not reading a 2019-09 keyword — and nothing obliges anyone to report it upstream, to record that it was reported, or to retire the owned rewrite when a later version fixes it. The adapter therefore accretes without a stated exit. | FR-074 Behavior, FR-077 Behavior (gap register), FR-077-CON-1, US-013 Options, issue #23 Deliverables |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| Toolchain pinning, advisory floor, licence assertion (FR-072) | filament-core-data issue #23 | cross-cutting |
| Immutable per-family target profiles and profile digests (FR-073) | filament-core-data issue #23, Node adapter | core |
| Additive schema preparation on top of `normalizeJsonSchemaForPython` (FR-074) | filament-core-data issue #23, Node adapter | core |
| Schema and argument-vector refusal guards, refusal register (FR-075) | filament-core-data issue #23, Node adapter | cross-cutting |
| Sandboxed subprocess runner, scratch root, limits, fingerprint (FR-076) | filament-core-data issue #23, Python runner | infrastructure |
| Per-family qualification, probes, verdicts, retained-gap register (FR-077) | filament-core-data issue #23 | core |
| Non-executing generated-source inspection (FR-078) | filament-core-data issue #23, Python runner | cross-cutting |
| Package layout, provenance, examples, content fingerprint (FR-079) | filament-core-data issue #23 | core |
| Static type checking and runtime validation of generated surfaces (FR-080) | filament-core-data issue #23 | cross-cutting |
| Sandbox, advisory, and refusal discipline (NFR-026) | filament-core-data issue #23 | cross-cutting |
| Reproducibility, changed-path, and non-publication discipline (NFR-027) | filament-core-data issue #23 | cross-cutting |
| Orchestration across the Node adapter and the Python runner; the generation entry point | Unallocated, see FND-1166 | core |
| `profiles.json` parsing and digest computation on the runner side | Unallocated, see FND-1166 | core |
| Authoritative record of the pinned generator and Pydantic versions after this ticket | Split across FR-043's `python-pins.mjs`, the frozen spike evidence, and FR-072's `toolchain.json`, see FND-1167 | infrastructure |
| Future generator version bumps | Unallocated; FR-072-CON-2 requires edits to prohibited paths, see FND-1167 | infrastructure |
| `conformance/adapters/python-backend/**`, its registry command, and `adapter-result.schema.json` emission | Issue #52, blocked on GAP-011; no reciprocal obligation accepted here, see FND-1168 | external to this ticket |
| Ordering of the FR-078 inspection against the FR-079 and FR-080 imports of generated code | Unallocated, see FND-1169 | cross-cutting |
| Execution path for this ticket's Python-side and `--check` gates (`make`, CI) | Unallocated; `package.json` and `.github/**` prohibited, `scripts/**` not permitted, see FND-1170 | infrastructure |
| Extension of the issue #9, #34, and #35 cumulative changed-path allow-lists | Required by those merged gates, unstated here, see FND-1171 | cross-cutting |
| Sequencing of `test/*.test.ts` allow-list, `Makefile`, and `biome.json` edits against issues #21 and #22 | Unallocated, see FND-1171 | cross-cutting |
| Promotion thresholds for the Python backend | Declared by FR-039 (issue #20), unreferenced here, see FND-1174 | external to this ticket |
| Generated Python package shape as a contract | FR-005 and FR-024, restated by FR-079, see FND-1175 | core, prior ticket |
| Reporting a closed gap upstream and retiring the owned rewrite | Unallocated, see FND-1176 | cross-cutting |
| `normalizeJsonSchemaForPython`, its byte-golden, and the three-key forbidden set | filament-core-data FR-043 (issue #27), frozen for #23 | core, prior ticket |
| The conformance corpus, oracle, harness, coverage account | filament-core-data issue #20, prohibited for #23 | external |
| Rust and TypeScript generation backends | Issues #21 and #22 | external |
| Compiler frontend, IR, packages, locks, diagnostics | Issue #19 | external |
| PyPI publication, npm publication, published-surface enlargement, consumer migration | Issue #11 and the issue #23 safety gate | external |
| `datamodel-code-generator` behaviour, its option surface, its advisories | Upstream (MIT), pinned and attributed | external |
| Pydantic, msgspec, `mypy`, `black`, `isort` behaviour | Upstream, pinned | external |
| Frozen TypeSpec spike and its retained evidence | Issues #4, #27, #42; prohibited for #23 | external |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `datamodel-code-generator` `0.76.0` | Code generator invoked as a subprocess | Guaranteed | FR-072-AC-1 version and licence assertion, FR-072-AC-3/AC-4 advisory gate, FR-076-AC-9 entry-point resolution, FR-075-AC-2 register keys asserted against the installed distribution |
| GHSA-386q-5hp3-95m9 and GHSA-5578-w22f-pfx9 | Published advisories fixing the floor | Guaranteed | FR-072-AC-2 declared ranges and derived floor `0.64.0`, NFR-026-AC-2 |
| `pydantic` `2.12.5`, `msgspec` | Runtime validation surfaces for three families | Guaranteed | FR-077-AC-5 import/accept/reject, FR-080-AC-4 per-constraint rejection |
| `mypy`, `black`, `isort` at the recorded versions | Static checker and formatters | Guaranteed | FR-080-AC-1, FR-080-AC-7 provisioning failure, FR-072-AC-6 recorded-version equality |
| `src/compiler/backends/python-schema.mjs` and its byte-golden | Merged normalizer this pass wraps | Guaranteed | FR-074-AC-1, FR-074-AC-10, FR-074-CON-3 branch diff against `origin/main` |
| `src/compiler/backends/python-pins.mjs` | Second record of the pinned versions | Guaranteed | FR-072-AC-8 equality (authority unstated, FND-1167) |
| `spikes/typespec-feasibility/evidence/toolchain.json` | Third, frozen record of the same versions | Assumed (FND-1167) | FR-043-AC-7 only; prohibited path for this ticket |
| `schema/semantic/v1/*.schema.json` | Realistic whole-bundle generation input | Guaranteed | FR-074-AC-8 keyword parity, FR-078-AC-3 zero degraded findings |
| Conformance corpus and its `python-backend` adapter slot (issue #20, issue #52) | Independent oracle for the generated surface | Assumed (FND-1168) | FR-077-AC-9 unmet accounting only; no runnable adapter, no reciprocal FR-037 obligation |
| `thresholds.json` promotion rows for issue #23 (FR-039) | Promotion policy written elsewhere | Assumed (FND-1174) | None named in this bundle |
| FR-024 and FR-005 generated-target and generated-package contracts | Shape authority for the emitted package | Assumed (FND-1175) | FR-079 Inputs prose only; no conformance criterion |
| `test/changed-paths.ts` (`changeRange`, `changedPathsOf`) | Shared changed-path helper | Guaranteed | NFR-027-AC-6, NFR-027-AC-7 sentinel-pinned ranges with `--no-renames` |
| Merged allow-lists in `test/semantic-contract.test.ts`, `test/semantic-core.test.ts`, `test/semantic-ir-v1-1.test.ts` | Moving-baseline gates this branch trips | Assumed (FND-1171) | None stated; convention recorded only in NFR-016 |
| `make test`, `make lint`, `pnpm run test`, `poetry run pytest` | Execution context for every gate here | Assumed (FND-1170) | No requirement names a target; `package.json` and `.github/**` prohibited |
| Issue #11 publication gate | Downstream consumer of the verdicts and the layout | Guaranteed (negatively) | FR-079-AC-7, FR-079-AC-8, NFR-027-AC-5, NFR-027-AC-10 |
| Issues #21 and #22 branches | Concurrent change sets sharing `test/**`, `Makefile`, `biome.json` | Assumed (FND-1171) | None |

The one boundary that matters most for this ticket is drawn correctly and
mechanically: FR-076-CON-1 keeps the process spawn out of `src/compiler/` so
FR-043-AC-8 stays green, FR-074-CON-3 and FR-074-AC-10 keep the merged
normalizer and its golden byte-identical, FR-077-CON-3 and FR-077-AC-10 keep
`conformance/**` unedited, and FR-079's four publication criteria plus
NFR-027-AC-5 and NFR-027-AC-10 hold the issue #11 line. What the bundle does not
settle is internal: FND-1166 leaves the adapter/runner seam without a direction
of call or an owner for orchestration, and FND-1169 leaves the inspect-then-run
ordering unstated. FND-1167, FND-1168, FND-1174, and FND-1175 are facts,
interfaces, and authorities this ticket shares with FR-043, issue #20, issue
#52, and issue #11 without a reciprocal obligation on either side. FND-1170 and
FND-1171 are the gates themselves: nothing declares where this ticket's Python
gates run, and the permitted list omits the merged allow-list extensions the
branch cannot go green without. FND-1172, FND-1173, and FND-1176 are hygiene on
the two NFR path lists and on the adapter's stated exit.
