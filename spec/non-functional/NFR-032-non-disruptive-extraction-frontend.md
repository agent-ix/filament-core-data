---
id: NFR-032
title: "Non-disruptive extraction frontend"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-098"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-099"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "depends_on"
---
# [NFR-032] Non-disruptive extraction frontend

## Statement

The extraction frontend SHALL land as one new workspace crate without changing
the TypeSpec frontend, the archetype packages, the independent Rust reader, a
published schema or fixture, the conformance corpus, a downstream consumer, or
any corpus repository it reads, and without publishing anything, so that a
defect found later can be backed out by reverting this work alone and so that
the crates whose agreement is evidence remain independent of it.

## Scope

- Applies to: this change's own path set — the paths between the commit it
  replaced and the commit that introduced it, both located from history through
  sentinel artifacts this change creates, plus the uncommitted paths in the tree
  that no later commit has taken over. It does not extend to paths a later
  ticket lands on top of this one, and it does not extend to paths a trunk
  merge inside the range brought in.
- Sentinel artifacts:
  `spec/usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md`, created by
  this change's *first* commit, and
  `docs/semantic-data-system/extraction-frontend-diagnostics.md`, created by
  its *last*. Both ends of the range resolve from these, in the NFR-023 form;
  the diagnostics document is therefore written in the final implementation
  commit rather than when its requirement is first satisfied.
- Permitted paths: `crates/extraction-frontend/**`, including the vendored
  module fixture under `crates/extraction-frontend/fixtures/modules/**`; the
  `members` line of the root `Cargo.toml` and the `Cargo.lock` entries that
  line adds, resolved under `cargo +1.98.1 --locked` so that no other member's
  entry moves (NFR-033); one `extraction-frontend` block in the root
  `Makefile`; additive rows in the root `THIRD-PARTY-NOTICES.md` for exactly
  the crates this change adds to `Cargo.lock` — a row per newly locked package
  version, no line of the register removed or changed, no row for a crate the
  lock does not carry (CR-036-8); exactly one repository-root script,
  `scripts/extraction-frontend-harness.mjs`, the rehearsal harness the
  Verification names — the rest of the root `scripts/` stays prohibited
  (CR-036-8); the `spec-bundle` and `reason` members of
  each case in `test/fixtures/compiler/shared/cases.json` and its top-level
  `$comment`, whose sentence reserved the column for this ticket (FR-045) and
  is rewritten to say the column is filled,
  `test/fixtures/compiler/shared/spec-bundle/**`, and the new shared case
  `test/fixtures/compiler/shared/typespec/records-and-scalars/**` beside its
  `spec-bundle/records-and-scalars/**` twin, authored in both dialects for
  FR-098's structural parity;
  `docs/semantic-data-system/extraction-frontend-diagnostics.md`; and this
  ticket's own artifacts under `spec/**`, `plan/**`, and `reviews/**`.
- Prohibited paths, meaning this change changes no byte of them (reading them,
  and running a program under them, remain permitted and are how the FR-098
  parity evidence is produced): `src/compiler/**` — including the
  `spec-bundle` seam `src/compiler/frontend/spec-bundle/frontend.mjs`, which
  keeps returning `FRONTEND_NOT_IMPLEMENTED` until filament-core-data#86 wires
  the Rust binary into it — `packages/**`, `crates/semantic-ir/**`,
  `crates/conformance-adapter/**`, `crates/consumer-compile-time/**`,
  `crates/consumer-runtime/**`, `schema/**`, the repository-root `fixtures/**`,
  `conformance/**`, `spikes/**`, `package.json`, `pnpm-lock.yaml`,
  `rust-toolchain.toml`, the `rust-version` key of the root `Cargo.toml`,
  `.github/**`, `agent_ix_core_data/**`, the repository-root `tests/**`, every
  `test/*.test.ts`, the repository-root `scripts/**` other than
  `scripts/extraction-frontend-harness.mjs`, and every path of every other
  repository —
  `config-service`, `quire-rs`, `spec-objects-business`, and
  `spec-artifacts-iso` are read-only fixtures. The `fixtures/**` and
  `tests/**` globs are anchored at the repository root and do not match
  `crates/extraction-frontend/fixtures/` or `crates/extraction-frontend/tests/`.
- `crates/semantic-ir/**` is prohibited for edits and permitted as a
  dependency: this crate depends on `agent-ix-semantic-ir` by `path` at run
  time (FR-097), and the reverse edge — from `crates/semantic-ir` or
  `crates/conformance-adapter` to this crate — is what the metric below
  forbids.
- Every permitted entry traces to a requirement Output or to a named
  Verification step of this requirement. The `members` line is
  permitted because a workspace member cannot exist without it; the `Makefile`
  block because FR-099 names it; the root register rows because NFR-023-AC-7
  requires every third-party crate in `Cargo.lock` to hold an entry there and
  its gate (`test/rust-backend.test.ts` TC-742) reads the lock this change
  produces, so a register that omits a locked crate is the defect NFR-023
  forbids, not a path this change may leave alone — the widening is bounded
  to the additions the lock proves; the harness because the Verification
  names it by that path and `test/compiler.test.ts` requires every tracked
  `.mjs` that names `src/compiler` — the harness does, in its prohibited
  table — to live under the root `scripts/`; the shared-case members and the
  `$comment` because FR-045 reserved the column for this ticket by name and
  FR-098 owns the `reason` member and the `records-and-scalars` case; the
  vendored module because
  NFR-033 pins it there; and the diagnostics document because FR-096 names it
  as the published registry.

