---
id: Task-127
title: "NFR-033 scaffold: crate, pins, vendored module, toolchain gate"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1320"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1322"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1325"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1329"
    type: verifies
---
# Task-127: NFR-033 scaffold: crate, pins, vendored module, toolchain gate

## Scope

Lay down `crates/extraction-frontend` as a workspace member that builds, on
`cargo +1.98.1 --locked`, with every dependency pinned exactly and the fixture
module vendored, so that every later task adds code to a crate whose toolchain,
licence and dependency posture are already measured. No lowering logic.

## Subtasks

- [x] **Red: manifest and lock tests.** Write `tests/toolchain.rs` with `tc_1320_`, `tc_1322_`, `tc_1325_`, `tc_1329_` (each `#[trace("TC-NNNN","NFR-033-AC-N")]`): read `Cargo.toml` and assert `rust-version = "1.98.1"`, `license = "AGPL-3.0-only"`, `publish = false`, `edition = "2021"`; assert `quire-rs` is `git` + exact `rev` (no `branch`), `agent-ix-semantic-ir` is `path = "../semantic-ir"`, `serde`/`serde_json` are `workspace = true`, `sha2` and `clap` are `=` pins, `ix-trace-rs` is a dev-dependency at tag `v0.1.1`, no `jsonschema`, no `path` outside the workspace `members`, no `file:`/`link:`; assert every third-party crate in `cargo +1.98.1 tree --locked --edges normal,build` has a `THIRD-PARTY-NOTICES.md` row and `LICENSE` carries AGPL-3.0-only; assert the module `PROVENANCE.json` names `d1840b8`.
- [x] **Green: manifest.** `Cargo.toml` with `[package] name = "agent-ix-extraction-frontend"`, the pins above (`quire-rs = { git = "https://github.com/agent-ix/quire-rs", rev = "8b8020e" }` default features), `[lib]` + `[[bin]] name = "extraction-frontend"`, `src/lib.rs` with `#![forbid(unsafe_code)]`, an empty `src/main.rs`.
- [x] **Green: root edits.** Add `"crates/extraction-frontend"` to the workspace `members` line; run `cargo +1.98.1 build --locked` and diff `Cargo.lock` against `main` to prove no other member's entry moved (D11, FND-1457). Add the `extraction-frontend-*` Makefile block skeleton: `EXTRACTION_TOOLCHAIN ?= 1.98.1`, a `extraction-frontend-toolchain` check that fails naming the toolchain, and `extraction-frontend-build` / `-test` depending on it (the remaining targets land in Task-135).
- [x] **Green: licence files.** `deny.toml` with an allowlist that is exactly the permitted set plus an explicit `AGPL-3.0-or-later` entry for `quire-rs`; `LICENSE` (AGPL-3.0-only); `THIRD-PARTY-NOTICES.md` generated from the locked tree.
- [x] **Green: vendored module.** Copy `manifest.yaml` and `schemas/` from spec-objects-business at `d1840b8` into `fixtures/modules/spec-objects-business/` with `PROVENANCE.json` `{repository, revision: "d1840b8", paths[], sha256 of manifest}`.
- [x] **Falsify.** Plant a caret specifier in a scratch copy of the manifest and prove `tc_1322_` fails; hide the 1.98.1 toolchain via `EXTRACTION_TOOLCHAIN=0.0.0` and prove `make extraction-frontend-build` fails naming `0.0.0`.

## Deliverables

- `crates/extraction-frontend/{Cargo.toml,deny.toml,LICENSE,THIRD-PARTY-NOTICES.md,src/lib.rs,src/main.rs,tests/toolchain.rs}`
- `crates/extraction-frontend/fixtures/modules/spec-objects-business/{manifest.yaml,schemas/,PROVENANCE.json}`
- Root `Cargo.toml` `members` line, `Cargo.lock`, Makefile block skeleton

## Notes

- This is the NFR-032 range's first implementation commit; US-015 (already committed) is the opening sentinel.
- `serde`/`serde_json` take the workspace pins; do not add a `[workspace.dependencies]` entry.
- Unblocks: Task-128 (every later task builds inside this crate).
