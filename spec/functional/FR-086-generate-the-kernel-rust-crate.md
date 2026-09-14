---
id: FR-086
title: "Generate the kernel Rust crate"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-084"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-086] Generate the kernel Rust crate

## Description

The semantic kernel's Rust crate SHALL be produced by running the
already-implemented `rust-serde` backend of `agent-ix/filament-core-data#21`
over the same kernel IR document FR-082 lowers and FR-085 generates the
TypeScript package from, and `make semantic-kernel` SHALL commit the emitted
bytes under `packages/semantic-kernel/rust/`, so that the two languages are two
generations from one contract document rather than two independent readings of
one grammar. This requirement orchestrates; it renders nothing. The mapping,
the constraint enforcement, the refusal register, the manifest and the
formatting rules belong to
[FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md),
[FR-056](./FR-056-emit-the-generated-rust-crate.md),
[FR-057](./FR-057-enforce-constraints-in-generated-rust.md),
[FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md) and
[FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md), and this
requirement restates none of them.

## Inputs

- `packages/semantic-kernel/semantic-ir.json`, the kernel IR document FR-082 produces at `contractVersion` `1.1.0`, and the provenance and representability register FR-084 records on it — the same document FR-085 consumes, read and not re-lowered
- `src/compiler/backends/rust-serde/crate.mjs`, whose `emitCrate(request)` is a pure function from a request to bytes, and `src/compiler/backends/rust-serde/index.mjs`, whose `generateRust(request, sink)` is the one module in that backend that writes
- `src/compiler/backends/rust-serde/cli.mjs`, the pure half of the command line the `make rust-*` targets call, whose `generate --out <dir>` route this requirement reuses with the kernel document in place of the corpus bases. All three modules are read and invoked; `src/compiler/backends/**` is a prohibited path for this issue and no byte of any of them changes here
- `rust-toolchain.toml`, pinning channel `1.94.1` with the `rustfmt` and `clippy` components — the version every fixed-point and build claim below is measured against
- The offline dependency supply: a cargo cache or vendor directory already holding `serde` at the exact pinned version `1.0.229` with its `derive` feature and `serde`'s transitive crates. No step of this requirement populates it by reaching a registry.
- `THIRD-PARTY-NOTICES.md`, the third-party attribution register FR-056 owns
- `test/fixtures/rust-serde/goldens/` and `test/fixtures/rust-serde/digests.json`, read as the two-artifact byte-comparison discipline FR-060 established, and as the record of how that discipline was left broken on `main`

## Outputs

- `packages/semantic-kernel/rust/`: the committed generated crate — `Cargo.toml`, `LICENSE`, `README.md`, `src/lib.rs`, `src/support.rs`, `src/identity.rs`, `src/provenance.rs`, `src/types.rs`, and one module under `src/types/` per kernel IR type
- `packages/semantic-kernel/rust-digests.json`: the digest baseline over the committed crate, written by a different entry point from the one that writes the crate
- `scripts/build-semantic-kernel.mjs`, the orchestrating generator shared with [FR-085](./FR-085-generate-the-kernel-typescript-package.md): this requirement adds its Rust half and carries it under the existing `--check` verb. `cli.mjs generate` enumerates the corpus bases and takes no document, so the kernel half builds the request `cli.mjs` builds for a base — the same `BACKEND` identity, the same `DEFAULT_PROFILE` and the same `DEFAULT_LIMITS`, imported from `cli.mjs` rather than restated — and hands it to `index.mjs`'s `generateRust`. Adding a kernel branch inside `cli.mjs` would change a prohibited path (FR-086-CON-1)
- `scripts/build-semantic-kernel-digests.mjs`, which writes `packages/semantic-kernel/rust-digests.json` and nothing else, reaching the emitter through `crate.mjs`'s pure `emitCrate` rather than through the writing path the tree came from. It is a *different* script from the one that writes the crate, because FR-060-CON-6 requires the baseline and the artifact it baselines to be written by two entry points
- `make semantic-kernel`, which regenerates the committed crate in place, invoked deliberately when the kernel IR moves
- `make semantic-kernel-digests`, which writes the digest baseline, and only that
- `make semantic-kernel-check`, which regenerates into a scratch directory outside the working tree, compares against the committed crate and against the digest baseline, runs the build gate, and reports the publication gate as blocked on `agent-ix/quoin#290` by name
- `scripts/check-semantic-kernel-crate.mjs`, the measured gates `make semantic-kernel-check` calls: the scratch-directory tree comparison and the manifest it produced, the committed manifest's `publish`, lint, dependency and metadata claims, the pinned formatter, the `cargo build --offline --locked` over a scratch copy, and the publication-gate report. It writes nothing into the working tree, and it is neither of the two writers, so no gate can pass by comparing a file to itself
- `test/semantic-kernel.test.ts`, the Node-side suite carrying this requirement's criteria, shared with FR-085
- The publication-gate record in `docs/semantic-data-system/semantic-kernel-packages.md`, naming `agent-ix/quoin#290`, alongside the inherited `agent-ix/filament-core-data#21` defect this requirement does not answer for
- One entry added to the root `Cargo.toml` `exclude` list, `packages/semantic-kernel/rust`. The generated manifest carries its own empty `[workspace]` table and is therefore its own workspace root; the `exclude` entry is what stops cargo reading a nested package inside this repository's workspace directory tree as an unlisted member. It is the only byte of the root manifest this requirement changes

