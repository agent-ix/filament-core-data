---
id: NFR-025
title: "Non-disruptive TypeScript backend"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-070"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-025] Non-disruptive TypeScript backend

## Statement

The TypeScript backend SHALL land without publishing a package, moving a
consumer, enlarging the published package surface, or changing any byte of the
corpus, oracle, schemas, fixtures, spike goldens, or frozen prototype path it is
judged against, so that a defect found later can be backed out by reverting this
work alone.

## Scope

- Applies to: this change's own path set — the paths between the commit it
  replaced and the commit that introduced it, both located from history through
  sentinel artifacts this change created, plus the uncommitted paths in the tree
  that no later commit has taken over. It does not extend to paths a later
  ticket lands on top of this one.
- Permitted paths: `spec/**`, `plan/**`, `reviews/**`, `test/**`, `tests/**`,
  `Makefile`, `src/compiler/backends/seam.mjs`, `src/compiler/backends/seam.d.mts`,
	`src/compiler/backends/targets.mjs`, `src/compiler/backends/targets.d.mts`,
  `src/compiler/backends/typescript-v1/**`, `src/compiler/backends/format.mjs`,
  `src/compiler/backends/format.d.mts`, `src/compiler/cli.mjs`,
  `src/compiler/diagnostics.mjs`, `src/compiler/inventory.json`,
  `docs/semantic-data-system/compiler-diagnostics.md`, and one named edit to
  `tsconfig.json` — adding `test/fixtures/backends/typescript` to its `exclude`,
  `conformance/adapters/registry.json`,
  `conformance/adapters/typescript-backend/**`, `conformance/coverage.json`,
  and nothing else in that file.
- Prohibited paths: every other path, and in particular `schema/**`,
  `fixtures/**`, `spikes/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`,
  `poetry.lock`, `pyproject.toml`, `src/generated.ts`, `agent_ix_core_data/**`,
  `scripts/**`, `src/compiler/index.mjs`, `src/compiler/index.d.mts`,
  `src/compiler/ir/**`, `src/compiler/compat/**`, `src/compiler/frontend/**`,
  `src/compiler/packages/**`, `src/compiler/backends/typescript.mjs`,
  `src/compiler/backends/rust.mjs`, `src/compiler/backends/type-names.mjs`,
  `conformance/cases/**`, `conformance/bases/**`, `conformance/oracle/**`,
  `conformance/runner/**`, `conformance/corpus.json`,
  `conformance/corpus.mjs`, `conformance/thresholds.json`,
  `conformance/defects.json`, `conformance/contract-gaps.json`,
  `conformance/mutations.json`, `conformance/diagnostic-codes.json`,
  `conformance/divergences.json`, `conformance/schema/**`, `biome.json`, and
  `tsconfig.build.json`.
- A prohibited path is one this change changes no byte of. Reading such a file
  is permitted and is how the corpus judges this backend at all.

## Rationale

Two frozen records are at risk here and both are the yardstick this work is
measured by. The first is the issue #20 corpus: its 111 cases, four bases,
oracle, harness, thresholds, and registers. A backend that edits the corpus it
is judged against has arranged its own verdict, and `conformance/README.md`
states the principle directly — an oracle written by the implementer of the
thing it checks is not an oracle. The second is the frozen issue #4 prototype
path: `src/compiler/backends/typescript.mjs` reproduces a committed golden the
promoted code did not produce, and FR-042-CON-4 forbids regenerating it. The new
backend is a second backend beside it, not a rewrite of it, so that golden does
not move.

The published surface is the third risk. `package.json` `exports`, `main`,
`module`, `types`, and `files` are the contract downstream consumers install
against; enlarging them is the issue #11 publication gate's decision, taken
behind the `agent-ix/quoin#290` human sign-off, and that gate has not moved.
The generated package this work produces is written to a caller-named directory
and to a committed test fixture; it is not added to this repository's own
manifest and it is not sent to any registry.

The permitted list carries one entry that looks like scope creep and is not:
`docs/semantic-data-system/compiler-diagnostics.md` is generated from
`DIAGNOSTIC_CODES` by `scripts/build-compiler-docs.mjs`, which `make lint` runs
in `--check` mode. Adding a diagnostic code therefore *must* move that file, and
declaring it up front is the alternative to discovering it and widening the list
later. Issue #55 records what widening a permitted list twice looks like.

Three of the permitted paths are machine-generated or shared, and issues #21 and
#23 are in flight against the same tree: `conformance/coverage.json` is written
by every harness run from the adapter registry,
`docs/semantic-data-system/compiler-diagnostics.md` is written by
`scripts/build-compiler-docs.mjs` from `DIAGNOSTIC_CODES`, and
`src/compiler/inventory.json` carries a limitation each of the three backend
tickets discharges its own half of. None of the three is merged on a rebase;
each is regenerated from the rebased tree and the regenerated bytes are what is
committed. No acceptance criterion in this bundle names a whole-corpus absolute
for that reason — a figure that is true only if this ticket merges first is a
gate that fails a blameless sibling.

`conformance/divergences.json` is deliberately prohibited rather than permitted.
A registered divergence converts a failing case into a matched one, so a
permission to register divergences is a permission to pass. A disagreement this
work cannot close is reported in the pull request and left failing for the owner
to disposition.

