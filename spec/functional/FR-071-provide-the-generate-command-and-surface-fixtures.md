---
id: FR-071
title: "Provide the generate command and the surface fixtures"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-065"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-067"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-071] Provide the generate command and the surface fixtures

## Description

The TypeScript backend SHALL be reachable by one command that reads an IR
document and writes a deterministically formatted generated package to a
caller-named directory, whose emitted bytes and whose public surface the
committed fixtures of this requirement hold to a comparison, so that "the
generated package did not change" is a byte comparison and "the package's public
surface did not grow" is a checked fact rather than a review opinion.

## Inputs

- A semantic IR document at `contractVersion` `2.0.0`, read from `--ir`
- A target name from `common.schema.json#/$defs/target`, read from `--target`
- An output root directory, read from `--out-root`
- An optional profile document valid against `schema/semantic/v1/profile.schema.json`, read from `--profile`
- An optional limits file valid against `schema/semantic/v1/compiler-request.schema.json#/properties/limits`, read from `--limits`
- The exactly-pinned `@biomejs/biome` binary this repository's lockfile already carries, used as the injected formatter
- The committed generation fixture under `test/fixtures/backends/typescript/`

## Outputs

- `src/compiler/backends/typescript-v1/emit.mjs` exporting `emitTypeScriptPackage(request, options)`, the orchestration behind the `generate` verb
- `src/compiler/backends/typescript-v1/emit.d.mts` declaring `emitTypeScriptPackage` and its request and result shapes
- `src/compiler/backends/format.mjs` exporting `biomeFormatter(host)`, the injected formatter that renders generated text through the pinned `@biomejs/biome` binary
- `src/compiler/backends/format.d.mts` declaring that surface
- The `generate` verb added to the existing `src/compiler/cli.mjs`, whose four existing verbs are unchanged
- `make generate-typescript` and `make generate-typescript-check` targets
- `test/fixtures/backends/typescript/tsconfig.json`, the strict configuration the generated package and the type-level fixtures are checked under
- `test/fixtures/backends/typescript/bundle-surface/**`, the entry modules and the committed reachable-symbol record
- The committed generation fixture and type-level fixtures under `test/fixtures/backends/typescript/`
- One edit to the root `tsconfig.json`, adding `test/fixtures/backends/typescript` to its `exclude`

## Behavior

### The command

- The CLI SHALL accept `generate --ir <file> --target <target> --out-root <dir> [--profile <file>] [--manifest <file>] [--limits <file>]`.
- The existing `emit-ir`, `compile`, `inspect`, and `diff` verbs SHALL keep their current flags and behavior unchanged, so no caller of the issue #19 command line is moved by this requirement.
- `generate` SHALL default `--target` to `typescript`.
- If `--target` names a target the backend registry has registered as declared-unimplemented, then `generate` SHALL name that target and the issue the registry records as its owner, as the frontend seam does for an unimplemented dialect.
- If `--target` names a value outside the closed target vocabulary, then `generate` SHALL reject the invocation as a usage error rather than as a document defect.
- `generate` SHALL apply the `DEFAULT_LIMITS` of `src/compiler/diagnostics.mjs` where `--limits` is absent, and the file's values where it is present.
- `generate` SHALL read no environment variable to decide behavior; every input is a flag or a file.
- `generate` SHALL write every output by creating a sibling temporary file `<path>.tmp` in the same directory and renaming it over the target, so a failed write cannot leave a half-written file.
- Those temporary paths SHALL be the only paths the command creates beyond the ones the caller named.
- If any diagnostic is blocking, then `generate` SHALL write no file under `--out-root`.
- If any diagnostic is blocking, then `generate` SHALL leave a pre-existing file under `--out-root` byte-unchanged.
- If any diagnostic is blocking, then `generate` SHALL create no file under `--out-root` where none existed.
- `generate` SHALL write the output manifest of `schema/semantic/v1/output-manifest.schema.json` to `--manifest` when that flag is given, and to standard output otherwise.
- `generate` SHALL write sorted diagnostics to standard error as one line per diagnostic.
- `generate` SHALL exit `0` when it produced no blocking diagnostic and the manifest state is `success` or `lossy`.
- `generate` SHALL exit `1` when it produced a blocking diagnostic or a manifest state of `invalid`, `unsupported`, or `unavailable`.
- `generate` SHALL exit `2` when the caller named an unknown command, an unknown flag, a missing required flag, an unreadable flag value, or a target outside the closed vocabulary.
- If the caller names an unknown command or flag, then the CLI SHALL print the usage text.
- `generate` SHALL publish nothing to any registry.
- `generate` SHALL make no network request.

