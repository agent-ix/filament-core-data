---
id: NFR-023
title: "Non-disruptive Rust backend"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
---
# NFR-023: Non-disruptive Rust backend

## Statement

The Rust backend SHALL land without publishing a crate, changing a published
schema or fixture, changing the conformance corpus beyond the one adapter slot
it is obliged to fill, or changing a downstream consumer, so that a defect found
later can be backed out by reverting this work alone.

## Scope

- Applies to: this change's own path set — the paths between the commit it
  replaced and the commit that introduced it, both located from history through
  sentinel artifacts this change creates, plus the uncommitted paths in the tree
  that no later commit has taken over. It does not extend to paths a later
  ticket lands on top of this one.
- Permitted paths: `src/compiler/backends/rust-serde/**`, `crates/**`,
  `spec/**`, `plan/**`, `reviews/**`, `test/rust-backend*.ts`,
  `test/fixtures/rust-serde/**`, `docs/semantic-data-system/rust-backend*.md`,
  `docs/semantic-data-system/index.md`, `docs/semantic-data-system/roadmap.md`,
  `scripts/build-rust-backend-docs.mjs`, `Makefile`, `.gitignore`,
  `rust-toolchain.toml`, `Cargo.toml`, `Cargo.lock`, and the single file
  `conformance/adapters/registry.json`.
- Prohibited paths: `schema/**`, `fixtures/**`, `packages/**`, `spikes/**`,
  `src/compiler/backends/rust.mjs`, `src/compiler/backends/typescript.mjs`,
  `src/compiler/backends/python-schema.mjs`, `src/compiler/backends/type-names.mjs`,
  `src/compiler/emitters/**`, `src/compiler/ir/**`, `src/compiler/frontend/**`,
  `src/compiler/compat/**`, `src/generated.ts`, `agent_ix_core_data/**`,
  `tests/**`, `package.json`, `pnpm-lock.yaml`, `pyproject.toml`,
  `poetry.lock`, and every path under `conformance/` except
  `conformance/adapters/registry.json`. A prohibited path is one this change
  changes no byte of; reading such a file, and running a program under it,
  remain permitted and are how the FR-059 differential evidence is produced.

## Rationale

Four of this repository's tickets have now been dragged back by the same defect
class, and it is not a defect in any one gate — it is a defect in how a gate
names the change it guards. A merged change's path set is a fixed historical
fact. Encoding it as a live computation against a moving reference degrades in
one of four ways: a negative prohibition over a range that empties on merge
passes vacuously and is the only safe shape; a positive assertion over the same
range fails immediately and is at least visible; a baseline read from
`origin/main` at run time compares the branch to itself and asserts nothing at
all; and a range that is fixed at its base but open at its head accretes every
later ticket's paths and fails the wrong ticket for them. Issue #19 shipped the
fourth shape and issue #20 measured it: 236 paths and no prohibited hit against
the merged trunk, 406 paths and 139 prohibited hits against a sibling branch,
every one of them a path NFR-016 legitimately permits for issue #20. This
requirement takes the fixed-at-both-ends form that PR #54 landed and uses the
shared `changeRange` helper rather than a fifth private copy.

The one path under `conformance/` this change is permitted to touch is not an
exception invented here. `conformance/adapters/registry.json` states the rule in
its own header: the corpus declares the slot and the result contract, and each
owning issue supplies its adapter command. Filling the `rust-backend` slot is
this issue's obligation; changing a case, a base, an expected verdict, the
oracle, the thresholds, or the coverage account is not, and would turn the
independent yardstick into one this backend authored.

The safety gate on issue #21 forbids crate publication until the cross-language
compatibility and release-readiness gates pass, and those gates have not moved.
Every emitted crate manifest therefore carries `publish = false`, and no step of
this work contacts a registry.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Prohibited paths in this change's own set | 0 | 0 | Change-set diff over a range fixed at both ends by history |
| Paths under `conformance/` other than `adapters/registry.json` in this change's set | 0 | 0 | Change-set diff |
| Byte changes to `conformance/` files other than `adapters/registry.json` | 0 | 0 | Byte comparison against the pre-change baseline |
| Crates published by this work | 0 | 0 | Registry inspection and command inspection |
| Emitted crate manifests without `publish = false` | 0 | 0 | Static analysis over every emitted manifest |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files` | 0 | 0 | Manifest comparison |
| Byte changes to `schema/**`, `fixtures/**`, `packages/**`, `spikes/**` | 0 | 0 | Change-set diff |
| Byte changes to the frozen prototype backends and emitters | 0 | 0 | Change-set diff |
| Downstream repositories changed | 0 | 0 | Inspection |
| Paths this change's set gains when a later unrelated ticket lands on top | 0 | 0 | Accretion rehearsal on a synthetic history |
| Test cases failing after a revert of this change's range | 0 | 0 | Scripted restore rehearsal |
| Added package manifests without `AGPL-3.0-only` | 0 | 0 | Licence inspection |

## Verification

Resolve this change's own commit range from history — the parent of the earliest
commit that added one of its sentinel artifacts, through the latest commit that
added one — with `changeRange` from `test/changed-paths.ts`, passing
`--no-renames` to every `git diff` so a move cannot hide a deletion. Confirm
every path in that range, and every uncommitted path in the tree no later commit
has taken over, is permitted and none prohibited. Compare `package.json`
metadata fields. Byte-compare every `conformance/` file other than the adapter
registry against the pre-change baseline. Inspect every emitted crate manifest
for `publish = false` and every added manifest for the licence. Confirm no
registry publication occurred. Re-run the full suite on a revert of that range.
Rehearse the range on a synthetic history in which an unrelated change lands on
top, and confirm the set does not grow and that a prohibited path at a path no
later commit owns still fails the gate.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-023-AC-1 | Every path in this change's own set is permitted and none is prohibited. | Analysis |
| NFR-023-AC-2 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the pre-change baseline. | Analysis |
| NFR-023-AC-3 | Every file under `conformance/` except `adapters/registry.json` is byte-unchanged from the pre-change baseline, and the registry's change is confined to the `rust-backend` entry. | Analysis |
| NFR-023-AC-4 | `schema/**`, `fixtures/**`, `packages/**`, `spikes/**`, and the frozen prototype backends and emitters are byte-unchanged. | Analysis |
| NFR-023-AC-5 | Every emitted crate manifest carries `publish = false`, and removing that emission makes a test fail. | Test |
| NFR-023-AC-6 | No crate was published and no downstream repository was changed. | Inspection |
| NFR-023-AC-7 | Every added package manifest declares `AGPL-3.0-only`. | Analysis |
| NFR-023-AC-8 | Reverting this change's own commit range leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand. | Test |
| NFR-023-AC-9 | Every gate here resolves both ends of its range from history rather than from a branch ref or a bare `HEAD`, uses `--no-renames`, and still fails on the same input after this change is merged. | Test |
| NFR-023-AC-10 | A later unrelated change landing on top of this one adds no path to this change's set, and a prohibited path at a path no later commit owns still fails the gate. | Test |
| NFR-023-AC-11 | The permitted-path list is not widened to absorb accretion: the list this branch lands equals the list it opened with, or every addition is justified in the update log by a named requirement rather than by a failing gate. | Inspection |

## Dependencies

- **Upstream**: [NFR-021](./NFR-021-non-disruptive-compiler-core.md), [NFR-016](./NFR-016-isolated-conformance-corpus.md)
- **Downstream**: issues #11, #7, #22, #23
