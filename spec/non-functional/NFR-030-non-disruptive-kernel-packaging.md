---
id: NFR-030
title: "Non-disruptive kernel packaging behind the publication gate"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-090"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [NFR-030] Non-disruptive kernel packaging behind the publication gate

## Statement

Kernel packaging SHALL generate every package and publish none of them, changing
no byte of the kernel source it reads, the schemas it validates against, the
conformance corpus it is judged by, or the three backends it drives, so that the
publication decision stays with `agent-ix/quoin#290` and a defect found later can
be backed out by reverting this work alone.

## Scope

- Applies to: this change's own path set — the union of the per-commit name
  lists over its own commit range, both endpoints resolved from history through
  sentinel artifacts this change created, plus the uncommitted paths in the tree
  that no later commit has taken over. It does not extend to paths a later
  ticket lands on top of this one.
- Sentinels: `spec/usecase/US-014-consume-the-semantic-kernel-natively.md`,
  added by this change's first commit, and
  `docs/semantic-data-system/semantic-kernel-packages.md`, added by its last.
- Permitted paths: `spec/**`, `plan/**`, `reviews/**`,
  `docs/semantic-data-system/semantic-kernel-packages.md`,
  `docs/semantic-data-system/compiler-diagnostics.md`,
  `src/compiler/frontend/json-schema/**`,
  `src/compiler/frontend/seam.mjs`, `src/compiler/frontend/seam.d.mts`,
  `src/compiler/diagnostics.mjs`, `src/compiler/inventory.json`,
  `packages/semantic-kernel/**`, `python_backend/kernel/**`,
  `crates/kernel-consumer/**`, `scripts/build-semantic-kernel.mjs`,
  `scripts/build-semantic-kernel-digests.mjs`,
  `scripts/check-semantic-kernel-crate.mjs` — permitted for one reason only,
  stated here so the entry cannot be reused for another: FR-086-CON-4 requires
  the crate and its digest baseline to be written by two scripts reaching the
  emitter through two entry points, and neither writer may also be the checker,
  because a gate that regenerates its own baseline compares a file to itself.
  The measured gates therefore need a third script that writes nothing, and
  this entry admits that one and only that one,
  `test/semantic-kernel.test.ts`, `test/changed-paths.ts`,
  `test/compiler-core.test.ts` — permitted for one reason only, stated here so
  the entry cannot be reused for another: FR-049's closing gate requires every
  registered diagnostic code to be emitted by a test **in that file**, and this
  requirement's siblings add six codes. Firing them anywhere else leaves the
  gate reporting them unemitted. The alternative is a code that no test can
  fire, which is the thing FR-049 exists to prevent. The scope conflict is
  recorded as `agent-ix/filament-core-data#83`; this entry is the local
  resolution, not the general one, and admits only the additions that fire this
  requirement's own codes,
  `tests/test_semantic_kernel.py`, `Makefile`, `Cargo.toml`, `Cargo.lock`,
  and nothing else.
- Prohibited paths: every other path, and in particular
  `packages/semantic-core/**`, `schema/**`, `fixtures/**`, `spikes/**`,
  `conformance/**`, `package.json`, `pnpm-lock.yaml`, `poetry.lock`,
  `pyproject.toml`, `tsconfig.json`, `tsconfig.build.json`, `biome.json`,
  `src/generated.ts`, `agent_ix_core_data/**`,
  `src/compiler/backends/**`, `src/compiler/frontend/typespec/**`,
  `src/compiler/frontend/spec-bundle/**`, `src/compiler/ir/**`,
  `src/compiler/compat/**`, `src/compiler/packages/**`, `src/compiler/cli.mjs`,
  `python_backend/adapter/**`, `python_backend/runner/**`,
  `python_backend/qualification/**`, `python_backend/generated/**`,
  `python_backend/profiles.json`, `python_backend/refusals.json`,
  `python_backend/limits.json`, `python_backend/toolchain.json`,
  `crates/semantic-ir/**`, `crates/conformance-adapter/**`,
  `crates/consumer-runtime/**`, `crates/consumer-compile-time/**`,
  `test/fixtures/**`, and `.github/**`.
- A prohibited path is one this change changes no byte of. Reading such a file
  is permitted and is how the kernel is generated at all.

## Rationale

Four frozen records are at risk and each one is a yardstick this work is measured
by.

The first is the **kernel source**. `packages/semantic-core/main.tsp` and the
thirty documents `make semantic-core-check` freezes are the contract this work
projects. A grammar edited to make a generator comfortable is no longer the
grammar, and the whole claim of the exercise — that four packages carry one
contract — would be circular. Every representability limit this work meets is
recorded as a loss with an owner, never repaired upstream of itself.