### Deterministic formatted output

- The issue's third deliverable names deterministic *formatted* output, and determinism alone does not supply it: two runs of a consistently ugly generator agree with each other. This requirement SHALL therefore settle the formatting as well as the stability.
- `generateTarget` SHALL take an injected `options.format(text, path)`, and `emitTypeScriptPackage` SHALL supply the formatter of `src/compiler/backends/format.mjs`.
- `biomeFormatter` SHALL render generated text through the `@biomejs/biome` binary at the exact version this repository's lockfile pins, in the manner `conformance/tools/format-json.mjs` already renders generated JSON.
- `src/compiler/backends/format.mjs` SHALL be the one module under `src/compiler/backends/` that starts a child process, and it SHALL say so in its own header, as `src/compiler/identity.mjs` already says it is the one module under `src/compiler/` outside `cli.mjs` that reads a file.
- Every module under `src/compiler/backends/typescript-v1/` SHALL remain pure, receiving the formatter as an argument rather than reaching for it.
- The output manifest's `files[].digest` SHALL be computed over the formatted bytes, so the digest names what was written.
- Because the formatter is the repository's own, `biome format .` over the committed generated fixture SHALL report no change, and `biome.json` SHALL NOT be edited by this work.
- If the formatter is unavailable or exits non-zero, then `generate` SHALL fail with a blocking diagnostic naming it, rather than writing unformatted output.

### Determinism of the emitted bytes

- Two consecutive runs over one IR document into two different output directories SHALL produce byte-identical files at corresponding paths.
- Those two runs SHALL produce a byte-identical output manifest, because the manifest carries digests and a fingerprint and no path, clock, or host value.
- A run from a different working directory SHALL produce byte-identical files, so no emitted byte depends on where the command was invoked.
- A run under `LC_ALL=tr_TR.UTF-8` SHALL produce byte-identical files; the Turkish locale is named because dotted-I case folding is how a locale-dependent identifier mint or sort would first show itself.
- A run with every environment variable cleared but `PATH` SHALL produce byte-identical files.

### The packed artifact

- The default artifact comparison SHALL be a listing this repository computes itself, naming each packable file's path, size, and content digest.
- The self-computed listing SHALL be the stated default because `npm pack` starts `npm`, which reads ambient configuration and in this ecosystem may be pointed at a private registry, so its output is a function of the host as well as of the package.
- `npm pack --dry-run --json` MAY be run as an optional cross-check, and its result SHALL NOT be the gate.
- The listing SHALL be equal between two runs after normalization.
- Normalization SHALL replace exactly the archive's own recorded `mtime`, `uid`, `gid`, `uname`, and `gname` members with fixed values.
- Normalization SHALL change no member other than those five.
- Normalization SHALL NOT normalize a file's path, size, mode, or content digest, because those are the members the comparison exists to check.

### The committed fixtures

- The repository SHALL carry a generation fixture under `test/fixtures/backends/typescript/` holding one input IR document and the full expected generated package.
- The committed expected package is a **regression baseline and not an oracle**: it can only have been produced by the generator it is compared against, so it proves that nothing changed and proves nothing about correctness. Its oracle is the conformance run of [FR-070](./FR-070-run-the-typescript-conformance-adapter.md) and the differential validator check of [FR-066](./FR-066-generate-runtime-validators.md), and this requirement SHALL record that distinction beside the fixture, as `provenance.blessedFromRun` records it for the conformance corpus.
- The fixture's input IR document SHALL be the smallest document that exercises all eight `kind` values, the four presence and nullability combinations, and one constraint of each operand shape, because every deliberate change to FR-064 through FR-067 rewrites the whole committed package and the fixture's size is therefore its maintenance cost.
- `make generate-typescript-check` SHALL regenerate the fixture into a scratch directory outside the repository tree and compare the result with the committed fixture.
- `make generate-typescript-check` SHALL NOT rewrite the committed fixture in place; regenerating a committed artifact inside the working tree is the defect issue #49 records, where three unrelated changed-path gates failed at random because a gate read a file another suite was part way through rewriting, and this requirement does not repeat it.
- `make generate-typescript` SHALL write the generated package to a caller-named directory.
- `make generate-typescript` SHALL NOT write into `test/fixtures/`.

