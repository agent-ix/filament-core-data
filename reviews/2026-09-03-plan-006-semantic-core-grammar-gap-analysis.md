---
id: SR-046
title: "Gap analysis — Plan-006 semantic-core grammar"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-006-semantic-core-grammar/, spec/tests.md, packages/semantic-core/, fixtures/semantic-core/, docs/semantic-data-system/metamodel.md, docs/semantic-data-system/adr/0002-generated-package-ownership.md, test/semantic-core.test.ts, test/semantic-core-reader.ts, test/semantic-core-lowerer.ts, tests/semantic_ir_reader.py, Makefile"
review_set: all
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-006"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/TM-001"
    type: references
---
# Gap analysis — Plan-006 semantic-core grammar

## Summary

Plan-006 (issue #35, branch `spec/35-semantic-core-l3-grammar`) is implemented
through its automated assurance boundary: Tasks 041–046 are done, all 31
automatable issue #35 Test Matrix cases (TC-248..279 minus the Manual TC-274)
carry an exact `/** Traces: … */` tag on a passing Vitest case, 32 of the 33
new acceptance-criterion and constraint ids appear in at least one tag and the
33rd (NFR-014-AC-2) is the TC-274 inspection recorded in the plan log and
re-inspected here, and no grammar declaration, emitted schema, reader rule,
Makefile target, or fixture was found without an owning FR/NFR behavior. The
substantive gap is in the lowering evidence: `lowering.json` records
`EnumValue.doc` as a loss-free lowering to a `variant` extension slot that IR
v1.1 does not have, and the reference lowerer drops the property, which no
test can see because no enum-kind instance is ever lowered (FND-212). The rest
is procedural: Task-047 is the gate this document belongs to, `quire coverage`
still binds none of this repository's tags, and the matrix markers lag the run.

Finding ids run FND-210..FND-219 as requested; the issue #35 requirement
reviews (SR-037..044) and the Plan-005 reviews (SR-035, SR-036) end below
FND-210, so the ranges do not collide.

## Verdict

**CONDITIONAL** — no task is blocked, no matrix case is unbacked, and no
finding is `high`. The open plan item is Task-047, the closing gate that this
review is part of (FND-210). FND-212 should be resolved (table row, FR-034
text, or an IR `variant.extensions` slot) before the "mergeable" comment, since
it contradicts the zero-loss claim FR-034-AC-1 rests on.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-210 | medium | Task-047 is `status: todo` with all three subtasks unchecked (re-run baselines; `/code-review` + `/gap-analysis`; PR + "mergeable" comment). The baselines were re-run for this review (114/114, 4/4, lint clean, `semantic-core-check` green); this SR-046 is the gap analysis. The code review, PR, comment, status flip, and Task File Mapping row remain. Not counted as a blocked task because it is the gate this document belongs to. | Task-047, Plan-006 | correct-requirement-no-evidence |
| FND-211 | medium | `quire coverage --scope . --json` (cli 0.31.0, engine ca7362d4) binds 0 / 498 rows repo-wide and 0 / 279 for `spec/tests.md`. The engine now reads the `/** Traces: … */` form (`typescript-doc-comment-id` matched) but attributes all 31 issue #35 tags to the file container `test/semantic-core.test` at line 1 (`tag-on-non-binding-symbol`, CR-061) instead of the `it(...)` symbol each comment precedes, and the 8 tests whose names contain "FR-006" surface as `marker-form-mismatch`/`unmatched_tags`. A separate diagnostic reports the Functional Requirement Coverage table's status column (`Coverage Status`) does not match the declared `Status`, so status classification was skipped for that table. Reconciliation therefore ran as a declared grep fallback (Coverage). Recorded as requested; not fixed here. | test/semantic-core.test.ts, spec/tests.md:57, quire coverage diagnostics `tag-on-non-binding-symbol`, `marker-form-mismatch`, `status-column-matches-nothing` | correct-requirement-no-evidence |
| FND-212 | medium | `lowering.json` row `EnumValue.doc → variant.extensions[ix://agent-ix/semantic-core/ext/doc]` is recorded `loss: none`, but the IR v1.1 `variant` definition has only `identity`, `name`, `payloadType`, `origin` with `additionalProperties: false`, and `test/semantic-core-lowerer.ts` emits variants as `{identity, name, origin}` — `EnumValue.doc` is dropped. FR-034 Behavior states `EnumValue.doc` SHALL lower to the doc extension, which the IR schema cannot carry on a variant. TC-267 checks only that a row exists per property and that `loss` reads `none`; TC-268/TC-269/TC-279 lower the record-kind FR-006 set, so no test builds an `enum`-kind instance and the `EnumValue SHALL lower to variant` behavior is unexercised. Either amend FR-034 and record the row as `loss`, or add `extensions` to the IR `variant` in a later IR revision; then add an enum-kind lowering case. | packages/semantic-core/lowering.json::EnumValue.doc, test/semantic-core-lowerer.ts::lower (variants), schema/semantic/v1/semantic-ir.schema.json::$defs.variant, FR-034, FR-034-AC-1, TC-267, TC-268 | wrong-requirement |
| FND-213 | low | FR-034 states the lowerer SHALL set every node's `origin` from the declaration's `SourceLocus` and lists "a `SourceLocus` per declaration" as input, but the `Instance` type carries loci only for fields (`fieldLoci`) and relations (`relationLoci`, keyed by verb alone); operations, params, variants, kernel definitions, and clauses without a span receive the generated origin. `SourceLocus.endLine`/`endColumn` reach the IR only through `clause.sourceSpan` (as the table records); for a declaration locus the lowerer copies start only. The FR-006 fixture declares no operations or enum values, so TC-268 cannot observe either. | test/semantic-core-lowerer.ts::Instance, test/semantic-core-lowerer.ts::origin, packages/semantic-core/lowering.json::SourceLocus.endLine, FR-034 | correct-requirement-no-evidence |
| FND-214 | low | The `Any` half of the kernel scope test is not the inventory test. `inventory.json` lists declaration names, not enum members, so `declarations(withAny)` still equals the inventory after the mutation and TC-249 asserts exactly that; the rejection comes from `allowedKernelScalars`, a nine-name list hard-coded in the test, which TC-258 also uses. FR-031-AC-2 and FR-032-AC-4 say the inventory/scope test "fails naming the declaration". The rows are backed, but the oracle is test-local rather than the committed inventory or `kernel-scalars.json`. | test/semantic-core.test.ts::allowedKernelScalars, TC-249, TC-258, FR-031-AC-2, FR-032-AC-4, packages/semantic-core/inventory.json | correct-requirement-no-evidence |
| FND-215 | low | NFR-014 Scope permits `fixtures/semantic-core/**` but not `fixtures/semantic/v1/compatibility/cases.json`, which FR-032-CON-1 requires this issue to extend (three kernel-scalar cases, TC-260); the TC-275 allowlist adds that path silently. In the other direction NFR-014 permits `package.json` (`scripts` only) while TC-275 prohibits any `package.json` change and the plan moved the scripts to `Makefile`. The changed-path gate and the NFR text disagree on both paths; the gate is the stricter and passes. | spec/non-functional/NFR-014-small-kernel-discipline.md (Scope), test/semantic-core.test.ts::TC-275, FR-032-CON-1, fixtures/semantic/v1/compatibility/cases.json | wrong-requirement |
| FND-216 | low | Matrix marker drift: rows TC-248..279 read `🚧 issue #35`, the header (line 20) says the issue "awaits implementation", Coverage Gaps says the 32 cases are "unexecuted pending implementation", and the footer says "blocked on issue #35 implementation", while the per-requirement tables (US-007, FR-031..034, NFR-014) already read `✅ Complete` and all 27 tests pass on this branch. Plan-006 `plan.md` requirement and test-plan boxes are checked and the Task File Mapping table is current, so the drift is confined to `spec/tests.md`. | spec/tests.md (rows 364–395, lines 20, 53, 89–92, 111, 625, 648) | correct-requirement-no-evidence |
| FND-217 | low | Host-bound evidence: TC-275 and TC-278 diff against `origin/main` (a fetch-less clone reads the wrong base); TC-279 shells `poetry run python tests/semantic_ir_reader.py --read`, so it fails hard without the poetry environment; TC-248, TC-253, TC-264 shell `pnpm exec tsp`/`biome` and TC-265 reads `pnpm-lock.yaml` for the pinned versions. All pass here (114/114); CI parity for the poetry prerequisite is unverified, as SR-036 FND-111 recorded for TC-232. | TC-275, TC-278, TC-279, TC-248, TC-253, TC-264, TC-265 | correct-requirement-no-evidence |
| FND-218 | low | Lowerer values with no owning requirement text, all committed into `config-version-lowered.json`: `package.version "1.0.0"`, `source.version "1.0.0"`, `source.dialect "spec-bundle"`, all-zero `manifestDigest`/`lockDigest` sentinels, `presence` derived from `multiplicity.lower >= 1`, and `capability: semantic-core-<name>` on every extension. FR-034's lowering context names only the package identity, loci, and clause-text map. Harmless for evidence-only code, but issue #36 will inherit these as the de facto contract unless FR-034 (or the #36 spec) states them. | test/semantic-core-lowerer.ts::lower (source/package envelope, ext), fixtures/semantic-core/positive/config-version-lowered.json, FR-034 | missing-requirement |
| FND-219 | low | Reader uniqueness is per list: `clauses[]`, each operation's `pre[]`, and each `post[]` are checked separately, so a `clauseId` shared between `pre` and `post` reads clean (the FR-031 rule) but so does a `pre` reference to a `clauseId` that no `clauses[]` entry declares (EC-034 dangling), and no positive rule fixture proves the shared pre/post case. The FR-006 set exercises neither. `describe` label "red until Task-042 lands" is stale. | test/semantic-core-reader.ts::readDeclarations, fixtures/semantic-core/negative/rules/cases.json, FR-031, EC-034, test/semantic-core.test.ts:131 | correct-requirement-no-evidence |

## Coverage

- Target: `plan/Plan-006-semantic-core-grammar/`; specification: `spec/`; matrix:
  `spec/tests.md` (`TM-001`); identity prefix: `ix://agent-ix/filament-core-data`.
- Reconciliation: grep fallback — `quire coverage` (cli 0.31.0, engine
  0.46.0 @ ca7362d4, `--scope` = repo root, split-root semantics apply) ran
  and returned `totals.backed = 0 / 498`, `groups[spec/tests.md] = 0 / 279`,
  `binding_census.typescript = 114 candidates, 8 tagged, 0 bound`, with the
  container-binding diagnostic in FND-211. That zero is "tags the binder
  attributes to the file, not the test", not "no tags"; every figure below is
  from the grep index of `/** Traces: … */` lines, checked by hand against the
  matrix `Traces To` column and against the `it(...)` each tag precedes.
- Tasks done: 6 / 7. Task-047 `todo` (FND-210). Done tasks with an
  incomplete dependency: 0. Dependency order (041 → 042 → 043/044/046,
  043 + 044 → 045 → 047) is consistent with the commit sequence
  `98e8ceb … d0faaea`.
- Issue #35 Test Cases backed by an exact `TC-` tag in a passing test:
  31 / 31 automatable (TC-248..273, TC-275..279). TC-274 (Manual,
  NFR-014-AC-2): inspected here — `metamodel.md` and ADR-0002 each carry
  exactly one *Amendment (issue #35)* paragraph naming the grammar,
  `inventory.json`, and the module-vocabulary rule; pass, matching the plan
  log entry. Matrix-only: 0. Tag-only (a `TC-` id in a test that is not in
  the matrix): 0. Every tag sits on an `it(...)`, none on a `describe`.
  TC-249 is tagged twice (inventory-file half at line 175, compiled half at
  line 306); TC-250+263, TC-255+257, TC-265+266, TC-267+272, TC-249+273 share
  a test, and every extra id belongs to the sibling row.
- New acceptance criteria and constraints traced by at least one tag:
  32 / 33 (FR-031-AC-1..7, FR-031-CON-1..2, FR-032-AC-1..5, FR-032-CON-1,
  FR-033-AC-1..5, FR-033-CON-1..2, FR-034-AC-1..5, FR-034-CON-1,
  NFR-014-AC-1, AC-3..5). Untagged: NFR-014-AC-2, verification method
  Inspection, covered by TC-274 above. US-007-EX-1..4 are tagged on TC-262,
  TC-271, TC-258, TC-277 as the matrix records.
- Execution evidence (this host, 2026-09-03): `pnpm test` 114 / 114
  (`test/semantic-core.test.ts` 27 / 27, 25.5 s); `poetry run pytest -q`
  4 / 4; `pnpm lint` (biome format + `tsc --noEmit`) clean;
  `make semantic-core-check` "up to date (30 files)". Marker drift against
  this run: 32 rows (FND-216).
- Underspecified code: 0 unowned behaviors above `low`. Every `main.tsp`
  declaration is named in FR-031 Behavior and `inventory.json`; every
  emitted schema (21 models, 1 union, 4 enums, 4 scalars = 30 files) maps to
  FR-033; the 13 reader diagnostic codes map to the FR-031 "rules the reader
  enforces" list and 14 rule fixtures cover each rule (`INVALID_INSTANCE`
  and the `lower < 0` branch of `INVALID_MULTIPLICITY` are schema-covered
  guards); `generate.mjs` maps to FR-033 (emit, normalize, digest, `--check`);
  the three Makefile targets map to FR-033 Outputs and the plan; the Python
  `--read/--export` mode is the TC-279 harness. Lowerer envelope constants
  are FND-218; `EnumValue.doc` is FND-212. Stubs / skipped cases /
  placeholder returns: 0. Negative fixtures: 36 shape negatives (≥ 1 per
  declaration incl. scalars and enums) + 14 rule cases.
- NFR-014 permitted-path guard (TC-275) is green over the committed diff
  (118 files); no `spikes/`, `src/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  or corpus file changed; `spikes/` diff is empty (TC-278).
- Semantic review: skipped — the skill requires explicit opt-in and the
  request did not include it. FND-212..214 and FND-219 came from reading the
  reader, lowerer, and table against FR-031/FR-034 while tracing ownership,
  not from a full intent↔test↔code pass.

## Gate Closure

1. Resolve FND-212: record `EnumValue.doc` as `loss` and amend FR-034, or
   defer `variant.extensions` to an IR revision; add an enum-kind lowering
   case either way.
2. Run `/code-review`, open the PR, post the "mergeable" comment citing the
   code review and SR-046; set Task-047 `status: done`, check its subtasks,
   and update the Task File Mapping row (FND-210).
3. Flip TC-248..279 from `🚧 issue #35` to the passed marker and rewrite the
   header, Coverage Gaps, and footer sentences (FND-216) in the same change.
4. Reconcile NFR-014 Scope with the TC-275 allowlist (FND-215).
5. File the container-binding diagnostic (FND-211) against quire-rs so the
   next gap analysis can use the engine path.
