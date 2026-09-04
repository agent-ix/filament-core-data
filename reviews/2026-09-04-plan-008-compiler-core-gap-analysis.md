---
id: SR-074
title: "Gap analysis — Plan-008 TypeSpec frontend and IR compiler core"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-008-typespec-frontend-and-ir-compiler-core/, spec/usecase/US-010-*.md, spec/functional/FR-045-*.md..FR-053-*.md, spec/non-functional/NFR-019-*.md..NFR-021-*.md, spec/tests.md TC-398..619, src/compiler/ (excluding ir.mjs, compile.mjs, identity.mjs, emitters/, backends/, inventory.json), scripts/*.mjs, test/compiler-core.test.ts, test/fixtures/compiler/"
review_set: subset
---
# Gap analysis — Plan-008

## Summary

Plan-008 (issue #19, branch `spec/19-typespec-frontend-and-ir-compiler-core`) is
a large and, on its mechanical measures, an unusually clean piece of work. The
traceability is exact in both directions: **222 of 222** matrix ids TC-398..619
carry a `/** Traces: … */` tag in `test/compiler-core.test.ts`, **0** tags name
an id the matrix does not carry, and all **200** acceptance criteria and
constraints of FR-045..053 and NFR-019..021 are named by at least one tag. Every
tag sits on an `it(...)`; nothing is skipped or todo'd. Task-068..078 are
`status: done` with their subtasks checked, Task-079 is correctly still in
progress, and no byte under any prohibited path is changed — `git diff
--no-renames origin/main...HEAD` touches `schema/`, `fixtures/`, `packages/`,
`spikes/`, `conformance/`, `tests/`, `agent_ix_core_data/`, `.github/` and the
three frozen prototype modules not at all. The CLI works end to end and two
`compile` runs of the assurance fixture are byte-identical. `make lint`,
`make build` and `make typecheck` are green.

Beneath that, the semantic pass found substantially more than the trace index
can see. Three classes of defect run through the ticket.

**First, the suite is red and non-deterministic.** Three consecutive full runs on
this host gave **293/299**, **297/299** and **299/299**. The changed-path guards
read the *live working tree* (`git status --porcelain --untracked-files=all`),
and two tests in other vitest workers transiently write into the repository
while they run — `test/compiler.test.ts` TC-344 drops
`test/declaration-drift-probe.ts` into `test/`, and `test/semantic-core.test.ts`
TC-264 mutates `packages/semantic-core/generated/json-schema/EnumValue.json`,
which is a **prohibited** path for this branch. Whichever guard happens to
sample the tree during that window fails. The plan log and `spec/tests.md` both
record "299 vitest cases across 9 files, all passing" (FND-680).

**Second, four requirements are not implemented as written, and the tests that
should have caught it were written to the code instead of to the criterion.** The
package resolver does not select the highest version satisfying *every*
constraint — it selects the highest satisfying the *first* constraint it meets
and then diagnoses. Reproduced here: with constraints `1.3.0` and `^1.0.0` on
one identity and a registry offering 1.3.0 and 1.9.0, listing `^1.0.0` first
selects **1.9.0** and raises a false `IMPORT_VERSION_CONFLICT` whose message
asserts "no single version … satisfies every constraint on it: 1.3.0, ^1.0.0";
reversing the two `imports` entries selects **1.3.0** with **zero** diagnostics
(FND-681). FR-053-CON-1's identity parity with FR-034 does not hold: a real
compile of the assurance package emits `ix://agent-ix/assurance/type/Artifactcode`
where FR-053 and FR-034 both say `ArtifactCode`, and
`agent-ix.assurance.ARTIFACT_CODE_MIN_LENGTH` where FR-034's rule gives
`ARTIFACT_CODE_MINLENGTH`; TC-417 asserts the divergent values as its
expectation under a comment claiming they were "written from the requirement
text" (FND-682). `maxDiagnostics` is never applied — `applyDiagnosticLimit` has
**zero call sites** in `src/` (FND-684) — and `maxDepth` is never a diagnostic
anywhere, only a thrown `CanonicalLimitError` no caller catches (FND-685).

**Third, several oracles cannot fail.** TC-595, the NFR-021-AC-6 restore
rehearsal, writes each file's `origin/main` bytes into a scratch directory and
asserts the bytes it just wrote equal the bytes it read; it never reverts
anything and never re-runs a single test case (FND-688). TC-467's
`PATH_ESCAPE` assertion is `includes(PATH_ESCAPE) || diagnostics.length === 0`,
a disjunction whose second branch is the one actually taken (FND-689). TC-495's
locale-independence check is `expect(sortDiagnostics(list)).toEqual(sortDiagnostics(list))`
inside a loop over two locales (FND-690). And TC-470 hand-constructs
`diagnostic(LIMIT_MAX_DEPTH, …)` purely to feed `observedCodes`, the file-global
set that TC-494/TC-609 read as proof that "every registry code fires at least
once across the fixture corpus" — fabricated coverage for a code no production
path emits (FND-685).

What is genuinely strong, and worth recording: the diagnostic registry is closed
and exact in both directions (65 declared, 65 named, no string literal outside
the builder); all 22 FR-050 cross-field rules exist; the compatibility
classifier is computed from the two IR documents against an *independent*
published oracle — `fixtures/semantic/v1/compatibility/cases.json`, 40 cases,
40/40 agreements, 0 disagreements, byte-unchanged on this branch; the RFC 8785
key ordering and scalar serialization are correct rather than approximated;
normalization genuinely reaches a fixed point under a real double application;
every import, cycle, unknown-mapping, duplicate-export, digest-conflict,
version-conflict and undeclared-loss fixture produces its exact code at a real
line and column; and the seam refuses `spec-bundle` by name rather than guessing.

Finding ids run FND-680..FND-714 as requested.

## Verdict

