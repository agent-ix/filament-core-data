---
id: FR-052
title: "Provide the compile, inspect, and diff commands"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-051"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "constrained_by"
---
# [FR-052] Provide the compile, inspect, and diff commands

## Description

The compiler SHALL expose its contract path through the existing
`src/compiler/cli.mjs` command and through the narrow build interface, so that a
package author, a conformance run, and a downstream generator all reach the same
code by the same three verbs.

## Inputs

- `compile --package <dir> [--package-path <dir>]... [--profile <name>] [--lock <file>] [--write-lock <file>] --out <file> [--diagnostics <file>] [--dialect <dialect>] [--limits <file>]`
- `inspect --ir <file> [--json] [--package <dir>]`
- `diff --old <ir> --new <ir> --out <file> [--old-profile <file>] [--new-profile <file>] [--consumer-policy <file>]... [--consumer-evidence <status>] [--target-result <target>=<disposition>]...`
- A `--limits` file valid against `schema/semantic/v1/compiler-request.schema.json#/properties/limits`

## Outputs

- The extended `src/compiler/cli.mjs`
- `src/compiler/pipeline.mjs`: `compilePackage(request)`, the orchestration behind the `compile` verb
- `src/compiler/inspect.mjs`: `inspectIr(document, { importedExports })`, `formatInspection(summary)`, and `inspectionJson(summary)`
- An extended `src/compiler/index.mjs` narrow interface, adding `runFrontend`, `compilePackage`, `readContractIr`, `normalizeIr`, `fingerprintIr`, `inspectIr`, `diffSemanticContract`, `readIrAsContract`, and `CONTRACT_IR_VERSION`
- An extended `src/compiler/index.d.mts` declaring every added symbol
- `make compiler-compile`, `make compiler-inspect`, and `make compiler-diff` targets

## Behavior

### The pipeline

- `compilePackage` SHALL run five phases in this order: resolve the package graph (FR-047); build the lock and, where one is supplied, verify it (FR-048); run the selected frontend through the seam (FR-045); validate the emitted document (FR-050); write the outputs.
- If a phase produces a blocking diagnostic, then `compilePackage` SHALL stop before the next phase and return the diagnostics accumulated so far.
- `compilePackage` SHALL return `{ ir, lock, diagnostics, state }`, where `state` is a `resultState` of `common.schema.json` and `ir` is `null` whenever any diagnostic is blocking.
- `compilePackage` SHALL live in `src/compiler/pipeline.mjs`, not in the frozen `src/compiler/compile.mjs`.

### The commands

