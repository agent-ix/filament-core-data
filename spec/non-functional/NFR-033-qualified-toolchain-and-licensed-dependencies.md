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

The extraction frontend SHALL build, lint, and test on exactly Rust 1.98.1
through `cargo +1.98.1` — the qualification compiler, named once in the
`Makefile` — while declaring the workspace's supported minimum
(`rust-version.workspace = true`) in its manifest so that a `--workspace`
build on the workspace channel still compiles it, with every dependency
declared at an exact, reviewed, licence-compatible version and its own licence
and attribution files beside it, so that the crate is qualified on the
toolchain the program has fixed for first-party Rust rather than on whichever
compiler is on the path, and so that nothing it links can change the licence
of what it produces.

## Scope

- Applies to: `crates/extraction-frontend/Cargo.toml`, its `deny.toml`,
  `LICENSE`, `THIRD-PARTY-NOTICES.md`, its test sources, the vendored module
  fixture under `crates/extraction-frontend/fixtures/modules/`, and every gate
  the `Makefile` block of FR-099 runs over the crate.
- Does not apply to: the workspace's other members, which stay on the
  workspace's own `rust-version = "1.85.0"` and the `rust-toolchain.toml`
  channel `1.94.1`. Those pins belong to quire-agent-c's Rust 1.98.1
  qualification sweep — `agent-ix/quire-rs#417`, `agent-ix/quire-cli#82`,
  `agent-ix/ix-trace-rs#6`, and `agent-ix/quire-contract-ir` PR #62 — and
  this change consumes that sweep rather than pre-empting it. The claim
  "qualified on 1.98.1" covers this crate alone: `quire-rs` at the pinned
  revision declares `rust-version = "1.75"` and is compiled, not qualified, on
  1.98.1 until quire-rs#417 closes.
- Operational context: an authoring host with `1.98.1-x86_64-unknown-linux-gnu`
  installed through `rustup` beside the workspace channel; every gate for this
  crate invokes `cargo +1.98.1` explicitly.

## Rationale

The owner directive of 2026-09-07 fixes first-party production Rust at exactly
1.98.1. The supported minimum and the qualification compiler are two different
facts and are named separately, in the shape `agent-ix/quire-contract-ir`
PR #62 fixed. The manifest declares `rust-version.workspace = true` — the
workspace's `1.85.0`, as the sibling members do — because `cargo` enforces
every member's `rust-version` under `--workspace`, so a member-level
`rust-version = "1.98.1"` would make `make rust-build` and `make rust-test` on
the `rust-toolchain.toml` channel `1.94.1` refuse the whole workspace
("rustc 1.94.1 is not supported by agent-ix-extraction-frontend") and break
`make test` for every other member — the non-disruption NFR-032 forbids
(CR-036-1). The qualification compiler is exact `1.98.1`, named once as
`EXTRACTION_TOOLCHAIN ?= 1.98.1` in the `Makefile`, and every gate of this
crate runs `cargo +$(EXTRACTION_TOOLCHAIN)`; the workspace pin and
`rust-toolchain.toml` stay untouched. Bumping either for the whole workspace is
another ticket's change: `rust-toolchain.toml` is the FR-060 rustfmt fixed
point, and moving it moves every Rust backend golden. Running this crate's gates
with `cargo +1.98.1` is what makes "qualified on 1.98.1" a measured claim
rather than a manifest line; a gate that runs on whatever `cargo` resolves to
measures the host, not the crate. An absent 1.98.1 toolchain is therefore a red
gate naming the toolchain — the never-skip rule is FR-099's (FR-099-AC-4);
this requirement measures it and does not restate it. That the crate also
compiles on the workspace channel is measured, not assumed: `cargo check` on
that channel is a gate of this crate (NFR-033-AC-11), so a language feature
newer than the supported minimum surfaces as a red gate rather than as a
broken `make test`.

Two cargos touch one lockfile. The workspace `Cargo.lock` was resolved under
the `rust-toolchain.toml` channel `1.94.1`; this crate's additions are resolved
under `cargo +1.98.1`, and every gate of this crate passes `--locked`, so a
resolver or lockfile-format difference between the two cargos surfaces as a
red gate with a `Cargo.lock` diff rather than as a silent rewrite. The first
plan task proves `cargo +1.98.1 build --locked` leaves every other member's
lock entries byte-unchanged; if quire-agent-c's sweep moves the workspace
channel first, this branch rebases onto it.

