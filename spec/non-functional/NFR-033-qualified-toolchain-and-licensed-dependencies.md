---
id: NFR-033
title: "Qualified toolchain and licensed dependencies"
type: NFR
quality_attribute: portability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-099"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "depends_on"
---
# [NFR-033] Qualified toolchain and licensed dependencies

## Statement

The extraction frontend SHALL build, lint, and test on exactly Rust 1.98.1,
declare every dependency at an exact, reviewed, licence-compatible version,
and carry its own licence and attribution files, so that the crate is
qualified on the toolchain the program has fixed for first-party Rust rather
than on whichever compiler is on the path, and so that nothing it links can
change the licence of what it produces.

## Scope

- Applies to: `crates/extraction-frontend/Cargo.toml`, its `deny.toml`,
  `LICENSE`, `THIRD-PARTY-NOTICES.md`, its test sources, and every gate the
  `Makefile` block of FR-099 runs over the crate.
- Does not apply to: the workspace's other members, which stay on the
  workspace's own `rust-version = "1.85.0"` and the `rust-toolchain.toml`
  channel `1.94.1`. Those pins belong to quire-agent-c's Rust 1.98.1
  qualification sweep — `agent-ix/quire-rs#417`, `agent-ix/quire-cli#82`,
  `agent-ix/ix-trace-rs#6`, and `agent-ix/quire-contract-ir` PR #62 — and
  this change consumes that sweep rather than pre-empting it.
- Operational context: an authoring host with `1.98.1-x86_64-unknown-linux-gnu`
  installed through `rustup` beside the workspace channel; every gate for this
  crate invokes `cargo +1.98.1` explicitly.

## Rationale

The owner directive of 2026-09-07 fixes first-party production Rust at exactly
1.98.1. This crate is new and can honour that directly by declaring
`rust-version = "1.98.1"` in its own manifest — a member-level key that
overrides `rust-version.workspace = true` — while leaving the workspace pin and
`rust-toolchain.toml` untouched. Bumping either for the whole workspace is
another ticket's change: `rust-toolchain.toml` is the FR-060 rustfmt fixed
point, and moving it moves every Rust backend golden. Running this crate's gates
with `cargo +1.98.1` is what makes "qualified on 1.98.1" a measured claim
rather than a manifest line; a gate that runs on whatever `cargo` resolves to
measures the host, not the crate. An absent 1.98.1 toolchain is therefore a red
gate naming the toolchain, in the NFR-022 form, never a skip.

The dependency posture follows the Phase 0 gate. `quire-rs` at the revision
containing `agent-ix/quire-rs#388` is the extraction contract this crate
consumes in-process; no release tag contains that commit, so the pin is an
exact git `rev`, in the same shape `quire-rs` itself pins `ix-trace-rs`, and
moves to a tag when quire-agent-c cuts one. A caret range on a git dependency
would let a `cargo update` silently change the extraction semantics this crate
is measured against. `serde` and `serde_json` take the workspace's own exact
pins; `jsonschema` takes the `~0.18` `quire-rs` already resolves, so one
validator, not two, is linked; `sha2` and `clap` are pinned exact.

Licence compatibility is a program mandate, not a preference: every original
source is AGPL-3.0-only, and a dependency under an incompatible licence would
make the generated domain packages undistributable under the licence the
program promises. `quire-rs` is AGPL-3.0-or-later, which an AGPL-3.0-only
consumer may link. The crate carries its own `deny.toml` allowlist and its own
`THIRD-PARTY-NOTICES.md` because the root `THIRD-PARTY-NOTICES.md` is outside
this change's permitted paths under NFR-032; an attribution file the change
cannot edit is not an attribution file.

Every requirement test carries an `ix-trace-rs` `#[trace]` marker and the
`tc_NNNN_` name so that the Test Matrix binds to a symbol rather than to a
row someone remembered to tick; that convention is the one `quire-rs` and the
Rust backend already use, and it is what lets `quire coverage` report a status
lie rather than a green row.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| `rust-version` declared by the crate manifest | `1.98.1` | exact | Manifest inspection |
| Gates in the `Makefile` block that invoke `cargo` without `+1.98.1` | 0 | 0 | Makefile inspection |
| Gates that skip rather than fail when `1.98.1` is absent | 0 | 0 | Run with the toolchain hidden |
| Changes to the workspace `rust-version` and `rust-toolchain.toml` | 0 | 0 | Change-set diff |
| Dependencies declared with a caret, tilde, wildcard, or branch specifier, other than `jsonschema ~0.18` | 0 | 0 | Manifest inspection |
| `quire-rs` pinned other than by exact `rev` (or an exact `tag` once one exists) | 0 | 0 | Manifest inspection |
| `path`, `file:`, or `link:` dependencies | 0 | 0 | Manifest inspection |
| Crates in `Cargo.lock` reachable from this crate whose licence is outside the `deny.toml` allowlist | 0 | 0 | `cargo deny check licenses` |
| `cargo deny check` errors (advisories, bans, sources) | 0 | 0 | `cargo deny check` |
| `cargo audit` advisories against the resolved graph | 0 | 0 | `cargo audit` |
| Third-party crates reachable from this crate without an entry in the crate's `THIRD-PARTY-NOTICES.md` | 0 | 0 | Lock-to-notices comparison |
| Crate manifests without `license = "AGPL-3.0-only"` and `publish = false` | 0 | 0 | Manifest inspection |
| `cargo +1.98.1 clippy --all-targets -- -D warnings` warnings | 0 | 0 | Clippy run |
| `cargo +1.98.1 fmt --check` diffs | 0 | 0 | Formatter check |
| Requirement tests without a `#[trace("TC-NNNN", "…-AC-N")]` marker and a `tc_NNNN_` name | 0 | 0 | Source scan |
| `#[trace]` markers naming a TC id absent from `spec/tests.md` | 0 | 0 | Cross-check against the matrix |