### Typechecking the generated output

- The root `tsconfig.json` includes `test`, sets `noUnusedLocals` and `noUnusedParameters`, does not set `exactOptionalPropertyTypes`, and is the program `make lint` runs. A committed generated package and four deliberately-uncompilable fixtures cannot sit inside that program, so this requirement SHALL add `test/fixtures/backends/typescript` to its `exclude`, and that single edit is the whole of this work's change to that file.
- `test/fixtures/backends/typescript/tsconfig.json` SHALL be the authoritative program for generated output, setting `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`.
- The suite SHALL typecheck every generated package of a run as **one** program through the TypeScript compiler API, rather than starting one compiler process per document, because the corpus admits 70 documents and a process apiece would add minutes to a suite that completes in about thirty seconds.
- The suite SHALL check the four deliberately-uncompilable type-level fixtures by a separate invocation that asserts the expected diagnostic code of each, so a fixture that fails to compile for the wrong reason is a failure rather than a pass.
- The repository SHALL carry type-level fixtures under `test/fixtures/backends/typescript/` that are checked by the compiler rather than executed.
- A type-level fixture SHALL assert that a successful validation result narrows to the generated type and that reading the value outside the successful branch fails to compile.
- A type-level fixture SHALL assert exhaustive handling of a generated discriminated union by assigning the unhandled residue to `never`, so adding a variant fails to compile.
- A type-level fixture SHALL assert the four presence and nullability forms of [FR-066](./FR-066-generate-runtime-validators.md) as four distinct declared property types.
- A type-level fixture SHALL assert that removing a declared export from the generated package fails to compile against the committed consumer.

### The reachable-symbol walk