## Rationale

Two of the prohibited paths carry more than the usual non-disruption argument.
`crates/semantic-ir` is the independent Rust reader of FR-059: it declares no
dependency at all, and its agreement with the issue #20 oracle is *evidence*
precisely because nothing it reads is shared with the thing it judges. A
dependency from that crate to this one — or a shared module extracted from
both — would turn the evidence into a shared implementation and prove nothing.
This crate may depend on the reader — it does, by `path`, for validation and
canonical bytes — but the reader may never depend on this crate, and this
change edits no byte of it. `src/compiler/frontend/typespec/**` is the other frontend; FR-098's
parity criterion is only a criterion while the two frontends share nothing but
the IR they emit.

The corpus repositories are prohibited for a reason this ticket measured. The
Phase 0 gate found that the live `config-service` FR-006 predates the
typed-table contract and lifts to nothing, and that no `object: entity`
artifact anywhere under the authoring host's checkouts is yet in the typed form.
The temptation to "fix the fixture" is exactly the corpus migration the program
has deferred (quire-contract-ir#52); the fixture this ticket lifts is the
provenance-tracked re-authoring `quire-rs` vendors, and every test run ends with
`git status --porcelain` empty in every repository it read.

The changed-path range is fixed at both ends by history because four of this
repository's tickets have been dragged back by the same defect class, and
NFR-021 and NFR-023 each record a face of it: a range fixed at its base but
open at its head accretes every later ticket's paths and fails the wrong ticket
for them — issue #20 measured 236 paths and no prohibited hit against the
merged trunk, 406 paths and 139 prohibited hits against a sibling branch — and
a tree diff over a range that merged the trunk inside itself annexes the
trunk's paths as its own, measured at 456 paths, 74 of them the trunk's, against
a true change set of 182. This branch rebases rather than merges, and the gate
unions per-commit path sets over `--first-parent --no-merges`.

One pre-existing suite fails on this branch and this change does not edit it.
`test/semantic-kernel.test.ts`, issue #11's NFR-030 non-disruption gate,
measures its change set as `git diff --name-only main...HEAD` — a range fixed
at its base and open at its head, the defect class this requirement's own
range is fixed against — so every later branch, this one included, is
attributed issue #11's paths and fails that gate. It is filed as
filament-core-data#89. `test/*.test.ts` is prohibited here, the failure is
issue #11's to repair, and the suite-compare rehearsal (NFR-032-AC-7)
compares that row's outcome on the range's base against its head like every
other pre-existing row rather than excusing it.

No publication follows from the issue #21 safety gate, which has not moved:
every crate manifest this work produces carries `publish = false`, and no step
contacts a registry. No consumer is migrated because a domain package is a
build-time derivation of a spec bundle, not a replacement for it; the day a
consumer reads a generated domain package instead of its own model is a
migration ticket, not this one.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Prohibited paths in this change's own set | 0 | 0 | Change-set diff over a range fixed at both ends by history, unioned over `--first-parent --no-merges` |
| Permitted entries traceable to no requirement Output or Verification step | 0 | 0 | Analysis over the permitted list |
| Byte changes to `src/compiler/**`, `packages/**`, `crates/semantic-ir/**`, `crates/conformance-adapter/**`, `schema/**`, `fixtures/**`, `conformance/**`, `spikes/**` | 0 | 0 | Change-set diff |
| Dependencies from `crates/semantic-ir` or `crates/conformance-adapter` to `crates/extraction-frontend` | 0 | 0 | `cargo metadata` inspection |
| Changes to `package.json`, `pnpm-lock.yaml`, `rust-toolchain.toml`, and the workspace `rust-version` | 0 | 0 | Change-set diff |
| Lines of the root `Cargo.toml` changed other than the `members` line | 0 | 0 | Line diff |
| Lines of `test/fixtures/compiler/shared/cases.json` changed outside a `spec-bundle` or `reason` member, the top-level `$comment`, or the added `records-and-scalars` case, and files added under `shared/typespec/` outside `records-and-scalars/` | 0 | 0 | Line diff |
| Lines of the root `THIRD-PARTY-NOTICES.md` removed or changed, and rows added for a crate the workspace `Cargo.lock` does not carry | 0 | 0 | Line diff against the range's base; row names against `Cargo.lock` |
| Third-party crates in the workspace `Cargo.lock` without a row in the root `THIRD-PARTY-NOTICES.md` | 0 | 0 | `test/rust-backend.test.ts` TC-742 (NFR-023-AC-7) |
| Files in any corpus repository changed or created by a test run | 0 | 0 | `git status --porcelain` in each after every run |
| Crates published by this work | 0 | 0 | Registry inspection and command inspection |
| Crate manifests without `publish = false` | 0 | 0 | Manifest inspection |
| Downstream repositories changed | 0 | 0 | Inspection |
| Trunk commits inside this change's range | 0 | 0 | `git log --merges` over the range |
| Paths this change's set gains when a later unrelated ticket lands on top | 0 | 0 | Accretion rehearsal on a synthetic history |
| Change in the outcome of `make test` and `make rust` on the pre-existing suite | 0 | 0 | Suite comparison before and after |
| Test cases failing after a revert of this change's range | 0 | 0 | Scripted restore rehearsal |
| Added manifests without `AGPL-3.0-only` | 0 | 0 | Licence inspection |

## Verification

Resolve this change's own commit range from history — the parent of the
earliest commit that added a sentinel, through the latest commit that added
one — with `changeRange` from `test/changed-paths.ts`, passing `--no-renames`
to every `git diff`, and take the union of the per-commit path sets over
`git log --first-parent --no-merges`. Confirm every path in that union, and
every uncommitted path in the tree no later commit has taken over, is permitted
and none prohibited; confirm each permitted entry is named by a requirement
Output or a Verification step here. Run `cargo metadata` and confirm no
workspace member other than this crate depends on it, and that its only
`path` edge points at `agent-ix-semantic-ir`. Line-diff the root `Cargo.toml`
and the shared-case manifest against the range's base, and confirm the
`spec-bundle` seam file is byte-unchanged. Line-diff the root
`THIRD-PARTY-NOTICES.md` against the range's base and confirm the diff is
additions only, that every added row names a crate the workspace
`Cargo.lock` carries, and that `test/rust-backend.test.ts` TC-742 passes on
the head. Run the
full crate suite and then `git status --porcelain` in this repository and in
every corpus repository the fixtures name, confirming each is empty. Inspect
every crate manifest for `publish = false` and every added manifest for the
licence. Run `make test` and `make rust` on the range's base and on its head
and compare outcomes row for row. Re-run the full suite on a revert of the
range. Rehearse the range on a synthetic history in which an unrelated change
lands on top, and confirm the set does not grow and that a prohibited path no
later commit owns still fails the gate. The three rehearsals are verbs of
`scripts/extraction-frontend-harness.mjs`, typed `Static` in the matrix, in
the form `test/changed-paths.ts` already takes; none is a `cargo test`.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-032-AC-1 | Every path in this change's own set, resolved from the two sentinels and unioned over `--first-parent --no-merges`, is permitted and none is prohibited; the root `THIRD-PARTY-NOTICES.md` differs from the range's base by added rows only, each naming a crate the workspace `Cargo.lock` carries. | Analysis (TC-1310) |
| NFR-032-AC-2 | `cargo metadata` shows no dependency edge from `agent-ix-semantic-ir` or `agent-ix-conformance-adapter` to the extraction frontend crate; the edge from the extraction frontend crate to `agent-ix-semantic-ir` is present and is the only path edge it declares. | Test (TC-1311) |
| NFR-032-AC-3 | The root `Cargo.toml` differs from the range's base only in the `members` line, and `rust-toolchain.toml` and the workspace `rust-version` are byte-unchanged. | Analysis (TC-1312) |
| NFR-032-AC-4 | `test/fixtures/compiler/shared/cases.json` differs from the base only by `spec-bundle` and `reason` members, the rewritten top-level `$comment`, and the added `records-and-scalars` case; every pre-existing path under `test/fixtures/compiler/shared/**` and `src/compiler/frontend/spec-bundle/frontend.mjs` are byte-unchanged. | Analysis (TC-1313) |
| NFR-032-AC-5 | After the full crate suite runs, `git status --porcelain` is empty in this repository's fixture directories and in every corpus repository the fixtures name. | Test (TC-1314) |
| NFR-032-AC-6 | Every crate manifest in the change set carries `publish = false` and `license = "AGPL-3.0-only"`, and no command in the `Makefile` block or the crate names a registry. | Analysis (TC-1315) |
| NFR-032-AC-7 | `make test` and `make rust`, driven by the `scripts/extraction-frontend-harness.mjs` `suite-compare` verb on the range's base and on its head, produce the same pass/fail outcome for every pre-existing row. | Static (TC-1316) |
| NFR-032-AC-8 | The full suite passes on a revert of this change's range, driven by the harness's `revert-rehearsal` verb. | Static (TC-1317) |
| NFR-032-AC-9 | On a synthetic history built by the harness's `accretion-rehearsal` verb, where an unrelated sibling change lands on top, this change's path set does not grow, and a prohibited path no later commit owns still fails the gate. | Static (TC-1318) |
| NFR-032-AC-10 | `git log --merges` over the range is empty, and `package.json` and `pnpm-lock.yaml` are byte-unchanged. | Analysis (TC-1319) |

## Dependencies

- **Upstream**: [NFR-021](./NFR-021-non-disruptive-compiler-core.md), [NFR-023](./NFR-023-non-disruptive-rust-backend.md), [NFR-016](./NFR-016-isolated-conformance-corpus.md)
- **Downstream**: [FR-095](../functional/FR-095-mint-package-identity-and-provenance.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md), issue #37