- The existing `emit-ir` command SHALL keep its current flags and behavior unchanged, so the FR-041 prototype path stays reachable.
- `compile` SHALL write the IR to `--out` only when no diagnostic is blocking.
- `compile` SHALL write each output by creating a sibling temporary file `<path>.tmp` in the same directory and renaming it over the target, so a failed write cannot leave a half-written document; those temporary paths are the only paths the compiler creates beyond the ones the caller named.
- If a compile produces a blocking diagnostic, then `compile` SHALL leave a pre-existing `--out` file byte-unchanged and SHALL create no file at that path where none existed.
- `compile` SHALL write sorted diagnostics as a JSON array to `--diagnostics` when given, and to standard error as one line per diagnostic otherwise.
- `compile` SHALL default `--dialect` to `typespec` and `--profile` to the manifest's single profile.
- If the manifest declares more than one profile and the caller names none, then `compile` SHALL raise `agent-ix.compiler.AMBIGUOUS_PROFILE`.
- `compile` SHALL write a lock to `--write-lock` only when that flag is given.
- `compile` SHALL NOT modify the file named by `--lock`.
- `compile` SHALL apply `DEFAULT_LIMITS` where `--limits` is absent, and the file's values where it is present.
- `inspect` SHALL print a deterministic summary — contract version, package identity and version, source dialect and digest, lock digest, IR fingerprint, and per-kind type counts, followed by one line per type giving identity, kind, and the counts of its fields, constraints, relationships, operations, and clauses — sorted by identity.
- `inspect --json` SHALL print the same record as canonical JSON.
- `inspect` SHALL pass `importedExports` from `--package` where given, and the marker `unknown` otherwise, and SHALL print the suppressions the reader reports.
- `inspect` SHALL report a document's reader diagnostics rather than failing silently on an invalid document.
- `diff` SHALL write the compatibility report to `--out`.
- If the aggregate disposition is `breaking` or `invalid`, then `diff` SHALL exit non-zero.
- A command SHALL exit `0` when it produced no blocking diagnostic and no breaking or invalid aggregate.
- A command SHALL exit `1` when it produced a blocking diagnostic or a breaking or invalid aggregate.
- A command SHALL exit `2` when the caller named an unknown command, an unknown flag, a missing required flag, or an unreadable flag value.
- If the caller names an unknown command or flag, then the CLI SHALL print the usage text.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-052-CON-1 | The narrow interface SHALL export exactly the six FR-041 symbols plus the nine named here, so that a test asserting the export set fails when a sixteenth is added. | Maintainability | Test |
| FR-052-CON-2 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making the compiler a runtime entry point remains issue #11. | Non-disruption | Analysis |
| FR-052-CON-3 | The CLI SHALL read no environment variable to decide behavior; every input is a flag or a file. | Determinism | Static analysis |
| FR-052-CON-4 | The CLI SHALL be the one place that constructs the injected host, passing it down to every module below it. | Security | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-052-AC-1 | `emit-ir` over the spike entrypoint reproduces the committed golden `spikes/typespec-feasibility/generated/custom/semantic-ir.json` byte for byte. | Snapshot |
| FR-052-AC-2 | `compile` over the fixture package writes a valid `2.0.0` document and exits `0`; running it twice produces identical IR and diagnostic bytes. | Integration |
| FR-052-AC-3 | `compile` over a fixture with a blocking defect exits `1`, leaves a fresh `--out` absent, leaves a pre-existing `--out` byte-unchanged, and writes the sorted diagnostics to `--diagnostics`. | Integration |
| FR-052-AC-4 | `compile` with `--lock` pointing at a stale lock exits `1` and leaves the lock file byte-unchanged. | Integration |
| FR-052-AC-5 | `compile --write-lock` produces a lock validating against its schema; omitting the flag writes no lock. | Integration |
| FR-052-AC-6 | A manifest with two profiles and no `--profile` yields `AMBIGUOUS_PROFILE` and exit `1`. | Unit |
| FR-052-AC-7 | `inspect` output is byte-identical across two runs and lists every type sorted by identity with its five node counts. | Snapshot |
| FR-052-AC-8 | `inspect --json` output parses, is canonical, and carries the same values as the text form. | Unit |
| FR-052-AC-9 | `inspect` over an invalid document prints its reader diagnostics and exits `1`; over a valid document with a cross-package relationship and no `--package` it prints the recorded suppression and exits `0`. | Unit |
| FR-052-AC-10 | `diff` writes a schema-valid report, exits `0` for an additive aggregate and `1` for a breaking one, and passes every `--consumer-policy` and `--target-result` through to the classification. | Integration |
| FR-052-AC-11 | An unknown command, an unknown flag, a missing required flag, and an unreadable `--limits` file each exit `2` and print the usage text. | Unit |
| FR-052-AC-12 | The narrow interface declares fifteen symbols that `tsc --noEmit` checks, and a deliberate drift between `index.d.mts` and `index.mjs` fails the typecheck. | Compile |
| FR-052-AC-13 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from `origin/main`, and no dependency was added. | Analysis |
| FR-052-AC-14 | A compile with every environment variable cleared but `PATH` produces identical output. | Integration |
| FR-052-AC-15 | `compilePackage` runs its five phases in the declared order and stops at the first blocking phase, asserted by an instrumented phase recorder. | Unit |
| FR-052-AC-16 | Every path the CLI creates during a fixture compile is a caller-named path or its `.tmp` sibling. | Integration |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md)
- **Downstream**: issues #21, #22, #23, #11
- **Constrained by**: [NFR-021](../non-functional/NFR-021-non-disruptive-compiler-core.md)