No output manifest is committed. `generateRust` writes a manifest as
`JSON.stringify` output that `biome format` reformats, so a committed manifest
would make `make lint` and the byte-comparison gate demand two different files —
the reasoning the `Makefile` already records for the Rust goldens. The manifest
is gated on the freshly generated copy in the scratch directory instead.

## Behavior

### Running the existing backend

- `scripts/build-semantic-kernel.mjs` SHALL generate the kernel crate over a compiler request carrying `packages/semantic-kernel/semantic-ir.json`, the declared `BACKEND` identity `ix://agent-ix/filament-core-data/rust-backend`, and the default profile and limits `cli.mjs` already declares, so the kernel is generated by the route the corpus bases take.
- The manifest for a completed kernel generation SHALL carry `state: "success"`, one `files[]` entry per emitted file, and no blocking diagnostic. The measured result is `state: "success"` and 77 files over the 69 kernel type definitions. The issue #11 baseline recorded 61 files; that number predates the kernel IR the FR-082 lowering now produces and is superseded by the measurement, which `make semantic-kernel-check` re-takes on every run rather than restating.
- If the backend reports a representability loss or any other blocking diagnostic over the kernel document, then nothing SHALL be committed and the diagnostics SHALL be reported. The Rust backend writes nothing until every diagnostic is collected and none is blocking, so a refused generation leaves no partial crate behind, and this requirement does not defeat that by committing a partial tree.
- This requirement SHALL add no module under `src/compiler/backends/rust-serde/`, no second emitter, and no kernel-specific branch inside the existing one.

### The committed crate tree

- The committed tree SHALL be `packages/semantic-kernel/rust/`, beside the kernel IR document it was generated from and beside the FR-085 TypeScript tree, so the kernel's IR and its target artifacts sit in one directory.
- The committed file set SHALL be exactly the set `emitCrate` returns for the kernel document, and every committed byte SHALL be reproduced by a regeneration on a clean checkout.
- The committed crate SHALL be a generated artifact and SHALL NOT be hand-edited; a hand-edit is a check failure naming the file.
- The committed crate SHALL carry the empty `[workspace]` table `renderCargoToml` emits, which makes it its own workspace root, so a crate committed inside this repository's directory tree builds as itself rather than as an unlisted member of the enclosing cargo workspace. The root `Cargo.toml` SHALL name `packages/semantic-kernel/rust` in its `exclude` list, which is the cargo-side half of the same statement; that one entry is the only change this requirement makes to the root manifest.

### `publish = false`, carried by the manifest

