---
id: FR-052
title: "Provide the compile, inspect, and diff commands"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
---
# [FR-052] Provide the compile, inspect, and diff commands

## Description

The compiler SHALL expose its contract path through the existing
`src/compiler/cli.mjs` command and through the narrow build interface, so that a
package author, a conformance run, and a downstream generator all reach the same
code by the same three verbs.

## Inputs

- `compile --package <dir> [--package-path <dir>]... [--profile <name>] [--lock <file>] [--write-lock <file>] --out <file> [--diagnostics <file>] [--dialect <dialect>] [--limits <file>]`
- `inspect --ir <file> [--json]`
- `diff --old <ir> --new <ir> --out <file> [--old-profile <file>] [--new-profile <file>] [--consumer-evidence <status>]`

## Outputs

- The extended `src/compiler/cli.mjs`
- `src/compiler/inspect.mjs`: `inspectIr(document)` returning the deterministic summary record
- An extended `src/compiler/index.mjs` narrow interface, adding `runFrontend`, `compilePackage`, `readContractIr`, `normalizeIr`, `fingerprintIr`, `inspectIr`, `diffSemanticContract`, `readIrAsContract`, and `CONTRACT_IR_VERSION`
- An extended `src/compiler/index.d.mts` declaring every added symbol
- `make compiler-compile`, `make compiler-inspect`, and `make compiler-diff` targets

## Behavior

- The existing `emit-ir` command SHALL keep its current flags and behavior unchanged, so the FR-041 prototype path stays reachable.
- `compile` SHALL resolve the package graph, verify or build the lock, run the selected frontend, validate the emitted document, and write the IR to `--out` only when no diagnostic is blocking.
- `compile` SHALL write sorted diagnostics as a JSON array to `--diagnostics` when given, and to standard error as one line per diagnostic otherwise.
- `compile` SHALL default `--dialect` to `typespec` and `--profile` to the manifest's single profile.
- If the manifest declares more than one profile and the caller names none, then `compile` SHALL raise `agent-ix.compiler.AMBIGUOUS_PROFILE`.
- `compile` SHALL write a lock to `--write-lock` only when that flag is given.
- `compile` SHALL NOT modify the file named by `--lock`.
- `inspect` SHALL print a deterministic summary — contract version, package identity and version, source dialect and digest, lock digest, fingerprint, and per-kind type counts, followed by one line per type giving identity, kind, and the counts of its fields, constraints, relationships, operations, and clauses — sorted by identity.
- `inspect --json` SHALL print the same record as canonical JSON.
- `inspect` SHALL report a document's reader diagnostics rather than failing silently on an invalid document.
- `diff` SHALL write the compatibility report to `--out`.
- If the aggregate disposition is `breaking` or `invalid`, then `diff` SHALL exit non-zero.
- Every command SHALL exit `0` on success, `1` when the work produced a blocking diagnostic or a breaking aggregate, and `2` on a usage error.
- If the caller names an unknown command or flag, then the CLI SHALL print the usage text.
- The CLI SHALL create no directory outside the parent of a path the caller named.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-052-CON-1 | The narrow interface SHALL export exactly the six FR-041 symbols plus the nine named here, so that a test asserting the export set fails when a sixteenth is added. | Maintainability | Test |
| FR-052-CON-2 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged; making the compiler a runtime entry point remains issue #11. | Non-disruption | Analysis |
| FR-052-CON-3 | The CLI SHALL read no environment variable to decide behavior; every input is a flag or a file. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-052-AC-1 | `emit-ir` over the spike entrypoint produces bytes identical to those it produced on `origin/main`. | Test |
| FR-052-AC-2 | `compile` over the fixture package writes a valid `1.1.0` document and exits `0`; running it twice produces identical IR and diagnostic bytes. | Test |
| FR-052-AC-3 | `compile` over a fixture with a blocking defect exits `1`, leaves `--out` absent, and writes the sorted diagnostics to `--diagnostics`. | Test |
| FR-052-AC-4 | `compile` with `--lock` pointing at a stale lock exits `1` and leaves the lock file byte-unchanged. | Test |
| FR-052-AC-5 | `compile --write-lock` produces a lock validating against its schema; omitting the flag writes no lock. | Test |
| FR-052-AC-6 | A manifest with two profiles and no `--profile` yields `AMBIGUOUS_PROFILE` and exit `1`. | Test |
| FR-052-AC-7 | `inspect` output is byte-identical across two runs and lists every type sorted by identity with its five node counts. | Test |
| FR-052-AC-8 | `inspect --json` output parses, is canonical, and carries the same values as the text form. | Test |
| FR-052-AC-9 | `inspect` over an invalid document prints its reader diagnostics and exits `1`. | Test |
| FR-052-AC-10 | `diff` writes a schema-valid report, exits `0` for an additive aggregate and `1` for a breaking one. | Test |
| FR-052-AC-11 | An unknown command, an unknown flag, and a missing required flag each exit `2` and print the usage text. | Test |
| FR-052-AC-12 | `src/compiler/index.mjs` exports exactly fifteen symbols, and `tsc --noEmit` fails when `index.d.mts` drifts from it. | Test |
| FR-052-AC-13 | `package.json` `exports`, `main`, `module`, `types`, and `files` are unchanged from `origin/main`, and no dependency was added. | Analysis |
| FR-052-AC-14 | Compiling with every environment variable cleared but `PATH` produces identical output. | Test |

## Dependencies

- **Upstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md)
- **Downstream**: issues #21, #22, #23, #11
