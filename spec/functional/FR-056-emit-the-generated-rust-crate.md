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

- A `compiler-request.schema.json` document carrying the IR, the profile, the
  mappings, the backend identity and version, the output root, and the limits
- The mapping model from
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md) and the
  identifiers from [FR-055](./FR-055-derive-stable-rust-identifiers.md)
- The lock fingerprint from
  [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)

## Outputs

- `src/compiler/backends/rust-serde/crate.mjs`: `emitCrate(request)` returning
  an ordered map of relative path to file bytes, and emitting no bytes to disk
- `src/compiler/backends/rust-serde/index.mjs`: `generateRust(request, sink)`,
  the one entry point that writes
- A generated crate rooted at the request's `outputRoot`, containing
  `Cargo.toml`, `LICENSE`, `README.md`, `src/lib.rs`, `src/support.rs`,
  `src/identity.rs`, `src/metadata.rs`, and one module per IR type
- An `output-manifest.schema.json` document naming every emitted file with its
  digest, media type, and the semantic identities it carries

## Behavior

### Crate manifest

- `Cargo.toml` SHALL declare `license = "AGPL-3.0-only"`, `publish = false`,
  `edition` and `rust-version` from the declared support matrix, and exactly one
  `[dependencies]` entry, `serde` with `features = ["derive"]` at an exact
  `=` version.
- The `[package] name` and `version` SHALL be derived from the IR
  `package.identity` and `package.version`.
- `publish = false` SHALL be emitted unconditionally, because this issue's
  safety gate forbids crate publication and a manifest that permits it is one
  command away from breaching that gate.

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

### Provenance

- `src/identity.rs` SHALL export `SOURCE_IDENTITY`, `SOURCE_VERSION`,
  `SOURCE_DIGEST`, `PACKAGE_IDENTITY`, `PACKAGE_VERSION`, `MANIFEST_DIGEST`,
  `LOCK_DIGEST`, `LOCK_FINGERPRINT`, `CONTRACT_VERSION`, `GENERATOR_IDENTITY`,
  and `GENERATOR_VERSION` as `&'static str` constants taken verbatim from the
  request.
- The backend SHALL NOT write a timestamp, a hostname, a working directory, a
  user name, or an absolute path into any emitted byte.

### Output manifest

- The backend SHALL emit one `output-manifest` document whose `files` names
  every emitted file with its `sha256` digest, and whose `normalizedFingerprint`
  is the digest over the concatenated canonical file list.
- If the result state is `invalid`, `unsupported`, or `unavailable`, then the
  backend SHALL emit zero files and at least one blocking diagnostic, which is
  what `output-manifest.schema.json` requires.
- The backend SHALL write files only after every diagnostic has been collected
  and none is blocking, so a refused generation leaves no partial crate behind.

### Limits

- The backend SHALL honour the request's `maxInputBytes`, `maxDepth`,
  `maxNodes`, `maxCollectionItems`, and `maxDiagnostics`, raising the
  corresponding limit diagnostic and emitting no file rather than recursing
  without bound.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-056-CON-1 | `emitCrate` SHALL be pure — it returns bytes and touches no filesystem — and `generateRust` SHALL be the only module that writes. | Purity | Static analysis |
| FR-056-CON-2 | No emitted byte SHALL depend on the clock, the environment, the hostname, the working directory, the locale, or any absolute path. | Determinism | Static analysis and test |
| FR-056-CON-3 | The emitted `Cargo.toml` SHALL carry `publish = false`, and no code path SHALL emit a manifest without it. | Safety | Static analysis and test |
| FR-056-CON-4 | The emitted `LICENSE` SHALL be the repository's `LICENSE` verbatim, and the crate SHALL declare `AGPL-3.0-only` with no carve-out. | Compliance | Byte comparison |
| FR-056-CON-5 | Generation SHALL write no file into the repository working tree outside the request's `outputRoot`. | Safety | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-056-AC-1 | Generating from each of the four corpus bases produces a crate that `cargo build --offline` compiles with no warning under `-D warnings`. | Test |
| FR-056-AC-2 | The emitted `Cargo.toml` declares `AGPL-3.0-only`, `publish = false`, exactly one dependency (`serde`) pinned with `=`, and the `rust-version` the support matrix declares. | Analysis |
| FR-056-AC-3 | Every constant in `src/identity.rs` equals the corresponding member of the request, compared field by field. | Test |
| FR-056-AC-4 | `SemanticType` has exactly one variant per generated type, and a consumer matching exhaustively over it fails to compile when a type is added. | Test |
| FR-056-AC-5 | The output manifest names every emitted file, every named file exists, every digest matches the bytes, and no file exists that the manifest does not name. | Test |
| FR-056-AC-6 | A document that produces a blocking diagnostic emits zero files and at least one diagnostic, and leaves the output root empty. | Test |
| FR-056-AC-7 | No emitted byte contains a timestamp, hostname, absolute path, user name, or environment value, checked by generating under two different working directories, `TZ` values, `LANG` values, and `HOME` values and comparing bytes. | Test |
| FR-056-AC-8 | A document exceeding `maxNodes`, one exceeding `maxDepth`, and one exceeding `maxCollectionItems` each raise the corresponding limit diagnostic and emit no file. | Test |
| FR-056-AC-9 | The only open-typed members the crate exposes are `SemanticValue`, `UnknownMembers`, and `Extension`, verified by scanning every generated declaration. | Static analysis |
| FR-056-AC-10 | Generation writes no path outside the request's `outputRoot`, including for a request whose `outputRoot` contains a `..` segment, which is refused. | Test |
| FR-056-AC-11 | The emitted `LICENSE` is byte-identical to the repository `LICENSE`. | Analysis |
| FR-056-AC-12 | `emitCrate` performs no filesystem call, verified by a static scan of its module graph for `node:fs` and by running it with the filesystem module stubbed to throw. | Static analysis |

## Dependencies

- **Upstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-055](./FR-055-derive-stable-rust-identifiers.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md), [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
