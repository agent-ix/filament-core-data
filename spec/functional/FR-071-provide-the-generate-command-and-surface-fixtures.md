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
document and writes a generated package to a caller-named directory, and its
output SHALL be proved byte-stable and surface-stable by committed fixtures, so
that "the generated package did not change" is a byte comparison and "the
package's public surface did not grow" is a checked fact rather than a review
opinion.

## Inputs

- A semantic IR document at `contractVersion` `1.1.0`, read from `--ir`
- A target name from `common.schema.json#/$defs/target`, read from `--target`
- An output root directory, read from `--out-root`
- An optional profile document valid against `schema/semantic/v1/profile.schema.json`, read from `--profile`
- An optional limits file valid against `schema/semantic/v1/compiler-request.schema.json#/properties/limits`, read from `--limits`
- The committed generation fixture under `test/fixtures/backends/typescript/`

## Outputs

- `src/compiler/backends/typescript-v1/emit.mjs` exporting `emitTypeScriptPackage(request, options)`, the orchestration behind the `generate` verb
- `src/compiler/backends/typescript-v1/emit.d.mts` declaring `emitTypeScriptPackage` and its request and result shapes
- The `generate` verb added to the existing `src/compiler/cli.mjs`, whose four existing verbs are unchanged
- `make generate-typescript` and `make generate-typescript-check` targets
- The committed generation fixture, type-level fixtures, and bundle-surface record under `test/fixtures/backends/typescript/`

## Behavior

### The command

- The CLI SHALL accept `generate --ir <file> --target <target> --out-root <dir> [--profile <file>] [--manifest <file>] [--limits <file>]`.
- The existing `emit-ir`, `compile`, `inspect`, and `diff` verbs SHALL keep their current flags and behavior unchanged, so no caller of the issue #19 command line is moved by this requirement.
- `generate` SHALL default `--target` to `typescript`.
- If `--target` names a target the backend registry does not implement, then `generate` SHALL name that target and its owning issue rather than guessing, as the frontend seam does for an unimplemented dialect.
- `generate` SHALL apply the `DEFAULT_LIMITS` of `src/compiler/diagnostics.mjs` where `--limits` is absent, and the file's values where it is present.
- `generate` SHALL read no environment variable to decide behavior; every input is a flag or a file.
- `generate` SHALL write every output by creating a sibling temporary file `<path>.tmp` in the same directory and renaming it over the target, so a failed write cannot leave a half-written file.
- Those temporary paths SHALL be the only paths the command creates beyond the ones the caller named.
- If any diagnostic is blocking, then `generate` SHALL write no file under `--out-root`.
- If any diagnostic is blocking, then `generate` SHALL leave a pre-existing file under `--out-root` byte-unchanged.
- If any diagnostic is blocking, then `generate` SHALL create no file under `--out-root` where none existed.
- `generate` SHALL write the output manifest of `schema/semantic/v1/output-manifest.schema.json` to `--manifest` when that flag is given, and to standard output otherwise.
- `generate` SHALL write sorted diagnostics to standard error as one line per diagnostic.
- `generate` SHALL exit `0` when it produced no blocking diagnostic and the manifest state is `success`.
- `generate` SHALL exit `1` when it produced a blocking diagnostic or a manifest state other than `success`.
- `generate` SHALL exit `2` when the caller named an unknown command, an unknown flag, a missing required flag, or an unreadable flag value.
- If the caller names an unknown command or flag, then the CLI SHALL print the usage text.
- `generate` SHALL publish nothing to any registry.
- `generate` SHALL make no network request.

### Determinism of the emitted bytes

- Two consecutive runs over one IR document into two different output directories SHALL produce byte-identical files at corresponding paths.
- Those two runs SHALL produce a byte-identical output manifest, because the manifest carries digests and a fingerprint and no path, clock, or host value.
- A run from a different working directory SHALL produce byte-identical files, so no emitted byte depends on where the command was invoked.
- A run under `LC_ALL=tr_TR.UTF-8` SHALL produce byte-identical files; the Turkish locale is named because dotted-I case folding is how a locale-dependent identifier mint or sort would first show itself.
- A run with every environment variable cleared but `PATH` SHALL produce byte-identical files.

### The packed artifact

- A deterministic archive listing of the generated package — `npm pack --dry-run --json` over the emitted package root, or an equivalent listing of path, size, and content digest — SHALL be equal between two runs after normalization.
- Normalization SHALL replace exactly the archive's own recorded `mtime`, `uid`, `gid`, `uname`, and `gname` members with fixed values.
- Normalization SHALL change no member other than those five.
- Normalization SHALL NOT normalize a file's path, size, mode, or content digest, because those are the members the comparison exists to check.

### The committed fixtures

