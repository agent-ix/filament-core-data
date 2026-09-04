---
id: FR-056
title: "Emit the generated Rust crate and its static export surface"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-056: Emit the generated Rust crate and its static export surface

## Description

The Rust backend SHALL emit one complete, self-contained Rust crate from a
compiler request, carrying a finite static export surface, the source and
request fingerprints it was generated from, and an output manifest naming every
file it wrote, so that what a consumer builds is traceable to the exact contract
it came from.

## Inputs

- A `compiler-request.schema.json` document, whose sealed member set is
  `contractVersion`, `lockFingerprint`, `ir`, `profile`, `mappings`, `backend`,
  `outputRoot`, and `limits`
- The mapping model from
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md) and the
  identifiers from [FR-055](./FR-055-derive-stable-rust-identifiers.md),
  including `crateName`
- The diagnostic registry of
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md),
  which every refusal below is addressed through
- The lock fingerprint from
  [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- The repository `LICENSE` and `THIRD-PARTY-NOTICES.md`

## Outputs

- `src/compiler/backends/rust-serde/crate.mjs`: `emitCrate(request)` returning
  an ordered map of relative path to file bytes, and emitting no bytes to disk
- `src/compiler/backends/rust-serde/index.mjs`: `generateRust(request, sink)`,
  the one entry point that writes
- `src/compiler/backends/rust-serde/rust-format.mjs`: the pinned `rustfmt`
  layout rules, reproduced so the emitter is a fixed point of the formatter
  without shelling out to it during generation
- `src/compiler/backends/rust-serde/cli.mjs`: the pure half of the command line
  the `make` targets call — `generate`, `check`, `register`, and `mutations` —
  which is the only caller of `generateRust`
- `scripts/rust-backend-harness.mjs`: the half that needs a child process —
  `install-from-artifact`, `mutate`, `fuzz`, `properties`, and `verdicts` — held
  outside `src/compiler/` because FR-042-AC-4 forbids every module there from
  starting one, and importing `cli.mjs` rather than the other way round
- A generated crate rooted at the request's `outputRoot`, containing
  `Cargo.toml`, `LICENSE`, `README.md`, `src/lib.rs`, `src/support.rs`,
  `src/identity.rs`, `src/metadata.rs`, and one module per IR type
- An `output-manifest.schema.json` document naming every emitted file with its
  digest, media type, and the semantic identities it carries
- `THIRD-PARTY-NOTICES.md`: the third-party attribution register, one entry per
  third-party crate this work uses, with its exact version, its SPDX identifier,
  and the location of its preserved upstream licence text

The Rust workspace files `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`,
`rustfmt.toml`, and `.cargo/config.toml` at the repository root are owned by
[FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md)'s Outputs and are
not restated here.

## Behavior

### Crate manifest

- `Cargo.toml` SHALL declare `license = "AGPL-3.0-only"`, `publish = false`,
  `edition` and `rust-version` from the declared support matrix, and exactly one
  `[dependencies]` entry, `serde` with `features = ["derive"]` at an exact
  `=` version.
- The `[package] name` SHALL be `crateName(package.identity)` as
  [FR-055](./FR-055-derive-stable-rust-identifiers.md) derives it — the IR
  `package.identity` with its `/` replaced by `-` — because `package.identity`
  is an `owner/name` pair and Cargo's package-name grammar forbids `/`. The
  `[package] version` SHALL be the IR `package.version`.
- `publish = false` SHALL be emitted unconditionally, because this issue's
  safety gate forbids crate publication and a manifest that permits it is one
  command away from breaching that gate.
- Every crate manifest this work produces SHALL carry `publish = false`,
  hand-written as well as emitted: the root workspace manifest,
  `crates/semantic-ir/`, `crates/conformance-adapter/`,
  `crates/consumer-compile-time/`, and `crates/consumer-runtime/`. The gate is
  on the manifest set, not on the emitter, because the crate a publication
  would reach first is a hand-written one.

### Third-party attribution

- This work SHALL use exactly two third-party crates: `serde`, pinned to an
  exact version and declared as the generated crate's only runtime dependency;
  and `serde_json`, pinned to an exact version and declared as a
  dev-dependency of the consumer crates alone.
- Both crates are published under `MIT OR Apache-2.0`, which is compatible with
  `AGPL-3.0-only`, so an AGPL-3.0-only distribution of this work carries them
  lawfully.
- `THIRD-PARTY-NOTICES.md` SHALL carry one entry per third-party crate naming
  its exact version, its SPDX licence identifier, and the location of its
  preserved upstream licence text.
- A third-party crate present in `Cargo.lock` and absent from
  `THIRD-PARTY-NOTICES.md` SHALL fail the attribution gate, so a transitively
  acquired crate cannot enter the build unattributed.

### Static export surface

- `src/lib.rs` SHALL re-export every generated type under one module tree, and
  SHALL declare `#![forbid(unsafe_code)]` and `#![deny(missing_docs)]`.
- The crate SHALL export a finite `pub const TYPES: &[TypeMeta]` naming every
  generated type, its semantic identity, its `kind`, its roles, and its unknown
  policy; and, per record type, a finite `pub const FIELDS: &[FieldMeta]`.
- The crate SHALL export `pub enum SemanticType`, a fieldless enum with one
  variant per generated type, so that a consumer can `match` exhaustively over
  the export surface and a contract addition becomes a compile error in the
  consumer.
- The dynamic surface SHALL be exactly `SemanticValue`, `UnknownMembers`, and
  `Extension`; the crate SHALL expose no other member typed as an open map or an
  open value.

### Documentation of every public item

- The IR carries no documentation member, so the doc comment on a public item is
  derived rather than copied, and the derivation is stated here because it is an
  emitted byte and therefore subject to the determinism gate of
  [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
  and to the goldens of
  [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md).
- Every public item the crate emits SHALL carry a doc comment composed by this
  total function of the node, in this order, one sentence per part, each part
  omitted only where the node does not carry it:
  1. the node's `displayName` verbatim, or its semantic identity's final
     segment where the node declares no `displayName`;
  2. the sentence `Semantic identity: <identity>.`, naming the node's own
     semantic identity;
  3. the sentence `Roles: <roles>.`, listing the node's `roles` in the order
     the IR carries them, where the node carries roles;
  4. the sentence `Unit: <ucum symbol>.`, where the node carries a `unit`.
- The composed text SHALL be escaped so that no `displayName` can close the doc
  comment or open a doc test, and SHALL be truncated at 200 code points per
  part.
- The backend SHALL derive no doc comment from any source outside the node and
  these rules, so that two runs over one document emit the same documentation
  bytes.

### Provenance

- `src/identity.rs` SHALL export `SOURCE_IDENTITY`, `SOURCE_VERSION`,
  `SOURCE_DIGEST`, `PACKAGE_IDENTITY`, `PACKAGE_VERSION`, `MANIFEST_DIGEST`,
  `LOCK_DIGEST`, `LOCK_FINGERPRINT`, `CONTRACT_VERSION`, `GENERATOR_IDENTITY`,
  and `GENERATOR_VERSION` as `&'static str` constants, each taken verbatim from
  the request member this table names and from no other source:

| Constant | Request member |
|---|---|
| `SOURCE_IDENTITY` | `ir.source.identity` |
| `SOURCE_VERSION` | `ir.source.version` |
| `SOURCE_DIGEST` | `ir.source.digest` |
| `PACKAGE_IDENTITY` | `ir.package.identity` |
| `PACKAGE_VERSION` | `ir.package.version` |
| `MANIFEST_DIGEST` | `ir.package.manifestDigest` |
| `LOCK_DIGEST` | `ir.package.lockDigest` |
| `LOCK_FINGERPRINT` | `lockFingerprint`, the request's own member |
| `CONTRACT_VERSION` | `ir.contractVersion` |
| `GENERATOR_IDENTITY` | `backend.identity` |
| `GENERATOR_VERSION` | `backend.version` |

- The correspondence is stated here because `compiler-request.schema.json` is
  sealed at eight members and carries no `SOURCE_DIGEST`, `MANIFEST_DIGEST`, or
  `LOCK_DIGEST` of its own; without the table an implementer would have to
  invent the mapping and the comparison test would have to invent it twice.
- The backend SHALL NOT write a timestamp, a hostname, a working directory, a
  user name, or an absolute path into any emitted byte.

### Output manifest

- The backend SHALL emit one `output-manifest` document whose `files` names
  every emitted file with its `sha256` digest, its `mediaType`, and its
  `semanticIdentities`, and whose `normalizedFingerprint` is the digest over the
  concatenated canonical file list.
- `mediaType` SHALL be a total function of the emitted file's extension:

| Emitted file | `mediaType` |
|---|---|
| `*.rs` | `text/x-rust` |
| `*.toml` | `application/toml` |
| `*.md` | `text/markdown` |
| `LICENSE` | `text/plain` |

- `semanticIdentities` is `minItems: 1` on every entry, and a file such as
  `Cargo.toml`, `LICENSE`, `README.md`, `src/support.rs`, or `src/identity.rs`
  carries no type identity of its own. Such a file SHALL carry exactly one
  semantic identity, the IR `package.identity` rendered in `ix://` form, because
  the package is the one semantic thing every emitted file does belong to and
  inventing a per-file identity would be the name-invention
  [FR-055](./FR-055-derive-stable-rust-identifiers.md) forbids one level up.
- A file emitted for one or more IR types SHALL carry those types' semantic
  identities, ordered by code point.
- If the result state is `invalid` or `unsupported`, then the backend SHALL emit
  zero files and at least one blocking diagnostic, which is what
  `output-manifest.schema.json` requires. Those are the only two states this
  backend produces; `unavailable` is produced by nothing in this backend, and
  the states are assigned by the rule
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
  states.
- The backend SHALL write files only after every diagnostic has been collected
  and none is blocking, so a refused generation leaves no partial crate behind.

### Limits and the output root

- The backend SHALL honour the request's `limits` as
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
  states, raising `agent-ix.rust-backend.LIMIT_EXCEEDED` naming the limit and
  emitting no file rather than recursing without bound.
- The backend SHALL write no path outside the request's `outputRoot`. An
  `outputRoot` carrying a leading `/`, a drive letter, a backslash, or a `..`
  segment is refused by the published `compiler-request.schema.json` pattern
  before any write, and the run's result state is `invalid`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-056-CON-1 | `emitCrate` SHALL be pure — it returns bytes and touches no filesystem — and `generateRust` SHALL be the only module that writes. | Purity | Analysis |
| FR-056-CON-2 | No emitted byte SHALL depend on the clock, the environment, the hostname, the working directory, the locale, or any absolute path. | Determinism | Analysis and test |
| FR-056-CON-3 | Every crate manifest this work produces, emitted or hand-written, SHALL carry `publish = false`. | Safety | Analysis and test |
| FR-056-CON-4 | The emitted `LICENSE` SHALL be the repository's `LICENSE` verbatim, and the crate SHALL declare `AGPL-3.0-only` with no carve-out. | Compliance | Byte comparison |
| FR-056-CON-5 | Generation SHALL write no file into the repository working tree outside the request's `outputRoot`. | Safety | Test |
| FR-056-CON-6 | This work SHALL use only third-party crates that are pinned to an exact version, carry an SPDX identifier compatible with `AGPL-3.0-only`, and have an entry in `THIRD-PARTY-NOTICES.md` preserving the upstream licence text location. | Compliance | Analysis |
| FR-056-CON-7 | Every diagnostic this requirement raises SHALL name a code the FR-058 registry declares. | Correctness | Analysis |
| FR-056-CON-8 | Every doc comment the backend emits SHALL be composed by the stated derivation from the node alone. | Determinism | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-056-AC-1 | Generating from each of the four corpus bases produces a crate that `cargo build --offline` compiles with no warning under `-D warnings`, with `#![deny(missing_docs)]` in force. | Test (TC-666) |
| FR-056-AC-2 | The emitted `Cargo.toml` declares `AGPL-3.0-only`, `publish = false`, exactly one dependency (`serde`) pinned with `=`, and the `rust-version` the support matrix declares. | Analysis (TC-667) |
| FR-056-AC-3 | Every constant in `src/identity.rs` equals the request member the correspondence table names, compared constant by constant against that table rather than against a mapping the test invents. | Test (TC-668) |
| FR-056-AC-4 | `SemanticType` has exactly one variant per generated type, and a consumer matching exhaustively over it fails to compile when a type is added. | Test (TC-669) |
| FR-056-AC-5 | The output manifest names every emitted file, every named file exists, every digest matches the bytes, and no file exists that the manifest does not name. | Test (TC-670) |
| FR-056-AC-6 | A document that produces a blocking diagnostic emits zero files and at least one diagnostic, and leaves the output root empty. | Test (TC-671) |
| FR-056-AC-7 | No emitted byte contains a timestamp, hostname, absolute path, user name, or environment value, checked by generating under two different working directories, `TZ` values, `LANG` values, and `HOME` values and comparing bytes. | Test (TC-672) |
| FR-056-AC-8 | A document exceeding `maxNodes`, one exceeding `maxDepth`, and one exceeding `maxCollectionItems` each raise `LIMIT_EXCEEDED` naming the limit and emit no file. | Test (TC-673) |
| FR-056-AC-9 | The only open-typed members the crate exposes are `SemanticValue`, `UnknownMembers`, and `Extension`, verified by scanning every generated declaration. | Analysis (TC-674) |
| FR-056-AC-10 | Generation writes no path outside the request's `outputRoot`, and a request whose `outputRoot` contains a `..` segment is refused before any write with the result state `invalid`. | Test (TC-675) |
| FR-056-AC-11 | The emitted `LICENSE` is byte-identical to the repository `LICENSE`. | Analysis (TC-676) |
| FR-056-AC-12 | `emitCrate` reads no ambient input: its module graph reaches no clock, no random source, no environment variable, no working directory and no child process, and its only filesystem reads are of the tables pinned beside it, each named in an Outputs section and each committed. Removing a pinned table makes it throw rather than emit a degraded crate. | Analysis (TC-676) |
| FR-056-AC-13 | Every public item of a generated crate carries a doc comment equal to the stated derivation applied to its node, checked over every corpus base against the input document rather than against the emitted text; a node with roles carries its roles, a node with a unit carries its unit, and a `displayName` containing a comment terminator is escaped. | Test (TC-666) |
| FR-056-AC-14 | Every output-manifest file entry carries the `mediaType` its extension row states and at least one semantic identity; a file carrying no type identity carries exactly the IR `package.identity` in `ix://` form; and the manifest validates against `output-manifest.schema.json`. | Test (TC-670) |
| FR-056-AC-15 | The emitted `[package] name` equals `crateName(package.identity)`, contains no `/`, and is accepted by `cargo metadata`. | Analysis (TC-667) |
| FR-056-AC-16 | `Cargo.lock` contains no third-party crate absent from `THIRD-PARTY-NOTICES.md`, every entry names an exact version and an SPDX identifier compatible with `AGPL-3.0-only`, and adding an unattributed crate fails the gate. | Analysis (TC-667) |
| FR-056-AC-17 | Every crate manifest this work produces carries `publish = false` — the emitted one, the root workspace manifest, and each of the four hand-written crates — and removing it from any one of them fails the gate naming the manifest. | Analysis (TC-667) |

## Dependencies

- **Upstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-055](./FR-055-derive-stable-rust-identifiers.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md), [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
