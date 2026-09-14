---
id: ARCH-007
title: "Semantic kernel packages and the publication gate"
status: normative
---
# Semantic kernel packages and the publication gate

The semantic kernel is generated, not written. `packages/semantic-kernel/`
holds one lowered IR document and the target artifacts generated from it, and
every one of those artifacts is reproduced by `make semantic-kernel` on a clean
checkout. A hand edit to any of them is a check failure naming the file, never
a change.

This record answers one question for a reader who never runs a gate: what is
committed, what publishes it, and what is blocking.

## What is committed

| Package | Path | Written by | Requirement |
|---|---|---|---|
| Kernel IR | `packages/semantic-kernel/semantic-ir.json` | `make semantic-kernel` | [FR-082](../../spec/functional/FR-082-lower-json-schema-to-semantic-ir.md) |
| TypeScript | `packages/semantic-kernel/typescript/` | `make semantic-kernel` | [FR-085](../../spec/functional/FR-085-generate-the-kernel-typescript-package.md) |
| Rust crate | `packages/semantic-kernel/rust/` | `make semantic-kernel` | [FR-086](../../spec/functional/FR-086-generate-the-kernel-rust-crate.md) |
| Rust digest baseline | `packages/semantic-kernel/rust-digests.json` | `make semantic-kernel-digests` | [FR-086](../../spec/functional/FR-086-generate-the-kernel-rust-crate.md) |

The crate and its digest baseline are written by two different scripts reaching
the emitter through two different entry points — `scripts/build-semantic-kernel.mjs`
through `index.mjs`'s writing `generateRust`, and
`scripts/build-semantic-kernel-digests.mjs` through `crate.mjs`'s pure
`emitCrate`. One emitter change therefore has to be committed twice, by two
deliberate acts, before `make semantic-kernel-check` goes green again;
regenerating only the tree leaves the baseline red.

`make semantic-kernel-check` regenerates into a scratch directory outside the
working tree, compares file by file, runs a real `cargo build --offline --locked`
over a scratch copy with `CARGO_TARGET_DIR` outside the working tree, and runs
the pinned `rustfmt --check`. It writes nothing and leaves `git status
--porcelain` empty. It shares no scratch directory and no `CARGO_TARGET_DIR`
with any `make rust-*` target, so a stale artifact left by another gate cannot
be served to this one.

## Publication is blocked

**Rust publication is blocked on [agent-ix/quoin#290](https://github.com/agent-ix/quoin/issues/290).**
It is not pending, not planned and not imminent: it is blocked on a named human
sign-off that has not moved.

What enforces it is `publish = false`, emitted unconditionally into the
generated `Cargo.toml` by `renderCargoToml` with no option, flag or request
member that can turn it off. A gate kept by an intention to refrain is kept
only as long as nobody types the command; `publish = false` makes `cargo
publish` refuse the crate whoever runs it, wherever the tree has been copied
to, and however the copy was obtained. The gate travels with the artifact.

Removing `publish = false` from the committed manifest fails
`make semantic-kernel-check` naming the manifest. No target added by FR-086
invokes `cargo publish`, and none passes `--registry`, `--index` or a publish
`--dry-run` — a dry-run publish still contacts an index.

Nothing is published to any public registry. Distribution, when the gate moves,
remains manual and remains GitHub-only.

## The inherited defect this record carries

[agent-ix/filament-core-data#21](https://github.com/agent-ix/filament-core-data/issues/21)
is **open**. FR-086 was written while `make rust-check` was red on `main`:
`test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json`
were both stale relative to `crate.mjs`, reproduced on clean `git clone`s under
`mktemp -d` at `65ea7fa` and again at #21's own merge commit `89e0ea1`, so the
redness was a property of the repository rather than of a working tree.

That redness has since been repaired — not here. Its cause was a `match` arm
the emitter wrote past `max_width = 100`, fixed under #21 by
[PR #123](https://github.com/agent-ix/filament-core-data/pull/123), merged to
`main` as `01cc31f`; `make rust-check` was measured green at that revision.
FR-086 did not repair it, does not repair it, and leaves
`test/fixtures/rust-serde/goldens/**` and
`test/fixtures/rust-serde/digests.json` byte-unchanged: regenerating another
ticket's emitter output from here would be this requirement blessing bytes it
does not answer for. #21 remains open for the rest of its scope.

## Change rule

The generated packages change when the kernel IR changes. Regenerate with
`make semantic-kernel`, rewrite the baseline with `make semantic-kernel-digests`,
and prove both with `make semantic-kernel-check`. A blocked gate recorded here
without an owning issue fails the check.