The second is the **published schema set**. `schema/semantic/v1/` states what a
semantic IR document is, and its `frontendDialect` vocabulary is closed with two
members. This work needs a third and does not take one: it declares `typespec`,
states why, and asks the contract owner. Widening a closed vocabulary so that
one's own document validates is the failure mode the vocabulary exists to
prevent.

The third is the **conformance corpus**. `conformance/README.md` states the
principle: an oracle written by the implementer of the thing it checks is not an
oracle. This work is judged against that corpus and therefore edits none of it —
not a case, not a base, not the oracle, not the harness, not the thresholds, and
above all not `divergences.json`, because a registered divergence converts a
failing case into a matched one and a permission to register divergences is a
permission to pass. The corpus's own unmet-area row for cross-language
serialization parity is likewise the corpus owner's to close; this work reports
the evidence and files the request rather than editing the row itself. That is
why `conformance/**` is prohibited outright, including `coverage.json`: this work
adds no adapter slot, so no harness run of its own rewrites it.

The fourth is the **three backends**. `src/compiler/backends/**` is read and
driven, never edited. Two of the three carry defects this work found while
establishing its baseline — `#21`'s stale goldens and digest baseline, `#22`'s
zero-field-record typecheck failure — and both are reopened on their own tickets
with reproductions. Repairing either here would put a fix for someone else's
requirement inside a package generation ticket, and would make a revert of this
branch also revert their fix.

`package.json` is prohibited for a reason that is the whole point of this
requirement. Adding a kernel package to `exports` or `files` is the act of
publishing it from this repository, and that act is behind `agent-ix/quoin#290`,
a human sign-off that has not been given. The gate is kept mechanically as well
as by rule: the generated Rust manifest carries `publish = false`
unconditionally, and no generated manifest names a registry.

`docs/semantic-data-system/compiler-diagnostics.md` is permitted and looks like
scope creep. It is not: the file is generated from `DIAGNOSTIC_CODES` by
`scripts/build-compiler-docs.mjs`, which `make lint` runs in `--check` mode, so
adding a diagnostic code *must* move it. Declaring it up front is the
alternative to discovering it and widening the list later, which issue `#55`
records the cost of.

`test/changed-paths.ts` is permitted only if this work needs a helper it does not
already have; the existing `changedPathsUnion` is expected to serve unchanged,
and a change to it must not weaken any sibling gate that shares it.

