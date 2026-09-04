---
id: SR-063
title: "Code review — issue #27 prototype-emitter promotion"
type: SpecReview
analysis: code-review
scope: "src/compiler/, test/compiler.test.ts, spikes/typespec-feasibility/scripts/run-experiment.mjs, package.json, Makefile, test/*.test.ts guards"
review_set: subset
---
# Code review — issue #27 prototype-emitter promotion

## Summary

Issue #27 promotes the issue #4 prototype emitters into `src/compiler/` behind a
six-symbol build interface, rewires the frozen spike to call it, and adds a
57-case suite whose oracle is byte-identity with the committed goldens the
promoted code did not produce. The promotion itself is sound — the goldens are
untouched, the four declared deltas are the only behavioural changes I could
find in the promoted logic, and the scoping of the five inherited changed-path
guards is honest — but the branch does not pass its own suite, and three of the
gates that were supposed to hold the promotion honest do not hold.

## Verdict

**FAIL** — four high findings: TC-395 fails on this worktree, the
`changedPaths()` helper every non-disruption gate is built on is blind to git
rename detection (which is exactly why TC-395 fails, and which also lets a
renamed golden past the FR-042-CON-4 oracle), the FR-041 default-generator
behaviour is absent from the CLI and programmatic routes so the repo's own
`make compiler-emit-ir` emits an envelope-violating document, and the
FR-041-AC-12 declaration-drift gate cannot detect drift because the `.mjs`
implementations are never typechecked.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-420 | high | TC-395 fails. `pnpm exec vitest run test/compiler.test.ts` is 56/57; `make test` is 170/172 (TC-395 plus the pre-existing TC-254 of issue #43, which I confirmed fails on `origin/main` because that manifest has no `private` key). The branch is not green. | test/compiler.test.ts:1082 |
| FND-421 | high | Root cause and wider hole: `changedPaths()` reads `git diff --name-only origin/main...HEAD`, which applies rename detection. Git scores `spikes/typespec-feasibility/emitter/index.mjs → src/compiler/ir.mjs` at R060 and `emitter/package.json → emitters/semantic-ir/package.json` at R050, so both deletions are invisible to `changedPaths()` and therefore to `deletedPaths()`. The same blindness applies to TC-359, the FR-042-CON-4 golden-untouched gate: a future branch that *renames* a frozen golden out of `spikes/` passes it. Pass `--no-renames`. | test/compiler.test.ts:70, test/compiler.test.ts:766 |
| FND-422 | high | FR-041 requires that where the caller supplies no `generator`, the compiler stamps `<name>@<version>` from the emitter manifest, and FR-041-CON-1 requires the `{schemaVersion, generator, types}` envelope. That default exists only in `$onEmit`. `buildSemanticIr`, `compileSemanticIr` and `cli.mjs` leave `generator` undefined, which `JSON.stringify` drops. `make compiler-emit-ir` (the target FR-041 mandates, with `GENERATOR ?=` empty) demonstrably emits a document with no `generator` key. TC-338/TC-339 call `defaultGeneratorId()` in isolation and never exercise the omission path, so nothing catches it. | src/compiler/ir.mjs:143, src/compiler/cli.mjs:39, Makefile:90, test/compiler.test.ts:479 |
| FND-423 | high | FR-041-AC-12 claims "a deliberate mismatch between `index.d.mts` and `index.mjs` fails `tsc --noEmit`". `tsconfig.json` sets neither `allowJs` nor `checkJs`, so the `.mjs` files are never typechecked against the declarations. I verified this: appending `export declare function totallyNonexistentExport(x: number): number;` to `index.d.mts` leaves `tsc --noEmit` clean. TC-344's probe only proves the declarations are *read* by a consumer, not that they match the implementation; it catches drift only in the signatures the suite happens to call. | src/compiler/index.d.mts:46, tsconfig.json:1, test/compiler.test.ts:557 |
| FND-424 | medium | TC-395 is tautological even when its precondition holds: it `git show`s each deleted path into a scratch directory and then asserts `existsSync(target)` — true because it just wrote it. It never compares the restored bytes to anything, so "restores `origin/main` exactly" (NFR-018-AC-6) is unverified. | test/compiler.test.ts:1083 |
| FND-425 | medium | TC-373/TC-387 (`cargo check --offline --locked` leaves the lockfile byte-identical) silently `return`s when `~/.cargo/bin/cargo` is absent, and it probes only that one path, not `PATH`. On any host without a home-directory rustup the case reports green having asserted nothing. There is no skip marker and no issue reference. | test/compiler.test.ts:1115 |
| FND-426 | medium | The FR-042/FR-043 purity proof is a substring scan over `src/compiler/**/*.mjs` for eight identifiers. It is defensible as a cheap invariant but has real holes: `fetch(`, `node:os`, `node:dns`, `node:tls`, `node:dgram`, `node:worker_threads`, `performance.now`, `globalThis.process`, dynamic `import(` and `createRequire` are all absent from the forbidden list, and the scan does not follow imports — a backend importing a helper from outside `src/compiler/` would be entirely unscanned (TC-337 only forbids `spikes/`). No violation exists today; the gate is weaker than the AC it discharges. | test/compiler.test.ts:647 |
| FND-427 | medium | The inventory records `typescript-backend` as `retain` with a limitation that mentions only the representative-slice qualification, but `emitTypeScript` did change: it now builds a `byId` map and calls `resolveModelBase`, which throws on an absent base where the prototype rendered `extends <unknown>` silently. `rust-serde-backend` got the same guard and is recorded `rewrite` with "Rewritten only to add the missing-base and base-chain-cycle guards". One of the two labels is wrong, and `inventoryViolations` has no rule that could catch it. | src/compiler/inventory.json:23, src/compiler/backends/typescript.mjs:48 |
| FND-428 | medium | `make compiler-emit-ir` defaults `OUT` to `build/semantic-ir.json`, and `build/` is not in `.gitignore` (only `node_modules/`, `dist/`, and the Python caches are). Running the repo's own new target leaves an untracked file that `changedPaths()` picks up via `--untracked-files=all`, turning TC-378, TC-379/TC-390, TC-392 and TC-396 — and the four inherited allowlist guards — red. I reproduced this and cleaned up. | Makefile:89, .gitignore:1 |
| FND-429 | medium | The declarations are loose enough to hide drift independently of FND-423. `SemanticIrType` and `SemanticIrField` both carry `[key: string]: unknown`, so the whole `metadataOf` block (`constraints`, `discriminator`, `versioning`, `deprecated`) and the `recursive`/`extensionPoint` flags are untyped. `SemanticIrDocument.generator?: string` is optional, which encodes FND-422's defect rather than FR-041-CON-1's required envelope. `normalizeJsonSchemaForPython<T>(schema: T): T` promises an identity type the implementation does not keep — it rebuilds the object and adds `$id` and `title` keys the input `T` need not have. | src/compiler/index.d.mts:24, src/compiler/index.d.mts:37, src/compiler/index.d.mts:59 |
| FND-430 | medium | `spec/tests.md` records TC-395 as `✅ passed`. It fails. TC-373 is recorded `✅ passed` without noting that it is conditional on a host-local cargo (FND-425). The matrix status is a claim about a measurement and should match the measurement. | spec/tests.md:492, spec/tests.md:469 |
| FND-431 | low | `cli.mjs` `parse()` silently accepts any unknown flag into `options` (a typo'd `--generatorr` is dropped without complaint, producing FND-422's envelope-less document), silently skips any non-`--` positional token, and cannot represent a value that itself begins with `--`. Only `--entrypoint` and `--out` are required-checked; there is no unknown-key rejection. | src/compiler/cli.mjs:9 |
| FND-432 | low | TC-321 and TC-332 are tautological negative controls: `names.slice(1)` can never equal the full list and a 7-element array can never equal a 6-element one. They exercise no production code and would pass against any implementation. The AC they trace to ("a missing or extra name fails the test") is really discharged by TC-320 and TC-331. | test/compiler.test.ts:220, test/compiler.test.ts:359 |
| FND-433 | low | TC-372 and TC-374 assert on the *source text* of `run-experiment.mjs` — TC-372 on the source *ordering* (`indexOf("cpSync(retainedLock") < indexOf('"generate-lockfile"')`), TC-374 on the literal `else if (checkMode) { … Missing retained lockfile` regex. Both would pass on an unreachable branch. Given that issue #42 blocks executing `--check`, source-text is the honest fallback here, but it should be recorded as such rather than as behavioural coverage of FR-044-AC-3/AC-4. TC-377 is the acceptable case: "the runner defines none of these functions" is genuinely a source-text property. | test/compiler.test.ts:900, test/compiler.test.ts:911 |
| FND-434 | low | TC-343 claims to cover "the repository formatter and typechecker" for FR-041-AC-12 but runs only `biome format src/compiler` and then asserts `existsSync(index.d.mts)`. The typechecker half is existence-only. | test/compiler.test.ts:549 |
| FND-435 | low | Dead widening in the scoped allowlists: `tsconfig.json` and `tsconfig.build.json` were added to five changed-path allowlists but this branch changes neither, and `spikes/typespec-feasibility/` is now a duplicate entry in the `contract-census` and `semantic-architecture` lists (it was already there). Each unneeded entry is permission a later branch inherits. | test/contract-census.test.ts:529, test/semantic-architecture.test.ts:336 |
| FND-436 | low | TC-371, TC-392 and TC-395 are themselves branch-lifetime assertions ("this branch changes exactly `evidence/custom.json`", "`addedPaths()` is non-empty"), so the next branch must scope them exactly as this one scoped its five predecessors. This matches the established repo idiom and is recorded as a known recurring cost, not a defect of this change. | test/compiler.test.ts:868, test/compiler.test.ts:1054 |
| FND-437 | low | Recorded clean: the guard scoping was done honestly. Each of the five inherited guards names the issue, the reason, and the replacement gate in a comment; none was deleted; the whole-file `package.json` diff was replaced by a key-by-key comparison plus TC-391's dependency-set equality modulo the one declared removal; the frozen-golden invariant survives in TC-359 and TC-371 (subject to FND-421). The goldens themselves are byte-identical — `git diff origin/main...HEAD -- spikes/typespec-feasibility/{generated,report.md,evidence}` is exactly one line of `evidence/custom.json`. | spikes/typespec-feasibility/evidence/custom.json:2 |

## Gates observed

| Gate | Result |
|---|---|
| `make lint` (`biome format .` + `tsc --noEmit`) | pass — 159 files checked, no fixes applied, no type errors |
| `make build` (`tsc -p tsconfig.build.json`) | pass |
| `make typecheck` | pass |
| `pnpm exec vitest run test/compiler.test.ts` | **fail** — 56 passed, 1 failed (TC-395) |
| `make test` | **fail** — 170 passed, 2 failed: TC-395 (this branch, FND-420) and TC-254 (pre-existing; confirmed absent from this branch's diff and failing against `origin/main`'s `packages/semantic-core/package.json`, issue #43) |

## Promoted-logic diff against the prototype

I diffed each promoted module against `git show origin/main:spikes/typespec-feasibility/emitter/index.mjs` and
`git show origin/main:spikes/typespec-feasibility/scripts/run-experiment.mjs`.

- `ir.mjs` vs the prototype `$onEmit`: `sourceOf` takes `baseDir` instead of reading `process.cwd()` (declared); the sort is code-point instead of `localeCompare` (declared); `generator` becomes a parameter instead of a hard-coded spike id (spec'd by FR-041-AC-7, and the source of FND-422). `namespaceOf`, `semanticRole`, `versionRecord`, `metadataOf` and `record` are otherwise byte-equivalent.
- `backends/typescript.mjs` + `type-names.mjs` vs `emitTypeScript`/`tsType`/`simpleReferences`/`enumMembers`/`replaceEnumMember`: identical apart from the missing-base guard (declared; see FND-427 for its inventory label).
- `backends/rust.mjs` vs `emitRust`/`rustType`/`snake`/`inheritedFields`: identical apart from the missing-base and cycle guards (both declared). The `seen` set is per top-level call, so the guard cannot leak between models.
- `backends/python-schema.mjs` vs `normalizeJsonSchemaForPython`: identical; `FORBIDDEN_KEYS`, `NORMALIZED_ID` and `titleFrom` are hoisted with no semantic change.
- `compile.mjs` filters `diagnostic.severity === "error"`, which is the correct discrimination for TypeSpec's `"error" | "warning"` severities; warnings do not abort, and a failed compile throws rather than returning a partial document.

I found no undeclared behavioural difference in the promoted logic. The one
undeclared behavioural change on the branch is in the spike runner itself — the
`Cargo.lock` seeding — and that is declared, in FR-044-AC-3/AC-4, the docs
"Host reproducibility" section, and issue #42.

## Isolation

Nothing under `src/compiler/` imports `spikes/` (verified by inspection of all
fifteen files, not only by TC-337's regex). The spike's import path
`../../../src/compiler/index.mjs` resolves correctly from
`spikes/typespec-feasibility/scripts/`, and is robust because it is relative to
`import.meta.url`'s directory rather than to `process.cwd()`. `inventory.json`'s
fifteen owned paths reconcile exactly with the fifteen files present, and every
`components` claim I spot-checked against the code holds except FND-427.

## Disposition (applied after the review)

Every high and every medium was acted on. The verdict above stands as recorded
at review time; the state below is what the branch now holds.

| Finding | Disposition |
|---|---|
| FND-420, FND-421 | Fixed. `--no-renames` added to every `git diff` in all four changed-path helpers. Git had been scoring the emitter moves R060/R050, so the deletions were invisible to TC-359, TC-371, TC-378, TC-395 and the four scoped guards. This was the single highest-value finding of the run: the compensating oracle for the frozen goldens was blind to exactly the operation the promotion performs. |
| FND-422 | Fixed. The default generator moved out of `$onEmit` into `src/compiler/identity.mjs` and is applied in `buildSemanticIr`, so every route stamps it. Verified: `make compiler-emit-ir` now emits `"generator": "@agent-ix/semantic-ir-emitter@0.1.0"`. TC-339 now asserts the default on the programmatic route and through the CLI, not just `defaultGeneratorId()` in isolation. |
| FND-423 | Fixed. Since the repository does not typecheck `.mjs`, TC-332 now compares the declared export set against the actual module namespace for all three `.d.mts` files, which catches declared-but-absent and absent-but-declared in both directions. |
| FND-424, FND-450 | Fixed. TC-395 now reads each changed path's bytes from `origin/main`, round-trips them, and asserts byte equality, that every deleted path is absent from the worktree and non-empty at main, and that the retained evidence command differs in the declared direction. It no longer asserts `existsSync` on what it just wrote. |
| FND-425 | Fixed. The cargo probe resolves through `PATH` and fails loudly when cargo is absent, since a missing toolchain is an unmet host prerequisite (FR-044-CON-4), not grounds for a silent pass. |
| FND-426, FND-459 | Fixed. The purity scan now walks the backends' import graph, asserts the reachable set is exactly the four pure modules, and checks a widened token list (`fetch(`, `node:os`, `node:dns`, `node:tls`, `createRequire`, `globalThis.process`, `performance.now`, and others). A separate pass asserts no module under `src/compiler/` spawns a process, covering `cli.mjs` and the emitter that the old scan exempted. |
| FND-427 | Fixed. `typescript-backend` is now `rewrite`, not `retain`; it gained the same missing-base guard that made the Rust backend a rewrite. |
| FND-428 | Fixed. `make compiler-emit-ir` defaults `OUT` to `dist/semantic-ir.json`, which is gitignored. |
| FND-429 | Fixed. `index.d.mts` drops both index signatures, models the metadata block, makes `generator` required (the envelope FR-041-CON-1 requires), and gives `normalizeJsonSchemaForPython` an honest signature instead of a false identity. The tightened types immediately caught two under-specified fixtures in the test file. |
| FND-430, FND-462 | Fixed. Matrix statuses recomputed from the rows; TC-395 and TC-380 are backed and passing, TC-370 and TC-382 blocked, the StR-001 rollup carries the blocked marker. |
| FND-431 | Fixed. `cli.mjs` rejects unknown flags and positional tokens instead of silently ignoring them, and no longer misreads a value beginning with `--` as a missing value. |
| FND-432, FND-453 | Fixed. TC-332 exercises the real module namespace against the real declarations; the synthetic 7-vs-6 array comparison is gone. |
| FND-433, FND-456 | Fixed as far as honestly possible. The three source-text tests are renamed `(source-text)` so no reader mistakes them for behavioural coverage. Executing the runner's seeding branch needs a full replay, which issue #42 blocks; that is stated rather than papered over. |
| FND-434, FND-460 | Fixed. TC-343 runs `biome format src/compiler` as the gate — and immediately caught an unformatted `inventory.json`, which is the evidence that it is now real. The declaration half moved to TC-332 where it can actually fail. |
| FND-435, FND-458 | Fixed. The `tsconfig*.json` entries were removed from the allowlists (nothing changes them), the whole-directory `spikes/typespec-feasibility/` widening was narrowed to the four paths the branch touches, and the `package.json` key comparison was widened back from 8 keys to 15, so `scripts`, `engines`, `packageManager` and the rest stay pinned. |
| FND-461 | Fixed. TC-345 enumerates the added `package.json` files from the branch diff instead of reading one hard-coded path. |
| FND-436 | Accepted, not acted on. Branch-lifetime assertions are the repository's established idiom for these guards; changing that convention is a repo-wide decision, not this ticket's. |
| FND-437 | Recorded clean, no action. |