The set of paths this change touched is a fixed historical fact and the gate
reads it as one. Measured against a moving reference it degrades in one of two
directions: against the trunk it empties on merge and every prohibition passes
over nothing, and from a fixed base to the current head it grows, annexing each
later ticket's paths and failing this ticket for work it never did. Both ends
are therefore resolved from history through sentinel artifacts this change
created, using the shared `changeRange` helper rather than a fourth private
copy of the rule.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by this work | 0 | 0 | Registry inspection |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files`, or any dependency block | 0 | 0 | Manifest comparison |
| Changes to `pnpm-lock.yaml` and `poetry.lock` | 0 | 0 | Change-set diff |
| Prohibited paths in this change's own path set | 0 | 0 | Change-set diff |
| Changes to `conformance/cases/**`, `conformance/bases/**`, `conformance/oracle/**`, `conformance/runner/**`, `conformance/thresholds.json` | 0 | 0 | Change-set diff |
| Changes to `spikes/**` and its committed goldens | 0 | 0 | Change-set diff |
| Changes to `schema/**` and `fixtures/**` | 0 | 0 | Change-set diff |
| Changes to the frozen prototype backends | 0 | 0 | Change-set diff |
| Symbols exported by `src/compiler/index.mjs` | 15 | 15 | Export-set test |
| Paths this change's set gains when a later ticket lands on top of it | 0 | 0 | Accretion rehearsal |
| Downstream repositories changed | 0 | 0 | Inspection |
| Test cases failing after a revert of this branch | 0 | 0 | Restore rehearsal |
| Added package manifests without an AGPL-3.0-only declaration | 0 | 0 | Licence inspection |
| Third-party dependencies added to either lockfile | 0 | 0 | Lockfile comparison |

## Verification

Resolve this change's own commit range from history — the parent of the earliest
commit that added one of its sentinel artifacts, through the latest commit that
added one — and confirm every path in that range, and every uncommitted path in
the tree that no later commit has taken over, is permitted and none is
prohibited. Assert the range with `--no-renames`, so a move cannot hide a
deletion. Compare the five `package.json` metadata fields and the three
dependency blocks against the *base endpoint of that range*, which is a commit,
never against a moving reference: after the squash merge the merge base is this
change itself, so a comparison against it is self-referential and asserts
nothing. Assert the narrow build interface
still exports exactly fifteen symbols. Re-run the full suite on a revert of the
range. Rehearse the range on a synthetic history in which an unrelated change
lands on top, and confirm the set does not grow. Inspect every added manifest
for the licence and confirm no registry publication occurred.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-025-AC-1 | Every path in this change's own path set is permitted, and none is prohibited, with both ends of the range resolved from history. | Analysis |
| NFR-025-AC-2 | A synthetic history that lands an unrelated commit after this change's tip leaves the path set unchanged. | Unit |
| NFR-025-AC-3 | `package.json` `exports`, `main`, `module`, `types`, `files`, `dependencies`, `peerDependencies`, and `optionalDependencies` are byte-unchanged between the base endpoint of this change's history-pinned range and its tip, and `package.json` is absent from the change's own path set. Both endpoints are commits, so the assertion survives the merge instead of comparing the change with itself. | Analysis |
| NFR-025-AC-4 | `pnpm-lock.yaml` and `poetry.lock` are absent from this change's own path set, and byte-identical between that range's two history-pinned endpoints. | Analysis |
| NFR-025-AC-5 | `src/compiler/index.mjs` exports exactly fifteen symbols, and adding a sixteenth fails the export-set test. | Unit |
| NFR-025-AC-6 | `src/compiler/backends/typescript.mjs`, `rust.mjs`, and `type-names.mjs` and the four issue #4 goldens are absent from this change's own path set, and the golden comparisons still pass in the checked-out tree — a tree assertion, so it gives the same verdict on the branch and on the trunk. | Snapshot |
| NFR-025-AC-7 | No corpus case, base, oracle module, harness module, threshold, defect row, gap row, mutation row, or conformance schema changed a byte. | Analysis |
| NFR-025-AC-8 | No file this work generates is written under a path this repository publishes, and `npm pack --dry-run` over this repository lists no generated-package file. | Analysis |
| NFR-025-AC-9 | Every generated `package.json` and every added source file declares AGPL-3.0-only. | Static |
| NFR-025-AC-10 | Reverting this change's commit range leaves the full suite passing. | Integration |
| NFR-025-AC-11 | Every gate in this requirement still fails on the input it exists to catch after this change is merged, rehearsed on a synthetic history in which the branch is squashed onto the trunk and `origin/main` is repointed at it. | Test |
| NFR-025-AC-12 | `conformance/divergences.json` is byte-unchanged, so no measured disagreement with the oracle was converted into a pass by suppressing it. | Analysis |
| NFR-025-AC-13 | The only edit to `tsconfig.json` adds `test/fixtures/backends/typescript` to its `exclude`; every other member is byte-identical between the range's endpoints. | Analysis |
| NFR-025-AC-14 | The modules this change adds under `src/compiler/` appear in `npm pack --dry-run` because `package.json` `files` already carries `src/`, and they ship as source with no runtime entry point, no `exports` entry, and no dependency — which is what `src/compiler/inventory.json` already records for every module under that directory. No generated package, and no file under `test/fixtures/`, appears in that listing. | Analysis |
| NFR-025-AC-15 | No acceptance criterion in this bundle asserts a whole-corpus absolute; every count this change claims is a delta attributable to this change alone, and a synthetic history in which a sibling backend lands first leaves every such criterion passing. | Test |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md),
  [NFR-016](./NFR-016-isolated-conformance-corpus.md),
  [NFR-021](./NFR-021-non-disruptive-compiler-core.md)
- **Downstream**: issue #11 (publication), issue #21, issue #23
- **Constrains**: [FR-063](../functional/FR-063-declare-the-generation-backend-seam.md),
  [FR-070](../functional/FR-070-run-the-typescript-conformance-adapter.md),
  [FR-071](../functional/FR-071-provide-the-generate-command-and-surface-fixtures.md)
