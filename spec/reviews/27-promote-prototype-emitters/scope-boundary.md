---
id: SR-061
title: "Scope and boundary review of the issue #27 prototype-emitter promotion"
type: SpecReview
analysis: scope-boundary
scope: "spec/usecase/US-009-*.md, spec/functional/FR-040-*.md..FR-044-*.md, spec/non-functional/NFR-017-*.md, spec/non-functional/NFR-018-*.md, spec/spec.md, spec/tests.md TC-320..375"
review_set: all
---
# Scope and boundary review

## Summary

Issue #27 owns the promotion of the issue #4 prototype generators into
repository code: a written disposition for each of thirteen prototype
components (FR-040), the TypeSpec semantic-IR emitter and its narrow build
interface under `src/compiler/` (FR-041), the pure TypeScript and Rust/Serde
backends (FR-042), the JSON Schema adapter that prepares the official bundle for
`datamodel-code-generator` (FR-043), and the rewiring of the frozen spike so it
replays through the promoted compiler with exactly one declared evidence delta
(FR-044). NFR-017 constrains determinism and fixes the permitted and prohibited
path lists; NFR-018 constrains non-disruption and rollback. The outer boundary is
stated correctly and consistently in several places: `spec.md` 2.2 keeps IR-shape
revision with #19, package generation and publication with #21/#22/#23 and #11,
and the conformance corpus with #20, and US-009's Dependencies section repeats
the same sequence. No finding below moves work into or out of issue #27 at that
outer edge.

