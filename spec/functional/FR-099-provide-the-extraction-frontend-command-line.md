---
id: FR-099
title: "Provide the extraction frontend command line and Make targets"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-098"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: "constrained_by"
---
# [FR-099] Provide the extraction frontend command line and Make targets

## Description

The extraction frontend SHALL expose one binary with a `lift` and an `inspect`
command, and the repository Makefile SHALL expose targets that build, test,
lift, and check it on the qualified toolchain, so that a domain package is
produced by one invocation whose exit code states whether the document was
written.

## Inputs

- A bundle root, one or more module roots, and an output path (FR-091, FR-097)
- The `EXTRACTION_TOOLCHAIN` Make variable, defaulting to `1.98.1` (NFR-033)
- The `CARGO_TARGET_DIR` export the Makefile already sets for the `rust-*` targets

## Outputs

- `crates/extraction-frontend/src/main.rs`: the `extraction-frontend` binary
- The root `Makefile` targets `extraction-frontend-build`, `extraction-frontend-test`, `extraction-frontend-lift`, `extraction-frontend-goldens`, and `extraction-frontend-check`
- The `crates/extraction-frontend` entry in the workspace `members` list of the root `Cargo.toml`, and its `Cargo.lock` resolution

## Behavior

### `lift`

- `lift --bundle <dir> --module <dir> [--module <dir>]... --out <file> [--diagnostics <file>] [--provenance <file>]` SHALL load the bundle under exactly the named module roots, mirroring quire's closed module set, and SHALL write the document per FR-097.
- Where `--diagnostics` is given, the command SHALL write every diagnostic of FR-096 to that file in canonical form; otherwise it SHALL print them to standard error, one per line, in FR-096 order.
- Where `--provenance` is given, the command SHALL write the FR-095 provenance record to that file.
- `lift --write-goldens` SHALL write the FR-098 goldens for every fixture and SHALL be the only path that writes under `fixtures/*/expected/`.
- The command SHALL exit `0` when no diagnostic is blocking, `1` when any diagnostic is blocking, and `2` on a refusal of FR-091 or FR-097; on exit `1` or `2` no document SHALL be written.
- If `--module` is absent, then the command SHALL exit `2` naming the missing option; it SHALL NOT fall back to an ambient module location.

### `inspect`

- `inspect --ir <file>` SHALL read a document, validate it per FR-097, and print each type's `identity`, `kind`, and `displayName` in `types` order, one per line.
- If the document fails validation, then `inspect` SHALL print the diagnostics and exit `1`.

### Make targets

- `extraction-frontend-build` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) build --locked -p agent-ix-extraction-frontend` and `cargo +$(EXTRACTION_TOOLCHAIN) fmt -p agent-ix-extraction-frontend -- --check`.
- `extraction-frontend-test` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) test --locked -p agent-ix-extraction-frontend` and `cargo +$(EXTRACTION_TOOLCHAIN) clippy --locked -p agent-ix-extraction-frontend --all-targets -- -D warnings`.
- `extraction-frontend-lift` SHALL run `lift` with `BUNDLE`, `MODULES` (space-separated, each becoming one `--module`), and `OUT`.
- `extraction-frontend-goldens` SHALL run `lift --write-goldens`.
- `extraction-frontend-check` SHALL regenerate every fixture into a scratch directory under `CARGO_TARGET_DIR` and `diff -ru` it against the committed goldens; it SHALL NOT write under `fixtures/`.
- Every target SHALL depend on a toolchain check that fails naming `$(EXTRACTION_TOOLCHAIN)` when `cargo +$(EXTRACTION_TOOLCHAIN)` cannot run; no target SHALL skip.
- Every target SHALL use the `CARGO_TARGET_DIR` the Makefile already exports, so that the frontend's artifacts live per worktree beside the other Rust gates'.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-099-CON-1 | Outside `crates/extraction-frontend/` and the FR-098 fixture paths, this requirement SHALL edit exactly the `members` line of the root `Cargo.toml`, the root `Cargo.lock`, and one contiguous `extraction-frontend-*` block in the root `Makefile`. | Scope | Change-set diff |
| FR-099-CON-2 | The frontend SHALL NOT edit `package.json`, `schema/**`, `src/compiler/**`, `packages/**`, `crates/semantic-ir/**`, `rust-toolchain.toml`, or the workspace `rust-version`. | Scope | Change-set diff |
| FR-099-CON-3 | The binary SHALL read no environment variable and no file other than those named on its command line. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-099-AC-1 | `lift` over the `config-version` fixture with its module exits `0`, writes `<out>` and `<out>.fingerprint`, and writes `--diagnostics` and `--provenance` files when given. | Test (TC-1295) |
| FR-099-AC-2 | `lift` over a `negatives` document with a blocking code exits `1` and writes no document; `lift` without `--module` and `lift` under a module with no `semantic` block each exit `2` and write nothing. | Test (TC-1296) |
| FR-099-AC-3 | `inspect --ir` over a lifted document prints one line per type in `types` order; over a document missing `contractVersion` it prints `INVALID_IR` and exits `1`. | Test (TC-1297) |
| FR-099-AC-4 | `make extraction-frontend-build extraction-frontend-test extraction-frontend-check` succeed on `1.98.1`; with `EXTRACTION_TOOLCHAIN=0.0.0` each fails naming `0.0.0` and none skips. | Test (TC-1298) |
| FR-099-AC-5 | The change set outside the crate and the FR-098 fixture paths is exactly the `members` line, `Cargo.lock`, and the Makefile block; `package.json`, `schema/**`, `src/compiler/**`, `packages/**`, `crates/semantic-ir/**`, `rust-toolchain.toml`, and the workspace `rust-version` are byte-unchanged. | Analysis (TC-1299) |

## Dependencies

- **Upstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md)
- **Downstream**: issue #37, `agent-ix/quire-contract-ir#52`
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), [NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md)
