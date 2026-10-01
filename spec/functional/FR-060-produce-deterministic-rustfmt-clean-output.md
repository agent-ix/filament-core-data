---
id: FR-060
title: "Produce deterministic, rustfmt-clean output"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-060: Produce deterministic, rustfmt-clean output

## Description

The Rust backend SHALL produce byte-identical, already-`rustfmt`-formatted
output for one request on every platform, so that a diff of generated code is evidence about the contract and
never about the machine that ran the generator.

## Inputs

- A compiler request and the crate bytes from
  [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- The pinned `rustfmt.toml` the backend emits beside the crate
- `rust-toolchain.toml`, which pins the Rust toolchain and the `rustfmt`
  component the fixed-point claim is made against

## Outputs

- `test/fixtures/rust-serde/goldens/`: committed generated crates for each of
  the four corpus bases
- `scripts/build-rust-backend-goldens.mjs`: the determinism and formatter checks
- `test/fixtures/rust-serde/format-branches.json`: a document exercising all
  three branches of the emitted `try_new` call rendering, because no corpus
  base reaches the middle one and a golden minted from the bases cannot
  catch a divergence there
- A `make rust-check` target that regenerates into a scratch directory and
  compares against the committed goldens
- A `make rust-deep` target carrying the long property, fuzz, and mutation runs

## Behavior

### Determinism

- Two generations from the same request SHALL produce byte-identical files and
  an identical file ordering.
- Generation SHALL emit no HashMap or HashSet iteration order into any byte;
  every collection whose iteration reaches the output SHALL be ordered by code
  point or by an explicit declared order.
- The file list in the output manifest SHALL be ordered by path, by code point.
- Generation SHALL be unaffected by `TZ`, `LANG`, `LC_ALL`, `HOME`, `PWD`,
  `SOURCE_DATE_EPOCH`, the hostname, and the wall clock.

### Formatting and the pinned formatter

- A fixed point of `rustfmt` is a fixed point of one `rustfmt` version, because
  the formatter's output moves between toolchain releases. `rust-toolchain.toml`
  SHALL pin the Rust toolchain together with its `rustfmt` component, which is
  the formatter every fixed-point claim below is made against.
- Emitted Rust SHALL be a fixed point of the pinned `rustfmt` with the emitted
  `rustfmt.toml`: running `rustfmt --check` over the generated crate SHALL
  report no change.
- The backend SHALL NOT shell out to `rustfmt` during generation; the emitter
  produces the formatted form directly, so generation stays hermetic and does
  not depend on a formatter being installed.

### Frozen goldens

- A golden SHALL be transcribed into `test/fixtures/rust-serde/goldens/` once,
  at the revision that introduces its corpus base, and SHALL thereafter be
  compared rather than regenerated.
- A change to one emitter byte SHALL fail the golden comparison, naming the file.

### Generated manifest

- The generated `Cargo.toml` SHALL carry the `rust-version` the backend
  declares as the minimum supported Rust version of a generated crate.
- The generated `[lints.rust]` table denies all warnings, so a future `rustc`
  lint reddens a consumer build with no contract change. That is intended by
  [FR-056](./FR-056-emit-the-generated-rust-crate.md) AC-1, and it is a property
  of the generated artifact rather than of this repository.

### The runtime split

- `make test` SHALL run the Node-side gates and the consolidated Rust gates.
- `make rust-deep` SHALL run the long property, fuzz, and mutation runs, which
  are too long for the edit loop and are scheduled separately.
- No gate SHALL skip when a toolchain is absent. A gate that cannot run SHALL
  fail naming what it could not run, so an absent toolchain reads as a red
  suite and never as a green one.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-060-CON-1 | The golden comparison SHALL regenerate into a scratch directory outside the working tree, so the check cannot pass by comparing a file to itself and cannot leave the tree dirty. | Correctness | Inspection and test |
| FR-060-CON-2 | The determinism evidence SHALL be measured, not asserted: the byte comparison SHALL run over an actual second generation, not over a cached result. | Honesty | Test |
| FR-060-CON-4 | The generator SHALL invoke no external process during generation. | Determinism | Analysis |
| FR-060-CON-7 | A gate whose toolchain is absent SHALL fail naming what it could not run. | Honesty | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-060-AC-1 | Two consecutive generations from each corpus base produce byte-identical crates, compared file by file including file ordering. | Test (TC-711) |
| FR-060-AC-2 | Generation under `TZ=UTC` and `TZ=Pacific/Kiritimati`, `LANG=C` and `LANG=tr_TR.UTF-8`, two different working directories, and two different `HOME` values produces identical bytes. | Test (TC-712) |
| FR-060-AC-3 | `rustfmt --check` over every generated crate reports no change. | Test (TC-713) |
| FR-060-AC-4 | The committed goldens equal a fresh generation, and the check names the differing file when they do not. | Test (TC-714) |
| FR-060-AC-5 | `make rust-check` leaves `git status --porcelain` empty. | Test (TC-715) |
| FR-060-AC-6 | The generator's module graph contains no `child_process`, `node:child_process`, `Date`, `Math.random`, `process.env`, or `process.cwd` reference on a live path. | Analysis (TC-716) |
| FR-060-AC-7 | The generated `Cargo.toml` carries the `rust-version` the backend declares. | Test (TC-717) |
| FR-060-AC-9 | Reordering a document's identity-keyed arrays and permuting every object's key order produces byte-identical output. | Test (TC-718) |
| FR-060-AC-10 | The output manifest's file list is sorted by path by code point, checked over every base. | Test (TC-718) |
| FR-060-AC-15 | `make test` runs the Node-side gates and the consolidated Rust gates, `make rust-deep` runs the long property, fuzz, and mutation runs, and each target fails naming what it could not run when its toolchain is absent rather than skipping. | Test (TC-715) |

## Dependencies

- **Upstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- **Downstream**: [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
