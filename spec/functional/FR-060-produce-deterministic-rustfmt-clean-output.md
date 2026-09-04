---
id: FR-060
title: "Produce deterministic, rustfmt-clean output with a declared support matrix"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
---
# FR-060: Produce deterministic, rustfmt-clean output with a declared support matrix

## Description

The Rust backend SHALL produce byte-identical, already-`rustfmt`-formatted
output for one request on every platform and toolchain of its declared support
matrix, so that a diff of generated code is evidence about the contract and
never about the machine that ran the generator.

## Inputs

- A compiler request and the crate bytes from
  [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- The pinned `rustfmt.toml` the backend emits beside the crate
- The declared support matrix: minimum supported Rust version, edition, and the
  platform triples the evidence covers

## Outputs

- `test/fixtures/rust-serde/goldens/`: committed generated crates for each of
  the four corpus bases, with a `digests.json` byte baseline
- `docs/semantic-data-system/rust-backend-support-matrix.md`: the MSRV, edition,
  toolchain, and platform matrix with the evidence each row rests on
- A `make rust-check` target that regenerates into a scratch directory and
  compares against the committed goldens

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

### Formatting

- Emitted Rust SHALL be a fixed point of `rustfmt` with the emitted
  `rustfmt.toml`: running `rustfmt --check` over the generated crate SHALL
  report no change.
- The backend SHALL NOT shell out to `rustfmt` during generation; the emitter
  produces the formatted form directly, so generation stays hermetic and does
  not depend on a formatter being installed.

### Support matrix

- The matrix SHALL name the MSRV, the Rust edition, and each platform triple the
  determinism evidence was measured on, with the toolchain version for each.
- The generated `Cargo.toml` SHALL carry `rust-version` equal to the matrix's
  MSRV.
- Where a matrix row has no measured evidence, it SHALL be recorded as unmet
  with its reason, and SHALL NOT be listed as supported.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-060-CON-1 | The golden comparison SHALL regenerate into a scratch directory outside the working tree, so the check cannot pass by comparing a file to itself and cannot leave the tree dirty. | Correctness | Inspection and test |
| FR-060-CON-2 | The determinism evidence SHALL be measured, not asserted: the byte comparison SHALL run over an actual second generation, not over a cached result. | Honesty | Test |
| FR-060-CON-3 | A platform triple SHALL appear as supported only where the suite has run on it; an unrun row SHALL be recorded unmet with its owning issue. | Honesty | Inspection |
| FR-060-CON-4 | The generator SHALL invoke no external process during generation. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-060-AC-1 | Two consecutive generations from each corpus base produce byte-identical crates, compared file by file including file ordering. | Test |
| FR-060-AC-2 | Generation under `TZ=UTC` and `TZ=Pacific/Kiritimati`, `LANG=C` and `LANG=tr_TR.UTF-8`, two different working directories, and two different `HOME` values produces identical bytes. | Test |
| FR-060-AC-3 | `rustfmt --check` over every generated crate reports no change. | Test |
| FR-060-AC-4 | The committed goldens equal a fresh generation; changing one emitter byte makes the check fail naming the file. | Test |
| FR-060-AC-5 | `make rust-check` leaves `git status --porcelain` empty. | Test |
| FR-060-AC-6 | The generator's module graph contains no `child_process`, `node:child_process`, `Date`, `Math.random`, `process.env`, or `process.cwd` reference on a live path. | Static analysis |
| FR-060-AC-7 | The generated `Cargo.toml` `rust-version` equals the matrix MSRV, and the crate builds on that toolchain. | Test |
| FR-060-AC-8 | The support matrix names every platform row as supported-with-evidence or unmet-with-reason; no row is unqualified. | Inspection |
| FR-060-AC-9 | Reordering a document's identity-keyed arrays and permuting every object's key order produces byte-identical output. | Property |
| FR-060-AC-10 | The output manifest's file list is sorted by path by code point, checked over every base. | Test |

## Dependencies

- **Upstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- **Downstream**: [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
