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

The extraction frontend SHALL build, lint, and test on the toolchain
`rust-toolchain.toml` selects, while declaring the workspace's supported
minimum (`rust-version.workspace = true`) in its manifest so that a
`--workspace` build still compiles it, with every dependency declared at an
exact, reviewed, licence-compatible version and its own licence and attribution
files beside it, so that the crate is qualified on the toolchain the program
has fixed for first-party Rust rather than on whichever compiler is on the
path, and so that nothing it links can change the licence of what it produces.

## Scope

- Applies to: `crates/extraction-frontend/Cargo.toml`, its `deny.toml`,
  `LICENSE`, `THIRD-PARTY-NOTICES.md`, its test sources, the synthetic module
  fixtures under `crates/extraction-frontend/fixtures/modules/`, and every gate
  the `Makefile` block of FR-099 runs over the crate.
- Does not apply to: the workspace's other members, which keep the
  workspace's own `rust-version`. The `rust-toolchain.toml` channel is the
  one `quire-rs` requires, so at the pinned revision no older channel
  compiles this crate.
- Operational context: an authoring host with the `rust-toolchain.toml`
  channel installed through `rustup`.

## Rationale

The owner directive fixes first-party production Rust on one toolchain. The
supported minimum and the qualification compiler are two different facts and
are named separately, in the shape `agent-ix/quire-contract-ir` PR #62 fixed.
The manifest declares `rust-version.workspace = true` — the workspace's
minimum, as the sibling members do — because `cargo` enforces every member's
`rust-version` under `--workspace`, so a member-level `rust-version` above
the workspace's would make `make rust-build` and `make rust-test` on an older
`rust-toolchain.toml` channel refuse the whole workspace and break `make test`
for every other member — the non-disruption NFR-032 forbids (CR-036-1). The
qualification compiler is the channel `rust-toolchain.toml` pins, which is
also the FR-060 rustfmt fixed point; the workspace `rust-version` stays
untouched. That the crate also compiles on the workspace's supported minimum is
measured, not assumed: `cargo check` is a gate of this crate (NFR-033-AC-11),
so a language feature newer than the supported minimum surfaces as a red gate
rather than as a broken `make test`.

The dependency posture follows the Phase 0 gate. `quire-rs` is the extraction
contract this crate consumes in-process; FR-091 loads modules only through
`Registry::load_module_set`, and the crate also needs
`SemanticContext::with_body_extraction`, `CompiledArchetype::construct()` and
the vendored FR-035 schema that validates a construct's `immutable` flag. No
release tag contains all of them, so the pin is an exact git `rev`, in the same
shape `quire-rs` itself pins `ix-trace-rs`. The migration from `rev` to a tag
is owned by quire-agent-c's sweep, `agent-ix/quire-rs#417`, and the provenance
re-golden that follows any engine move is one deliberate `--write-goldens`
commit per bump under FR-098-CON-2. A caret range on a git dependency would let
a `cargo update` silently change the extraction semantics this crate is
measured against. No `jsonschema` crate is declared as a direct
dependency: schema and cross-field validation and the canonical bytes come from
`agent-ix-semantic-ir` (FR-097), a member of this workspace consumed by
`path`. `quire-rs` links a `jsonschema` crate transitively by design — that is
the engine's module-schema validator, not this crate's, and it is listed in the
notices file like every other reachable crate. A `path` dependency is permitted only on a member of this workspace
and forbidden outside it; `file:` and `link:` specifiers are forbidden
everywhere, because a path that leaves the workspace is a pin on a checkout.

The modules the fixtures are lifted under are synthetic modules authored in
this repository, `fixture-domain`, `fixture-systems` and `fixture-edges`
(each a `manifest.yaml` and `schemas/`), and are never loaded from `~/.ix`.

Licence compatibility is a program mandate, not a preference: every original
source is AGPL-3.0-or-later, and a dependency under an incompatible licence would
make the generated domain packages undistributable under the licence the
program promises. `quire-rs` is AGPL-3.0-or-later, the same licence as this
crate. The crate carries its own `deny.toml` allowlist and its own
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
is the first member to adopt it. One consequence follows for the evidence: the
status-lie criterion of NFR-033-AC-9 presumes `quire coverage` binds
the Rust attribute form under the module's `traceability:` model, which the
first traced test confirms with `quire coverage --scope . --json` before the
row is promised.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| `rust-version` declared by the crate manifest | `rust-version.workspace = true` | exact | Manifest inspection |
| `cargo check -p agent-ix-extraction-frontend --locked --offline` failures on the `rust-toolchain.toml` channel | 0 | 0 | Check on the workspace channel |
| Changes to the workspace `rust-version` and `rust-toolchain.toml` | 0 | 0 | Change-set diff |
| `Cargo.lock` entries of other workspace members moved by `cargo --locked` | 0 | 0 | Lock diff against the range's base |
| `path` dependencies on crates outside this workspace; `file:` or `link:` dependencies anywhere | 0 | 0 | Manifest inspection against the workspace `members` |
| `jsonschema` crates declared as a direct dependency of this crate | 0 | 0 | Manifest inspection |
| Crates in `Cargo.lock` reachable from this crate whose licence is outside the `deny.toml` allowlist | 0 | 0 | `make extraction-frontend-deny` |
| `cargo deny check` errors (advisories, bans, sources) | 0 | 0 | `make extraction-frontend-deny` |
| `cargo audit` advisories against the resolved graph | 0 | 0 | `make extraction-frontend-audit` |
| Crate manifests without `license = "AGPL-3.0-or-later"` and `publish = false` | 0 | 0 | Manifest inspection |
| `cargo clippy --no-deps --all-targets -- -D warnings` warnings | 0 | 0 | Clippy run |
| `cargo fmt --check` diffs | 0 | 0 | Formatter check |
| Requirement tests without a `#[trace("TC-NNNN", "…-AC-N")]` marker and a `tc_NNNN_` name | 0 | 0 | Source scan |
| `#[trace]` markers naming a TC id absent from `spec/tests.md` | 0 | 0 | Cross-check against the matrix |