The set of paths this change touched is a fixed historical fact and this gate
reads it as one. Measured against a moving reference it degrades in one of four
observed directions: a positive diff asserting a path *changed* fails once the
change merges; a baseline read at run time compares the trunk with itself and
goes quiet; a fixed base to a moving head annexes every later ticket's paths and
fails this ticket for work it never did; and a working tree compared against a
history-pinned base attributes a later ticket's bytes to this one. Both endpoints
are therefore resolved from history through the sentinels above, via the shared
`changeRange` helper rather than a private copy, always with `--no-renames` so a
move cannot hide a deletion. A range that cannot be located fails saying it did
not run.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published to npm, crates.io, or a Python index | 0 | 0 | Registry inspection |
| Git tags pushed | 0 | 0 | Inspection |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files`, or any dependency block | 0 | 0 | Manifest comparison |
| Changes to `pnpm-lock.yaml`, `poetry.lock`, `pyproject.toml`, `tsconfig.json`, `biome.json` | 0 | 0 | Change-set diff |
| Prohibited paths in this change's own path set | 0 | 0 | Change-set diff |
| Changes to `packages/semantic-core/**` | 0 | 0 | Change-set diff |
| Changes to `schema/**` and `fixtures/**` | 0 | 0 | Change-set diff |
| Changes to `conformance/**` | 0 | 0 | Change-set diff |
| Changes to `src/compiler/backends/**` | 0 | 0 | Change-set diff |
| Merge commits inside this change's own range | 0 | 0 | History inspection |
| Paths this change's set gains when a later ticket lands on top of it | 0 | 0 | Accretion rehearsal |
| Generated manifests permitting registry publication | 0 | 0 | Manifest inspection |
| Third-party dependencies added to any lockfile | 0 | 0 | Lockfile comparison |
| Test cases failing after a revert of this change's range, beyond those already failing on its base | 0 | 0 | Restore rehearsal |

## Verification

Resolve this change's own commit range from history through its two sentinels,
take the union of the per-commit name lists over `--first-parent --no-merges
--no-renames`, fold in the uncommitted paths no later commit has taken over, and
confirm every path is permitted and none is prohibited. Compare `package.json`'s
five metadata fields and three dependency blocks between the range's two
history-pinned endpoints, both commits, never against a moving reference: after
the squash merge the merge base is this change itself, so a comparison against it
is self-referential and asserts nothing. Rehearse the range on a synthetic
history in which an unrelated commit lands after this change's tip, and confirm
the set does not grow. Rehearse it again on a synthetic history in which the
branch is squashed onto the trunk and `origin/main` is repointed at it, and
confirm every gate still fails on the input it exists to catch. Assert the range
contains no merge commit. Inspect every generated manifest for a
publication-permitting field and every registry for a published artifact.
Re-run the full suite on a revert of the range and compare its failure set with
the failure set of the range's base commit, so a failure this change did not
cause is not attributed to it.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-030-AC-1 | Every path in this change's own path set is permitted and none is prohibited, with both endpoints of the range resolved from history through the two declared sentinels and `--no-renames` passed. | Analysis |
| NFR-030-AC-2 | A synthetic history that lands an unrelated commit after this change's tip leaves the path set unchanged, and a synthetic history that squashes the branch onto the trunk and repoints `origin/main` at it leaves every gate in this requirement still failing on the input it exists to catch. | Unit |
| NFR-030-AC-3 | A range whose sentinels are absent from history fails saying it could not be located, rather than passing over an empty set. | Unit |
| NFR-030-AC-4 | `package.json` `exports`, `main`, `module`, `types`, `files`, `dependencies`, `peerDependencies`, and `optionalDependencies` are byte-unchanged between the range's two history-pinned endpoints, and `package.json` is absent from this change's own path set. | Analysis |
| NFR-030-AC-5 | `pnpm-lock.yaml`, `poetry.lock`, `pyproject.toml`, `tsconfig.json`, `tsconfig.build.json`, and `biome.json` are absent from this change's own path set. | Analysis |
| NFR-030-AC-6 | No file under `packages/semantic-core/`, `schema/`, `fixtures/`, `spikes/`, `conformance/`, `src/compiler/backends/`, `python_backend/adapter/`, `python_backend/runner/`, or `crates/semantic-ir/` changed a byte. | Analysis |
| NFR-030-AC-7 | `Cargo.lock` changes only by the addition of this change's own members and adds no third-party package, asserted by comparing the resolved package set between the range's endpoints. | Analysis |
| NFR-030-AC-8 | No generated package manifest permits registry publication: the Rust manifest carries `publish = false`, and no generated manifest names a registry, a `publishConfig`, or a distribution index. | Static |
| NFR-030-AC-9 | No package was published and no tag was pushed, and the publication step is recorded as blocked with `agent-ix/quoin#290` named. | Inspection |
| NFR-030-AC-10 | This change's own range contains no merge commit, so its path set is the union of its own commits and carries nothing the trunk moved. | Analysis |
| NFR-030-AC-11 | Reverting this change's range leaves the suite's failure set equal to the failure set of the range's base commit — which is not empty, because `make rust-check` is red on `main` for the reason recorded on `agent-ix/filament-core-data#21`. The criterion is a comparison, not an absolute, so a pre-existing failure is neither hidden nor attributed here. | Integration |
| NFR-030-AC-12 | No acceptance criterion in this bundle asserts a whole-corpus or whole-suite absolute; every count claimed is a delta attributable to this change alone, and a synthetic history in which a sibling ticket lands first leaves every such criterion passing. | Test |

## Dependencies

- **Upstream**: [NFR-016](./NFR-016-isolated-conformance-corpus.md),
  [NFR-023](./NFR-023-non-disruptive-rust-backend.md),
  [NFR-025](./NFR-025-non-disruptive-typescript-backend.md),
  [NFR-027](./NFR-027-reproducible-non-disruptive-python-generation.md)
- **Downstream**: the publication gate `agent-ix/quoin#290`; the reopened
  `agent-ix/filament-core-data#21` and `agent-ix/filament-core-data#22`
- **Constrains**: [FR-081](../functional/FR-081-declare-the-semantic-kernel-bundle.md),
  [FR-085](../functional/FR-085-generate-the-kernel-typescript-package.md),
  [FR-086](../functional/FR-086-generate-the-kernel-rust-crate.md),
  [FR-087](../functional/FR-087-generate-the-kernel-python-package.md),
  [FR-088](../functional/FR-088-ship-the-modular-kernel-json-schema.md),
  [FR-090](../functional/FR-090-prove-cross-language-agreement.md)
