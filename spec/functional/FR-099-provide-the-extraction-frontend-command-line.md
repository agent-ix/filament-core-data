---
id: FR-099
title: "Provide the extraction frontend command line and Make targets"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "depends_on"
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
command behind a contiguous block of Make targets on the qualified toolchain, so
that a domain package is produced by one invocation whose exit code states
whether the document was written.

## Rationale

The exit-code contract is owned here and referenced by FR-096 and FR-097: `0`
when no diagnostic blocks, `1` when a lowering diagnostic blocks, `2` when the
lift is refused before lowering. The sidecars of FR-097 are always written; the
`--diagnostics` and `--provenance` options only rename them. The no-ambient-
module rule is FR-091's; this command exposes no fallback for it to violate.
`cargo deny` and `cargo audit` gates are Make targets here so that NFR-033's
evidence has a named producer. The Make rehearsals of FR-099-AC-4 are `Static`
evidence produced by the named targets, not by `cargo test`.

## Inputs

- A bundle root, one or more module roots, and an output path (FR-091, FR-097)
- The `EXTRACTION_TOOLCHAIN` Make variable, defaulting to `1.98.1` (NFR-033)
- The `CARGO_TARGET_DIR` export the Makefile already sets for the `rust-*` targets

## Outputs

- `crates/extraction-frontend/src/main.rs`: the `extraction-frontend` binary
- The root `Makefile` targets `extraction-frontend-build`, `extraction-frontend-test`, `extraction-frontend-lift`, `extraction-frontend-goldens`, `extraction-frontend-check`, `extraction-frontend-deny`, and `extraction-frontend-audit`
- The `crates/extraction-frontend` entry in the workspace `members` list of the root `Cargo.toml`, and its `Cargo.lock` resolution
- `docs/semantic-data-system/extraction-frontend-diagnostics.md`, the FR-096 output that closes the change set

## Behavior

### `lift`

- The command SHALL accept `lift --bundle <dir> --module <dir> [--module <dir>]... --out <file> [--diagnostics <file>] [--provenance <file>]`.
- The command SHALL load the bundle under exactly the named module roots through FR-091.
- The command SHALL write the document and sidecars per FR-097.
- If `--diagnostics <file>` is given, then the command SHALL write the FR-097 diagnostics sidecar at `<file>` instead of `<out>.diagnostics.json`.
- If `--provenance <file>` is given, then the command SHALL write the FR-097 provenance sidecar at `<file>` instead of `<out>.provenance.json`.
- The command SHALL print every diagnostic to standard error, one per line, in FR-096 order, on every lift.
- The command SHALL exit `0` when no diagnostic is blocking.
- The command SHALL exit `1` when any diagnostic is blocking and the lift was not refused.
- The command SHALL exit `2` on a refusal: `MODULE_WITHOUT_SEMANTIC_BLOCK`, `MODULE_REFUSED`, `BUNDLE_UNIDENTIFIED`, `DUPLICATE_ARTIFACT_ID`, `OUTPUT_UNWRITABLE`, or a missing or malformed option.
- The command SHALL leave which files a blocking lift or a refusal writes to FR-097, which owns the write rules; the exit code adds no write of its own.
- If `--module` is absent, then the command SHALL exit `2` naming the missing option.
- If `--out` lies under the bundle root or a module root, then the command SHALL exit `2` with `OUTPUT_UNWRITABLE` per FR-097 before loading the bundle.
- The command SHALL accept `lift --write-goldens`, which writes the FR-098 goldens for every fixture.
- The command SHALL write under `fixtures/*/expected/` only through `lift --write-goldens`.

### `inspect`

- The command SHALL accept `inspect --ir <file>`.
- The command SHALL run the document through `agent_ix_semantic_ir::decide` per FR-097.
- The command SHALL print each type's `identity`, `kind`, and `displayName` in `types` order, one per line.
- If `decide` returns any diagnostic, then the command SHALL print each as `INVALID_IR` per FR-096 and exit `1`.

### Make targets

