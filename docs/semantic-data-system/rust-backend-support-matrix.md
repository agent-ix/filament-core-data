# Rust backend support matrix

The platforms, toolchains and formatter version the Rust/Serde backend's
determinism and fixed-point claims are made against (FR-060).

A fixed point of `rustfmt` is a fixed point *of one `rustfmt` version*: the
formatter's output moves between toolchain releases, so a claim that names no
version is a claim about whichever binary happened to be on the path.
Everything below therefore names a version, and every row names either the run
that measured it or the issue that owns its absence.

## The pin

- Toolchain channel, from `rust-toolchain.toml`: `1.94.1`
- `rustfmt` version: `1.8.0-stable`, built from `e408947bfd` — the same commit
  as `rustc 1.94.1`, which is what makes it that toolchain's component rather
  than a formatter that happens to be installed
- Rust edition: `2021`
- MSRV: `1.85.0`, carried into every generated `Cargo.toml` as `rust-version`

`make rust-check` reads the running `rustfmt --version` and the running
`rustc -vV` and fails naming both the version it found and the version this
document declares, rather than reporting a formatting difference as a generator
defect.

## What the generated crate denies

The generated `Cargo.toml` carries a `[lints.rust]` table with
`unsafe_code = "forbid"`, `missing_docs = "deny"` and `warnings = "deny"`.

This is a property of the *generated crate*, not of this repository, and it has
a consequence a consumer should read here rather than discover on a toolchain
bump:

- The generated crate denies **all** warnings by manifest, so its build is
  coupled to the `rustc` release, not only to the MSRV.
- The pinned channel above is what this repository's own evidence was measured
  on.
- A consumer on a newer toolchain may meet a lint this crate's pin never met.
  That is a toolchain event rather than a contract change. The remedy is to
  regenerate against the newer pin, not to relax the table.

## Platform rows

| Target triple | Status | Toolchain | `rustfmt` | Evidence or owning issue |
|---|---|---|---|---|
| `x86_64-unknown-linux-gnu` | supported | `1.94.1` | `1.8.0-stable` | Measured on the authoring host on 2026-09-04 by `make rust-check` (goldens, digest baseline, determinism matrix, `rustfmt --check` over 56 generated files) and `make rust-install-from-artifact` (both consumers built from the packaged artifact with `-D warnings`). |
| `aarch64-unknown-linux-gnu` | unmet | — | — | No run has covered it. Owned by https://github.com/agent-ix/filament-core-data/issues/60. |
| `x86_64-apple-darwin` | unmet | — | — | No run has covered it. Owned by https://github.com/agent-ix/filament-core-data/issues/60. |
| `aarch64-apple-darwin` | unmet | — | — | No run has covered it. Owned by https://github.com/agent-ix/filament-core-data/issues/60. |
| `x86_64-pc-windows-msvc` | unmet | — | — | No run has covered it, and the emitted newline style is `Unix` on every platform, so a Windows row additionally needs a checkout-newline decision before it can be measured. Owned by https://github.com/agent-ix/filament-core-data/issues/60. |

Exactly one row is supported at this revision, and it is supported with named
measured evidence: the triple, the toolchain version, the `rustfmt` version,
and the runs that produced it.

## Why exactly one row

This is the honest close of the platform claim, not a deferral.

The repository's only CI is `.github/workflows/build-test.yml`, a Node-only
reusable workflow triggered on `workflow_dispatch` alone, with no Rust
toolchain, no OS matrix and no cargo cache. `.github/**` is a prohibited path
under [NFR-023](../../spec/non-functional/NFR-023-non-disruptive-rust-backend.md),
so the change that produced this document could not add a Rust lane to it. A
second platform row is therefore another ticket's work, and it is recorded here
as unmet with its owning issue rather than construed as met.

`make rust-check` fails a row that is listed supported without a toolchain
version, a `rustfmt` version and an evidence cell, and fails a row recorded
unmet with no owning issue, so neither state can be reached by leaving a cell
blank.

## The gates the evidence comes from

| Target | What it measures |
|---|---|
| `make rust-check` | The committed goldens equal a fresh generation; the digest baseline equals the goldens; two real generations and the `TZ`, `LANG`, working-directory, `HOME` and `SOURCE_DATE_EPOCH` perturbations agree byte for byte; the running formatter is the pinned one; `rustfmt --check` reports no change; every matrix row is qualified. |
| `make rust-build` | The workspace builds offline against the committed `Cargo.lock` and `cargo fmt --all -- --check` reports no change. |
| `make rust-install-from-artifact` | `cargo package --offline --no-verify`, unpack, and build both consumers against the unpacked artifact with `-D warnings`, plus the two compile-failure rehearsals. |
| `make rust-deep` | The long property, fuzz and mutation runs, which are too long for the edit loop. |

No gate skips. A gate whose toolchain is absent fails naming what it could not
run, so an absent toolchain reads as a red suite and never as a green one.
