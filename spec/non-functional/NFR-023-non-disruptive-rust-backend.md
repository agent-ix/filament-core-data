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
  ticket lands on top of this one, and it does not extend to paths a trunk merge
  inside the range brought in.
- Sentinel artifacts: `spec/usecase/US-011-consume-semantic-contracts-in-rust.md`,
  created by this change's *first* commit, and
  `docs/semantic-data-system/rust-backend-support-matrix.md`, created by its
  *last*. Both ends of the range resolve from these, so a single-sentinel
  collapse cannot narrow the range to one commit on a live branch, and after the
  squash merge both resolve to the one squash commit, which is exactly this
  change's path set. The support matrix is therefore written in the final
  implementation commit rather than when its requirement is first satisfied; a
  sentinel created early would leave every later commit outside the range.
- Permitted paths: `src/compiler/backends/rust-serde/**`, `crates/**`,
  `spec/**`, `plan/**`, `reviews/**`, `test/rust-backend*.ts`,
  `test/fixtures/rust-serde/**`, `test/changed-paths.ts`,
  `docs/semantic-data-system/rust-backend*.md`,
  `docs/semantic-data-system/index.md`,
  `docs/semantic-data-system/roadmap.md`,
  `scripts/build-rust-backend-docs.mjs`,
  `scripts/build-rust-backend-goldens.mjs`, `Makefile`, `.gitignore`,
  `rust-toolchain.toml`, `rustfmt.toml`, `Cargo.toml`, `Cargo.lock`,
  `.cargo/config.toml`, `THIRD-PARTY-NOTICES.md`, and exactly two files under
  `conformance/`: `adapters/registry.json`, whose `rust-backend` slot the corpus
  itself assigns to the owning issue, and the generated `coverage.json`, which
  `conformance/README.md` declares is regenerated on every run and which
  necessarily moves when the slot it accounts for is filled. The second entry is
  admitted because FR-039 and FR-059 name it, not because a gate failed without
  it, and FR-059-AC-12 bounds its diff to the `rust-backend` row so the
  permission cannot carry anything else.
- Prohibited paths: `schema/**`, `fixtures/**`, `packages/**`, `spikes/**`,
  `.github/**`, `src/compiler/backends/rust.mjs`,
  `src/compiler/backends/typescript.mjs`,
  `src/compiler/backends/python-schema.mjs`,
  `src/compiler/backends/type-names.mjs`, `src/compiler/emitters/**`,
  `src/compiler/ir/**`, `src/compiler/frontend/**`, `src/compiler/compat/**`,
  `src/generated.ts`, `agent_ix_core_data/**`, `tests/**`, `package.json`,
  `pnpm-lock.yaml`, `pyproject.toml`, `poetry.lock`, `biome.json`,
  `tsconfig*.json`, every `test/*.test.ts` other than `test/rust-backend*.ts`,
  and every path under `conformance/` except
  `conformance/adapters/registry.json` and `conformance/coverage.json`. A prohibited path is one this change
  changes no byte of; reading such a file, and running a program under it,
  remain permitted and are how the FR-059 differential evidence is produced.
- Every permitted entry SHALL be traceable to a requirement Output or to a
  named Verification step of this requirement. `test/changed-paths.ts` is
  permitted because this requirement's own Verification mandates the shared
  helper and may need to extend it; `.github/**` is prohibited because adding a
  Rust job to the shared reusable workflow is another ticket's change, which is
  why the cross-platform evidence of FR-060 closes as unmet rather than as met.

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
every one of them a path NFR-016 legitimately permits for issue #20.

Issue #20's own gate then recorded a fifth face, which this requirement takes
seriously rather than repeating: a tree diff over `base..tip` annexes the trunk
when the branch merged `origin/main` inside its own range — measured there at
456 paths, 74 of them the trunk's, against a true change set of 182. Two
controls follow. This branch SHALL rebase onto the trunk rather than merge it,
so no trunk commit falls inside the range at all; and the gate SHALL take the
union of the per-commit path sets over `--first-parent --no-merges`, so a merge
that reaches the range anyway contributes only its own commits.

The one path under `conformance/` this change is permitted to touch is not an
exception invented here. `conformance/adapters/registry.json` states the rule in
its own header: the corpus declares the slot and the result contract, and each
owning issue supplies its adapter command. Filling the `rust-backend` slot is
this issue's obligation; changing a case, a base, an expected verdict, the
oracle, the thresholds, the divergence register, or the coverage account is not,
and would turn the independent yardstick into one this backend authored.

