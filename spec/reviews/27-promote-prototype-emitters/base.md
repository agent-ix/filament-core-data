---
id: SR-055
title: "Base checklist review of the issue #27 prototype-emitter promotion"
type: SpecReview
analysis: base
scope: "spec/usecase/US-009-*.md, spec/functional/FR-040-*.md..FR-044-*.md, spec/non-functional/NFR-017-*.md, spec/non-functional/NFR-018-*.md, spec/tests.md TC-320..375, spec/spec.md, spec/index.md"
review_set: all
---
# Base checklist review

## Summary

US-009 is elaborated by FR-040..044 and constrained by NFR-017 and NFR-018 under
StR-001. ID formats are clean: US-009, FR-040..044, NFR-017..018 and TC-320..375
are well-formed, unique, and contiguous within the issue #27 block, and every
AC and named CON in the block has at least one mapped test case. Every relative
link in the eight new artifacts resolves to a real file and every `ix://` target
names an artifact that exists. Two defects are structural rather than editorial:
NFR-017's permitted/prohibited path lists forbid deleting
`spikes/typespec-feasibility/emitter/`, which FR-044 Outputs require and
NFR-018-AC-4 rehearses, so NFR-018-AC-1 and FR-044-AC-4 cannot both pass; and
FR-040 fixes an inventory at "thirteen prototype components enumerated in the
Inputs" when the Inputs enumerate three bullets, one of which is a six-way
category list and one of which is an evidence file rather than a component. The
Test Execution Summary is also wrong by one in two rows (Static and Snapshot),
which happen to cancel in the grand total. No spec artifact was edited by this
review.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-260 | high | NFR-017 Scope lists permitted paths `spikes/typespec-feasibility/scripts/**`, `spikes/typespec-feasibility/package.json`, `spikes/typespec-feasibility/evidence/custom.json` and `spikes/typespec-feasibility/README.md`, then declares "Prohibited paths: every other file under `spikes/typespec-feasibility/`". `spikes/typespec-feasibility/emitter/` is therefore prohibited, yet FR-044 Outputs require "A deleted `spikes/typespec-feasibility/emitter/` package", FR-044-AC-4 asserts `spikes/typespec-feasibility/emitter/` "is absent from the tree", and NFR-018-AC-4 rehearses restoring it. NFR-018-AC-1 ("Every changed path on the branch is on the permitted list, and none is on the prohibited list", verified by TC-371) fails on exactly the change the promotion is required to make. Either the permitted list must add `spikes/typespec-feasibility/emitter/**` or FR-044 must stop deleting it. | NFR-017 Scope, NFR-018-AC-1, FR-044 Outputs, FR-044-AC-4, TC-362, TC-371 |
| FND-261 | high | FR-040 Behavior says "The inventory SHALL contain one record for each of the thirteen prototype components enumerated in the Inputs" and FR-040-AC-1 requires "thirteen records, one per enumerated prototype component", but the Inputs section enumerates three bullets: `spikes/typespec-feasibility/emitter/index.mjs`, "the generator, adapter, fixture, projection, evidence, and harness functions in `spikes/typespec-feasibility/scripts/run-experiment.mjs`" (a six-way category, not a component list), and `spikes/typespec-feasibility/evidence/capabilities.json` (an evidence record, not a prototype component). `run-experiment.mjs` defines 20 top-level functions, so the number thirteen cannot be derived from either the spec or the tree, and TC-320 has no oracle. The count is also a hard boundary with no below/above case: nothing fails an inventory of twelve or fourteen records. | FR-040 Inputs, FR-040 Behavior, FR-040-AC-1, TC-320, spikes/typespec-feasibility/scripts/run-experiment.mjs |
| FND-262 | medium | The Test Execution Summary miscounts two categories. Counting the Test Case Summary rows directly gives Static 139 and Snapshot 9; the summary states Static "138 total, 110 passed, 28 blocked" and Snapshot "10 total, 6 passed, 4 blocked". Blocked counts are right (issue #27 adds 28 Static and 4 Snapshot cases), so the passed figures should be Static 111 and Snapshot 5. The two errors are equal and opposite, so the `**Total**` row 335/279/0/56 is coincidentally correct and hides the defect. | spec/tests.md Test Execution Summary, Test Case Summary TC-001..375 |
| FND-263 | medium | FR-041 Behavior states two locus rules — "While a type's source locus lies beneath the process working directory, the compiler SHALL record that locus as a working-directory-relative path" and "If a type has no source location, then the compiler SHALL record its locus as `synthetic`" — and neither has an acceptance criterion, a test case, or an error-path row. The `synthetic` branch is a documented condition under matrix rule 4, so its absence from the Error Paths table (ERR-051..057) and from TC-329..339 is a real coverage gap. The behavior also understates the prototype: `sourceOf` in `spikes/typespec-feasibility/emitter/index.mjs` returns `` `${path}:${position.line + 1}` ``, a path plus a line number, not a bare path, so an implementer reading FR-041 alone would break FR-041-AC-2 byte equality. | FR-041 Behavior, FR-041-AC-2, spec/tests.md Error Paths, spikes/typespec-feasibility/emitter/index.mjs |
| FND-264 | medium | Nothing in the bundle governs whether the promoted compiler ships in the published tarball. Root `package.json` already declares `"files": ["dist/", "schema/", "fixtures/", "src/", ...]`, so `src/compiler/**` would be published, while FR-041-CON-2 and FR-041-CON-4 keep every `@typespec/*` package a devDependency and forbid adding a runtime dependency. NFR-018's only surface metric is "Public export surface of `@agent-ix/filament-core-data` changed | 0 entries", measured by comparing `package.json` `exports`, and NFR-018-AC-2 compares only `exports`, `main`, `module`, `types` — none of them reads `files`. The promotion can therefore satisfy every stated criterion while shipping importable compiler source whose imports cannot resolve for a consumer. | FR-041-CON-2, FR-041-CON-4, NFR-018 Measurement, NFR-018-AC-2, package.json |
| FND-265 | medium | US-009 Context asserts that the spike "is excluded from the repository formatter". `biome.json` excludes only `!spikes/typespec-feasibility/generated/**` and `!spikes/typespec-feasibility/evidence/**`; there is no other `biome.json` in the tree, so `spikes/typespec-feasibility/emitter/index.mjs` and `spikes/typespec-feasibility/scripts/run-experiment.mjs` are already formatted by `pnpm run format:check`. The claim overstates the gap the promotion closes; what the spike source actually escapes is `tsconfig.json`, whose `"include": ["src", "test", "scripts"]` does not reach `spikes/`. | US-009 Context, biome.json, tsconfig.json |
| FND-266 | medium | The drifted-index obligation is not measurable as written. NFR-017 Measurement gives "`spike:typespec:check` exit code with a drifted crates.io index | 0 | 0 | Retained-evidence check", NFR-017-AC-3 requires the check to exit zero "on a host whose index carries a newer `syn`", and FR-044-AC-3 requires "re-running the check on a host whose crates.io index has newer transitive versions". No requirement states how that host condition is produced (`cargo update -p syn`, a vendored index, a fixture lockfile, or waiting for upstream), so TC-361 and TC-368 have no runnable procedure and can only ever be recorded by assertion. This is the one gate the whole NFR-017 Rationale is built on. | NFR-017 Measurement, NFR-017-AC-3, FR-044-AC-3, TC-361, TC-368 |
| FND-267 | medium | The Constraint Boundary Tests table covers only FR-040-CON-2, FR-041-CON-2, FR-043-CON-1, FR-044-CON-1, and FR-044-CON-3, leaving nine of the fourteen named issue #27 constraints with no allowed/prohibited pair. Two matter: FR-041-CON-1 requires `schemaVersion` to stay `1.0.0`, and TC-336 asserts only the allowed value, so no case fails a revised version; FR-042-CON-1 says "The inventory SHALL NOT describe either backend as production-qualified", and TC-346 asserts only the allowed wording, so no case fails an inventory that does. Matrix rule 3 requires both boundaries. | spec/tests.md Constraint Boundary Tests, FR-041-CON-1, FR-042-CON-1, TC-336, TC-346 |
| FND-268 | medium | Four test cases are traced to acceptance criteria that do not state what the case tests, because the underlying Behavior clause has no AC of its own. TC-337 ("Only `AgentIx.Semantic` declarations enter the IR") is traced to FR-041-AC-2, which is a byte-equality assertion over the retained IR; TC-347 (enums as string-literal unions) to FR-042-AC-1 and TC-348 (`Option<…>` wrapping) to FR-042-AC-2, both golden byte-equality criteria; TC-356 ("No hand-written Python code generator exists under `src/compiler/`") to FR-043-AC-1, which is the normalized-bundle byte comparison. The corresponding normative clauses — FR-041's namespace restriction, FR-042's TypeScript/Rust rendering rules, and FR-043's "This repository SHALL NOT own a hand-written Python code generator" — need their own acceptance criteria rather than being hung off the nearest golden. | TC-337, TC-347, TC-348, TC-356, FR-041 Behavior, FR-042 Behavior, FR-043 Behavior |
| FND-269 | low | US-009's dependency record is inconsistent with its own prose. Frontmatter declares `depends_on` `ix://agent-ix/filament-core-data/US-005`, which the Dependencies section never mentions; the Dependencies section instead names "IR v1.1 ([US-006](./US-006-declare-typed-domain-structure.md)) and the semantic-core grammar ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md))", neither of which appears in frontmatter. The same file also mixes `ix://` forms, using the path style `ix://agent-ix/filament-core-data/spec/stakeholder/StR-001` alongside the bare style `ix://agent-ix/filament-core-data/US-005`. | US-009 frontmatter, US-009 Dependencies |
| FND-270 | low | The Option Permutation Matrix row for TC-348 records the expectation "Optional and nullable both reach `Option<…>`; TypeScript uses `?`", but no FR-042 Behavior clause states how the TypeScript backend renders optionality — the clause list covers scalars as string aliases, enums as string-literal unions, and models as interfaces extending their base, and stops there. The permutation table is asserting a generator behavior the requirement does not own. | spec/tests.md Option Permutation Matrix, TC-348, FR-042 Behavior |
| FND-271 | low | Two Constraints tables list their rows out of ID order: FR-041 runs CON-1, CON-2, CON-4, CON-3, and FR-042 runs CON-1, CON-3, CON-2. Nothing is missing or duplicated, but the ordering makes the "FR-041-CON-1..4" and "FR-042-CON-1..3" ranges in the tests.md Functional Requirement Coverage table harder to check by eye. | FR-041 Constraints, FR-042 Constraints, spec/tests.md lines for FR-041 and FR-042 |
| FND-272 | low | FR-041's narrow interface exports six symbols including `compileSemanticIr`, and FR-041-AC-3 exercises it ("`compileSemanticIr` over a TypeSpec source with an unresolved reference rejects…"), but the Outputs section names a file for `buildSemanticIr` (`src/compiler/ir.mjs`), the `$onEmit` entry, `index.mjs`, `index.d.mts`, and `cli.mjs`, and never says where `compileSemanticIr` lives or what it takes. Its signature — entrypoint path versus `Program`, and what it writes — is left to the implementer while TC-332 asserts "writes no output file". | FR-041 Outputs, FR-041-AC-3, TC-332 |
| FND-273 | low | NFR-018's Measurement table ends with "Commits needed to revert the promotion | branch revert only | branch revert only | Revert rehearsal". A metric named as a count of commits has a categorical string for both its target and its threshold, so there is nothing to compare a measurement against. US-009-EX-4 compounds the ambiguity by speaking of "reverting the promotion commit" (singular) while NFR-018's Statement says "revertible by reverting its own commits" (plural). | NFR-018 Measurement, NFR-018-AC-4, US-009-EX-4 |
| FND-274 | low | The US-009 illustrative-example mapping in the User Story Coverage table picks weaker cases than the ones that exist. EX-2 requires that "the disposition cites the evidence rather than the fact that the representative golden passed", which is exactly TC-325, but the row maps EX-2 to TC-320 (record count). EX-4 requires that "no package was published, no schema, fixture, or consumer changed", which is TC-371 and TC-375, but the row maps EX-4 to TC-372 (export-surface comparison only). | spec/tests.md User Story Coverage US-009 row, US-009-EX-2, US-009-EX-4, TC-325, TC-371, TC-375 |
| FND-275 | low | Two framing statements are stale or over-reaching. The tests.md Overview opens "This matrix defines the verification contract for the issue #8 architecture, issue #10 read-only contract census, issue #4 TypeSpec feasibility gate, and issue #9 semantic IR/package/projection specification, and the issue #34 semantic IR v1.1 revision" — omitting issues #35 and #27, which later sentences in the same section do cover. And US-009's title, "Build generated packages from a supported compiler", promises an outcome that spec.md §2.2 explicitly excludes ("generating or publishing a Rust, TypeScript, or Python package … as part of issue #27"); the Story's own "I want" clause also prescribes the solution ("live in this repository's `src/`") rather than the outcome. | spec/tests.md Overview, US-009 title, US-009 Story, spec/spec.md out-of-scope list |

## Coverage Result

| Scope | Obligations | Matrix cases | Result |
|---|---|---|---|
| FR-040 | AC-1..6, CON-1..2 | TC-320..328 | Every AC and CON mapped; count boundary unmapped (FND-261) |
| FR-041 | AC-1..7, CON-1..4 | TC-329..339 | Every AC and CON mapped; locus behavior unmapped (FND-263); CON-1 has no prohibited boundary (FND-267) |
| FR-042 | AC-1..6, CON-1..3 | TC-340..348 | Every AC and CON mapped; CON-1 has no prohibited boundary (FND-267) |
| FR-043 | AC-1..6, CON-1..2 | TC-349..356 | Every AC and CON mapped; the "no hand-written Python generator" clause has no owning AC (FND-268) |
| FR-044 | AC-1..6, CON-1..3 | TC-357..365 | Every AC and CON mapped; AC-3 has no reproducible method (FND-266) |
| NFR-017 | AC-1..5, 6 metrics | TC-366..370 | All five AC mapped; the drifted-index metric is not measurable as stated (FND-266) |
| NFR-018 | AC-1..5, 6 metrics | TC-371..375 | All five AC mapped; AC-1 contradicts FR-044 (FND-260); the revert metric has no numeric target (FND-273) |
| ID and link integrity | 8 new artifacts | — | All relative links resolve; all `ix://` targets exist; TC-320..375 contiguous, unique, no duplicates |
| Existing corpus | 279 cases | TC-001..279 | Untouched; summary arithmetic wrong in two rows (FND-262) |

## Disposition of the composite review

The eight analyses (SR-055..SR-062, FND-260..FND-417) raised 20 high and 43
medium findings across the base checklist, failure-domain, integrity,
dependency, evidence, risk-complexity, scope-boundary, and EARS analyses. Every
high and every medium that named a real defect was fixed in the requirement
bundle before planning. The deduplicated record follows; a finding not listed
here was fixed.

### High findings, all fixed

| Theme | Findings | Fix |
|---|---|---|
| NFR-017's prohibited-path list forbade deleting `spikes/typespec-feasibility/emitter/`, which FR-044 requires | FND-260, FND-280, FND-302, FND-364, FND-380 | NFR-017 Scope now permits `spikes/typespec-feasibility/emitter/**` for deletion only, and enumerates the prohibited spike paths explicitly |
| The gate that actually enforces isolation is the allowlist in `test/typespec-feasibility.test.ts`, and nobody owned its amendment | FND-281, FND-323, FND-381 | FR-044 Outputs and FR-044-AC-9 own the amendment; TC-379 verifies it covers every changed path |
| "Thirteen prototype components" was not determinable from the Inputs | FND-261, FND-287, FND-301, FND-342, FND-362, FND-383 | FR-040 Inputs now enumerate fourteen named components with their spike paths and symbols; the enumeration is the oracle and no count stands in for it |
| FR-040-AC-5 was unsatisfiable for files the promotion authors | FND-288, FND-305, FND-321, FND-383 | The inventory gains an `authored` array; AC-5 covers both, and CON-3/CON-4 stop it laundering a promoted component |
| `$onEmit` had no channel for a caller-supplied generator identity | FND-284, FND-308 | Verified empirically that `tsp --emit <absolute path> --option "@agent-ix/semantic-ir-emitter.generator=<id>"` works; FR-041 Behavior and AC-5/AC-8 state it |
| `localeCompare` ordering is ICU- and locale-dependent | FND-282, FND-367 | FR-041 now requires a locale-independent code-point comparison; verified it reproduces the golden order, and AC-11/TC-342/TC-385 check it against two collator locales |
| `process.cwd()` was an undeclared, load-bearing input to every byte-identity criterion | FND-283, FND-309, FND-366 | `baseDir` is an explicit parameter with a stated default; AC-10 and NFR-017-AC-4 verify two values give correspondingly different loci |
| The retained evidence embeds the minting host's node, rustc and Python versions, and the generated Python models need Python >= 3.11 | FND-304, FND-360 | Verified on this host and filed as issue #42 with measurements. FR-044-AC-1 and TC-370/TC-382 are marked blocked on it rather than weakened; per-component byte-identity is the evidence available without it |
| Seeding the lockfile does not do what "a drifted crates.io index" claims, and "generate one if absent" is a silent-rebaseline route | FND-285, FND-286, FND-361 | FR-044-CON-4 states that `--offline` consults no index; AC-4 requires `--check` to fail rather than generate |
| The promoted IR does not validate against this repo's own v1 IR schema | FND-303 | FR-041-CON-2 states the two shapes are different artefacts and allocates reconciliation to issue #19 |
| FR-024 expects retained custom codegen in a separate repository | FND-300, FND-324 | ADR-0002 supersedes it; FR-042 declares ADR-0002 upstream and the amendment of FR-024 belongs to issue #19 |
| The byte-identity oracle freezes real prototype bugs | FND-363 | Recorded rather than hidden: FR-040 requires a `limitation` per record, FR-042-CON-1/CON-3 keep the four absent gates, EC-040 names the risk, and fixing the generators is issues #19/#21/#22 |
| Everything promoted is frozen at IR 1.0.0 while IR v1.1 is merged | FND-365, FND-326 | FR-041-CON-1 and CON-2 pin the promotion to the prototype shape and name issue #19 as the owner of any revision |
| `package.json` `files` already ships `src/` | FND-264, FND-328, FND-370, FND-382, FND-356 | NFR-018 gains `files` and packed-file metrics plus AC-3; the source-only shipping choice is recorded in the inventory and a public export deferred to issue #11 |
| FR-040 -> FR-041 -> FR-040 ordering cycle | FND-320 | Not a requirement cycle to break but a task order: the plan authors the modules first and the inventory conformance test last |
| `validation.json`'s zero-mutation counters are literals written by the tool under test | FND-340 | FR-044-AC-10 discharges them with a changed-path check over the branch diff instead |
| The "drifted index" condition is unobservable under `cargo --offline` | FND-341 | NFR-017's metric table now measures lockfile entries replaced by a run, and AC-5 checks the seeded lockfile survives byte-identical |
| EARS: FR-040's central obligation was allocated three ways; NFR-018's Statement packed two `SHALL`, a copula and five prohibitions | FND-400, FND-401 | Both rewritten; `quire validate` now reports no `[ears:*]` or `[quality:*]` finding on any issue #27 artifact |

### Medium findings not acted on, with reasons

| ID | Reason |
|---|---|
| FND-291, FND-294 | IR `id` uniqueness and the `role`/`nullable`/`recursive`/`extensionPoint` name heuristics are prototype semantics. FR-041-CON-1 freezes the emitted shape on purpose; changing them is issue #19, and doing it here would break the only oracle the promotion has. |
| FND-296 | The adapter's deeper edge cases (duplicate `$id` collapse, non-unique derived titles) are real but belong to the Python package ticket (#23); FR-043 Behavior now describes what the adapter actually does, so #23 inherits a true description rather than a flattering one. |
| FND-333 | The stale `spikes/.../emitter` reference in `plan/Plan-003/tasks/Task-019` is a landed historical plan record; plans are not rewritten after they land. |
| FND-345, FND-350, FND-357, FND-358 | The `Analysis`-cell / `Static`-row pairing and free-text metric methods are settled repository-wide conventions (SR-040 FND-167); changing them here would diverge this bundle from the other 279 rows. |
| FND-351 | FR-041-AC-4 and NFR-017-AC-1 are deliberately both present: the FR states the component obligation, the NFR the cross-cutting one. The duplicate row is cheap and keeps each requirement independently verifiable. |
| FND-354 | NFR-018-AC-2 is typed `Static` rather than `Snapshot` because its baseline is a git ref, not a stored artefact. |
| FND-361 (CI half), FND-368 | `build-test.yml` is `workflow_dispatch`-only and the Python venv repeats the transitive-drift defect. Both are folded into issue #42 rather than fixed here; adding CI for a gate that is red for host reasons would only encode the redness. |
| FND-371 | FR-044 is not split into three requirements; the plan decomposes it into separate tasks instead, which gives the same reviewability without fragmenting one integration obligation. |
| FND-275 (title half) | US-009's title is retained: the story's outcome is that the package tickets can build from an owned compiler, and `spec.md` 2.2 settles that #27 itself builds no package. |