The findings concern the inner edges, where the bundle meets machinery that
already exists in the tree. Four are structural. NFR-017's prohibited list
forbids the very deletion FR-044 mandates. The changed-path allowlist that
actually enforces isolation lives in `test/typespec-feasibility.test.ts`, gates
every path on the branch, and does not admit `src/`; no requirement in the bundle
allocates its amendment. `src/` is not a private area — `package.json` `files`
ships it — so `src/compiler/**` enters the published tarball, a #11 concern
NFR-018 believes it is measuring but is not. And FR-040's inventory is asked to be
both a prototype-component ledger and a file-ownership allowlist for
`src/compiler/`, two roles that contradict each other for the files the promotion
authors new. The remainder are unallocated responsibilities: gate wiring for
`.mjs` sources, the named build entry point, the Python generator invocation, the
discharge owner for the backend qualification limitation, and the standing of
NFR-006 once the spike imports owned code.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-380 | high | NFR-017's prohibited list forbids the deletion FR-044 requires. The permitted list names `spikes/typespec-feasibility/scripts/**`, `package.json`, `evidence/custom.json`, and `README.md`; the prohibited list is then "every other file under `spikes/typespec-feasibility/`", which covers `spikes/typespec-feasibility/emitter/index.mjs` and `emitter/package.json`. FR-044 Outputs require "a deleted `spikes/typespec-feasibility/emitter/` package" and FR-044-AC-4 requires that directory absent from the tree, while NFR-018-AC-1 requires that no changed path be on the prohibited list. TC-362 and TC-371 therefore cannot both pass. The permitted list must name `spikes/typespec-feasibility/emitter/**` as a deletion-only path, or the prohibition must exempt it. | NFR-017 Scope, NFR-018-AC-1, FR-044 Outputs, FR-044-AC-4, TC-362, TC-371 |
| FND-381 | high | The allowlist that actually enforces isolation is not amended by anything in the bundle, and its amendment is allocated to nobody. `test/typespec-feasibility.test.ts` ("keeps the spike isolated, unpublished, and non-canonical", TC-123/TC-124, NFR-006) reads `git diff --name-only main...HEAD` plus the working tree and asserts every changed path matches one of thirty-odd literal prefixes. That list has no `src/` entry, no `tsconfig.json` or `tsconfig.build.json` entry, and enumerates plan directories one at a time up to `plan/Plan-006-semantic-core-grammar/` — so a `plan/Plan-007-*` bundle for this promotion is rejected too. The first file written under `src/compiler/` turns that suite red for every subsequent ticket, not only for #27. NFR-017 permits `test/**`, `tsconfig*.json`, and `plan/**`, so the edit is allowed; the defect is that no FR, no NFR acceptance criterion, and no TC in TC-320..375 says the edit is part of the work or verifies that the pre-existing gate still passes on the promotion branch. | `test/typespec-feasibility.test.ts` (`allowed` array), NFR-006 Verification, NFR-017 Scope, NFR-018-AC-1, TC-371 |
| FND-382 | high | `src/` is an already-owned published area, and the promotion changes the published surface without the spec noticing. `package.json` lists `"src/"` in `files`, so every byte under `src/compiler/` — including `inventory.json`, `cli.mjs`, and the emitter package — ships in the `@agent-ix/filament-core-data` tarball at the next publish, alongside the existing `src/generated.ts`. NFR-018's metric row reads "Public export surface of `@agent-ix/filament-core-data` changed — 0 entries", but NFR-018-AC-2 measures only `exports`, `main`, `module`, and `types`, all of which stay byte-identical while the tarball contents change. Whether the promoted compiler is part of the published package (a #11 decision) or must be excluded from `files` (a #27 decision) is stated by neither ticket. `prepublishOnly` → `pnpm run build` → `tsc -p tsconfig.build.json` with `rootDir: "src"` compounds this: the build now walks a directory containing hand-written `.mjs` and a hand-written `index.d.mts` inside its own `rootDir`. | `package.json` `files`/`exports`/`prepublishOnly`, `tsconfig.build.json`, NFR-018 Measurement, NFR-018-AC-2, FR-041 Outputs, TC-372 |
| FND-383 | high | FR-040 makes one artifact serve two incompatible roles. As a disposition ledger it holds "one record for each of the thirteen prototype components" and "SHALL contain no record whose `source` is absent or empty". As a file-ownership allowlist, FR-040-AC-5 requires every file under `src/compiler/` except the inventory itself to be "the target of exactly one record". Three of FR-041's five outputs are not prototype components and have no spike source at all: `src/compiler/index.mjs` (the narrow re-export interface), `src/compiler/index.d.mts` (new TypeScript declarations), and `src/compiler/cli.mjs` (a new CLI, whose invocation string FR-044 records as new). Each is simultaneously required to have an owning record and forbidden from having one. The file set is also indeterminate from the requirements: `compileSemanticIr` is exported by the narrow interface and tested by FR-041-AC-3 but no Output names the module it lives in, so ERR-052/TC-326 cannot be evaluated against a known file list. | FR-040 Behavior, FR-040-AC-1, FR-040-AC-5, FR-041 Outputs, FR-041-AC-3, ERR-052, TC-320, TC-326 |
| FND-384 | medium | No requirement allocates how `src/compiler/**` enters the repository's own gates, which is the outcome US-009 exists to deliver. US-009-EX-1 promises a module "that is formatted, typechecked, and tested by the repository's own gates". `tsconfig.json` sets neither `allowJs` nor `checkJs`, so `pnpm run typecheck` and `pnpm run lint` (`biome format . && tsc --noEmit`) typecheck nothing inside a `.mjs` file; only Biome formatting would apply, and Biome's `includes` list has no `src/compiler` exception either way. `tsconfig.build.json` excludes only `test`, `scripts`, `node_modules`, and `dist`. NFR-017's permitted list names `tsconfig*.json` and `biome.json`, which implies the promotion edits them, but no FR Output, no acceptance criterion, and no TC in TC-320..375 says what those edits are or asserts the gates cover the promoted files afterwards. | US-009-EX-1, `tsconfig.json`, `tsconfig.build.json`, `biome.json`, `package.json` `scripts.lint`/`scripts.typecheck`, NFR-017 Scope |
| FND-385 | medium | "The repository's build interface" that US-009-EX-1 promises downstream tickets has no named entry point. FR-041 defines a programmatic export set and a CLI invoked as a bare `node src/compiler/cli.mjs emit-ir …`; no requirement adds a `package.json` script or a `Makefile` target, although NFR-017 permits both files and the repository's convention is that every gate is a `make` target delegating to a pnpm script (and, for the private `packages/semantic-core` build, a Makefile-only target justified by NFR-014). Issues #19, #21, #22, and #23 are therefore told to call an interface whose invocation contract is a raw file path inside this repository's `src/`, which is precisely the coupling US-009-EX-1 objects to for `spikes/`. | US-009-EX-1, FR-041 Outputs, `Makefile` (`semantic-core-*` targets), `package.json` `scripts`, NFR-017 Scope |
| FND-386 | medium | The Python generation route is left inside non-canonical code, so issue #23 gains no supported path. FR-043 promotes only `normalizeJsonSchemaForPython` and states that "the Python code generation itself SHALL remain the official `datamodel-code-generator`", but the code that provisions the venv, pins `datamodel-code-generator==0.76.0` and `pydantic 2.12.5`, and invokes the generator is `ensurePython` and `pythonGeneratorArguments` in `spikes/typespec-feasibility/scripts/run-experiment.mjs` — a file NFR-006 declares non-canonical and FR-044 keeps as frozen evidence. FR-043 lists those pinned versions as Inputs while owning none of the machinery that honours them, and FR-041-CON-4 plus NFR-017's path lists (which admit neither `pyproject.toml` nor `tests/**`) close off adding it here. Whether #27, #19, or #23 owns promoting the invocation is unstated, so the ticket that "unblocks #23" leaves #23's only working route in the spike. | FR-043 Inputs, FR-043 Behavior, `spikes/typespec-feasibility/scripts/run-experiment.mjs` lines 472–527, 607–627, NFR-006 Statement, NFR-017 Scope |
| FND-387 | medium | The backend qualification limitation is scheduled for discharge by tickets that do not own the gate it names. FR-042-CON-3 requires the limitation naming "the absent conformance corpus, property/fuzz suite, compatibility matrix, and downstream adoption" to remain "until issues #21 and #22 discharge it". The conformance corpus and oracle is issue #20, which `spec.md` 2.2 and US-009's Dependencies both place outside #27 and describe as built independently ("issue #27 neither reads nor edits it, because that independence is the point"). Nothing says #20's corpus is the evidence that discharges the limitation, nor what #21 and #22 may present instead, so TC-346 will keep passing on a string that no named owner can ever satisfy. | FR-042-CON-3, FR-042-AC-6, `spec.md` 2.2, US-009 Dependencies, TC-346 |
| FND-388 | medium | NFR-006 is silently redefined and nothing amends it. Its Statement requires the experiment to "run from exact locked dependencies in an isolated spike directory"; FR-044 makes the spike import `src/compiler/` and call the promoted CLI, after which the spike is no longer self-contained and its reproducibility depends on repository code outside `spikes/`. That is the intended redraw — the spike becomes evidence-only while its generators become owned — but NFR-006 still carries `test/typespec-feasibility.test.ts` and `evidence/validation.json` as its evidence refs, and no requirement in the #27 bundle amends its Statement or Scope. Compare the precedent set by NFR-014-AC-2, where the issue #35 bundle explicitly allocated one-paragraph amendments to the documents whose meaning it changed. | NFR-006 Statement, NFR-006 Scope/evidence, FR-044 Behavior, NFR-014-AC-2, FR-044-AC-1 |
| FND-389 | medium | The frozen, non-canonical spike becomes the permanent acceptance oracle for owned code, with no owner for that data after the spike's purpose ends. FR-041-AC-2, FR-042-AC-1, FR-042-AC-2, and FR-043-AC-1 all assert byte identity against retained bytes under `spikes/typespec-feasibility/generated/custom/`, and FR-042 Behavior calls this equivalence "the promotion oracle". `spec.md` 2.2 and NFR-006 say the spike is disposable, non-canonical evidence. The bundle answers what is deleted (`emitter/`) and what is rewired (`scripts/`, `package.json`, `evidence/custom.json`), but not what the goldens become: fixtures that `src/compiler/`'s permanent test suite depends on, historical evidence that may be retired, or both. Nothing says who re-homes them if issue #20's corpus supersedes them or if the spike is ever removed. | FR-041-AC-2, FR-042 Behavior, FR-042-AC-1, FR-042-AC-2, FR-043-AC-1, NFR-006 Rationale, `spec.md` 2.2 |
| FND-390 | low | NFR-017's path lists are not evaluable as written. They permit `reviews/**` although this bundle's own review artifacts land under `spec/reviews/27-promote-prototype-emitters/` (already inside `spec/**`), while the repository also has a separate top-level `reviews/` directory whose relationship to the promotion is unstated. They name `Makefile` without the "build targets only" scoping NFR-014 used for the same file. They omit `pyproject.toml`, `tests/**`, and `.github/workflows/**` entirely — omission is prohibition under NFR-018-AC-1, which is probably correct but is nowhere stated as a decision. And FR-044-AC-2 diffs against `origin/main...HEAD` while the pre-existing changed-path gate diffs against `main...HEAD`, so the two gates can disagree on a stale local `main`. | NFR-017 Scope, NFR-018-AC-1, NFR-014 Scope, FR-044-AC-2, `test/typespec-feasibility.test.ts` `changedPaths` |
| FND-391 | low | Two `spec.md` boundary statements are now stale. Section 2.2's first bullet still reads "Implementing the production semantic compiler or production emitter framework; issue #4 may implement only an isolated disposable experimental emitter" as an unqualified out-of-scope entry, while 2.1 now admits "the promoted semantic-IR emitter, TypeScript and Rust generation backends, and Python JSON Schema adapter under `src/compiler/`"; the two are reconciled only by reading FR-041-CON-1 for where the line falls (the emitted IR shape, not the emitter's existence). Section 4's ownership table likewise still says `filament-core-data` owns "compiler and emitters in later tickets", which as of this bundle is a current responsibility rather than a future one. | `spec.md` 2.1, `spec.md` 2.2, `spec.md` section 4, FR-041-CON-1 |

