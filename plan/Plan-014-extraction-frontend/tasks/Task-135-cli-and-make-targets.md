---
id: Task-135
title: "FR-099 lift / inspect binary and Make targets"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-134"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-099"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1295"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1296"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1297"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1298"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1349"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1268"
    type: verifies
---
# Task-135: FR-099 lift / inspect binary and Make targets

## Scope

`main.rs`: `extraction-frontend lift --bundle <dir> --module <dir>... --out
<file> [--diagnostics <file>] [--provenance <file>] [--write-goldens]` and
`inspect --ir <file>`, exit codes `0`/`1`/`2`; the remaining root Makefile
targets `extraction-frontend-lift`, `-goldens`, `-check`, `-deny`, `-audit`
in the contiguous block Task-127 opened. The binary precedes FR-098 because
`lift --write-goldens` is the only sanctioned golden writer.

## Subtasks

- [x] **Red.** `tests/cli.rs` (spawning the built binary via `CARGO_BIN_EXE_extraction-frontend`): `tc_1295_` (exit 0, four files; `--diagnostics d.json --provenance p.json` renames, same document bytes), `tc_1296_` (`negatives/UNRESOLVED_TYPE_TOKEN` exit 1 diagnostics only; no `--module`, `MODULE_WITHOUT_SEMANTIC_BLOCK`, `--out` under root each exit 2 and write nothing), `tc_1297_` (`inspect` one line per type in `types` order; missing `contractVersion` → `INVALID_IR`, exit 1), `tc_1268_` (fresh `--out` absent / pre-existing unchanged on exit 1; warning-only lift writes and exits 0). `tests/make.rs` as `Static` evidence scripts: `tc_1298_` (five targets succeed on 1.98.1; `EXTRACTION_TOOLCHAIN=0.0.0` fails naming it, none skips), `tc_1349_` (deny/audit fail on a planted bad licence / yanked version in a scratch manifest, pass on the committed one).
- [x] **Green: `lift`.** `clap` derive; `--out` and every sidecar path checked against the bundle and module roots before loading (also refuse `--diagnostics`/`--provenance` equal to `<out>`, `<out>.fingerprint` or each other as `OUTPUT_UNWRITABLE`, SR-168 FND-1483); diagnostics printed to stderr one per line in FR-096 order on every lift; exit `2` on refusals and malformed options, `1` on a blocking lowering diagnostic, `0` otherwise; `--write-goldens` iterates the FR-098 inventory into each fixture's `expected/`.
- [x] **Green: `inspect`.** Read `--ir`, run `decide`, print `identity kind displayName` per type; any reader diagnostic → `INVALID_IR` lines, exit 1.
- [x] **Green: Makefile.** `-lift` (`BUNDLE`, `MODULES` → repeated `--module`, `OUT`), `-goldens`, `-check` (regenerate into `$(CARGO_TARGET_DIR)/extraction-frontend-check/` and `diff -ru` against `fixtures/*/expected`; never writes under `fixtures/`), `-deny` (`cargo +$(EXTRACTION_TOOLCHAIN) deny --manifest-path crates/extraction-frontend/Cargo.toml check`), `-audit` (`cargo +$(EXTRACTION_TOOLCHAIN) audit --locked` with the crate's `deny.toml` advisory policy); every target depends on the toolchain check and uses the exported `CARGO_TARGET_DIR`.
- [x] **Falsify.** Run `-check` after a one-byte edit to a scratch golden and prove it fails naming the file.

## Deliverables

- `src/main.rs`; `tests/cli.rs`, `tests/make.rs`
- Completed root Makefile `extraction-frontend-*` block

## Notes

- FR-099-CON-3: the binary reads no environment variable; `std::env::args` is the only `std::env` use and is the NFR-031-AC-5 exemption.
- `--write-goldens` exists here but is not run against `fixtures/` until Task-136 cuts the goldens.
- Unblocks: Task-136.