The dependency posture follows the Phase 0 gate. `quire-rs` is the extraction
contract this crate consumes in-process; FR-091 loads modules only through
`Registry::load_module_set`, which landed in `agent-ix/quire-rs#411` at
`a874fb6`, two commits after `agent-ix/quire-rs#388`, so the pin is at or after
`a874fb6` — not "the revision containing #388". No release tag contains either
commit (`v0.45.0` predates both), so the pin is an exact git `rev`, `8b8020e`,
the `origin/main` head as of 2026-09-08, in the same shape `quire-rs` itself
pins `ix-trace-rs`. The migration from `rev` to a tag is owned by
quire-agent-c's sweep, `agent-ix/quire-rs#417`, and the provenance re-golden
that follows any engine move is one deliberate `--write-goldens` commit per
bump under FR-098-CON-2. A caret range on a git dependency would let a
`cargo update` silently change the extraction semantics this crate is measured
against. `serde` and `serde_json` take the workspace's own exact pins; `sha2`
and `clap` are pinned exact. No `jsonschema` crate is declared as a direct
dependency: schema and cross-field validation and the canonical bytes come from
`agent-ix-semantic-ir` (FR-097), a member of this workspace consumed by
`path`. `quire-rs` links a `jsonschema` crate transitively by design — that is
the engine's module-schema validator, not this crate's, and it is listed in the
notices file like every other reachable crate. A `path` dependency is permitted only on a member of this workspace
and forbidden outside it; `file:` and `link:` specifiers are forbidden
everywhere, because a path that leaves the workspace is a pin on a checkout.

The module the fixtures are lifted under is pinned the same way the engine is.
`spec-objects-business` `0.3.0` exists only on that repository's untagged
`main`, so the module (`manifest.yaml` and `schemas/`) is vendored under
`crates/extraction-frontend/fixtures/modules/spec-objects-business/` from
repository revision `d1840b8` with a `PROVENANCE.json` naming that revision,
and is never loaded from `~/.ix`.

Licence compatibility is a program mandate, not a preference: every original
source is AGPL-3.0-only, and a dependency under an incompatible licence would
make the generated domain packages undistributable under the licence the
program promises. `quire-rs` is AGPL-3.0-or-later, which an AGPL-3.0-only
consumer may link. The crate carries its own `deny.toml` allowlist and its own
`THIRD-PARTY-NOTICES.md` because the root `THIRD-PARTY-NOTICES.md` is outside
this change's permitted paths under NFR-032; an attribution file the change
cannot edit is not an attribution file. `cargo deny` and `cargo audit` are on
the authoring host today, and FR-099 gives each a Make target
(`extraction-frontend-deny`, `extraction-frontend-audit`) so that the gate is
a target a reviewer runs rather than a tool a reviewer remembers.