## Verification

Read `rust-version` from the crate manifest and confirm it is
`rust-version.workspace = true`; run `cargo check -p agent-ix-extraction-frontend --locked --offline` on the
`rust-toolchain.toml` channel and confirm it exits zero; diff the workspace `Cargo.toml` `rust-version` key,
`rust-toolchain.toml`, and every `Cargo.lock` entry not reachable only from
this crate against the range's base; inspect every `[dependencies]` and `[dev-dependencies]`
specifier against the workspace `members` list; run `make extraction-frontend-deny`
and `make extraction-frontend-audit`; confirm the crate's
`THIRD-PARTY-NOTICES.md` attributes the licence of each crate
`cargo tree --locked --edges normal,build` lists, and confirm no `jsonschema` crate is declared under
`[dependencies]` or `[dev-dependencies]`; run
`cargo clippy --no-deps --all-targets --locked -- -D warnings` and
`cargo fmt --check`; scan every test under the crate for the trace
marker and the name convention, and cross-check each named TC id against
`spec/tests.md`. A gate whose tool is missing fails saying which, and never
reports the metric it could not measure.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-033-AC-1 | `crates/extraction-frontend/Cargo.toml` declares `rust-version.workspace = true`, `license = "AGPL-3.0-or-later"`, `publish = false`, and `edition = "2021"`; the workspace `rust-version` is byte-unchanged, and every `Cargo.lock` entry of the range's base is byte-unchanged after `cargo build --locked` except the entries of crates reachable only from this crate: computed from the base lock, those this crate reaches and no other workspace member reaches (a member's own entry, and a crate another member also reaches, never move). | Analysis (TC-1320) |
| NFR-033-AC-3 | `quire-rs` is declared as a git dependency; `ix-trace-rs` is a dev-dependency; `agent-ix-semantic-ir` is a `path` dependency on `../semantic-ir`; no `jsonschema` crate is declared; no `path` dependency names a crate outside the workspace `members`, and no `file:` or `link:` dependency exists | Analysis (TC-1322) |
| NFR-033-AC-4 | `make extraction-frontend-deny` passes with zero errors against a `deny.toml` whose licence allowlist is exactly the set the program permits, and `quire-rs`'s `AGPL-3.0-or-later` is admitted by an explicit entry. | Static (TC-1323) |
| NFR-033-AC-5 | `make extraction-frontend-audit` reports zero advisories against the locked graph. | Static (TC-1324) |
| NFR-033-AC-6 | The crate ships a `LICENSE` file carrying AGPL-3.0-or-later. | Analysis (TC-1325) |
| NFR-033-AC-7 | `cargo clippy --no-deps --all-targets --locked -- -D warnings` and `cargo fmt --check` both pass. | Test (TC-1326) |
| NFR-033-AC-8 | Every requirement test in the crate carries `#[trace("TC-NNNN", "<FR or NFR>-AC-N")]` and is named `tc_NNNN_…`, and every named TC id exists in `spec/tests.md`. | Analysis (TC-1327) |
| NFR-033-AC-9 | With `quire coverage --scope . --json` confirmed to bind the Rust `#[trace]` form, removing both the `#[trace]` marker and the `tc_NNNN_` name prefix from one test turns its matrix row into a status lie under `quire coverage` (the `rust-test-name-id` form still binds through the name alone), proving the binding is by symbol rather than by row. | Static (TC-1328) |
| NFR-033-AC-10 | `cargo build --locked --offline` succeeds from a warm cache, proving every dependency is resolvable without a network. | Test (TC-1329) |
| NFR-033-AC-11 | `cargo check -p agent-ix-extraction-frontend --locked --offline` on the `rust-toolchain.toml` channel exits zero, proving a `--workspace` build on the workspace channel still compiles the crate and `make rust-build` and `make rust-test` are not broken by it. | Test (TC-1350) |

## Dependencies

- **Upstream**: [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-032](./NFR-032-non-disruptive-extraction-frontend.md), `agent-ix/quire-rs#411`, `agent-ix/quire-rs#417`, `agent-ix/quire-cli#82`, `agent-ix/ix-trace-rs#6`, `agent-ix/quire-contract-ir` PR #62
- **Downstream**: [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-097](../functional/FR-097-normalize-validate-and-write-the-lifted-document.md)