- No bundler is reachable in this repository: `esbuild`, `rollup`, and `vite` exist only as transitive dependencies of `vitest` under `node_modules/.pnpm/**`, neither `import("esbuild")` nor `import("rollup")` resolves from the repository root, and [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md) freezes both lockfiles. The surface measurement SHALL therefore be a static reachable-symbol walk over the generated package's own module graph rather than a bundle.
- The walk SHALL start from one named export of the generated package, follow relative import specifiers and named re-exports, and collect the top-level bindings it reaches.
- Before reporting a result, the walk SHALL assert four enabling conditions: the generated `package.json` declares `"sideEffects": false`; no generated module imports a non-relative specifier; no generated module re-exports by wildcard; and every generated export is a top-level binding whose initializer has no side effect.
- If any of those four conditions does not hold, then the walk SHALL fail rather than report a set, because for a package satisfying all four the reachable set is exactly what a tree-shaker retains, and for a package that does not it is not.
- The repository SHALL carry a committed record of the symbols reachable from each declared single-type entry module.
- If the reachable-symbol set of an entry module grows, then the check SHALL fail, so a widened surface is a decision rather than an accident.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-071-CON-1 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making the backend a runtime entry point remains issue #11. | Non-disruption | Analysis |
| FR-071-CON-2 | The CLI SHALL be the one place that reads a flag, constructs the injected host, and passes it and the injected formatter down to every module below it, so no module beneath it reaches for an environment variable or the filesystem on its own. | Security | Static analysis |
| FR-071-CON-3 | No `make` target of this requirement SHALL rewrite a committed artifact inside the working tree; every regeneration goes to a scratch directory and is compared. | Maintainability | Target inspection |
| FR-071-CON-4 | The command SHALL neither publish nor make a network request; the safety gate on issue #22 forbids publication until the compatibility and release-readiness gates pass. | Safety | Purity test |
| FR-071-CON-5 | The committed fixture SHALL NOT be regenerated to make a failing comparison pass; a difference is a defect in the backend or a recorded, reviewed change to the fixture, never a silent rebaseline. | Integrity | Branch diff |
| FR-071-CON-6 | Adding a verb SHALL change no existing verb's flags, exit codes, or output; the four issue #19 verbs stay byte-equivalent in behavior. | Non-disruption | Regression test |
| FR-071-CON-7 | The surface measurement SHALL add no dependency to either lockfile; it uses no bundler, because none is resolvable here. | Non-disruption | Lockfile comparison |
| FR-071-CON-8 | The edit to the root `tsconfig.json` SHALL be confined to adding one `exclude` entry; no compiler option of that file changes, so no other file in the repository is typechecked differently by this work. | Non-disruption | Manifest comparison |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-071-AC-1 | `generate` over the committed fixture IR writes the committed expected package byte for byte and exits `0`. | Snapshot |
| FR-071-AC-2 | Two runs into two different directories produce byte-identical files and a byte-identical output manifest. | Integration |
| FR-071-AC-3 | A run from a different working directory, a run under `LC_ALL=tr_TR.UTF-8`, and a run with every environment variable cleared but `PATH` each produce bytes identical to the first run. | Integration |
| FR-071-AC-4 | A generation whose document carries a blocking diagnostic writes no file under a fresh `--out-root`, leaves a pre-existing file there byte-unchanged, exits `1`, and writes a manifest whose `state` is not `success` and whose `files` array is empty. | Integration |
| FR-071-AC-5 | Every path the command creates during a fixture generation is a caller-named path or its `.tmp` sibling, asserted by an instrumented host. | Integration |
| FR-071-AC-6 | An unknown command, an unknown flag, a missing required flag, and an unreadable `--limits` file each exit `2` and print the usage text. | Unit |
| FR-071-AC-7 | A `--target` naming a registered declared-unimplemented target prints that target and the owning issue the registry records for it, and exits `1`; a `--target` outside the closed target vocabulary exits `2`. Both are exercised over the registry as it stands at the time of the run rather than over a named sibling target, so neither assertion depends on which targets remain unimplemented. | Unit |
| FR-071-AC-8 | The self-computed normalized artifact listing is equal between two runs, and a listing normalized only in `mtime`, `uid`, `gid`, `uname`, and `gname` still differs when one generated file's content differs by one byte. | Integration |
| FR-071-AC-9 | The type-level fixtures compile under the fixture `tsconfig.json`; the four deliberately-uncompilable fixtures each fail with the expected diagnostic code, and a fixture failing with a different code fails the check. | Compile |
| FR-071-AC-10 | The four presence and nullability forms appear as four distinct declared property types in the type-level fixture, checked by assignability probes rather than by inspection. | Compile |
| FR-071-AC-11 | The committed reachable-symbol record matches the walk's result for every declared entry module, adding an export to an entry's reachable set fails the check, and removing `"sideEffects": false` from the generated manifest makes the walk fail rather than report a set. | Analysis |
| FR-071-AC-12 | `make generate-typescript-check` writes no byte inside the repository tree, asserted by an unchanged `git status --porcelain` after it runs. | Integration |
| FR-071-AC-13 | `emit-ir` over the spike entrypoint still reproduces `spikes/typespec-feasibility/generated/custom/semantic-ir.json` byte for byte, and `compile`, `inspect`, and `diff` still satisfy their FR-052 acceptance criteria. | Integration |
| FR-071-AC-14 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the base endpoint of this change's history-pinned range, and no dependency was added to either lockfile. | Analysis |
| FR-071-AC-15 | During a fixture generation the command opens no network socket and starts no child program other than the pinned `@biomejs/biome` formatter, asserted by an instrumented spawn. | Integration |
| FR-071-AC-16 | The `generate` verb reads no environment variable, asserted by a static scan of `src/compiler/cli.mjs` and every module under `src/compiler/backends/typescript-v1/` for `process.env`. | Static |
| FR-071-AC-17 | `biome format .` reports no change over the committed generated fixture, and `biome.json` is byte-unchanged from the base endpoint of this change's history-pinned range. | Static |
| FR-071-AC-18 | A generation whose formatter exits non-zero writes no file and reports a blocking diagnostic naming the formatter. | Unit |
| FR-071-AC-19 | The root `tsconfig.json` differs from the base endpoint of this change's history-pinned range by exactly one added `exclude` entry, and every generated fixture path is outside the program `make lint` runs. | Analysis |
| FR-071-AC-20 | Typechecking every generated package of a corpus run completes as one compiler program, and the suite's added wall-clock time is recorded in the run's own output rather than estimated. | Integration |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Downstream**: [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