- The committed `Cargo.toml` SHALL carry `publish = false` unconditionally, emitted by `renderCargoToml` in `src/compiler/backends/rust-serde/crate.mjs` for every crate it renders, with no option, flag or request member that can turn it off.
- This is what satisfies the `agent-ix/quoin#290` publication gate **mechanically rather than by promise**. A gate kept by an intention to refrain is kept only as long as nobody types the command; `publish = false` in the manifest makes `cargo publish` refuse the crate whoever runs it, wherever the tree has been copied to, and however the copy was obtained. The gate travels with the artifact instead of living in a process.
- No step of this requirement SHALL invoke `cargo publish`, and no step SHALL pass `--registry`, `--index`, or a publish `--dry-run`, because a dry-run publish still contacts an index.
- Removing `publish = false` from the committed manifest SHALL fail the gate naming the manifest, so the marker is asserted by a check rather than assumed to survive.
- The publication step SHALL be recorded as blocked on `agent-ix/quoin#290` by name, in `docs/semantic-data-system/semantic-kernel-packages.md` for a reader who never runs the gate and in the output of `make semantic-kernel-check` for a reader who never opens the document. It is not described as pending, planned, or imminent; it is blocked on a named human sign-off that has not moved.

### The measured build gate

- `make semantic-kernel-check` SHALL build the committed crate with `cargo build --offline --locked`, and that build SHALL report zero warnings and zero errors under the `[lints.rust]` table the generated manifest carries: `warnings = "deny"`, `missing_docs = "deny"`, `unsafe_code = "forbid"`.
- The build SHALL be a measurement, not an assertion. The gate SHALL run an actual `cargo` invocation over the committed bytes; a recorded prior result SHALL NOT stand in for it.
- The build SHALL run against a copy of the committed crate in a scratch directory outside the working tree, with `CARGO_TARGET_DIR` also outside the working tree, so that the `Cargo.lock` and `target/` a build produces cannot dirty the tree and cannot be mistaken for committed artifacts. `make semantic-kernel-check` SHALL leave `git status --porcelain` empty.
- The generated crate declares no `Cargo.lock` of its own, because a lock is a consumer's artifact and not a generated one. The resolve therefore happens in the scratch copy, by `cargo generate-lockfile --offline`, which cannot reach a registry; the build that follows is `--locked` against the lock that resolve produced. The resolve SHALL be satisfied entirely from the offline supply named in Inputs, and a resolve that would reach a registry SHALL fail the gate rather than fetch.
- The gate SHALL fail naming what it could not run when `cargo` or `rustfmt` is absent, rather than skipping — an absent toolchain is a red suite and never a green one, as `rust-toolchain-check` already enforces for every `make rust-*` target.
- `rustfmt --check` under the pinned `1.94.1` toolchain SHALL report no change over the committed crate, and a check running under any other formatter version SHALL fail saying which version it found and which the pin declares, rather than reporting a formatting difference as a generator defect.

### The byte-comparison gate and its two independent artifacts