## Verification

Read `rust-version` from the crate manifest; grep the `Makefile` block for every
`cargo` invocation and confirm each carries `+1.98.1`; run the block with
`RUSTUP_TOOLCHAIN` pointed at a name no toolchain answers to and confirm each
gate fails naming `1.98.1` rather than passing; diff the workspace `Cargo.toml`
`rust-version` key and `rust-toolchain.toml` against the range's base; inspect
every `[dependencies]` and `[dev-dependencies]` specifier; run
`cargo +1.98.1 deny check` and `cargo +1.98.1 audit --locked` from the crate
directory; list every third-party crate in `cargo +1.98.1 tree --locked
--edges normal,build` and confirm each has a notices entry; run
`cargo +1.98.1 clippy --all-targets --locked -- -D warnings` and
`cargo +1.98.1 fmt --check`; scan every test under the crate for the trace
marker and the name convention, and cross-check each named TC id against
`spec/tests.md`. A gate whose tool is missing fails saying which, and never
reports the metric it could not measure.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-033-AC-1 | `crates/extraction-frontend/Cargo.toml` declares `rust-version = "1.98.1"`, `license = "AGPL-3.0-only"`, `publish = false`, and `edition = "2021"`; the workspace `rust-version` and `rust-toolchain.toml` are byte-unchanged from the range's base. | Analysis (TC-1320) |
| NFR-033-AC-2 | Every `cargo` invocation in the `Makefile` extraction-frontend block carries `+1.98.1`, and with that toolchain hidden each gate exits non-zero naming `1.98.1`. | Test (TC-1321) |
| NFR-033-AC-3 | `quire-rs` is declared as a git dependency with an exact `rev` (or an exact `tag`) and no `branch`; `ix-trace-rs` is a dev-dependency at tag `v0.1.1`; `serde` and `serde_json` are the workspace's exact pins; `sha2` and `clap` are exact; `jsonschema` is `~0.18`; no `path`, `file:`, or `link:` dependency exists. | Analysis (TC-1322) |
| NFR-033-AC-4 | `cargo +1.98.1 deny check` from the crate directory passes with zero errors against a `deny.toml` whose licence allowlist is exactly the set the program permits, and `quire-rs`'s `AGPL-3.0-or-later` is admitted by an explicit entry. | Test (TC-1323) |
| NFR-033-AC-5 | `cargo +1.98.1 audit --locked` reports zero advisories. | Test (TC-1324) |
| NFR-033-AC-6 | Every third-party crate reachable from this crate in `Cargo.lock` has an entry in `crates/extraction-frontend/THIRD-PARTY-NOTICES.md` naming its version and licence, and the crate ships a `LICENSE` file carrying AGPL-3.0-only. | Analysis (TC-1325) |
| NFR-033-AC-7 | `cargo +1.98.1 clippy --all-targets --locked -- -D warnings` and `cargo +1.98.1 fmt --check` both pass. | Test (TC-1326) |
| NFR-033-AC-8 | Every requirement test in the crate carries `#[trace("TC-NNNN", "<FR or NFR>-AC-N")]` and is named `tc_NNNN_…`, and every named TC id exists in `spec/tests.md`. | Analysis (TC-1327) |
| NFR-033-AC-9 | Removing a `#[trace]` marker from one test turns its matrix row into a status lie under `quire coverage`, proving the binding is by symbol rather than by row. | Test (TC-1328) |
| NFR-033-AC-10 | `cargo +1.98.1 build --locked --offline` succeeds from a warm cache, proving every dependency is resolvable without a network. | Test (TC-1329) |

## Dependencies

- **Upstream**: [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-032](./NFR-032-non-disruptive-extraction-frontend.md), `agent-ix/quire-rs#417`, `agent-ix/quire-cli#82`, `agent-ix/ix-trace-rs#6`, `agent-ix/quire-contract-ir` PR #62
- **Downstream**: [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
