---
id: NFR-028
title: "Deterministic and hermetic semantic kernel generation"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-083"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-084"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "depends_on"
---
# [NFR-028] Deterministic and hermetic semantic kernel generation

## Statement

Kernel generation SHALL produce byte-identical output for identical input on
every run, host, working directory, locale, and clock reading, reading no value
outside its declared inputs, so that a difference between two generated trees is
always a difference in the contract and never a difference in the machine.

## Scope

- Applies to: the kernel bundle declaration, the JSON Schema to semantic IR
  lowering, the minting of names for anonymous constructs, the kernel IR
  document, and the four generated trees — TypeScript, Rust, Python, and the
  modular JSON Schema index.
- Declared inputs: the thirty documents under
  `packages/semantic-core/generated/json-schema/`,
  `packages/semantic-core/inventory.json`,
  `packages/semantic-core/kernel-scalars.json`,
  `packages/semantic-core/package.json`,
  `packages/semantic-core/generated/toolchain.json`, the published schemas under
  `schema/semantic/v1/`, `LICENSE`, the pinned generator versions the existing
  routes already declare, and the kernel bundle declaration this work adds.
  Nothing else is an input.
- Not applied to: the upstream `@typespec/json-schema` emitter run, which
  `make semantic-core-check` already governs and this work does not repeat.

## Rationale

The whole value of a generated kernel is that four languages carry one contract.
That claim rests on a comparison between generated trees, and a comparison is
worth nothing if the trees differ for reasons unrelated to the contract. A single
timestamp, absolute path, hostname, environment variable, locale-dependent sort,
or unordered map iteration turns every regeneration gate in this bundle into
noise, and the usual response to a noisy gate is to stop reading it.

Determinism also carries the review property. A generated tree is committed, so
a reviewer's question is "does this tree follow from that contract" — answerable
by regenerating and comparing, and unanswerable otherwise. `#21` demonstrated the
converse: its two byte-freeze artifacts, `test/fixtures/rust-serde/goldens/**`
and `test/fixtures/rust-serde/digests.json`, are both stale against `crate.mjs`
on `main` today, and the emitter's real output was invisible until something
regenerated it.

The `--check` verb regenerates into a scratch directory **outside** the working
tree and compares. It never rewrites a committed artifact in place. Issue `#49`
records what in-place regeneration costs: three unrelated changed-path gates
failed at random against a file another suite was part way through rewriting.

`CARGO_TARGET_DIR` is set explicitly by every Rust target rather than left to
`.cargo/config.toml`, because the environment variable takes precedence and a
determinism gate that compares a rebuilt artifact against one another checkout
left behind measures nothing. The same reasoning is why generation writes its
scratch under a per-worktree directory.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte differences between two generations of the same bundle | 0 | 0 | Determinism rerun |
| Byte differences between generations from two different working directories | 0 | 0 | Determinism rerun |
| Byte differences between generations under `LC_ALL=C` and under `LC_ALL=en_US.UTF-8` | 0 | 0 | Determinism rerun |
| Byte differences between generations one hour apart | 0 | 0 | Determinism rerun |
| Clock, environment, `process.cwd`, hostname or user readings in the lowering and minting modules | 0 | 0 | Static |
| Network sockets opened during a generation | 0 | 0 | Instrumented run |
| Child processes started by a module under `src/compiler/` | 0 | 0 | Instrumented run |
| Committed artifacts rewritten in place by a `--check` run | 0 | 0 | Analysis |
| Unordered iterations reaching emitted output | 0 | 0 | Analysis |
| Generated trees whose committed bytes differ from a fresh regeneration | 0 | 0 | Byte comparison |

## Verification

Generate the kernel bundle twice into two scratch directories under distinct
`mktemp -d` roots, from two different working directories, under two locales,
and compare every emitted byte. Run a generation with `node:child_process`,
`node:net`, `node:https`, `Date`, and `process.env` instrumented and assert no
access. Assert statically that no module under the lowering and minting
directories matches `Date.now`, `new Date`, `process.env`, `process.cwd`,
`node:fs`, `node:net`, or `node:https`, following the rule
[FR-063](../functional/FR-063-declare-the-generation-backend-seam.md) already
holds the backends to. Run every `--check` verb and assert `git status
--porcelain` is empty afterwards.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-028-AC-1 | Two generations of the same kernel bundle, from different working directories and under different locales, produce byte-identical trees for all four targets. | Test |
| NFR-028-AC-2 | No module implementing the lowering or the minting reads a clock, an environment variable, `process.cwd()`, a hostname, a user identity, or a socket; every file read passes through the injected host. | Static |
| NFR-028-AC-3 | An instrumented generation records zero child processes and zero sockets. | Test |
| NFR-028-AC-4 | Every `--check` verb regenerates into a directory outside the working tree, and `git status --porcelain` is empty after each one runs. | Analysis |
| NFR-028-AC-5 | The kernel IR document's type, field, variant, and constraint lists are ordered by identity code point, and shuffling the input document order leaves the emitted IR byte-identical. | Property |
| NFR-028-AC-6 | Each committed generated tree is byte-identical to a fresh regeneration, asserted for TypeScript, Rust, Python, and the JSON Schema index independently. | Byte comparison |
| NFR-028-AC-7 | The generated trees carry no generation timestamp, build date, hostname, machine identifier, user name, home directory, working directory, absolute path, tool path, or environment variable value. | Static |
| NFR-028-AC-8 | Removing any one declared input makes generation fail naming the missing input, rather than producing a tree from a default. | Unit |

## Dependencies

- **Upstream**: [NFR-017](./NFR-017-deterministic-promoted-compilation.md),
  [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md),
  [NFR-024](./NFR-024-portable-deterministic-generated-typescript.md)
- **Downstream**: the publication gate `agent-ix/quoin#290`
- **Constrains**: [FR-081](../functional/FR-081-declare-the-semantic-kernel-bundle.md) through [FR-088](../functional/FR-088-ship-the-modular-kernel-json-schema.md)
