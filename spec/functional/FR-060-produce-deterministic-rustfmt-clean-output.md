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
  - target: "ix://agent-ix/filament-core-data/NFR-023"
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
- `rust-toolchain.toml`, which pins the exact Rust toolchain release and the
  exact `rustfmt` component version the fixed-point claim is made against
- The declared support matrix: minimum supported Rust version, edition,
  toolchain version, `rustfmt` version, and the platform triples the evidence
  covers

## Outputs

- `test/fixtures/rust-serde/goldens/`: committed generated crates for each of
  the four corpus bases
- `test/fixtures/rust-serde/digests.json`: the byte baseline over the goldens,
  written by a script separate from the one that writes the goldens
- `docs/semantic-data-system/rust-backend-support-matrix.md`: the MSRV, edition,
  toolchain version, `rustfmt` version, and platform matrix with the evidence
  each row rests on and the owning issue each unmet row carries
- A `make rust-check` target that regenerates into a scratch directory and
  compares against the committed goldens and against the digest baseline
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
  SHALL pin the exact Rust toolchain release together with its `rustfmt`
  component, and the support matrix SHALL name that toolchain version and that
  `rustfmt` version as the version every fixed-point claim below is made
  against.
- Emitted Rust SHALL be a fixed point of the pinned `rustfmt` version with the
  emitted `rustfmt.toml`: running `rustfmt --check` under the pinned version
  over the generated crate SHALL report no change.
- The `rustfmt` that the check invokes SHALL be the pinned one. A check running
  under any other formatter version SHALL fail saying which version it found
  and which the matrix declares, rather than reporting a formatting difference
  as a generator defect.
- The backend SHALL NOT shell out to `rustfmt` during generation; the emitter
  produces the formatted form directly, so generation stays hermetic and does
  not depend on a formatter being installed.

### Frozen goldens

- A golden SHALL be transcribed into `test/fixtures/rust-serde/goldens/` once,
  at the revision that introduces its corpus base, and SHALL thereafter be
  compared rather than regenerated.
- The byte baseline `test/fixtures/rust-serde/digests.json` SHALL be written by
  a script distinct from the one that writes the goldens, and the two SHALL
  read the emitter through distinct entry points, so that a single emitter
  change has to move two artifacts by two deliberate acts before the check goes
  green again.
- A change to one emitter byte SHALL therefore fail twice: once as a golden
  comparison naming the file, and once as a digest baseline mismatch naming the
  digest.

### Support matrix

- The matrix SHALL name the MSRV, the Rust edition, the pinned toolchain
  version, the pinned `rustfmt` version, and each platform triple the
  determinism evidence was measured on, with the toolchain version for each row.
- The generated `Cargo.toml` SHALL carry `rust-version` equal to the matrix's
  MSRV.
- Where a matrix row has no measured evidence, the matrix SHALL record it as
  unmet with its reason and its owning issue, and SHALL NOT list it as
  supported.
- Exactly one platform row is supported with measured evidence at this
  revision: the authoring host's target triple, named in the matrix together
  with the toolchain and `rustfmt` versions the evidence was measured under.
  Every other row is recorded unmet.
- This is the honest close of the platform claim, not a deferral. The
  repository's only CI is `.github/workflows/build-test.yml`, a Node-only
  reusable workflow triggered on `workflow_dispatch` alone, with no Rust
  toolchain, no OS matrix, and no cargo cache; `.github/**` is a prohibited path
  under
  [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md), so this
  change cannot add a Rust lane to it. A one-row matrix is therefore the
  expected outcome of this ticket, and the second row is another ticket's work.

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
| FR-060-CON-3 | A platform triple SHALL appear as supported only where the suite has run on it; an unrun row SHALL be recorded unmet with its owning issue. | Honesty | Inspection |
| FR-060-CON-4 | The generator SHALL invoke no external process during generation. | Determinism | Analysis |
| FR-060-CON-5 | The repository SHALL pin, in `rust-toolchain.toml`, an exact toolchain release together with its `rustfmt` component, carried into the support-matrix row as that row's evidence. | Maintainability | Inspection |
| FR-060-CON-6 | The repository SHALL keep a golden frozen after its one transcription, with the digest baseline written by a script other than the golden writer. | Honesty | Inspection |
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
| FR-060-AC-7 | The generated `Cargo.toml` `rust-version` equals the matrix MSRV, and the crate builds on that toolchain. | Test (TC-717) |
| FR-060-AC-8 | The support matrix names every platform row as supported-with-evidence or unmet-with-reason; no row is unqualified. | Inspection (TC-717) |
| FR-060-AC-9 | Reordering a document's identity-keyed arrays and permuting every object's key order produces byte-identical output. | Test (TC-718) |
| FR-060-AC-10 | The output manifest's file list is sorted by path by code point, checked over every base. | Test (TC-718) |
| FR-060-AC-11 | The `rustfmt` the check invokes reports the version `rust-toolchain.toml` pins and the support matrix names; a check run under a different formatter version fails naming both versions. | Test (TC-713) |
| FR-060-AC-12 | Changing one emitter byte fails the golden comparison naming the file and fails the digest baseline naming the digest, and the two failures come from two scripts, so regenerating only the goldens leaves the baseline red. | Test (TC-714) |
| FR-060-AC-13 | No platform row is listed supported without named measured evidence — the triple, the toolchain version, the `rustfmt` version, and the run that produced it — and exactly one row is so listed at this revision. | Inspection (TC-717) |
| FR-060-AC-14 | Every unmet platform row names its reason and its owning issue, and a row recorded unmet with no owning issue fails the matrix gate. | Inspection (TC-717) |
| FR-060-AC-15 | `make test` runs the Node-side gates and the consolidated Rust gates, `make rust-deep` runs the long property, fuzz, and mutation runs, and each target fails naming what it could not run when its toolchain is absent rather than skipping. | Test (TC-715) |

## Dependencies

- **Upstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- **Downstream**: [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
