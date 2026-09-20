---
id: SR-064
title: "Gap analysis — Plan-007 prototype-emitter promotion"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-007-promote-prototype-emitters/, spec/functional/FR-040-*.md..FR-044-*.md, spec/non-functional/NFR-017-*.md, NFR-018-*.md, spec/tests.md TC-320..397, src/compiler/, test/compiler.test.ts"
review_set: subset
---
# Gap analysis — Plan-007

## Summary

Plan-007 (issue #27, branch `spec/27-promote-prototype-emitters`) is
substantively implemented: all fifteen files under `src/compiler/` are owned by
an `inventory.json` record or a reasoned `authored` entry, all four committed
issue #4 goldens reproduce byte-for-byte through the promoted modules, the spike
runner imports the promoted build interface and shells `src/compiler/cli.mjs`,
the emitter package and its `file:` devDependency are gone, `pnpm-lock.yaml`
carries no `file:`/`link:` specifier, and exactly one field of one
retained-evidence file changed. `make lint`, `make build` and `make typecheck`
are green here, and `quire validate` over `spec/**` and `plan/**` reports only
the repository's standing module-set warnings.

Two things are not as recorded. First, **TC-395 fails** on this branch, and the
matrix marks it `✅ passed`. `changedPaths()`/`deletedPaths()` in
`test/compiler.test.ts` derive from `git diff --name-only origin/main...HEAD`,
which collapses renames; git scores `spikes/typespec-feasibility/emitter/index.mjs
→ src/compiler/ir.mjs` at R060 and `emitter/package.json →
emitters/semantic-ir/package.json` at R050, so the two deleted spike-emitter
paths never appear in the branch's own changed-path index. The test was green
while the deletion was uncommitted (`git status --porcelain` shows a delete) and
went red the moment it was committed. The plan log's "vitest 171/172, the single
failure is TC-254" is a pre-commit measurement. Observed here: **170/172, two
failures, TC-254 and TC-395** (FND-450). Second, **all eight tasks are
`status: pending`** and every `plan.md` checkbox is unchecked, against a log
entry recording 060–066 done (FND-451).

The three "known and accepted" claims check out. TC-254 does fail at
`origin/main` — verified in `../fcd-baseline` (detached at
`8425a14`): `packages/semantic-core/package.json` has no `private` field, so
`expect(manifest.private).toBe(true)` receives `undefined` there exactly as it
does here. TC-370 and TC-382 carry `🚧 blocked on issue #42` in the matrix, are
excluded from the `test/compiler.test.ts` trace inventory, and are the only two
TC-320..397 rows not so marked; nothing pretends they pass. The five scoped
guards are honest in substance — the retained evidence is still pinned to one
field by TC-371 and the published surface plus both dependency sets by TC-391 —
but the scoping is broader than the promotion needed and TC-371 inherits the
same rename blindness as TC-395 (FND-457, FND-458).

The remaining findings are the semantic pass. The highest-value ones are tests
that pass while the criterion they cite is not exercised: TC-332 compares a
seven-element array with a six-element one and never mutates the module
(FND-453); TC-334's "writes no output" clause checks a path that was never
passed to anything (FND-454); TC-372/TC-374/TC-377 verify runner *behaviour* by
grepping runner *source text* (FND-456); and TC-341/TC-386, a determinism test,
asserts the literal worktree name `filament-core-data-27` (FND-455).

Finding ids run FND-450..FND-464 as requested.

## Verdict

**FAIL** — FND-450 is `high`: a P0 matrix row recorded `✅ passed` fails on
every host (`diff.renames` is unset, so git's default rename detection applies),
and it is the rollback rehearsal NFR-018-AC-6 rests on. FND-452 is a matrix row
with no tagged test. Both are pre-merge blockers. FND-451 is procedural but must
be cleared in the same change.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-450 | high | TC-395 fails. `deletedPaths()` filters `changedPaths()`, which is `git diff --name-only origin/main...HEAD`; git detects `spikes/typespec-feasibility/emitter/index.mjs → src/compiler/ir.mjs` (R060) and `emitter/package.json → emitters/semantic-ir/package.json` (R050) as renames and prints only the destinations, so no deleted `emitter/` path is ever seen and `expect(deleted.some(...startsWith("spikes/typespec-feasibility/emitter/")))` is `false`. Green only while the deletion was uncommitted. `spec/tests.md:492` records `✅ passed` and line 802 records "vitest 171/172; the single failure is TC-254"; measured here, 170/172 with TC-254 and TC-395 failing. `--no-renames`, or a pathspec-limited diff as TC-278/TC-234 use, sees both deletions. | test/compiler.test.ts:99 `deletedPaths`, test/compiler.test.ts:1070-1096, spec/tests.md:492, spec/tests.md:802, NFR-018-AC-6, TC-395 |
| FND-451 | medium | Every Plan-007 task is `status: pending` — Task-060..067 — and every requirement and test-plan checkbox in `plan.md` is unchecked, while `log.md` records "Tasks 060–066 done". No Task File Mapping table exists. Task-067 is the gate this document belongs to; the other seven are substantively complete and only unflipped. | plan/Plan-007-promote-prototype-emitters/tasks/Task-060..067 (frontmatter `status`), plan/Plan-007-promote-prototype-emitters/plan.md, plan/Plan-007-promote-prototype-emitters/log.md |
| FND-452 | medium | TC-380 is recorded `✅ passed` but carries no `/** Traces: … */` tag anywhere in the repository, and FR-044-AC-10 appears in no tag. It is the only unbacked row in TC-320..397 besides the two blocked ones. `test/compiler.test.ts`'s own header inventory lists TC-380 among the traced cases, so the comment overstates. The substance — a changed-path check over `origin/main...HEAD` proving zero publications and zero schema/consumer mutations — is performed by TC-390's prohibited list (`schema/`, `packages/`, `fixtures/`, `tests/`, `.github/`, `audit/`), but that assertion is tagged NFR-018-AC-1 only. Meanwhile the only assertion in the suite that names publication counts is `contract-census.test.ts` TC-085, which reads `validation.packagePublications` out of `evidence/validation.json` — precisely the evidence FR-044-AC-10 forbids as the proof. | spec/tests.md:476, test/compiler.test.ts:29-46 (trace inventory), test/compiler.test.ts:1025, test/contract-census.test.ts:505, FR-044-AC-10, TC-380 |
| FND-453 | medium | TC-332 is a tautology. FR-041-AC-1's negative half requires that the export-set assertion *fail* when a seventh symbol appears; the test instead builds `withExtra = [...Object.keys(module), "serializeSemanticIr"].sort()` and asserts it differs from the six-key list and has length 7. It never mutates the module, never re-runs TC-331's oracle, and passes for any value of `src/compiler/index.mjs` — including one already exporting seven symbols. | test/compiler.test.ts:359-365, FR-041-AC-1, TC-332 |
| FND-454 | medium | TC-334's second clause is vacuous. FR-041-AC-3 requires that "the `--out` path named on the call does not exist afterwards", but the test computes `out = resolve(temp("bad"), "ir.json")` and then calls `compileSemanticIr({entrypoint, generator, baseDir})`, which takes no output path and writes no file — only `cli.mjs` writes. `expect(existsSync(out)).toBe(false)` is true because nothing could ever have created it. The rejection-with-locus half is genuinely exercised; the no-partial-output half is not. | test/compiler.test.ts:399-415, src/compiler/compile.mjs, src/compiler/cli.mjs, FR-041-AC-3, TC-334 |
| FND-455 | medium | TC-341/TC-386 asserts `expect(second?.source).toContain("filament-core-data-27/spikes")` — the name of this worktree directory. A determinism criterion whose whole point is that the working directory is a declared input, not an ambient one, is verified by an assertion bound to one checkout path; it fails in `~/dev/filament-core-data`, in a CI checkout, and in any other worktree of this branch. The `baseDir` mechanism itself is sound (`compile.mjs`/`ir.mjs` take it explicitly); only the assertion is host-bound. | test/compiler.test.ts:511-528, NFR-017-AC-4, FR-041-AC-10, TC-341, TC-386 |
| FND-456 | medium | Three FR-044 criteria are verified by grepping the runner's source text rather than running it. TC-372 asserts `runner.toContain('cpSync(retainedLock')` and that its index precedes `"generate-lockfile"`; TC-374 asserts the regex `/else if \(checkMode\) \{[\s\S]*Missing retained lockfile/`; TC-377 asserts `runner.toContain('from "../../../src/compiler/index.mjs"')` and the absence of three `function` declarations. FR-044-AC-4 states the runner "exits non-zero naming the missing lockfile" — a claim about behaviour, checked as a claim about characters. `run-experiment.mjs` is never invoked by any test on this branch; the only criterion that would execute it, FR-044-AC-1/TC-370, is the one blocked on issue #42, so the whole runner path is text-verified only. | test/compiler.test.ts:900-955, spikes/typespec-feasibility/scripts/run-experiment.mjs:599-607, FR-044-AC-3, FR-044-AC-4, FR-044-AC-7, TC-372, TC-374, TC-377 |
| FND-457 | medium | TC-371, the guard the scoping of `test/semantic-core.test.ts` and `test/semantic-ir-v1-1.test.ts` was justified by, inherits FND-450's rename blindness: it filters `changedPaths()` for the three retained prefixes, so a retained golden *moved* out of `spikes/typespec-feasibility/generated/` would never enter its `changed` array and the "exactly one retained-evidence file" assertion would still pass. TC-359 (frozen-golden check) filters the same array and has the same hole. The invariant does survive, but through the guards that were relaxed, not the one that replaced them: TC-278 and TC-234 now run `git diff origin/main --name-only -- spikes/`, which is pathspec-limited and therefore *does* report the two deletions (verified by hand: it lists both `emitter/` files). Fix TC-371 and TC-359 to use a pathspec-limited or `--no-renames` diff. | test/compiler.test.ts:868-897, test/compiler.test.ts:766-788, test/semantic-core.test.ts:145, test/semantic-ir-v1-1.test.ts:195, FR-044-CON-1, NFR-017-AC-2, TC-371, TC-359 |
| FND-458 | medium | Guard scoping is broader than the promotion required. Four allowlists — `contract-census.test.ts` (TC-085), `semantic-architecture.test.ts`, `semantic-contract.test.ts` (TC-198), `semantic-ir-v1-1.test.ts` (TC-236) — gained the whole-directory entry `spikes/typespec-feasibility/` rather than the four paths NFR-017 permits, so those four suites now constrain no future change anywhere under the spike, retained evidence included. Separately, `semantic-contract.test.ts` TC-130 replaced `expect(git diff origin/main -- package.json).toBe("")` with an eight-key comparison; `private` and `publishConfig` remain covered by TC-123/TC-124 and both dependency sets by TC-391, but root `scripts`, `engines`, `packageManager` and the `pnpm` block are now pinned by nothing. Verified that the actual `package.json` delta is the single removed `file:` devDependency line, so no protection is being exercised away today — but the manifest-body invariant was narrowed without a replacement assertion. | test/contract-census.test.ts:526, test/semantic-architecture.test.ts:333, test/semantic-contract.test.ts:295-325, test/semantic-contract.test.ts:1094, test/semantic-ir-v1-1.test.ts:227, NFR-012, NFR-013-AC-2, NFR-014-AC-3, NFR-017 Scope |
| FND-459 | low | TC-352/TC-369 verify FR-042-AC-4, FR-043-AC-8 and FR-043-CON-3 by grepping `.mjs` sources for eight forbidden substrings, and skip `cli.mjs` and everything under `emitters/`. FR-043-AC-8 states "No module under `src/compiler/` spawns a process"; three of the fifteen files are exempted from that check by construction. Nothing executes under an instrumented runtime, so a computed specifier or a transitively-imported side effect is invisible; `compile.mjs` passes the grep while calling `NodeHost`, which reads the filesystem. | test/compiler.test.ts:647-673, src/compiler/compile.mjs:1, FR-042-AC-4, FR-043-AC-8, FR-043-CON-3, TC-352, TC-369 |
| FND-460 | low | TC-343 cites FR-041-AC-12 ("`make lint` formats **and typechecks** `src/compiler/`") but runs `pnpm exec biome format src/compiler` and then asserts `existsSync(index.d.mts)`. The format half is real — `biome format` without `--write` exits 1 on unformatted input, confirmed here — and the typecheck half is carried entirely by TC-344. `make lint` itself (`biome format . && tsc --noEmit -p tsconfig.json`) is green but is not what TC-343 runs. | test/compiler.test.ts:549-555, Makefile:21, FR-041-AC-12, TC-343 |
| FND-461 | low | TC-345/TC-393 cite NFR-018-AC-4, "Every added package manifest declares AGPL-3.0-only", and read exactly one hard-coded path (`src/compiler/emitters/semantic-ir/package.json`). That is the only manifest this branch adds, so the row is honest today, but the assertion does not enumerate added manifests and would not notice a second one. | test/compiler.test.ts:577-582, NFR-018-AC-4, FR-041-AC-13, TC-345, TC-393 |
| FND-462 | low | Matrix execution markers lag the run. Line 802 records "vitest 171/172; the single failure is TC-254, pre-existing on main"; measured here 170/172 with TC-254 **and** TC-395 failing. Line 776 records "76 pass" for TC-320..397; 75 pass. TC-395 (line 492) reads `✅ passed` and TC-380 (line 476) reads `✅ passed` with no test at all. The StR-001 rollup (line 46) still reads `🚧 issue #27` while every US-009/FR-040..044/NFR-017/NFR-018 child row already reads `✅ Complete`. | spec/tests.md:46, :476, :492, :776, :802 |
| FND-463 | low | `src/compiler/backends/type-names.mjs` is listed as a `targets` entry of the `typescript-backend` record only, though `backends/rust.mjs` imports `enumMembers`, `replaceEnumMember`, `resolveModelBase` and `simpleReferences` from it. FR-040-AC-5's "exactly one record's `targets`" is satisfied, but FR-042-CON-5's ordered-substitution-table limitation — which TC-358 checks as `limitation` containing "textual substitution" — is recorded against one of the two backends that render through the shared table. | src/compiler/inventory.json (`typescript-backend`, `rust-serde-backend`), src/compiler/backends/type-names.mjs, src/compiler/backends/rust.mjs:1-6, FR-040-AC-5, FR-042-CON-5, TC-358 |
| FND-464 | low | NFR-017-AC-7 and TC-389 say "the **two** retained-evidence host couplings recorded in issue #42"; `docs/semantic-data-system/typespec-feasibility.md` enumerates three under its issue #42 heading (node/rustc versions, `toolchain.json` inside the byte-compared set, and the generated models' `StrEnum`/3.13 floor). TC-389 greps for `issues/42`, `toolchain.json` and `StrEnum`, so it cannot see the count either way. | spec/non-functional/NFR-017-deterministic-promoted-compilation.md (NFR-017-AC-7), docs/semantic-data-system/typespec-feasibility.md:83-95, test/compiler.test.ts:973, TC-389 |

## Coverage

- Target: `plan/Plan-007-promote-prototype-emitters/`; specification: `spec/`;
  matrix: `spec/tests.md`; identity prefix `ix://agent-ix/filament-core-data`.
- Reconciliation: grep index of `/** Traces: … */` lines, cross-checked by hand
  against the matrix `Traces To` column and the `it(...)` each comment precedes,
  as in SR-046. `quire coverage` still attributes this repository's tags to the
  file container rather than the test symbol (SR-046 FND-211); no change.
- **Tasks done: 0 / 8 by frontmatter** (FND-451). By deliverable inspection,
  Task-060..066 are complete and Task-067 is this document plus the code review,
  PR and marker flip. Dependency order 060 → 061 → {062, 063} → 064 → 065 → 066
  → 067 matches the commit sequence `b3d5b6c … eaace46`.
- Matrix rows: 78 of 78 TC-320..397 present in `spec/tests.md`, none missing.
  **Backed by an exact tag: 75** (TC-320..369, TC-371..379, TC-381, TC-383..397).
  Unbacked: TC-380 (FND-452). Correctly marked blocked: TC-370, TC-382.
  Tag-only ids with no matrix row: 0. Every tag sits on an `it(...)`.
  **Passing: 74** — TC-395 is tagged, run, and red (FND-450).
- Acceptance criteria and constraints traced by at least one tag: **63 of 67**
  (FR-040-AC-1..7, FR-040-CON-1..4, FR-041-AC-1..13, FR-041-CON-1..5,
  FR-042-AC-1..11, FR-042-CON-1..5, FR-043-AC-1..8, FR-043-CON-1..3,
  FR-044-AC-2..9, AC-11, AC-12, FR-044-CON-1..3, NFR-017-AC-1..7,
  NFR-018-AC-1..7). Untagged: FR-044-AC-1, FR-044-CON-4, FR-044-CON-5 (the
  TC-370/TC-382 issue #42 block, declared in the test header) and FR-044-AC-10
  (FND-452). Of the 63 traced, four are traced by an assertion that does not
  exercise them: FR-041-AC-1 negative half (FND-453), FR-041-AC-3 second clause
  (FND-454), FR-044-AC-4 (FND-456), NFR-018-AC-6 (FND-450, red).
- Underspecified code: **none**. All fifteen files under `src/compiler/` are
  claimed exactly once — eleven as `targets` of five promoted components
  (`semantic-ir-emitter`, `typescript-backend`, `rust-serde-backend`,
  `python-json-schema-adapter`, `python-generator-pins`) and four in `authored`
  (`index.mjs`, `index.d.mts`, `cli.mjs`, `inventory.json`), each with a reason.
  The fourteen enumerated FR-040 components each hold one record, dispositions
  are inside the closed set (5 promoted, 8 `discard`, 1 `replace-with-official`),
  and every `discard`/`replace-with-official` record carries an empty `targets`.
  `serializeSemanticIr` is exported from `ir.mjs` for `cli.mjs` but is
  deliberately outside the six-symbol interface, matching FR-041. No stubs, no
  skipped cases, no placeholder returns.
- Requirements with no code: none. The four "blocked on issue #42" criteria have
  code (the runner's `--check` path); what is blocked is the host that can run it.
- Execution evidence, this host, 2026-09-03:
  - `pnpm exec vitest run` → **170 / 172, 2 failed** (8 files, 25.3 s).
    `test/compiler.test.ts` 56/57 — TC-395 red (FND-450).
    `test/semantic-core.test.ts` 27/28 — TC-254 red, pre-existing (below).
    `semantic-architecture` 10/10, `typespec-feasibility` 6/6,
    `contract-census` 9/9, `schema` 3/3, `semantic-contract` 14/14,
    `semantic-ir-v1-1` 45/45.
  - `make lint` (`biome format .` over 159 files + `tsc --noEmit -p tsconfig.json`)
    → clean. `make build` (`tsc -p tsconfig.build.json`) → clean.
    `make typecheck` → clean.
  - `quire validate --scope ../filament-core-data-27 "spec/**/*.md"
    "plan/**/*.md"` (quire 0.31.0, engine 0.46.0@ca7362d4) → no document
    diagnostics; the only output is the repository's standing
    `DuplicateArchetype` / `DuplicateInverseEdge` module-set warnings.
- **TC-254 baseline check** (accepted claim, verified): at
  `../fcd-baseline`, detached at `origin/main` `8425a14`,
  `pnpm exec vitest run test/semantic-core.test.ts` → 26/28, failing on
  `expect(manifest.private).toBe(true)` receiving `undefined` — the same
  assertion, the same value, without this branch. Not a regression; issue #43
  stands. (The baseline's second failure is its own missing `jsonschema`
  module, an environment gap in that worktree, not a code defect.)
- **Issue #42 block check** (accepted claim, verified): TC-370 and TC-382 read
  `🚧 blocked on issue #42` at `spec/tests.md:466` and `:479`, the FR-044 row
  reads `⚠️ TC-370, TC-382 blocked on issue #42`, and both ids are excluded from
  the `test/compiler.test.ts` trace inventory with the reason stated. No test
  claims either passes. `docs/semantic-data-system/typespec-feasibility.md`
  carries the couplings (FND-464 on the count).
- **Scoped-guard check** (accepted claim, verified with reservations): the
  invariants survive. Retained evidence is pinned to exactly one file and one
  field by TC-371, with the before/after `command` strings asserted literally;
  `exports`, `main`, `module`, `types`, `files` and `dependencies` are compared
  against `origin/main` and `devDependencies` compared modulo the single removed
  spike-emitter entry by TC-391; TC-278 and TC-234, now pathspec-limited
  `--name-only` diffs, still fail on any other spike change *and* still see
  deletions. What was silently narrowed: the whole-directory
  `spikes/typespec-feasibility/` allowlist entries in four suites, and the
  `package.json` whole-file diff in TC-130 (FND-458); and TC-371 itself cannot
  see a retained file that leaves the tree by rename (FND-457).
- Semantic review: **run**, per the request. FND-450 and FND-453..457 come from
  it. The pattern is a test whose oracle is the shape of the test rather than
  the behaviour of the code — an array-length comparison standing in for a
  mutated module, a temp path standing in for a written output, a source-text
  regex standing in for a process exit code.

## Gate Closure

1. Fix FND-450: make `changedPaths()`/`deletedPaths()` rename-blind
   (`--no-renames`, or diff per pathspec as TC-278 does), re-run, and confirm
   TC-395 is green. Apply the same fix to TC-371 and TC-359 (FND-457).
2. Tag TC-380 / FR-044-AC-10 onto a real changed-path assertion, or record it
   blocked; do not leave it `✅ passed` unbacked (FND-452).
3. Rewrite TC-332 and TC-334's output clause so they can fail (FND-453,
   FND-454); drop the hard-coded worktree name from TC-341/TC-386 (FND-455).
4. Decide on FND-456: either exercise `run-experiment.mjs --check` against a
   scratch tree with the lockfile removed, or record in the matrix that
   FR-044-AC-3/AC-4/AC-7 are verified by inspection of the runner source.
5. Narrow the four `spikes/typespec-feasibility/` allowlist entries to the four
   permitted paths and restore a manifest-body assertion for TC-130 (FND-458).
6. Flip Task-060..067 to `done`, check the `plan.md` boxes, add the Task File
   Mapping table (FND-451), and re-measure every TC-320..397 marker plus the
   lines 46, 776 and 802 rollups against the corrected run (FND-462).

## Disposition (applied after the analysis)

Every high and every medium was acted on. The verdict above stands as recorded
at analysis time; the state below is what the branch now holds.

| Finding | Disposition |
|---|---|
| FND-450, FND-457 | Fixed. `--no-renames` added to every changed-path helper in all four test files. This was the same root cause the code review found independently: git scored the emitter moves as renames, so no gate built on `changedPaths()` could see a deletion — including TC-371 and TC-359, the compensating oracles for the frozen goldens. |
| FND-451 | Fixed. Task-060..066 are `status: done` with their subtasks checked, Task-067 stays in progress, the plan's requirement and test checkboxes are ticked, and `plan.md` gains a Task file mapping table. |
| FND-452 | Fixed. TC-380 now has its own test, which discharges FR-044-AC-10 from the branch diff — asserting no changed path falls under `schema/`, `fixtures/`, `packages/`, `agent_ix_core_data/`, `src/generated.ts`, `audit/` or `.github/`. The `validation.json` counters are read only as corroboration, which is what the AC permits. |
| FND-453 | Fixed. See the code review's FND-432. |
| FND-454 | Fixed. The "writes no output" clause now exercises `cli.mjs`, which is the route that owns `--out`; `compileSemanticIr` takes no output path, so asserting one against it was trivially true. |
| FND-455 | Fixed. TC-341 uses `basename(root)` instead of the literal worktree name, so a determinism test no longer depends on the checkout directory. |
| FND-456 | See the code review's FND-433 disposition. |
| FND-458 | Fixed. The four whole-directory `spikes/typespec-feasibility/` widenings became the four specific paths the branch changes, and the `package.json` key comparison went from 8 keys back to 15, restoring `scripts`, `packageManager`, `repository` and the rest to the pinned set. |
| FND-459 | Fixed. The process-spawn assertion now covers every `.mjs` under `src/compiler/`, including `cli.mjs` and the emitter. |
| FND-460, FND-461 | Fixed. See the code review's FND-434 and FND-461. |
| FND-462 | Fixed. All matrix markers recomputed from the rows; the execution line reads 172/173 and names TC-254 as the pre-existing failure. |
| FND-463 | Fixed. `type-names.mjs` moved from `typescript-backend`'s targets into the `authored` ledger, with a reason recording that the prototype declared those helpers at module scope beside both generators, so neither backend record owns the extracted file. |
| FND-464 | Fixed. NFR-017-AC-7 and TC-389 now say three couplings and require the one the promotion repairs to be distinguished from the two it does not. |