- `extraction-frontend-build` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) build --locked -p agent-ix-extraction-frontend` and `cargo +$(EXTRACTION_TOOLCHAIN) fmt -p agent-ix-extraction-frontend -- --check`.
- `extraction-frontend-test` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) test --locked -p agent-ix-extraction-frontend` and `cargo +$(EXTRACTION_TOOLCHAIN) clippy --locked -p agent-ix-extraction-frontend --no-deps --all-targets -- -D warnings` (`--no-deps` because the other workspace members are qualified on the workspace channel, not on `1.98.1`'s newer lint set).
- `extraction-frontend-lift` SHALL run `lift` with `BUNDLE`, `MODULES` (space-separated, each becoming one `--module`; the fixtures need both `fixtures/modules/spec-objects-business` and `fixtures/modules/edge-vocabulary`), and `OUT`.
- `extraction-frontend-goldens` SHALL run `lift --write-goldens`.
- `extraction-frontend-check` SHALL regenerate every fixture into a scratch directory under `CARGO_TARGET_DIR` and `diff -ru` it against the committed goldens.
- `extraction-frontend-check` SHALL NOT write under `fixtures/`.
- `extraction-frontend-deny` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) deny --manifest-path crates/extraction-frontend/Cargo.toml check`.
- `extraction-frontend-audit` SHALL run `cargo +$(EXTRACTION_TOOLCHAIN) audit` over the workspace `Cargo.lock` with the crate's `deny.toml` advisory policy (`cargo audit` reads the lock as written and has no `--locked` flag).
- Every target SHALL depend on a toolchain check that fails naming `$(EXTRACTION_TOOLCHAIN)` when `cargo +$(EXTRACTION_TOOLCHAIN)` cannot run.
- Every target SHALL use the `CARGO_TARGET_DIR` the Makefile already exports.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-099-CON-1 | Outside `crates/extraction-frontend/` and the FR-098 change set, the frontend's change set SHALL be exactly the `members` line of the root `Cargo.toml`, the root `Cargo.lock`, one contiguous `extraction-frontend-*` block in the root `Makefile`, and `docs/semantic-data-system/extraction-frontend-diagnostics.md`. | Scope | Change-set diff |
| FR-099-CON-2 | The frontend SHALL NOT edit `package.json`, `schema/**`, `src/compiler/**`, `packages/**`, `crates/semantic-ir/**`, `rust-toolchain.toml`, or the workspace `rust-version`. | Scope | Change-set diff |
| FR-099-CON-3 | The binary SHALL read no environment variable and no file other than those under the paths named on its command line. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-099-AC-1 | `lift` over the `config-version-table` fixture with its two module roots (`--module fixtures/modules/spec-objects-business --module fixtures/modules/edge-vocabulary`) exits `0` and writes `<out>`, `<out>.fingerprint`, `<out>.diagnostics.json`, and `<out>.provenance.json`; with `--diagnostics d.json --provenance p.json` it writes `d.json` and `p.json` in their place and the same document bytes. | Test (TC-1295) |
| FR-099-AC-2 | `lift` over `negatives/UNRESOLVED_TYPE_TOKEN` exits `1`, writes the diagnostics sidecar, and writes no document; `lift` without `--module`, `lift` under `negatives/MODULE_WITHOUT_SEMANTIC_BLOCK`, and `lift` with `--out` under the bundle root each exit `2` and write nothing. | Test (TC-1296) |
| FR-099-AC-3 | `inspect --ir` over a lifted document prints one line per type in `types` order and exits `0`; over a document missing `contractVersion` it prints `INVALID_IR` and exits `1`. | Test (TC-1297) |
| FR-099-AC-4 | `make extraction-frontend-build extraction-frontend-test extraction-frontend-check extraction-frontend-deny extraction-frontend-audit` succeed on `1.98.1`; with `EXTRACTION_TOOLCHAIN=0.0.0` each fails naming `0.0.0` and none skips. | Static (TC-1298) |
| FR-099-AC-5 | The change set outside the crate and the FR-098 change set is exactly the `members` line, `Cargo.lock`, the Makefile block, and `docs/semantic-data-system/extraction-frontend-diagnostics.md`; `package.json`, `schema/**`, `src/compiler/**`, `packages/**`, `crates/semantic-ir/**`, `rust-toolchain.toml`, and the workspace `rust-version` are byte-unchanged. | Static (TC-1299) |
| FR-099-AC-6 | `extraction-frontend-deny` and `extraction-frontend-audit` each exit non-zero when a crate with a licence outside the `deny.toml` allow list, or a yanked version, is planted in a scratch copy of the manifest, and exit zero on the committed manifest. | Static (TC-1349) |

## Dependencies

- **Upstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-052](./FR-052-provide-the-compiler-command-line.md), [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md)
- **Downstream**: issue #37, `agent-ix/quire-contract-ir#52`
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), [NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md)