- The committed crate SHALL be compared against a fresh generation into a scratch directory outside the working tree, file by file, and the check SHALL name the differing file when they differ.
- The digest baseline `packages/semantic-kernel/rust-digests.json` SHALL be written by `scripts/build-semantic-kernel-digests.mjs`, a script distinct from the `scripts/build-semantic-kernel.mjs` that writes the committed crate, and the two SHALL reach the emitter through distinct entry points — the baseline through `crate.mjs`'s pure `emitCrate`, the tree through `index.mjs`'s writing `generateRust` — so a single emitter change must move two artifacts by two deliberate acts before the check goes green again. A change to one emitted byte therefore fails twice: once as a tree comparison naming the file, and once as a digest baseline mismatch naming the digest.
- The two-artifact discipline is carried here because it is what failed on `agent-ix/filament-core-data#21`, and the failure is named rather than assumed away. `make rust-check` was red on `main`: both `test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json` were stale relative to `crate.mjs`, reproduced on a clean `git clone` under `mktemp -d` at `65ea7fa` and again at #21's own merge commit `89e0ea1`, so the redness was a property of the repository and not of a working tree. The two artifacts did what they were built to do — they both went red — and what went wrong is that they were left red.
- That redness has since been repaired, and not here. Its cause was a `match` arm the emitter wrote past `max_width = 100`; #21's own PR `agent-ix/filament-core-data#123` fixed the emitter and moved neither baseline, because the corrected emitter reproduced both byte for byte. It merged to `main` as `01cc31f`, where `make rust-check` was measured green end to end. `agent-ix/filament-core-data#21` remains open for the rest of its scope, and this requirement still answers for none of it.
- This requirement SHALL NOT repair, regenerate or touch `test/fixtures/rust-serde/goldens/**` or `test/fixtures/rust-serde/digests.json`. Those artifacts belong to `agent-ix/filament-core-data#21`; regenerating them here would be this ticket blessing another ticket's emitter output.
- Because of that, `make semantic-kernel-check` SHALL be an independent target that does not run, depend on, or share artifacts with `make rust-check`. It SHALL also use a scratch directory and a `CARGO_TARGET_DIR` that no `rust-*` target writes to, so a stale artifact left by a red `rust-check` run cannot be served to the kernel gate — a shared target directory serving a stale build is how a gate reports on bytes it did not generate. A kernel gate wired through a target that is already red would report nothing about the kernel, and a kernel gate that turned `rust-check` green by regenerating its goldens would erase the #21 evidence. Each gate answers for its own artifacts.
- `make semantic-kernel` SHALL be the only target that writes into the committed crate, and `make semantic-kernel-digests` the only target that writes the digest baseline. Neither SHALL be a prerequisite of `make semantic-kernel-check`, because a check that regenerates its own baseline compares a file to itself.

### Third-party dependencies, pinned and attributed