- The repository SHALL carry a generation fixture under `test/fixtures/backends/typescript/` holding one input IR document and the full expected generated package.
- `make generate-typescript-check` SHALL regenerate the fixture into a scratch directory outside the repository tree and compare the result with the committed fixture.
- `make generate-typescript-check` SHALL NOT rewrite the committed fixture in place; regenerating a committed artifact inside the working tree is the defect issue #49 records, where three unrelated changed-path gates failed at random because a gate read a file another suite was part way through rewriting, and this requirement does not repeat it.
- `make generate-typescript` SHALL write the generated package to a caller-named directory.
- `make generate-typescript` SHALL NOT write into `test/fixtures/`.
- The repository SHALL carry type-level fixtures under `test/fixtures/backends/typescript/` that are checked by `tsc --noEmit` rather than executed.
- A type-level fixture SHALL assert that a successful validation result narrows to the generated type and that reading the value outside the successful branch fails to compile.
- A type-level fixture SHALL assert exhaustive handling of a generated discriminated union by assigning the unhandled residue to `never`, so adding a variant fails to compile.
- A type-level fixture SHALL assert the four presence and nullability forms of [FR-066](./FR-066-generate-runtime-validators.md) as four distinct declared property types.
- A type-level fixture SHALL assert that removing a declared export from the generated package fails to compile against the committed consumer.
- The repository SHALL carry a bundle-surface record naming every symbol reachable from a single-type import of the generated package.
- If the reachable-symbol set of that import grows, then the bundle-surface check SHALL fail, so a widened surface is a decision rather than an accident.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-071-CON-1 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making the backend a runtime entry point remains issue #11. | Non-disruption | Analysis |
| FR-071-CON-2 | The CLI SHALL be the one place that reads a flag, constructs the injected host, and passes it down to every module below it, so no module beneath it reaches for an environment variable or the filesystem on its own. | Security | Static analysis |
| FR-071-CON-3 | No `make` target of this requirement SHALL rewrite a committed artifact inside the working tree; every regeneration goes to a scratch directory and is compared. | Maintainability | Target inspection |
| FR-071-CON-4 | The command SHALL neither publish nor make a network request; the safety gate on issue #22 forbids publication until the compatibility and release-readiness gates pass. | Safety | Purity test |
| FR-071-CON-5 | The committed fixture SHALL NOT be regenerated to make a failing comparison pass; a difference is a defect in the backend or a recorded, reviewed change to the fixture, never a silent rebaseline. | Integrity | Branch diff |
| FR-071-CON-6 | Adding a verb SHALL change no existing verb's flags, exit codes, or output; the four issue #19 verbs stay byte-equivalent in behavior. | Non-disruption | Regression test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-071-AC-1 | `generate` over the committed fixture IR writes the committed expected package byte for byte and exits `0`. | Snapshot |
| FR-071-AC-2 | Two runs into two different directories produce byte-identical files and a byte-identical output manifest. | Integration |
| FR-071-AC-3 | A run from a different working directory, a run under `LC_ALL=tr_TR.UTF-8`, and a run with every environment variable cleared but `PATH` each produce bytes identical to the first run. | Integration |
| FR-071-AC-4 | A generation whose document carries a blocking diagnostic writes no file under a fresh `--out-root`, leaves a pre-existing file there byte-unchanged, exits `1`, and writes a manifest whose `state` is not `success` and whose `files` array is empty. | Integration |
| FR-071-AC-5 | Every path the command creates during a fixture generation is a caller-named path or its `.tmp` sibling, asserted by an instrumented host. | Integration |
| FR-071-AC-6 | An unknown command, an unknown flag, a missing required flag, and an unreadable `--limits` file each exit `2` and print the usage text. | Unit |
| FR-071-AC-7 | `--target rust` names the target and issue #21 as its owner and exits `1`; `--target avro` is rejected as outside the target vocabulary and exits `2`. | Unit |
| FR-071-AC-8 | The normalized packed-artifact listing is equal between two runs, and a listing normalized only in `mtime`, `uid`, `gid`, `uname`, and `gname` still differs when one generated file's content differs by one byte. | Integration |
| FR-071-AC-9 | The type-level fixtures compile under `tsc --noEmit`; a deliberate mutation removing a union variant handler, one reading `result.value` outside the successful branch, and one deleting a declared export each fail the typecheck. | Compile |
| FR-071-AC-10 | The four presence and nullability forms appear as four distinct declared property types in the type-level fixture, checked by assignability probes rather than by inspection. | Compile |
| FR-071-AC-11 | The bundle-surface record matches the symbols reachable from the committed single-type import, and adding an export to that import's reachable set fails the check. | Analysis |
| FR-071-AC-12 | `make generate-typescript-check` writes no byte inside the repository tree, asserted by an unchanged `git status --porcelain` after it runs. | Integration |
| FR-071-AC-13 | `emit-ir` over the spike entrypoint still reproduces `spikes/typespec-feasibility/generated/custom/semantic-ir.json` byte for byte, and `compile`, `inspect`, and `diff` still satisfy their FR-052 acceptance criteria. | Integration |
| FR-071-AC-14 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the merge base, and no dependency was added. | Analysis |
| FR-071-AC-15 | The command opens no network socket and starts no child program during a fixture generation. | Integration |
| FR-071-AC-16 | The `generate` verb reads no environment variable, asserted by a static scan of `src/compiler/cli.mjs` and `src/compiler/backends/typescript-v1/emit.mjs` for `process.env`. | Static |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Downstream**: [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