The safety gate on issue #21 forbids crate publication until the cross-language
compatibility and release-readiness gates pass, and those gates have not moved.
Every crate manifest this work produces — emitted or hand-written — therefore
carries `publish = false`, and no step of this work contacts a registry.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Prohibited paths in this change's own set | 0 | 0 | Change-set diff over a range fixed at both ends by history, unioned over `--first-parent --no-merges` |
| Permitted entries traceable to no requirement Output or Verification step | 0 | 0 | Analysis over the permitted list |
| Paths under `conformance/` other than `adapters/registry.json` and `coverage.json` in this change's set | 0 | 0 | Change-set diff |
| Coverage-account lines changed outside the `rust-backend` row and the `unmetCases` total | 0 | 0 | Line diff against the pre-change baseline |
| Byte changes to `conformance/` files other than those two | 0 | 0 | Byte comparison against the pre-change baseline |
| Crates published by this work | 0 | 0 | Registry inspection and command inspection |
| Crate manifests without `publish = false`, emitted or hand-written | 0 | 0 | Analysis over every manifest in the change set and every emitted manifest |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files` | 0 | 0 | Manifest comparison |
| Byte changes to `schema/**`, `fixtures/**`, `packages/**`, `spikes/**`, `.github/**` | 0 | 0 | Change-set diff |
| Byte changes to the frozen prototype backends and emitters | 0 | 0 | Change-set diff |
| Trunk commits inside this change's range | 0 | 0 | `git log --merges` over the range |
| Downstream repositories changed | 0 | 0 | Inspection |
| Paths this change's set gains when a later unrelated ticket lands on top | 0 | 0 | Accretion rehearsal on a synthetic history |
| Test cases failing after a revert of this change's range | 0 | 0 | Scripted restore rehearsal |
| Third-party crates without a pinned version, a recorded licence, and an attribution entry | 0 | 0 | Inspection of `Cargo.lock` against `THIRD-PARTY-NOTICES.md` |
| Added package manifests without `AGPL-3.0-only` | 0 | 0 | Licence inspection |

## Verification

Resolve this change's own commit range from history — the parent of the earliest
commit that added a sentinel, through the latest commit that added one — with
`changeRange` from `test/changed-paths.ts`, passing `--no-renames` to every
`git diff` so a move cannot hide a deletion, and take the union of the
per-commit path sets over `git log --first-parent --no-merges` so a trunk merge
inside the range contributes nothing of the trunk's. Confirm every path in that
union, and every uncommitted path in the tree no later commit has taken over, is
permitted and none prohibited. Confirm each permitted entry is named by a
requirement Output or by a Verification step here. Compare `package.json`
metadata fields. Byte-compare every `conformance/` file other than the adapter
registry against the pre-change baseline. Inspect every crate manifest, emitted
and hand-written, for `publish = false`, and every added manifest for the
licence. Compare `Cargo.lock`'s third-party entries against
`THIRD-PARTY-NOTICES.md`. Confirm no registry publication occurred. Re-run the
full suite on a revert of that range. Rehearse the range on a synthetic history
in which an unrelated change lands on top, and confirm the set does not grow and
that a prohibited path at a path no later commit owns still fails the gate.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-023-AC-1 | Every path in this change's own set is permitted and none is prohibited. | Analysis |
| NFR-023-AC-2 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the pre-change baseline. | Analysis |
| NFR-023-AC-3 | Every file under `conformance/` except `adapters/registry.json` and `coverage.json` is byte-unchanged from the pre-change baseline; the registry's change is confined to the `rust-backend` entry; and the coverage account's change is confined to that adapter's row and the `unmetCases` total. | Analysis |
| NFR-023-AC-4 | `schema/**`, `fixtures/**`, `packages/**`, `spikes/**`, `.github/**`, and the frozen prototype backends and emitters are byte-unchanged. | Analysis |
| NFR-023-AC-5 | Every crate manifest this work produces carries `publish = false` — the emitted one and each of the hand-written crates — and removing that emission, or dropping it from a hand-written manifest, makes a test fail. | Test |
| NFR-023-AC-6 | No crate was published and no downstream repository was changed. | Inspection |
| NFR-023-AC-7 | Every added package manifest declares `AGPL-3.0-only`, and every third-party crate in `Cargo.lock` has a pinned version, a recorded SPDX licence compatible with AGPL-3.0-only, and an entry in `THIRD-PARTY-NOTICES.md`. | Analysis |
| NFR-023-AC-8 | Reverting this change's own commit range leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand. | Test |
| NFR-023-AC-9 | Every gate here resolves both ends of its range from history rather than from a branch ref or a bare `HEAD`, uses `--no-renames`, unions over `--first-parent --no-merges`, and still fails on the same input after this change is merged. | Test |
| NFR-023-AC-10 | A later unrelated change landing on top of this one adds no path to this change's set, a trunk merge inside the range adds none of the trunk's paths, and a prohibited path at a path no later commit owns still fails the gate. | Test |
| NFR-023-AC-11 | Every entry of the permitted-path list is named by a requirement's Outputs section or by this requirement's Verification, and an entry no requirement names fails the gate — so widening the list to absorb a failing gate is itself a failure rather than a matter of the author's word. | Test |
| NFR-023-AC-12 | Both sentinel artifacts resolve in history, and a gate whose sentinels do not resolve fails saying it could not locate its range rather than passing. | Test |

## Dependencies

- **Upstream**: [NFR-021](./NFR-021-non-disruptive-compiler-core.md), [NFR-016](./NFR-016-isolated-conformance-corpus.md)
- **Downstream**: issues #11, #7, #22, #23