- The committed `Cargo.toml` SHALL declare exactly one third-party dependency: `serde = { version = "=1.0.229", features = ["derive"] }`, at an exact pin emitted by `crate.mjs`, and no other.
- The generated crate SHALL declare no `serde_json` dependency. `serde_json` is the JSON front door a *consumer* feeds the crate through and is a consumer's dev-dependency, as FR-061 states; it is never a runtime dependency of a generated crate.
- `serde` and its transitive crates SHALL be attributed in `THIRD-PARTY-NOTICES.md` with the exact version, the SPDX identifier, and the location of the preserved upstream licence text. This requirement adds no third-party crate, so it adds no register row; if the pin moves, the row moves with it.
- The committed `Cargo.toml` SHALL carry `license = "AGPL-3.0-only"`, `edition = "2021"`, and `rust-version = "1.85.0"` — the values `crate.mjs` emits and the FR-060 support matrix declares — and the committed `LICENSE` SHALL be byte-identical to this repository's committed `LICENSE`.
- The crate name SHALL be whatever `crate.mjs` derives from the kernel document's `package.identity`, and this requirement SHALL NOT override it: for a `package.identity` of `agent-ix/semantic-core` the emitted crate name is `agent-ix-semantic-core`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-086-CON-1 | This requirement SHALL add no module under `src/compiler/backends/rust-serde/` and no kernel-specific branch inside the existing emitter. A construct the backend cannot render is a change request against `agent-ix/filament-core-data#21`, not a second emitter here. | Scope | Inspection |
| FR-086-CON-2 | The committed `Cargo.toml` SHALL carry `publish = false` unconditionally, and no step of this requirement SHALL invoke `cargo publish` or pass `--registry`, `--index`, or a publish `--dry-run`. The `agent-ix/quoin#290` gate is kept by the marker in the artifact, not by an intention to refrain. | Safety | Analysis |
| FR-086-CON-3 | The byte comparison SHALL regenerate into a scratch directory outside the working tree, and the build run over a scratch copy with `CARGO_TARGET_DIR` outside the working tree, so no check can pass by comparing a file to itself and none can leave the tree dirty. | Correctness | Test |
| FR-086-CON-4 | The digest baseline SHALL be written by a script other than the one that writes the committed crate, reaching the emitter through a different entry point, so one emitter change moves two artifacts by two deliberate acts. | Honesty | Inspection |
| FR-086-CON-5 | This requirement SHALL NOT regenerate, repair or touch `test/fixtures/rust-serde/goldens/**` or `test/fixtures/rust-serde/digests.json`, nor make `make rust-check` green. Those artifacts are the reopened `agent-ix/filament-core-data#21`'s, and blessing another ticket's emitter output from here would destroy the evidence that ticket is open on. | Honesty | Change-set diff |
| FR-086-CON-6 | `make semantic-kernel-check` SHALL measure the build gate on an actual `cargo build --offline --locked` over the committed bytes under `warnings = "deny"`, `missing_docs = "deny"` and `unsafe_code = "forbid"`, never on a recorded prior result standing in for a run. | Honesty | Test |
| FR-086-CON-7 | No step SHALL contact a package registry, either to publish or to resolve; every build SHALL run offline against the cached or vendored `serde` at the exact pinned version, and removing that crate from the cache SHALL make the build fail rather than fetch it. | Safety | Test |
| FR-086-CON-8 | A gate whose toolchain is absent SHALL fail naming what it could not run, never skip. | Honesty | Test |
| FR-086-CON-9 | The generated crate SHALL declare `serde` and nothing else and contain no `unsafe` block, which `unsafe_code = "forbid"` enforces at compile time rather than by review. | Portability | Analysis |
| FR-086-CON-10 | `src/compiler/backends/**`, `Cargo.lock`, `rust-toolchain.toml`, `rustfmt.toml`, `.cargo/config.toml`, `package.json`, `tsconfig.json` and `.github/**` are prohibited paths for this issue and SHALL be byte-unchanged. The root `Cargo.toml` SHALL change by exactly one added `exclude` entry, `packages/semantic-kernel/rust`, and by nothing else. | Non-disruption | Change-set diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-086-AC-1 | Generating from the FR-082 kernel IR through the `rust-serde` CLI returns an `output-manifest.schema.json`-valid manifest with `state: "success"`, one `files[]` entry per emitted file, and no blocking diagnostic. | Integration |
| FR-086-AC-2 | The committed `packages/semantic-kernel/rust/` tree equals a fresh generation from the kernel IR file by file, including file ordering, and the check names the differing file when they differ. | Test |
| FR-086-AC-3 | The committed `Cargo.toml` carries `publish = false`, and removing it fails the gate naming the manifest. | Analysis |
| FR-086-AC-4 | The recorded command list for every target this requirement adds contains no `cargo publish`, no `--registry`, no `--index`, and no publish `--dry-run`, checked against the recorded list rather than by reading the `Makefile` by eye. | Inspection |
| FR-086-AC-5 | `cargo build --offline --locked` over a scratch copy of the committed crate completes with zero warnings and zero errors under the crate's own `[lints.rust]` table, and the gate reads the denied lint names out of the committed `Cargo.toml` rather than from a list restated in the gate. | Test |
| FR-086-AC-6 | Introducing a `missing_docs` violation, and separately an `unsafe` block, into a scratch copy each fails the build, so the three lint settings are proven in force rather than merely present in the manifest. | Test |
| FR-086-AC-7 | `rustfmt --check` under the `1.94.1` toolchain `rust-toolchain.toml` pins reports no change over the committed crate, and a run under a different formatter version fails naming both versions. | Test |
| FR-086-AC-8 | Changing one emitted byte fails the tree comparison naming the file and fails the digest baseline naming the digest, and the two failures come from two scripts reaching the emitter through two entry points, so regenerating only the tree leaves the baseline red. | Test |
| FR-086-AC-9 | `make semantic-kernel-check` leaves `git status --porcelain` empty, in the passing case and in each failing case, with no `Cargo.lock` and no `target/` left inside the working tree. | Test |
| FR-086-AC-10 | This branch leaves `test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json` byte-unchanged, and `make semantic-kernel-check` neither invokes nor depends on `make rust-check` nor shares a scratch directory or `CARGO_TARGET_DIR` with any `rust-*` target; the `agent-ix/filament-core-data#21` redness is recorded with its two clean-clone reproductions at `65ea7fa` and `89e0ea1` and its repair under #21 itself at `01cc31f`, and is not repaired here. | Analysis |
| FR-086-AC-11 | The committed `Cargo.toml` declares `serde = { version = "=1.0.229", features = ["derive"] }` and no other dependency, declares no `serde_json`, and carries `license = "AGPL-3.0-only"`, `edition = "2021"` and `rust-version = "1.85.0"`. | Analysis |
| FR-086-AC-12 | `THIRD-PARTY-NOTICES.md` carries a row for `serde` at the exact pinned version with its SPDX identifier and the location of its preserved upstream licence text, and a pinned crate with no row fails the attribution gate. | Inspection |
| FR-086-AC-13 | Every build in this requirement runs with the network denied and the cargo offline flag set and still succeeds; removing `serde` from the offline supply makes the build fail rather than fetch it. | Test |
| FR-086-AC-14 | Two generations of the kernel crate produce byte-identical files and an identical file ordering under `TZ=UTC` against `TZ=Pacific/Kiritimati`, `LANG=C` against `LANG=tr_TR.UTF-8`, two working directories and two `HOME` values. | Test |
| FR-086-AC-15 | The committed crate name equals the value `crate.mjs` derives from the kernel document's `package.identity`, and the committed `LICENSE` is byte-identical to this repository's committed `LICENSE`. | Test |
| FR-086-AC-16 | Every gate this requirement adds fails naming what it could not run when `cargo` or `rustfmt` is absent from the path, and none of them skips. | Test |
| FR-086-AC-17 | Hand-editing one byte of a committed generated file makes `make semantic-kernel-check` fail naming that file. | Test |
| FR-086-AC-18 | `make semantic-kernel-check` reports on every run that Rust publication is blocked on `agent-ix/quoin#290`, that `publish = false` in the generated manifest is what enforces it, and that `agent-ix/filament-core-data#21` is an inherited open defect this ticket does not answer for; a blocked gate carrying no owning issue fails the check. | Inspection |
| FR-086-AC-19 | `Cargo.lock`, `rust-toolchain.toml`, `rustfmt.toml`, `.cargo/config.toml`, `package.json`, `tsconfig.json`, `.github/**` and every path under `src/compiler/backends/` are byte-unchanged on this branch, and the root `Cargo.toml` diff is exactly one added `exclude` entry naming `packages/semantic-kernel/rust`. | Analysis |
| FR-086-AC-20 | `docs/semantic-data-system/semantic-kernel-packages.md` records Rust publication as blocked on `agent-ix/quoin#290` with `publish = false` named as what enforces it, and records `agent-ix/filament-core-data#21` as an inherited open defect with its two clean-clone reproductions and the revision its emitter defect was repaired at; a row carrying no owning issue fails the gate. | Inspection |

## Dependencies

- **Upstream**: FR-082 (the kernel IR document), FR-084 (kernel provenance and the representability register), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md), [FR-061](./FR-061-consume-the-generated-crate.md)
- **Downstream**: FR-089 (per-language consumer examples), FR-090 (cross-language agreement and the publication gate)
- **Constrained by**: NFR-028 (deterministic and hermetic kernel generation), NFR-029 (portable, dependency-free kernel packages), NFR-030 (non-disruptive kernel packaging behind the publication gate)
- **Inherited open defects this requirement records rather than closes**: `agent-ix/filament-core-data#21`, open. `make rust-check` was red on `main` because `test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json` were both stale relative to `crate.mjs`, reproduced on clean clones at `65ea7fa` and `89e0ea1`; the emitter defect behind it was repaired under #21 by `agent-ix/filament-core-data#123`, merged as `01cc31f`, and #21 remains open for the rest of its scope. Publication is blocked on `agent-ix/quoin#290`.