## Responsibility Allocation

| Concern | Owner | Class |
|---|---|---|
| Disposition record for the thirteen issue #4 prototype components (FR-040) | filament-core-data issue #27 | cross-cutting |
| `## Promotion inventory` section of `docs/semantic-data-system/typespec-feasibility.md` (FR-040-AC-6) | filament-core-data issue #27 | cross-cutting |
| Semantic-IR emitter, `buildSemanticIr`, `$onEmit` entry point, narrow interface, CLI (FR-041) | filament-core-data issue #27 | core |
| Module hosting `compileSemanticIr` | Unallocated, see FND-383 | core |
| TypeScript and Rust/Serde backends as pure IR→text functions (FR-042) | filament-core-data issue #27 | core |
| JSON Schema normalization for `datamodel-code-generator`, forbidden-key rejection (FR-043) | filament-core-data issue #27 | core |
| Provisioning and invoking `datamodel-code-generator` itself | Unallocated, see FND-386; currently in the non-canonical spike runner | infrastructure |
| Spike rewiring, emitter-package deletion, `file:` dependency removal, lockfile seeding (FR-044) | filament-core-data issue #27 | infrastructure |
| Determinism, retained-evidence byte gates, dependency pinning (NFR-017) | filament-core-data issue #27 | cross-cutting |
| Non-disruption, licence posture, revert rehearsal (NFR-018) | filament-core-data issue #27 | cross-cutting |
| Amendment of the `test/typespec-feasibility.test.ts` changed-path allowlist | Unallocated, see FND-381 | cross-cutting |
| Amendment of NFR-006's isolation statement | Unallocated, see FND-388 | cross-cutting |
| `tsconfig*.json` / `biome.json` wiring so the promoted `.mjs` sources are typechecked and formatted | Unallocated, see FND-384 | infrastructure |
| Named build entry point (`make` target or `package.json` script) for the compiler | Unallocated, see FND-385 | infrastructure |
| Whether `src/compiler/**` ships inside the `files` tarball | Unallocated between #27 and #11, see FND-382 | cross-cutting |
| Long-term home of the retained goldens used as the promotion oracle | Unallocated, see FND-389 | core |
| Revising the emitted semantic-IR shape and `schemaVersion` | Issue #19 semantic compiler (FR-041-CON-1) | external to this ticket |
| Rust package generation and layout | Issue #21 | external to this ticket |
| TypeScript package generation and layout | Issue #22 | external to this ticket |
| Python package generation and layout | Issue #23 | external to this ticket |
| Publication of any package, registry names, `exports` surface | Issue #11 and `agent-ix/quoin#290` | external to this ticket |
| Conformance corpus and independent oracle | Issue #20, built in parallel, deliberately not read by #27 | external |
| Discharge of the representative-slice-only limitation | Named as #21/#22 but gated on #20's corpus, see FND-387 | external |
| `@typespec/json-schema` `$id` alias defect and removal of the adapter's `$ref` rewriting | Issue #31 (FR-043-CON-2) | external |
| Semantic-core grammar, kernel scalars, lowering table | Issue #35, frozen for #27 (`packages/**` prohibited) | core, prior ticket |
| IR v1.1 node shapes and readers | Issue #34, frozen for #27 | core, prior ticket |
| Avro baseline, `src/generated.ts`, `schema/**`, `fixtures/**`, `agent_ix_core_data/**` | Prior tickets, prohibited paths for #27 | external to this ticket |
| Corpus repositories | Corpus owners; untouched | external |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `@typespec/compiler` 1.15.0, `@typespec/versioning` 0.85.0 (exact pins already in `package.json`) | Toolchain | Guaranteed | FR-041-CON-2, FR-041-CON-4, NFR-017-AC-4, TC-339, TC-369 |
| `navigateProgram` and the `$onEmit` emitter contract | Official TypeSpec API | Assumed | FR-041 Behavior; FR-041-AC-5 compares the two routes but does not pin the API |
| `@typespec/json-schema` 1.15.0 bundle shape | Adapter input | Guaranteed | FR-043-AC-1 byte identity against the retained bundle |
| Issue #31 `$id` defect | Upstream defect the adapter compensates for | Guaranteed while open | FR-043-CON-2, FR-043-AC-6, TC-355 |
| `datamodel-code-generator` 0.76.0, `pydantic` 2.12.5 | Python code generator, invoked only from the spike runner | Assumed, unallocated | FR-043 Inputs; see FND-386 |
| Retained issue #4 goldens under `spikes/typespec-feasibility/generated/custom/` | Promotion oracle | Guaranteed | FR-041-AC-2, FR-042-AC-1, FR-042-AC-2, FR-043-AC-1; ownership open, see FND-389 |
| Retained `spikes/typespec-feasibility/generated/custom/rust/Cargo.lock` | Reproducibility seed | Guaranteed | FR-044-AC-3, FR-044-CON-2, NFR-017-AC-3, TC-360, TC-361 |
| crates.io index state and `cargo check --offline --locked` | Host environment | Guaranteed via lockfile seeding | NFR-017-AC-3, TC-368 |
| `test/typespec-feasibility.test.ts` changed-path allowlist (NFR-006 gate) | Pre-existing repository gate the branch must keep green | Assumed, and currently incompatible | See FND-381 |
| `package.json` `files`/`exports` publication surface | Existing published contract | Partially guaranteed (`exports` only) | NFR-018-AC-2; `files` unmeasured, see FND-382 |
| Issue #20 conformance corpus and oracle | Future evidence for the backends' qualification | Assumed, not consumed | FR-042-CON-3, `spec.md` 2.2; see FND-387 |
| Issue #11 and `agent-ix/quoin#290` publication gate | Downstream gate | Assumed | NFR-018 Scope, NFR-018-AC-5, TC-375 |

`spec.md` 2.2's issue #27 entries, US-009's Dependencies section, and NFR-018's
operational-context note agree with each other on the outer boundary: no package
is generated or published, no consumer moves, the IR shape stays with #19, and
#20 stays independent. FND-380 through FND-383 are contradictions between this
bundle and machinery already in the tree that would stop the work rather than
merely under-specify it; FND-384 through FND-389 are responsibilities the bundle
leaves with no owner; FND-390 and FND-391 are hygiene on the gate lists and on
`spec.md`'s own scope prose.