Every requirement test carries an `ix-trace-rs` `#[trace]` marker and the
`tc_NNNN_` name so that the Test Matrix binds to a symbol rather than to a
row someone remembered to tick. That convention is the one `quire-rs` uses
(`tests/robustness.rs`); it is not yet this repository's — the
`crates/conformance-adapter` tests carry `tc_NNN_` names and no `#[trace]`
marker, and no workspace member depends on `ix-trace-rs` today — so this crate
is the first member to adopt it. Two consequences follow for the evidence:
`spec/tests.md` ends at TC-1108, so the plan lands TC-1200..1329 in the matrix
before the first traced test or the cross-check of NFR-033-AC-8 is vacuous;
and the status-lie criterion of NFR-033-AC-9 presumes `quire coverage` binds
the Rust attribute form under the module's `traceability:` model, which the
first traced test confirms with `quire coverage --scope . --json` before the
row is promised.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| `rust-version` declared by the crate manifest | `rust-version.workspace = true` | exact | Manifest inspection |
| Non-comment lines of the `Makefile` naming the qualification compiler `1.98.1` | 1 (`EXTRACTION_TOOLCHAIN ?= 1.98.1`) | exact | Makefile inspection |
| Gates in the `Makefile` block that invoke `cargo` without `+$(EXTRACTION_TOOLCHAIN)` | 0 | 0 | Makefile inspection |
| `cargo check -p agent-ix-extraction-frontend --locked --offline` failures on the `rust-toolchain.toml` channel | 0 | 0 | Check on the workspace channel |
| Gates that skip rather than fail when `1.98.1` is absent (FR-099-AC-4) | 0 | 0 | Run with the toolchain hidden |
| Changes to the workspace `rust-version` and `rust-toolchain.toml` | 0 | 0 | Change-set diff |
| `Cargo.lock` entries of other workspace members moved by `cargo +1.98.1 --locked` | 0 | 0 | Lock diff against the range's base |
| Dependencies declared with a caret, tilde, wildcard, or branch specifier | 0 | 0 | Manifest inspection |
| `quire-rs` pinned other than by exact `rev` at or after `a874fb6` (or an exact `tag` once quire-rs#417 cuts one) | 0 | 0 | Manifest inspection |
| `path` dependencies on crates outside this workspace; `file:` or `link:` dependencies anywhere | 0 | 0 | Manifest inspection against the workspace `members` |
| `jsonschema` crates declared as a direct dependency of this crate | 0 | 0 | Manifest inspection |
| Vendored module fixtures without a `PROVENANCE.json` naming the source repository revision | 0 | 0 | Fixture inspection |
| Crates in `Cargo.lock` reachable from this crate whose licence is outside the `deny.toml` allowlist | 0 | 0 | `make extraction-frontend-deny` |
| `cargo deny check` errors (advisories, bans, sources) | 0 | 0 | `make extraction-frontend-deny` |
| `cargo audit` advisories against the resolved graph | 0 | 0 | `make extraction-frontend-audit` |
| Third-party crates reachable from this crate without an entry in the crate's `THIRD-PARTY-NOTICES.md` | 0 | 0 | Lock-to-notices comparison |
| Crate manifests without `license = "AGPL-3.0-only"` and `publish = false` | 0 | 0 | Manifest inspection |
| `cargo +1.98.1 clippy --no-deps --all-targets -- -D warnings` warnings | 0 | 0 | Clippy run |
| `cargo +1.98.1 fmt --check` diffs | 0 | 0 | Formatter check |
| Requirement tests without a `#[trace("TC-NNNN", "…-AC-N")]` marker and a `tc_NNNN_` name | 0 | 0 | Source scan |
| `#[trace]` markers naming a TC id absent from `spec/tests.md` | 0 | 0 | Cross-check against the matrix |

## Verification

Read `rust-version` from the crate manifest and confirm it is
`rust-version.workspace = true`; grep the `Makefile` for `1.98.1` and confirm
the one non-comment line is `EXTRACTION_TOOLCHAIN ?= 1.98.1`; grep the `Makefile` block for
every `cargo` invocation and confirm each carries `+$(EXTRACTION_TOOLCHAIN)`;
run `cargo check -p agent-ix-extraction-frontend --locked --offline` on the
`rust-toolchain.toml` channel and confirm it exits zero; run the block with
`EXTRACTION_TOOLCHAIN=0.0.0` and confirm each gate fails naming `0.0.0` rather
than passing; diff the workspace `Cargo.toml` `rust-version` key,
`rust-toolchain.toml`, and every `Cargo.lock` entry of another member against
the range's base; inspect every `[dependencies]` and `[dev-dependencies]`
specifier against the workspace `members` list; confirm the vendored module
fixture's `PROVENANCE.json` names `d1840b8`; run `make extraction-frontend-deny`
and `make extraction-frontend-audit`; list every third-party crate in
`cargo +1.98.1 tree --locked --edges normal,build` and confirm each has a
notices entry, and confirm no `jsonschema` crate is declared under
`[dependencies]` or `[dev-dependencies]`; run
`cargo +1.98.1 clippy --no-deps --all-targets --locked -- -D warnings` and
`cargo +1.98.1 fmt --check`; scan every test under the crate for the trace
marker and the name convention, and cross-check each named TC id against
`spec/tests.md`. A gate whose tool is missing fails saying which, and never
reports the metric it could not measure.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-033-AC-1 | `crates/extraction-frontend/Cargo.toml` declares `rust-version.workspace = true`, `license = "AGPL-3.0-only"`, `publish = false`, and `edition = "2021"`; the `Makefile` names the qualification compiler on exactly one non-comment line, `EXTRACTION_TOOLCHAIN ?= 1.98.1`; the workspace `rust-version`, `rust-toolchain.toml`, and every `Cargo.lock` entry of another workspace member are byte-unchanged from the range's base after `cargo +1.98.1 build --locked`. | Analysis (TC-1320) |
| NFR-033-AC-2 | Every `cargo` invocation in the `Makefile` extraction-frontend block carries `+$(EXTRACTION_TOOLCHAIN)`, and with `EXTRACTION_TOOLCHAIN=0.0.0` each gate exits non-zero naming `0.0.0`. | Static (TC-1321) |
| NFR-033-AC-3 | `quire-rs` is declared as a git dependency with an exact `rev` at or after `a874fb6` — `8b8020e` at authoring — and no `branch`; `ix-trace-rs` is a dev-dependency at tag `v0.1.1`; `agent-ix-semantic-ir` is a `path` dependency on `../semantic-ir`; `serde` and `serde_json` are the workspace's exact pins; `sha2` and `clap` are exact; no `jsonschema` crate is declared; no `path` dependency names a crate outside the workspace `members`, and no `file:` or `link:` dependency exists; the vendored module under `crates/extraction-frontend/fixtures/modules/spec-objects-business/` carries a `PROVENANCE.json` naming repository revision `d1840b8`. | Analysis (TC-1322) |
| NFR-033-AC-4 | `make extraction-frontend-deny` passes with zero errors against a `deny.toml` whose licence allowlist is exactly the set the program permits, and `quire-rs`'s `AGPL-3.0-or-later` is admitted by an explicit entry. | Static (TC-1323) |
| NFR-033-AC-5 | `make extraction-frontend-audit` reports zero advisories against the locked graph. | Static (TC-1324) |
| NFR-033-AC-6 | Every third-party crate reachable from this crate in `Cargo.lock` has an entry in `crates/extraction-frontend/THIRD-PARTY-NOTICES.md` naming its version and licence, and the crate ships a `LICENSE` file carrying AGPL-3.0-only. | Analysis (TC-1325) |
| NFR-033-AC-7 | `cargo +1.98.1 clippy --no-deps --all-targets --locked -- -D warnings` and `cargo +1.98.1 fmt --check` both pass. | Test (TC-1326) |
| NFR-033-AC-8 | Every requirement test in the crate carries `#[trace("TC-NNNN", "<FR or NFR>-AC-N")]` and is named `tc_NNNN_…`, and every named TC id exists in `spec/tests.md`, which carries TC-1200 through TC-1329 before the first traced test lands. | Analysis (TC-1327) |
| NFR-033-AC-9 | With `quire coverage --scope . --json` confirmed to bind the Rust `#[trace]` form, removing both the `#[trace]` marker and the `tc_NNNN_` name prefix from one test turns its matrix row into a status lie under `quire coverage` (the `rust-test-name-id` form still binds through the name alone), proving the binding is by symbol rather than by row. | Static (TC-1328) |
| NFR-033-AC-10 | `cargo +1.98.1 build --locked --offline` succeeds from a warm cache, proving every dependency is resolvable without a network. | Test (TC-1329) |
| NFR-033-AC-11 | `cargo check -p agent-ix-extraction-frontend --locked --offline` on the `rust-toolchain.toml` channel (`cargo +1.94.1` at authoring) exits zero, proving a `--workspace` build on the workspace channel still compiles the crate and `make rust-build` and `make rust-test` are not broken by it. | Test (TC-1350) |

## Dependencies

- **Upstream**: [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-032](./NFR-032-non-disruptive-extraction-frontend.md), `agent-ix/quire-rs#411`, `agent-ix/quire-rs#417`, `agent-ix/quire-cli#82`, `agent-ix/ix-trace-rs#6`, `agent-ix/quire-contract-ir` PR #62
- **Downstream**: [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-097](../functional/FR-097-normalize-validate-and-write-the-lifted-document.md)