**FAIL** — fourteen `high` findings, of which four are pre-merge blockers on
their own: FND-680 (the suite is red and the recorded 299/299 is not
reproducible), FND-681 (the resolver's answer depends on `imports` array order,
which NFR-019 and FR-047 both forbid), FND-682 (FR-053-CON-1's whole point —
one identity rule shared with FR-034 — does not hold, and the test asserts the
divergence), and FND-684/FND-685 (two of the five declared limits are inert).
FND-688, FND-689, FND-690 and FND-685's `note([...])` are gates that cannot
fail, which means four criteria are recorded `✅ passed` on no evidence.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-680 | high | `make test` is red and non-deterministic. Three consecutive runs on this host: **293/299 (6 failed, 5 files)**, **297/299 (2 failed, 1 file)**, **299/299**. `changedPaths()` unions `git diff --no-renames --name-only origin/main...HEAD` with `git status --porcelain --untracked-files=all`, so every changed-path guard samples the live working tree. Two tests in other vitest workers write into the repository while they run: `test/compiler.test.ts:679-681` (TC-344) writes `test/declaration-drift-probe.ts`, and `test/semantic-core.test.ts:673-676` (TC-264) rewrites `packages/semantic-core/generated/json-schema/EnumValue.json` — a **prohibited** path — restoring both in a `finally`. Run 1 failed six guards on the probe file; run 2 failed the two `compiler.test.ts` guards on `EnumValue.json` (`mutation outside the promotion: packages/semantic-core/generated/json-schema/EnumValue.json`); run 3 was lucky. `make lint` also exited 2 on the first attempt, `tsc` having found the probe file. `spec/tests.md:1140` records "299 vitest cases across 9 files" all passing and `plan/.../log.md` records "**299 vitest cases across 9 files, all passing**". The same hole means a guard can pass *while* a prohibited path is mutated. | test/compiler.test.ts:76-90 `changedPaths`, test/compiler.test.ts:679-695, test/semantic-core.test.ts:657-695, test/compiler-core.test.ts:3901 (same `changedPaths` pattern), spec/tests.md:1140, plan/Plan-008-typespec-frontend-and-ir-compiler-core/log.md, NFR-021-AC-1, TC-590 |
| FND-681 | high | Package candidate selection is not the specified rule, and the resolution depends on `imports` array order. FR-047 requires selecting "among the candidates satisfying **every** constraint on one identity, the one with the highest version", and requires the graph to resolve identically "for any permutation of an `imports` array". `resolve.mjs:322-338` takes `matching[0]` — the highest version satisfying only the first-encountered constraint — and `:345-364` merely diagnoses afterwards. Reproduced with a scratch registry offering `agent-ix/core` 1.3.0 and 1.9.0 and constraints `1.3.0` + `^1.0.0` (1.3.0 satisfies both): with `^1.0.0` listed first the resolver selects **core@1.9.0** and emits `IMPORT_VERSION_CONFLICT :: no single version of agent-ix/core satisfies every constraint on it: 1.3.0, ^1.0.0` — a false statement; with `1.3.0` listed first it selects **core@1.3.0** with an **empty** diagnostic list. Same graph, two answers. TC-465/TC-466/TC-618 exercise only single-constraint and search-directory tie-breaks, and NFR-019-AC-4 varies the *search path*, never the `imports` order, so nothing in the suite can see this. The declared-order tie-break at `resolve.mjs:175` is dead code — `discoverCandidates` already keys on `identity@version` and keeps the first directory's entry at `:138-141`. | src/compiler/packages/resolve.mjs:105-141, :175, :322-364, FR-047-AC-3, FR-047-AC-5, FR-047-CON-2, NFR-019-AC-4, TC-465, TC-466, TC-618 |
| FND-682 | high | FR-053-CON-1 — "the minted identities and the constraint-alias rule SHALL equal those of FR-034" — does not hold, and TC-417 asserts the divergence. FR-053 states the alias is `ix://<package identity>/type/<Name><Field>` "exactly as FR-034 requires"; `test/semantic-core-lowerer.ts:126` mints `${owner}${pascal(name)}`. `identity.mjs:58-62` mints `${slug(owner)}${slug(field)}` with no pascal-casing. Proven by compiling the assurance fixture through `src/compiler/cli.mjs compile`: the emitted document contains `ix://agent-ix/assurance/type/Artifactcode` with `displayName: "Artifactcode"`, where FR-034 and FR-053 both give `ArtifactCode`. The second half diverges too: the same constraint carries `diagnosticCode: agent-ix.assurance.ARTIFACT_CODE_MIN_LENGTH`, because `upperSnake` (`identity.mjs:64-69`) inserts a separator at every lower→upper boundary; FR-034 (`semantic-core-lowerer.ts:142`) does a plain `toUpperCase()` and gives `ARTIFACT_CODE_MINLENGTH`, and FR-053's own wording ("upper snake of the slugged owner parts", "every `-` becomes `_`") gives the same, since `slug("minLength")` contains no `-`. TC-417's comment reads "The expectations are written from the requirement text, and the implementation is asked to agree with them rather than the other way round", immediately above `expect(constraintAliasIdentity(pkg, "Artifact", "code")).toBe("ix://agent-ix/assurance/type/Artifactcode")`. FR-053-AC-6 requires the correspondence be "computed by a shared table rather than by two hand-written lists" and FR-053-CON-1's method is "Differential test"; `test/compiler-core.test.ts` never imports `test/semantic-core-lowerer.ts` as an oracle — it appears only in an unchanged-paths list at `:3950`. | src/compiler/frontend/typespec/identity.mjs:56-86, test/semantic-core-lowerer.ts:56, :126-127, :142, spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:71-72, test/compiler-core.test.ts:635-670, FR-053-AC-6, FR-053-AC-9, FR-053-CON-1, TC-417, TC-419, TC-420 |
| FND-683 | high | An imported package's manifest bytes are outside the fingerprint entirely. FR-048 defines `fingerprint` over `[schemaBytes, manifestDigest, mappingDigests, profileDigests, resolvedPackages, contractVersion]`; `lock.mjs:106` supplies only `resolution.root.manifestDigest`, and each package's `contentDigest` covers only files beneath its `sourceRoots` (`lock.mjs:76-86`), which excludes `package-manifest.json` at the package root. A dependency's `exports`, `imports`, profile capabilities or targets can be rewired and the fingerprint is byte-identical; `verifyLock` compares `packages[].dependencies` and `packages[].sourceIdentity` against nothing (`lock.mjs:139-140`, `:186-230`). FR-048-CON-1 ("the fingerprint SHALL change for every change to an included input") is satisfied only for the inputs the code happens to include. TC-484..TC-488 vary the root manifest, a mapping, a profile, a source file and a schema file — never an imported manifest. | src/compiler/packages/lock.mjs:76-86, :103-119, :139-140, :186-230, spec/functional/FR-048-build-and-verify-the-lock-and-fingerprint.md:56, FR-048-AC-3, FR-048-CON-1, TC-484..TC-488 |
| FND-684 | high | `maxDiagnostics` is never applied by any compile path. `grep -rn applyDiagnosticLimit src/` matches only its definition (`diagnostics.mjs:242`) and its `.d.mts` declaration — zero call sites. `cli.mjs:170`, `pipeline.mjs:61,:137` and `frontend/typespec/frontend.mjs:132,:150,:163` sort and stop. `DEFAULT_LIMITS.maxDiagnostics: 1000` (`diagnostics.mjs:144`) is inert, and FR-049's "the compiler SHALL sort the accumulated diagnostics before applying `maxDiagnostics`" is unimplemented outside the unused helper. FR-049-AC-8 requires "a fixture producing five defects" under `maxDiagnostics: 2`; TC-499 (`test/compiler-core.test.ts:2434-2472`) instead hand-builds five `diagnostic()` objects and calls `applyDiagnosticLimit` directly — no fixture form could have passed. The function itself is correct: it sorts, slices, then appends the marker. | src/compiler/diagnostics.mjs:139-145, :242-251, src/compiler/cli.mjs:170, src/compiler/pipeline.mjs:61,:137, test/compiler-core.test.ts:2434-2472, FR-049-AC-8, FR-049-AC-9, TC-499, TC-500 |
| FND-685 | high | `maxDepth` is never a diagnostic, and its coverage evidence is fabricated. FR-047 requires "if the JSON pointer index exceeds `maxDepth` nesting levels, then the compiler SHALL raise the corresponding blocking limit diagnostic and stop"; FR-050-AC-9 names `maxDepth` among the four inputs that must "produce a diagnostic and terminate". `grep -c 'maxDepth\|LIMIT_MAX_DEPTH' src/compiler/ir/reader.mjs` → **0**; the reader guards only `maxNodes` and `maxCollectionItems`. `json-locus.mjs:148-208` has no depth guard at all. The only enforcement is a thrown `CanonicalLimitError` inside `canonicalize` (`canonical.mjs:50`) that no caller catches — TC-470's own assertion is `expect(() => canonicalize(deep, {maxDepth: 10})).toThrow(/maxDepth/)`. `DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH` is therefore emitted by no production path. TC-470 then closes the gap by hand: `note([diagnostic(DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH, { message: "bounded" }), …])` at `test/compiler-core.test.ts:1895-1900` inserts the code straight into `observedCodes`, the file-global set TC-494/TC-609 read to assert that "every registry code fires at least once across the fixture corpus". This is the only `note([` call in the file, and it exists solely to satisfy FR-049-AC-3 for a code nothing emits. TC-518 has no `maxDepth` case. | src/compiler/ir/reader.mjs:93-99,:253-260, src/compiler/packages/canonical.mjs:25,:47-50, src/compiler/json-locus.mjs:148-208, test/compiler-core.test.ts:1885-1901, :2792-2884, :4254-4261, FR-047-AC-17, FR-048-AC-6, FR-049-AC-3, FR-050-AC-9, TC-470, TC-494, TC-518, TC-609 |
| FND-686 | high | An unknown consumer-evidence status *downgrades* a change that is already breaking. `diff.mjs:161-172` overrides every entry's disposition with `"unknown"` whenever `consumerEvidenceStatus === "unknown"`, and `DISPOSITION_RANK` (`:22-29`) places `unknown` **below** `breaking` and `invalid`. Reproduced: a required-field addition with `consumerEvidenceStatus: "unknown"` aggregates to `unknown`; the same input with evidence omitted aggregates to `breaking`. FR-025's behaviour rules make a required-field addition and a member removal breaking irrespective of consumer evidence, and FR-051-CON-1 forbids reporting a change as compatible on insufficient evidence — an evidence gap must never make a report *less* restrictive. The code follows FR-051's last table row literally, so the published table is as much at fault as the code; the row needs scoping to changes not already ranked above `unknown`. No published case pairs `unknown` evidence with a breaking change, so the 40/40 corpus agreement cannot see it. | src/compiler/compat/diff.mjs:22-29, :161-172, spec/functional/FR-051-diff-and-evolve-the-semantic-ir.md (classification table), FR-025 Behavior, FR-051-AC-3, FR-051-CON-1, TC-527, TC-602 |
| FND-687 | high | A `1.0.0` → `1.1.0` uplift that carries any real change is reported `breaking` with phantom entries, defeating NFR-013's additive-revision guarantee. `diff.mjs:195-217` sets `versionUplift` only when the projection back to the old version is byte-identical; otherwise both type maps are populated and the full diff runs a `1.0.0` document (no `multiplicity`, no `unit`) against a `1.1.0` one. Reproduced against the committed goldens: `diffSemanticContract({old: forward-1-0-0.document, new: backward-1-1-0.document})` gives `additive` with 1 change; adding a single optional field to the new document gives **`breaking` with 8 changes**, six of them `multiplicity changed from null to {"lower":1,"upper":1}` and the like — changes that did not occur. The one genuine entry reads `the optional field undefined was added`, so the rationale loses the field's `displayName` as well. TC-541/TC-542 exercise only the exact-uplift path. | src/compiler/compat/diff.mjs:94-107, :195-217, :496-503, test/fixtures/compiler/evolution/, NFR-013, FR-051-AC-6, TC-541, TC-542, TC-545 |
| FND-688 | high | TC-595, the NFR-021-AC-6 restore rehearsal, cannot fail and does not rehearse anything. The criterion is "reverting the branch leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand". The test iterates `changedPaths()`, reads each file's `origin/main` bytes with `git show`, writes them into a scratch directory, and asserts `readFileSync(target).equals(original)` — the bytes it wrote one line earlier. It never reverts the working tree, never invokes vitest, and never compares a case count. `expect(restored).toBeGreaterThan(0)` is the only other assertion. The scratch directory is deleted in the `finally`. Nothing about the suite's post-revert state is observed. | test/compiler-core.test.ts:4008-4035, NFR-021-AC-6, TC-595 |
| FND-689 | high | TC-467's `PATH_ESCAPE` oracle is a disjunction that passes on the branch actually taken, and the diagnostic never fires. The assertion is `expect(codesOf(resolution.diagnostics).includes(PATH_ESCAPE.code) || resolution.diagnostics.length === 0).toBe(true)`. `host.isDirectory`/`host.exists` swallow `PathEscapeError` and return `false` (`host.mjs:127-140`), so `discoverCandidates` silently `continue`s past a symlinked search-directory entry (`resolve.mjs:105-108`) and the resolution ends with an **empty** diagnostic list — the right-hand branch. FR-047-AC-12 requires `PATH_ESCAPE`. Confinement itself holds (the smuggled package is refused, `refusedReads` is non-zero); only the required diagnostic is absent, and the test is written so that either outcome passes. | test/compiler-core.test.ts:1720-1750, src/compiler/host.mjs:127-140, src/compiler/packages/resolve.mjs:105-108, FR-047-AC-12, NFR-020-AC-4, TC-467 |
| FND-690 | high | TC-495's locale-independence oracle compares an expression with itself. FR-049-AC-4 requires the emitted order be unchanged "for at least two `Intl.Collator` locales"; `test/compiler-core.test.ts:2368-2373` loops over `["en-US","sv-SE"]` and asserts `expect(new Intl.Collator(locale).compare("a","b")).toBeLessThan(0)` — a property of `Intl`, not of the sorter — followed by `expect(sortDiagnostics(list).map(...)).toEqual(sortDiagnostics(list).map(...))`, the identical expression on both sides. Every fixture string in the test is ASCII, so no collator-sensitive input (the `a`/`ä`/`z` case sv-SE exists to expose) is ever built. The forward/reverse half at `:2357-2365` is real, and the comparator itself is genuinely collator-free — `byCodePoint` (`diagnostics.mjs:196-200`) uses plain relational operators and no `Intl` or `localeCompare` appears anywhere in `src/compiler/` — so the property holds; it is the evidence that is absent. | test/compiler-core.test.ts:2357-2374, src/compiler/diagnostics.mjs:196-235, FR-049-AC-4, NFR-019-AC-6, TC-495, TC-574 |
| FND-691 | high | Every manifest locus names the wrong source. `resolve.mjs:115` and `:251` hardcode `sourceIdentityFor("agent-ix/unresolved", "manifest")`, and the identity is never re-stamped once the manifest's own package identity is known. Verified on the `version-conflict` fixture: both the primary and the related locus of `IMPORT_VERSION_CONFLICT` print byte-identically as `{"sourceIdentity":"ix://agent-ix/unresolved/source/manifest","path":"package-manifest.json","startLine":11,"startColumn":3}`. FR-047 requires `ix://<owning package identity>/source/manifest` and a path relative to the owning package root; FR-047-AC-2 requires the conflict to name **both** requiring loci, which here are indistinguishable — the same for `digest-conflict` (both `3:2`), `package-cycle` (both `11:3`) and `duplicate-export` (both `10:3`). TC-469 asserts only `/^ix:\/\//` on `sourceIdentity` (`:1838`), so `agent-ix/unresolved` passes. Mapping and profile loci are stamped correctly (`resolve.mjs:499`, `:545`). | src/compiler/packages/resolve.mjs:115, :251, test/compiler-core.test.ts:1838, FR-047-AC-1, FR-047-AC-2, FR-047-AC-14, TC-456, TC-469 |
| FND-692 | high | NFR-019-AC-10's "the count of unobserved operations is zero" is never counted. The criterion requires that every file-system read and JavaScript module load a fixture compile performs be observed by the injected host, "counted at run time", with the unobserved count asserted zero. TC-406/TC-576/TC-589 (`:450-463`) asserts `host.record.reads.length > 0`, that each recorded read starts with `root`, and that `refusedReads` is empty — all facts about what the host *did* see. Nothing instruments `node:fs`, so a read that bypassed the host is invisible by construction and the count of unobserved operations is never formed. `schema-validate.mjs` makes this concrete: its module-level `cached` (`:17`, `:21`) means only the *first* caller's host performs the schema reads, so every later compile in the same process performs zero observed schema reads and the test cannot notice. Task-078's subtask "count every read and module load the injected host did not see across a full fixture compile, and assert zero" is checked off against this test. | test/compiler-core.test.ts:450-463, src/compiler/schema-validate.mjs:17-48, plan/Plan-008-typespec-frontend-and-ir-compiler-core/tasks/Task-078-determinism-safety-and-non-disruption-gates.md, NFR-019-AC-10, NFR-020-AC-11, FR-045-AC-9, TC-406, TC-576, TC-589 |
| FND-693 | high | Lock diagnostics carry a locus path the published schema forbids. `pipeline.mjs:83-92` reads the caller's `--lock` document through `readDocument` with the *package* root as the base, so `relativePosix` (`manifest.mjs:27-29`) produces a path full of `..` segments whenever the lock lives outside the package — which `cli.mjs:147-158` explicitly documents as normal ("the lock may live anywhere"). `schema/semantic/v1/common.schema.json:32` forbids `..` in `sourceLocus.path`, and FR-047 requires a `..`-free relative path in every locus. `STALE_LOCK` otherwise lands exactly where FR-048 says: line 4, column 2, the `"fingerprint"` key of a tab-indented lock, via `locateJsonPointer(lockText, pointer, "key")`. | src/compiler/pipeline.mjs:83-92, src/compiler/packages/manifest.mjs:27-29, src/compiler/packages/lock.mjs:156-183, src/compiler/cli.mjs:147-158, schema/semantic/v1/common.schema.json:32, FR-047-AC-15, FR-048-AC-8, TC-489, TC-490 |
| FND-694 | medium | `src/compiler/frontend/typespec/vocabulary.mjs` does not exist. FR-053's Outputs name it ("the decorator state readers used by the lowering"), the plan's Seams diagram draws it, and Task-073's fifth subtask — "`src/compiler/frontend/typespec/vocabulary.mjs`: read the state maps, apply repeatability, and raise `DUPLICATE_DECORATOR`" — is checked `[x]`. The directory holds only `frontend.mjs`, `host.mjs`, `identity.mjs`, `lower.mjs` and `lib/`. The behaviour is real but folded into the 36 KB `lower.mjs` (`DUPLICATE_DECORATOR` at `:349`), so the deliverable is checked off against a file that was never written and the spec's Outputs list is stale. | spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:43, plan/Plan-008-.../plan.md (Seams), plan/Plan-008-.../tasks/Task-073-semantic-vocabulary-and-identities.md, src/compiler/frontend/typespec/, src/compiler/frontend/typespec/lower.mjs:349 |
| FND-695 | medium | TC-590's permitted-path list is wider than the requirement it verifies. NFR-021-AC-1 is "every changed path on the branch is in the permitted set", and the permitted set is NFR-019's Scope, which enumerates `src/compiler/{diagnostics,inspect,json-locus,pipeline,host,cli,index}.mjs` and `index.d.mts` by name. The test's `permitted` array (`:3903-3928`) adds three entries the spec does not carry: `biome.json`, `src/compiler/dialects.`, and `src/compiler/schema-validate.`. All three are genuinely changed or added by the branch — `biome.json` gains two formatter exclusions for the generated fixture trees — so the gate is honest about the tree; it is the *criterion* that was not updated, and the test now certifies itself. The list also carries a bare `test/` and a bare `package.json`, where NFR-019 permits only `package.json` `scripts` (the actual delta is the one `lint` line, so nothing is being exercised away today). | test/compiler-core.test.ts:3903-3928, spec/non-functional/NFR-019-deterministic-contract-compilation.md:32, NFR-021-AC-1, TC-590 |
| FND-696 | medium | NFR-019-AC-3's scope includes `cli.mjs`, and `cli.mjs` violates it; the verifying test excludes `cli.mjs` from the scan. AC-3 forbids `process.cwd`, `Date`, `Intl`, `path.sep` and "`node:fs` outside a test" in every module in scope, and NFR-019's Scope names `src/compiler/cli.mjs` explicitly. `cli.mjs:16` imports `mkdirSync, readFileSync, renameSync, writeFileSync` from `node:fs` and `:129` calls `process.cwd()`. TC-565/566/569 (`:3816-3866`) builds its scan list by hand from `frontend/`, `packages/`, `ir/`, `compat/` and six named modules, omitting `cli.mjs` and `host.mjs`, then checks only `cliSource.includes("process.env") === false` for the CLI. The `process.cwd()` call is on the frozen `emit-ir` prototype route and the `node:fs` use is the CLI's own I/O, both defensible — but the criterion says otherwise and no disposition records the carve-out. | src/compiler/cli.mjs:16, :129, test/compiler-core.test.ts:3816-3866, spec/non-functional/NFR-019-deterministic-contract-compilation.md:32, NFR-019-AC-3, TC-565, TC-566, TC-569 |
| FND-697 | medium | Four modules in the reviewed scope are owned by no requirement's Outputs. `src/compiler/dialects.mjs` (holding `FRONTEND_DIALECTS`, which FR-045's Outputs place in `frontend/seam.mjs`), `src/compiler/schema-validate.mjs` (four exports; FR-050's Outputs name only `ir/schema.mjs`), `src/compiler/ir/applicability.mjs` (six exports; FR-053 says the frontend "SHALL read that applicability table from the same module the FR-050 reader reads it from" without naming it), and `src/compiler/host.mjs` (four exports, the mechanism the whole NFR-019/NFR-020 argument rests on) appear only inside NFR-019's and NFR-020's "Applies to" lists — `dialects.mjs` and `schema-validate.mjs` not even there. `plan/.../log.md` records the reason `dialects.mjs` exists (the seam could not read `common.schema.json` with `node:fs` under FR-046-CON-4), which is exactly the kind of forced move that should have amended FR-045's Outputs. This is the reverse gap: code with no owning requirement. | src/compiler/dialects.mjs:15, src/compiler/schema-validate.mjs:20-72, src/compiler/ir/applicability.mjs:12-62, src/compiler/host.mjs:51-216, spec/functional/FR-045-define-the-frontend-seam.md Outputs, spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md Outputs, plan/Plan-008-.../log.md |
| FND-698 | medium | `schemaValidators` caches the compiled schema set in a module-level variable keyed on nothing. `schema-validate.mjs:17` declares `let cached`, `:21` returns it unconditionally, and `resetSchemaValidators()` (`:47-49`) exists as a "test seam" to clear it. A second call with a different `host` or `root` silently receives the first caller's schemas — a process-global that makes two compiles in one process share state the NFR-019 argument assumes is per-run, and that makes every schema read after the first invisible to the injected host (see FND-692). The repository root itself is derived from `import.meta.url` rather than `cwd`, which is correct. | src/compiler/schema-validate.mjs:17-49, src/compiler/packages/lock.mjs:20, NFR-019-AC-10, FR-050-AC-1 |
| FND-699 | medium | The two evolution goldens are generated by the code under test, so TC-533/TC-534's byte-equality proves nothing. `scripts/build-evolution-goldens.mjs:16` imports `readIrAsContract` from `src/compiler/compat/evolution.mjs` and writes its output verbatim; both goldens landed in the same commit as the code (`6d53e12`), and `pnpm run lint` re-verifies them with `--check` against the same function. `test/compiler-core.test.ts:3131-3133` and `:3148-3150` then compare `readIrAsContract(source)` against a file `readIrAsContract(source)` wrote. TC-535 has the same shape: `down(up(x))` where `up` only *adds* `field.multiplicity` where absent and `down` only *deletes* the 1.1.0 members, so the identity holds by construction for any input lacking them, and it compares by `normalizeIr` where FR-051-AC-9 says byte-identical. The surrounding assertions — loss non-empty, schema-valid at the target version, `source.digest` and `package` verbatim — are real, and the forward projection does genuinely declare 15 lost identities. Contrast the compatibility corpus, whose oracle **is** independent (see Coverage). | scripts/build-evolution-goldens.mjs:16-46, test/compiler-core.test.ts:3119-3167, FR-051-AC-7, FR-051-AC-8, FR-051-AC-9, TC-533, TC-534, TC-535 |
| FND-700 | medium | One of FR-050's 22 reader rules fires in no reader test, and the comment claiming otherwise is false. All 22 rules are implemented; `NODES_ON_NON_RECORD` (`reader.mjs:269-279`) is reached by neither `fixtures/semantic/v1/negative/reader-cases.json` (15 of 22 codes) nor TC-520's six constructed mutations (`:4111-4128`). FR-050-AC-11 ("every rule of the code table fires on a constructed document") is therefore unmet. The FR-049-AC-3 closing gate passes only because the *frontend* emits the same code at `:800-802`, on a path that never calls `readContractIr`. `test/compiler-core.test.ts:769` asserts "The rule itself is exercised through the reader (TC-520)". | src/compiler/ir/reader.mjs:269-279, test/compiler-core.test.ts:769, :800-802, :4088-4140, fixtures/semantic/v1/negative/reader-cases.json, FR-050-AC-11, TC-511, TC-520 |
| FND-701 | medium | `fragment()` truncates by UTF-16 code unit and splits surrogate pairs. `diagnostics.mjs:161-166` measures `text.length` and slices at 119. Executed here: `fragment("😀".repeat(200))` returns a 120-unit string of **61 code points** whose 120th-from-last character is a **lone high surrogate** (`/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/` matches), i.e. an emitted diagnostic message that is not well-formed Unicode. FR-049-CON-2 says "120 characters". TC-501 uses `"a".repeat(n)` exclusively and its constructed-message oracle is `toBeLessThan(200)`, where FR-049-AC-10 bounds the message at 120 — the message it builds is 148 characters and passes. | src/compiler/diagnostics.mjs:155-166, test/compiler-core.test.ts:2476-2484, FR-049-AC-10, FR-049-CON-2, TC-501 |
| FND-702 | medium | The fingerprint's canonical bytes disagree with FR-048's own definition in two places. FR-048 defines `resolvedPackages` as the identity-sorted list of `{ identity, version, contentDigest }` **objects**; `lock.mjs:113-115` emits three-element **arrays**. FR-048 says the profile digests are identity-sorted; `lock.mjs:110-112` keys them on `profile.name`. A second implementation following the requirement text produces a different fingerprint from the same inputs — precisely the failure the "every digest is defined by its byte set" preamble at `lock.mjs:2-9` exists to prevent, and which FR-048-CON-4 makes the point of the requirement. | src/compiler/packages/lock.mjs:103-119, spec/functional/FR-048-build-and-verify-the-lock-and-fingerprint.md:56, FR-048-AC-1, FR-048-CON-4, TC-479, TC-491 |
| FND-703 | medium | Duplicate exports are keyed on the export *name*, not the type identity, and the fixture matches the code rather than the requirement. FR-047: "if a manifest exports a type **identity** twice"; `resolve.mjs:375` tests `seen.has(item.name)`. `test/fixtures/compiler/cases/duplicate-export/root/root/package-manifest.json:9-20` repeats the name `Actor` across two different `typeIdentity` values, so the case exercises the implemented rule. A manifest that genuinely repeats one identity falls into the cross-package branch and emits `… is exported by both agent-ix/dup and agent-ix/dup`. FR-047-AC-10's first clause is unexercised. | src/compiler/packages/resolve.mjs:370-385, test/fixtures/compiler/cases/duplicate-export/root/root/package-manifest.json:9-20, FR-047-AC-10, TC-461 |
| FND-704 | medium | Two reader rules are wider or narrower than FR-050 authorizes. `reader.mjs:141-153` records a suppression instead of raising `UNRESOLVED_TYPE_REF` whenever `exportsUnknown`, but FR-050 scopes the `unknown` suppression to `UNRESOLVED_RELATIONSHIP_TARGET` alone; worse, `:72` treats an absent `importedExports` as `"unknown"`, so the plain `readContractIr(doc)` call — the one TC-518 (`:2808`, `:2843`) and the TC-522 fuzz loop (`:2946`) use — silently disables the rule. Separately, `:224` compiles a pattern operand with `new RegExp(String(operands.regex), "u")`; unicode mode rejects patterns legal under plain ECMA-262 (identity escapes such as `\-`, unpaired `{`), so conforming documents are refused where FR-050 says "compiles under ECMA-262", and a missing operand stringifies to `"undefined"` and compiles cleanly. | src/compiler/ir/reader.mjs:66-76, :141-153, :218-232, spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md (cross-field rule table), FR-050-AC-2, FR-050-CON-3, TC-511, TC-518, TC-522 |
| FND-705 | medium | Four gaps in the compatibility classification table, none reachable by the published corpus. (i) A **union** variant addition is unconditionally `additive` — `diff.mjs:539-543` branches on `kind === "enum"` and never consults the consumer's `unknownExtensions` policy, against FR-025-AC-3. (ii) Reserved-Protobuf reuse is checked only against `reservations.old.reserved` (`:362-363`), so a number reserved and reused within the *new* registry falls through to the equal-fingerprint `patch` fallback. (iii) The `generated-api` required-gate is pushed only when `generatedNames` is absent **and** `targetResults` is empty (`:395-399`), so supplying per-target dispositions silently removes the gate that says generated names were never examined — TC-530 exercises only the all-absent case. (iv) The `identity` family is detected by an unchanged-`displayName` heuristic (`:224-236`), so an identity change made together with a rename is reported as a removal plus an addition and the `identity` family never appears. | src/compiler/compat/diff.mjs:224-236, :362-363, :395-399, :539-543, FR-025-AC-3, FR-051-AC-2, FR-051-AC-4, FR-051-CON-1, TC-529, TC-530, TC-531 |
| FND-706 | medium | The diagnostic comparator is not total, so ties fall to insertion order. `diagnostics.mjs:221-235` compares the five keys FR-049 names — `locus.path`, `startLine`, `startColumn`, `code`, `message` — and returns `0` when all five match; two diagnostics differing only in `causes` or `related` then order by the order analysis happened to find them, which is the ambient dependency FR-049 exists to remove. The spec table itself stops at five keys, so this is a requirement gap as much as a code gap; a sixth tiebreak on the entry's canonical bytes closes it. `sortKey` also reads `locus.path`/`startLine` without guards (`:205-208`), which would make the comparator non-transitive for a locus missing `path` — unreachable today because `common.schema.json` requires all four locus members. | src/compiler/diagnostics.mjs:202-235, spec/functional/FR-049-emit-stable-source-located-diagnostics.md:59-61, FR-049-AC-4, TC-495 |
| FND-707 | medium | Seven further oracles are pure functions called twice on the same argument, or evidence collected and discarded. TC-483 (`:2097`) calls `buildLock` twice on the *same in-memory resolution object* to prove "two lock builds over the same graph produce identical bytes"; TC-491 (`:2251`, and `:2190`) does the same for `contentDigest`; TC-537 (`:3170-3182`) re-invokes `diffSemanticContract` on one object literal. TC-478 (`:1991`) builds a key-permuted resolution and asserts only `toBeDefined()` — the fingerprint is never taken, so FR-048-AC-2's object-key clause rests on a standalone `canonicalize({b,a})` toy. TC-511 (`:2634-2644`) accumulates a `fired` set across all 22 rules and then asserts only `fired.has(INVALID_DOCUMENT)`. TC-520 (`:4090-4140`) populates `fired` and never reads it beyond `fired.size > 0`, taking its six real assertions from the file-global `observedCodes` instead, so a mutation that stopped firing its rule still passes whenever another test emits that code. TC-522's fuzz oracle (`:2946-2949`) checks only registry membership, so a run returning `[]` passes. | test/compiler-core.test.ts:1991, :2097, :2190, :2251, :2634-2644, :2946-2949, :3170-3182, :4090-4140, FR-048-AC-2, FR-048-AC-5, FR-050-AC-2, FR-050-AC-13, TC-478, TC-483, TC-491, TC-511, TC-520, TC-522, TC-537 |
| FND-708 | medium | Four matrix rows name a criterion their backing test's tag omits. `spec/tests.md` gives TC-603 `FR-046-AC-6`, TC-605 `NFR-020-AC-1`, TC-615 `FR-047-AC-1` and TC-617 `FR-050-AC-12`; the `Traces:` comments on the tests carrying those ids name neither. Computed over all 222 rows, these are the only four mismatches — every other row's criterion set is a subset of its tag's. The criteria themselves are covered elsewhere, so nothing is untraced; the matrix and the tags simply disagree about which case discharges what. | spec/tests.md (TC-603, TC-605, TC-615, TC-617 rows), test/compiler-core.test.ts (the four `Traces:` comments carrying those ids) |
| FND-709 | medium | `UNSUPPORTED_LOSS` covers one of the three cases FR-053 declares. The requirement names an enum member value, a template parameter, and `@doc` on a declaration the IR has no home for; `lower.mjs:637-644` implements only the enum-member case. No template check exists anywhere under `frontend/`, and `getDoc` is read only inside `lowerField` (`:808`), so `@doc` on a model, scalar, enum, enum member, operation or union variant is silently dropped rather than raising. TC-425 (`:907-920`) tests only the enum-member case. | src/compiler/frontend/typespec/lower.mjs:637-644, :808, spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:96, FR-053-AC-13, TC-425 |
| FND-710 | medium | The RFC 8785 vectors miss the two cases the module actually owns, and the scalar oracle is the implementation. `test/fixtures/compiler/rfc8785/vectors.json` covers negative zero and the `1e30`/`1e21`/`1e-7` exponent boundaries but contains **no lone surrogate** (only a well-formed pair at `:147`) and **no supplementary-plane key** — the non-ASCII ordering cases are `€` (U+20AC) and `ö` (U+00F6), both BMP, so the one place UTF-16 code-unit order diverges from code-point order is untested. `canonical.mjs:65-67` sorts keys itself and is correct per §3.2.3; numbers and strings are delegated to `JSON.stringify` (`:78`), which genuinely is the ES algorithm — but TC-477 (`:1970`) then asserts `JSON.stringify(row.input) === row.expected` under a comment calling it "an independent second implementation of the scalar rules". It is the same implementation. | test/fixtures/compiler/rfc8785/vectors.json:11-49, :147, :173-183, src/compiler/packages/canonical.mjs:33, :65-78, test/compiler-core.test.ts:1970, FR-048-AC-1, TC-477 |
| FND-711 | medium | The ticket's cross-frontend criterion is not delivered, and the record says so honestly. Issue #19 asks that "independent frontend fixtures produce equivalent IR where semantics agree"; only the `typespec` dialect is implemented, so `test/fixtures/compiler/shared/cases.json` supplies one source tree per case, the harness records every case as single-dialect, and `spec/tests.md:1085` (EC-049) states that single-dialect runs must not be reported as cross-frontend equivalence. This is the correct disposition, not a defect — but the criterion is **partial**, deferred to issue #36, and the review must say so rather than let the ✅ on FR-045 read as agreement observed. | test/fixtures/compiler/shared/cases.json, spec/tests.md:1085 (EC-049), plan/Plan-008-.../tasks/Task-072-frontend-seam.md, FR-045-AC-5, TC-402, TC-601 |
| FND-712 | low | Plan and matrix markers lag the measured run. `plan/.../log.md` records "`make test`: **299 vitest cases across 9 files, all passing**"; measured here across three runs, 293, 297 and 299 (FND-680). `spec/tests.md:1140` records the same 299 figure. Task-079's first two subtasks — the static registry extractor and "land the remaining rule rows" — are unchecked, though both are in fact delivered (TC-493/TC-508 at `:2295` and TC-494/TC-609 at `:4254` are genuine, and TC-598..619 are all tagged and passing). The issue #19 code review Task-079 sequences before this document does not yet exist under `reviews/`. | plan/Plan-008-.../log.md, plan/Plan-008-.../tasks/Task-079-review-gap-analysis-and-pr.md, spec/tests.md:1140, reviews/ |
| FND-713 | low | Three published signatures drift from their implementations. FR-048's Outputs declare `verifyLock(lock, lockText, resolution)` and `canonicalize(value, sets)`; the code is `verifyLock(lock, lockText, lockPath, resolution)` (`lock.mjs:156`) and `canonicalize(value, options)` (`canonical.mjs:44`). FR-053's Outputs declare `mintIdentity(slot, parts, packageIdentity)` and `constraintDiagnosticCode(parts, keyword, packageName)`; the code is `mintIdentity(packageIdentity, slot, parts)` (`identity.mjs:39`) and `constraintDiagnosticCode(packageIdentity, parts, keyword)` (`:81`). Nothing depends on the spec's argument order today, but these are the signatures a second implementation would be written against. | src/compiler/packages/lock.mjs:156, src/compiler/packages/canonical.mjs:44, src/compiler/frontend/typespec/identity.mjs:39, :81, FR-048 Outputs, FR-053 Outputs |
| FND-714 | low | Three small hardening gaps in the registry and the lock. `Object.freeze(DIAGNOSTIC_CODES)` (`diagnostics.mjs:132`) is shallow, so `DIAGNOSTIC_CODES.PATH_ESCAPE.blocking = false` succeeds at runtime on a surface FR-049-CON-1 calls a compatibility surface. The registry is keyed by short name with `code` as a member, so a lookup by code string returns `undefined` where FR-049 words it as "mapping each code to its severity". `verifyLock` returns after `UNSUPPORTED_CANONICALIZATION` (`lock.mjs:183`), suppressing every other lock diagnostic, which FR-048 does not authorize. And `WIDENINGS` (`diff.mjs:87`) is a hardcoded two-element set restated in code, where the sibling family map is read as data. | src/compiler/diagnostics.mjs:113-132, src/compiler/packages/lock.mjs:180-183, src/compiler/compat/diff.mjs:87, FR-049-AC-1, FR-049-CON-1, FR-048-AC-9 |

## Coverage

- Target: `plan/Plan-008-typespec-frontend-and-ir-compiler-core/`; specification:
  `spec/`; matrix: `spec/tests.md`; identity prefix
  `ix://agent-ix/filament-core-data`. Branch
  `spec/19-typespec-frontend-and-ir-compiler-core` at `42e9d91`, seven commits
  ahead of `origin/main` at `51febd4`.
- Reconciliation: grep index of `/** Traces: … */` lines, expanded for the
  continuation shorthand this file uses (`FR-051-AC-7, AC-8, AC-10`), and
  cross-checked by script against the matrix `Traces To` column and the `it(...)`
  each comment precedes. `quire coverage` still attributes this repository's tags
  to the file container rather than the test symbol (SR-046 FND-211); no change.
- **Tasks done: 11 / 12 by frontmatter.** Task-068..078 are `status: done` with
  every subtask checked; Task-079 is `in progress`, which is correct — this
  document is one of its deliverables. Two of Task-079's own subtasks are
  unchecked though delivered, and one — the code review this gap analysis is
  sequenced after — is not yet written (FND-712). One checked subtask names an
  artefact that does not exist: Task-073's `vocabulary.mjs` (FND-694).
- **Matrix rows: 222 distinct ids in TC-398..619, all present, none missing from
  the range.** Seven matrix rows carry two ids in one cell (TC-400/TC-601,
  TC-433/TC-600, TC-437/TC-598, TC-438/TC-599, TC-466/TC-618, TC-527/TC-602,
  TC-533/TC-534), which is why the row count is 215 and the id count 222.
- **Backed by an exact tag: 222 of 222.** `test/compiler-core.test.ts` carries
  **126** `Traces:` comments over **126** `it(...)` blocks — every comment
  immediately precedes an `it`, none precedes a `describe`, and there is no
  `.skip`, `.todo` or `.only` in the file. **227** tag occurrences across 222
  distinct ids: five ids are traced by two tests each (TC-433, TC-448, TC-464,
  TC-520, TC-552), each a deliberate second half declared in the comment.
- **Matrix ids with no test: 0. Test tags with no matrix row: 0.** Both
  directions are clean, in the 398..619 range and outside it — no tag in the file
  names an id below 398 or above 619.
- **Acceptance criteria and constraints: 200 of 200 traced.** Counted from the
  criteria tables of FR-045..FR-053 and NFR-019..NFR-021 (200 rows) against the
  expanded criterion set of the tags (200). Nothing untagged, and no tag names a
  criterion that does not exist. Four matrix rows name a criterion their backing
  tag omits (FND-708).
- Of those 200, at least **eight are traced by an assertion that does not
  exercise them**: NFR-021-AC-6 (FND-688), FR-047-AC-12 (FND-689), FR-049-AC-4
  (FND-690), NFR-019-AC-10 (FND-692), FR-049-AC-3 for `LIMIT_MAX_DEPTH`
  (FND-685), FR-050-AC-11 (FND-700), FR-051-AC-7/AC-8 (FND-699), and
  FR-048-AC-2's object-key clause (FND-707). Four more are contradicted by the
  code they cite: FR-047-AC-3/AC-5 (FND-681), FR-053-CON-1 (FND-682),
  FR-049-AC-8/AC-9 (FND-684), FR-050-AC-9 (FND-685).
- **Underspecified code: four modules.** `src/compiler/dialects.mjs`,
  `src/compiler/schema-validate.mjs`, `src/compiler/ir/applicability.mjs` and
  `src/compiler/host.mjs` are named by no requirement's Outputs (FND-697); the
  first two are not even inside NFR-019's or NFR-020's "Applies to" lists, yet
  TC-590's permitted set admits them (FND-695). Conversely one declared output,
  `frontend/typespec/vocabulary.mjs`, does not exist (FND-694). Every other
  module under the reviewed scope maps to exactly one FR Outputs entry:
  `frontend/seam.mjs`, `frontend/spec-bundle/frontend.mjs` and
  `frontend/typespec/frontend.mjs` to FR-045/FR-046; `frontend/typespec/{host,lower}.mjs`
  to FR-046; `frontend/typespec/{identity.mjs,lib/*}` to FR-053;
  `packages/{manifest,resolve}.mjs` and `json-locus.mjs` to FR-047;
  `packages/{canonical,lock}.mjs` to FR-048; `diagnostics.mjs` to FR-049;
  `ir/{schema,reader,normalize}.mjs` to FR-050; `compat/{diff,evolution}.mjs` to
  FR-051; `pipeline.mjs`, `inspect.mjs`, `cli.mjs`, `index.mjs` and `index.d.mts`
  to FR-052. `index.mjs` exports exactly the fifteen symbols Task-077 requires.
  No stubs, no placeholder returns, no skipped cases.
- **Requirements with no code: none.** The one criterion that cannot be observed
  is the cross-dialect equivalence of FR-045-AC-5, and the harness and the matrix
  both record it as single-dialect rather than claiming agreement (FND-711).
- **Non-disruption, verified independently:** `git diff --no-renames
  --name-status origin/main...HEAD` shows 226 paths, all additions except
  `Makefile`, `biome.json`, `package.json`, `spec/{index,log,spec,tests}.md`,
  `src/compiler/{cli.mjs,index.mjs,index.d.mts}` and six test files. **No byte**
  under `src/compiler/{ir,compile,identity}.mjs`, `emitters/`, `backends/`,
  `inventory.json`, `schema/`, `fixtures/`, `packages/`, `spikes/`,
  `conformance/`, `tests/`, `agent_ix_core_data/`, `src/generated.ts`, `audit/`,
  `.github/` or the three frozen reader/lowerer test files. The `package.json`
  delta is the single `lint` script line; `exports`, `main`, `module`, `types`,
  `files` and both dependency sets are unchanged. `biome.json` gains two
  formatter exclusions (FND-695 on its permission).
- **The compatibility oracle is independent, and it agrees.**
  `scripts/build-compatibility-cases.mjs` imports only `node:fs`, `node:path` and
  `node:url` — never `compat/diff.mjs` — and the fixtures it writes carry
  `{id, observedFamily, old, new, request}` with no expected disposition. The
  oracle is the `expected` field of `fixtures/semantic/v1/compatibility/cases.json`,
  which predates this branch and is byte-unchanged. **40 published cases, 40
  derived pairs, 0 published cases without a counterpart, 0 orphan fixtures,
  40/40 agreements, 0 disagreements**, 14 of 14 report families produced. This is
  the strongest piece of evidence in the ticket. The *evolution* goldens are the
  opposite (FND-699).
- **Diagnostic registry closure, verified in both directions:** 65 codes
  declared over exactly two namespaces (42 `agent-ix.compiler.*`, 22
  `agent-ix.semantic-ir.*`, plus `DIAGNOSTIC_LIMIT_REACHED`); 65 named by
  `DIAGNOSTIC_CODES.<NAME>` member access across `src/compiler/**` outside the
  frozen prototype; empty difference both ways; the only code string literal in
  `src/` is the registry's own construction site at `diagnostics.mjs:129`; all 65
  appear in `docs/semantic-data-system/compiler-diagnostics.md` and match the
  `common.schema.json` code pattern.
- **Loci, exercised live** (not read from a test): every graph fixture produces
  its declared code at a real line and column —
  `IMPORT_NOT_FOUND 11:3`, `IMPORT_VERSION_UNSATISFIED 17:3`,
  `IMPORT_EXPORT_MISSING 26:4`, `IMPORT_EXPORT_PRIVATE 32:4`,
  `IMPORT_CAPABILITY_MISSING 39:4`, `PACKAGE_CYCLE 11:3` (and a second at `17:3`
  for `two-cycles`), `IMPORT_VERSION_CONFLICT 11:3`, `DIGEST_CONFLICT 3:2`,
  `DUPLICATE_EXPORT 10:3` and `15:3`, `UNKNOWN_MAPPING 17:17`,
  `UNKNOWN_TARGET 16:16`, `UNDECLARED_LOSS mappings/markdown.json:22:3`,
  `UNSUPPORTED_VERSION_CONSTRAINT 13:4`, `STALE_LOCK package-lock.json:4:2`. The
  positions are exact; the `sourceIdentity` on every manifest locus is not
  (FND-691), and the lock's path carries `..` (FND-693).
- **CLI, exercised live:** `compile` exits 0 and two runs of the assurance
  package are byte-identical (`cmp` clean); `inspect` exits 0 and prints the
  contract version, package, manifest digest, lock digest and source identity;
  an unknown verb exits 2 with usage. `DUPLICATE_IDENTITY`, `STALE_LOCK`,
  `STALE_LOCK_PACKAGE` and `LOCK_GRAPH_MISMATCH` are all present in the registry.
- Execution evidence, this host, 2026-09-04:
  - `npx vitest run`, three consecutive runs: **293 / 299 (6 failed, 5 files)**,
    **297 / 299 (2 failed, 1 file)**, **299 / 299 (9 files)**. Non-deterministic;
    root cause and the six failing cases are FND-680.
  - `npx vitest run test/compiler-core.test.ts` in isolation → **126 / 126**,
    17.2 s. The Plan-008 suite itself is green; the flake is in the guards it
    shares the repository with.
  - `make lint` → **exit 2** on the first attempt (`tsc` found the transient
    `test/declaration-drift-probe.ts`), **exit 0** re-run on a clean tree:
    `biome format .` over **255 files**, `tsc --noEmit`, and the four
    `--check` generators (`test-matrix-summary`, `build-compatibility-cases` —
    40 constructed pairs, `build-evolution-goldens` — 2 goldens,
    `build-compiler-docs` — 2 documents).
  - `make typecheck` (`tsc --noEmit -p tsconfig.json`) → **exit 0**.
  - `make build` (`tsc -p tsconfig.build.json`) → **exit 0**.
  - `quire validate --scope <worktree> "reviews/2026-09-04-plan-008-compiler-core-gap-analysis.md"`
    (quire 0.31.0, engine 0.46.0@ca7362d4) → no document diagnostics; the only
    output is the repository's standing `DuplicateArchetype` /
    `DuplicateInverseEdge` module-set warnings.
- Semantic review: **run**, per the request, over FR-045..053 and NFR-019..021.
  FND-681..FND-693 and most of the mediums come from it. The recurring pattern is
  a test whose oracle is a restatement of the code rather than of the criterion —
  a pure function called twice, a disjunction with an always-true branch, an
  expression compared with itself, a golden generated by the function it checks,
  and in one case a diagnostic hand-constructed purely to enter the coverage set.

## The ticket's own acceptance criteria

| Issue #19 criterion | Verdict | Why |
|---|---|---|
| Identical inputs yield byte-identical IR and diagnostics | **Met** | Two `compile` runs of the assurance fixture are byte-identical (`cmp`); TC-567/568/570/571/572/573/574/575 vary the working directory, `TZ`/`LANG`/`LC_ALL`, search-path permutation, enumeration order and the simulated `\` separator, and all pass. Caveat: `imports`-array permutation is *not* varied, and it changes the answer (FND-681); and the "unobserved operations is zero" half is never counted (FND-692). |
| Invalid imports, cycles, unknown mappings, duplicate identities, stale locks and unsupported loss fail at exact source loci | **Partial** | Every one of those codes fires at a real line and column, verified live (list above). But every manifest locus names `ix://agent-ix/unresolved/source/manifest`, so the two requiring loci FR-047-AC-2 demands are byte-identical (FND-691), and the lock's locus path contains `..`, which the published schema forbids (FND-693). Duplicate *identity* on export is unexercised — the rule is keyed on the name (FND-703). |
| IR schema evolution has golden backward/forward readers plus an explicit compatibility policy | **Partial** | `docs/semantic-data-system/ir-compatibility-policy.md` is published and gated by `build-compiler-docs.mjs --check` in lint, and both projections exist and behave (forward declares 15 lost identities, backward derives multiplicity from presence). But both goldens are written by the code under test, so the byte-equality assertions prove nothing (FND-699), and the classifier misreports a `1.0.0`→`1.1.0` uplift that carries any change (FND-687). |
| No backend-specific decorator becomes canonical IR authority | **Met** | The fifteen `extern dec` in `lib/main.tsp` are exactly FR-053's set, with `REPEATABLE` matching the spec's six. `lower.mjs` consumes no `@typespec/protobuf`, `@typespec/json-schema`, `@typespec/openapi` or HTTP/REST decorator; the only non-Agent-IX decorators read are the nine TypeSpec **core** constraint decorators, each mapped to a closed FR-029 keyword. TC-403/TC-410/TC-454 additionally forbid any `frontend/` module from importing `../backends/` or a target-facing library. |
| Independent frontend fixtures produce equivalent IR where semantics agree | **Not delivered** | Only `typespec` is implemented. `shared/cases.json` supplies one tree per case, the harness records each as single-dialect, and `spec/tests.md` EC-049 states outright that single-dialect runs must not be read as cross-frontend agreement. Correctly and honestly deferred to issue #36 — but the criterion is open (FND-711). |

## Gate Closure

1. Fix FND-680 before anything else: make every changed-path guard immune to a
   concurrent worker's transient write — compare against the *committed* tree
   only, or run the guards in a serialised project — and stop TC-264 mutating a
   prohibited path in place. Then re-measure `make test` at least three times and
   record the number that reproduces.
2. Fix FND-681: select the highest version satisfying the *whole* constraint set
   for an identity, and add a case that permutes an `imports` array and asserts
   both the resolution and the diagnostic list are unchanged.
3. Decide FND-682 in the spec first — `ArtifactCode` or `Artifactcode`,
   `ARTIFACT_CODE_MINLENGTH` or `ARTIFACT_CODE_MIN_LENGTH` — then make
   `identity.mjs` and `test/semantic-core-lowerer.ts` agree, and turn TC-417 into
   the differential test FR-053-CON-1's verification method names by importing
   FR-034's lowerer as the oracle.
4. Implement the two inert limits: call `applyDiagnosticLimit` on the compile
   path (FND-684) and raise `LIMIT_MAX_DEPTH` as a blocking diagnostic from the
   reader and the pointer index rather than throwing from `canonicalize`
   (FND-685). Delete the `note([diagnostic(...)])` at
   `test/compiler-core.test.ts:1895` in the same change.
5. Rewrite the four oracles that cannot fail: TC-595 must actually revert into a
   scratch worktree and run the suite (FND-688); TC-467 must assert
   `PATH_ESCAPE` without a disjunction, once `PATH_ESCAPE` fires (FND-689);
   TC-495 must compare against an independently collated order (FND-690); and
   NFR-019-AC-10 needs real `node:fs` instrumentation to form the unobserved
   count (FND-692).
6. Bring the fingerprint and the requirement back into agreement: include every
   resolved package's manifest digest (FND-683) and settle the
   `resolvedPackages` and profile-digest shapes (FND-702).
7. Amend the specification where the code has already moved: add
   `dialects.mjs`, `schema-validate.mjs`, `ir/applicability.mjs` and `host.mjs`
   to an owning FR's Outputs, add `biome.json` to NFR-019's permitted set or
   revert the change, and either write `vocabulary.mjs` or remove it from FR-053
   and Task-073 (FND-694..FND-697).
8. Fix FND-686 and FND-687 in the classifier and the FR-051 table together — an
   evidence gap must never lower a disposition, and an uplift must not
   manufacture multiplicity changes.
9. Close the smaller gaps: the four FR-051 classification holes (FND-705), the
   reader's two over/under-wide rules (FND-704), `NODES_ON_NON_RECORD`'s missing
   reader case and the false comment above it (FND-700), surrogate-safe
   truncation (FND-701), the RFC 8785 vector gaps (FND-710), the six weak oracles
   (FND-707), and the four matrix/tag mismatches (FND-708).
10. Then flip Task-079: write the code review it sequences first, check its own
    subtasks, and recompute `spec/tests.md`'s execution line and the
    `plan/.../log.md` figure from the corrected run (FND-712).

## Dispositions

Applied on 2026-09-04, on the branch this review was taken from. Every high and
every medium is fixed; one low is recorded with no action and one medium is
accepted with a reason. The gates after remediation: `make lint`, `make build`
and `make typecheck` green; `make test` **299 of 299** across 9 files;
`spec/tests.md` 577 of 579 passed with TC-370 and TC-382 blocked on issue #42,
and the coverage column now measured at `100% mapped (579/579)`.

| ID | Disposition |
|---|---|
| FND-680 | Fixed with FND-664, and filed as #49. |
| FND-681 | Fixed. Selection is against every constraint gathered so far, so permuting a manifest's imports no longer changes the resolved version. Verified on the caret fixture with both permutations. |
| FND-682 | Fixed. `type/ArtifactCode` and `ARTIFACT_CODE_MINLENGTH`, matching FR-034 literally — the keyword is upper-cased without inserting a separator, because agreement with the semantic-core lowering is the point. |
| FND-683 | Fixed. `resolvedPackages` carries each package's manifest digest as well as its content digest, and FR-048 and its criterion say so. |
| FND-684 | Fixed with FND-645. |
| FND-685 | Fixed with FND-644. TC-470's fabricated `note()` is replaced by documents that actually reach the bound. |
| FND-686 | Fixed with FND-641. |
| FND-687 | Fixed. A version uplift is compared against the projection of the new document, so its own additions are not counted and every other change still is. An uplift that also removes a field reports the removal. |
| FND-688 | Fixed with FND-647. |
| FND-689 | Fixed with FND-665. |
| FND-690 | Fixed with FND-665. |
| FND-691 | Fixed. `readDocument` takes the source identity as a function of the parsed document, so every candidate's locus names the package it came from. |
| FND-692 | Fixed. The test watches `node:fs` directly for the duration of a compile and asserts the set of reads the injected host did not see is empty. |
| FND-693 | Fixed. `relativePosix` falls back to the file name when a document lies outside the package root, so no locus carries `..`. |
| FND-694 | Fixed. `src/compiler/frontend/typespec/vocabulary.mjs` exists and is the only reader of the decorator state maps. |
| FND-695 | Fixed. NFR-019's Scope names every module that exists, `biome.json` is in the permitted list, and the test's list matches it. |
| FND-696 | Fixed. NFR-019 states that `cli.mjs` is the boundary rather than a subject — it is the one module that reads the world and constructs the host — and AC-3 says the scan covers everything below it. |
| FND-697 | Fixed. `dialects.mjs`, `family-map.mjs`, `schema-validate.mjs`, `host.mjs` and `ir/applicability.mjs` are named in the Outputs of the requirements that own them. |
| FND-698 | Fixed with FND-652. |
| FND-699 | Fixed with FND-667. |
| FND-700 | Fixed. A constructed document puts relationships on an enum and the reader's `NODES_ON_NON_RECORD` fires. |
| FND-701 | Fixed. `fragment` cuts on a code point, and the test asserts the input-derived part is exactly 120 characters and carries no lone surrogate. |
| FND-702 | Fixed with FND-683: FR-048 states the tuple the code computes, member by member. |
| FND-703 | Fixed. A duplicate is reported on the identity as well as on the name. |
| FND-704 | Fixed. A type reference into the document's own package is never suppressed — no resolution could have resolved it — and `INVALID_PATTERN` compiles without the `u` flag, which the `ecma-262` operand dialect requires. |
| FND-705 | Fixed with FND-660. |
| FND-706 | Fixed. The change comparator orders on identity, family, disposition, then rationale, so it is total. |
| FND-707 | Fixed. The four self-comparisons compare against independently computed values: a literal canonical form, the recomputed fingerprint, the document's own counts, and a hand-computed content digest. |
| FND-708 | Fixed. TC-603, TC-605, TC-615 and TC-617 name every criterion their test asserts, in both the matrix and the tag. |
| FND-709 | Fixed. Declared loss now covers a template instance as well as an enum member value; a `@doc` on a declaration is *carried* as the semantic-core `doc` extension rather than dropped, which is the honest treatment of a datum the IR can hold. |
| FND-710 | Fixed with FND-663. |
| FND-711 | Accepted and recorded. Cross-frontend equivalence needs issue #36; EC-049 and `spec/tests.md` record the harness as single-dialect rather than claiming agreement it never observed. |
| FND-712 | Fixed. The plan log, the matrix status line and this review carry the measured numbers from the remediated tree. |
| FND-713 | Fixed. FR-047, FR-048 and FR-052 publish the signatures the modules actually export. |
| FND-714 | Fixed. `DIAGNOSTIC_CODES` is frozen entry by entry, so a caller cannot change a code's blocking disposition at run time. |

## Verdict after remediation

PASS. The fourteen highs and seventeen mediums are fixed, and the three lows with them; FND-711 stands as the one deferred item, and it is deferred to issue #36 rather than left unsaid.
