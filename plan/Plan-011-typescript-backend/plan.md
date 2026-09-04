---
id: Plan-011
title: "TypeScript semantic codegen and validator backend"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-065"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-067"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-070"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: references
---
# Implementation Plan: TypeScript semantic codegen and validator backend

Issue: `agent-ix/filament-core-data#22`. Reviews: SR-087..SR-094 under
`spec/reviews/22-typescript-backend/`. Predecessor bundles: Plan-008 (the
compiler core, issue #19) and Plan-009 (the conformance corpus and its
independent oracle, issue #20). Runs in parallel with issue #21 (the Rust
backend) and issue #23 (the Python backend), which own the sibling adapter
slots.

This is the first mostly-*feature* slice in the programme. Only Task-100,
Task-101, Task-102, Task-103, Task-104 and Task-113 are enablement — they build
the decision layer the corpus judges. Everything else is the generated package
itself.

## Requirements Summary

### Stakeholder and User Requirements

- [ ] **StR-001:** Keep the semantic contract governed by evidence a reviewer can check without running the thing being judged.
- [ ] **US-012:** Let a TypeScript consumer typecheck against the semantic contract at build time and check untrusted input against it at run time, without the contract living in decorators, a framework, or an ORM.

### Functional Requirements

- [ ] **FR-063:** The generation seam keyed on the published `target` vocabulary: request in, output manifest out, for every request including every failing one; four targets registered as declared-unimplemented; the declared TypeScript target contract.
- [ ] **FR-064:** The resolved type model and the type projection: one declared rendering for each of the eight IR kinds and nine scalars, the three field axes kept distinct, collision-free identifier minting, deterministic order, purity.
- [ ] **FR-065:** The ESM package: a closed eight-file set, a named-only export surface, an empty external dependency closure, SPDX headers, a strict typecheck, and a reachable-symbol walk in place of a bundler.
- [ ] **FR-066:** The generated runtime validators: a pointer and a stable code on every failure, four distinct presence/nullability decisions, every constraint keyword, the object-shape hazards, bounded recursion, and no third-party runtime dependency.
- [ ] **FR-067:** Identity and provenance as ordinary readonly data — identities, roles, extensions, units, relationship descriptors, occurrences, and the fingerprint — with no determinism leak.
- [ ] **FR-068:** The backend's own admissibility reader: a structural layer, the cross-field rules, a closed code register with a per-code derivation ledger, a suppression channel, declared bounds, and the single named GAP-011 reference policy; plus representability and declared loss under a `fail` policy.
- [ ] **FR-069:** The canonical form — JCS with identity-sorted sets over thirteen declared paths, a total tie-break, the `1.1.0` materialization — and the IR-surface compatibility classification with its modelled-change set exported as data.
- [ ] **FR-070:** The `typescript-backend` conformance adapter: agreement with the independent oracle on every case, the first-run divergence count, the registry row, and the coverage delta.
- [ ] **FR-071:** The `generate` command, the injected biome formatter, the committed fixtures, the strict typecheck program, and the archive listing.

### Non-Functional Requirements

- [ ] **NFR-024:** The generated package is reproducible byte for byte across runs, directories and locales, and depends on no framework, application, or third-party runtime package.
- [ ] **NFR-025:** The backend lands without publishing, moving a consumer, enlarging the published surface, or changing a byte of the corpus, oracle, schemas, fixtures, spike goldens, or frozen prototype path it is judged against.

## Dependency Graph

```text
Task-100 -> Task-101 -> Task-102 -> Task-103 -> Task-104 -+-> Task-105 -> Task-106 -+
                                                          |            \            |
                                                          |             +-> Task-107 -> Task-108
                                                          |             +-> Task-109 |
                                                          |                          |
                                                          |   Task-106,107,109 ------+-> Task-110
                                                          |                                 |
                                                          +-> Task-113                      v
                                                                   |               Task-111 -> Task-112
                                                                   |                             |
                                                                   +-------------> Task-114 <----+
                                                                                        |
                                                                              Task-115 -> Task-116
```

- **Task-100** lands the seam and the failing suite before any generator exists, so every later task turns a real red gate green rather than adding a green one.
- **Task-101 comes before Task-102** even though canonicalization looks independent of admissibility. `normalized` is compared byte for byte on all 111 corpus cases and it is the cheapest complete signal this ticket can get against the whole yardstick: it can be measured before a single diagnostic rule exists, and a mismatch there is a cheaper thing to learn early than late. The two do not form a cycle — FR-069-AC-20 requires canonicalization to run over every corpus case with no admissibility answer computed.
- **Task-102 → Task-103 → Task-104** build the decision layer in the order the layers run: structural, then cross-field, then target representability.
- **Task-105** is the join the whole codegen track hangs from; four requirements named the resolved model before the review pass and none owned it.
- **Task-106, Task-107 and Task-109** fan out from the model; **Task-108** follows the validators because it is their evidence; **Task-110** is the join.
- **Task-111 and Task-112** are the surfaces — the impure edge and the committed fixtures.
- **Task-113** hangs off Task-104 rather than off the codegen, because the classifier shares the set-ordering rule with Task-101 and nothing with the renderers. It can run in parallel with the whole of track B.
- **Task-114** is where the independent oracle finally judges the backend. **Task-115** is the two quality gates, **Task-116** the closing gate.

## Execution Tracks

| Track | Tasks | Character |
|---|---|---|
| A — the decision layer | Task-100, Task-101, Task-102, Task-103, Task-104, Task-113 | Enablement and the critical path. This is the dominant cost of the ticket and the only part whose correctness the corpus can judge directly. |
| B — the codegen | Task-105, Task-106, Task-107, Task-108, Task-109, Task-110 | Feature work. Fans out from the resolved model and joins at the package layout. |
| C — the surfaces | Task-111, Task-112 | The impure edge — the formatter, the command, the committed fixtures. |
| D — the join | Task-114, Task-115, Task-116 | The conformance run, the quality gates, and the closing review. |

Track A and track B are serial with respect to each other: the codegen cannot
start until representability is decided, because a construct the target cannot
represent must refuse generation rather than be approximated. Track A's
Task-113 and the whole of track B run in parallel.

## Quality Gates

| Gate | After | Pass condition |
|---|---|---|
| **G1** | Task-101 | `normalizeIrForTarget` reproduces the oracle's `normalized` string byte for byte for all 111 corpus cases, measured directly, before any diagnostic rule exists. The first-run mismatch count is recorded before anything is fixed. |
| **G2** | Task-104 | The admissibility answer agrees with the oracle's `resultState` on all 111 cases and with its diagnostics on all 44 expected rows, keyed on `[pointer, code, severity, locus]`. The **first-run divergence count is recorded before any fix**, because after the first run every change is tuning. |
| **G3** | Task-110 | Every one of the 70 cases the backend admits generates, and the generated packages typecheck as one program under `strict` with `exactOptionalPropertyTypes`. |
| **G4** | Task-113 | The classification agrees with the oracle on all 25 `kind: "compatibility"` cases, with the first-run divergence count recorded before any fix. |
| **G5** | Task-114 | `make conformance` exits 0 with the `typescript-backend` row at matched 111 and unmet 0; `conformance/divergences.json` is byte-unchanged; and the coverage delta is read from the regenerated account rather than restated. |
| **G6** | Task-115 | The three verification numbers — branch, simulated post-merge, and post-merge with a real unrelated sibling commit on top — plus, for every guard this ticket adds, a falsification (the guard bites with the fix reverted) and a perturbation (it still bites after a plausible unrelated change). |
| **G7** | Task-116 | Code review and gap analysis carry no blocking finding; the PR carries the mergeable comment with all three numbers and everything left unmet. |

### Entrance Criteria

- US-012, FR-063..FR-071, NFR-024, NFR-025, TC-745..844 and SR-087..SR-094 validate with Quire: zero errors, and the only grammar warning in the tree is the pre-existing one on FR-031.
- `node scripts/test-matrix-summary.mjs --check` exits 0.
- `make test` and `poetry run pytest` green on the base commit, with `pnpm install --frozen-lockfile` and `poetry install` both run.

### Exit Criteria

- All 100 issue #22 cases pass; the 644 prior cases pass unchanged.
- `make conformance` exits 0 with this slot answering all 111 cases and zero registered divergences.
- The change-set gate reports no prohibited path, with both range endpoints pinned to history; `package.json` and both lockfiles are absent from the set.
- Code review and gap analysis report no blocking finding; the PR carries the mergeable comment.

## Test Plan

Every one of TC-745..TC-844 is owned by exactly one task. The mapping is
authoritative in each task's `verifies` frontmatter; the summary is below.

| Task | Test cases | Count |
|---|---|---|
| Task-100 | TC-745..TC-754 | 10 |
| Task-101 | TC-806..TC-810 | 5 |
| Task-102 | TC-797, TC-801 | 2 |
| Task-103 | TC-795, TC-796, TC-798, TC-799, TC-800, TC-803, TC-805 | 7 |
| Task-104 | TC-802, TC-804 | 2 |
| Task-105 | TC-755, TC-765 | 2 |
| Task-106 | TC-756..TC-764 | 9 |
| Task-107 | TC-778..TC-786 | 9 |
| Task-108 | TC-776, TC-777 | 2 |
| Task-109 | TC-787..TC-794 | 8 |
| Task-110 | TC-766..TC-775 | 10 |
| Task-111 | TC-826..TC-829, TC-832, TC-833 | 6 |
| Task-112 | TC-825, TC-830, TC-831 | 3 |
| Task-113 | TC-811..TC-814 | 4 |
| Task-114 | TC-815..TC-824 | 10 |
| Task-115 | TC-834..TC-844 | 11 |
| Task-116 | — | 0 |

TC-814 closes at Task-113 rather than at Task-101 because it is a static
analysis over `canonical.mjs` and `classify.mjs` together, and can only run once
both exist.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **The decision layer is priced as two requirements among eleven and is not.** Task-101..104 and Task-113 re-derive what `conformance/oracle/oracle.mjs` (1,484 lines), `oracle/json.mjs` (253) and `oracle/schema-layer.mjs` (176) decide, and must agree at `permittedDivergences: 0` on four surfaces at once: `resultState` across 111 cases, a positional `[pointer, code, severity, locus]` key across 44 diagnostics, `normalized` bytes across 111, and `classification` across 25. | High | High | It gets its own track, its own two gates (G1 and G2) measured before any codegen starts, and a build order that gets the cheapest complete signal first. The requirement is not narrowed to fit the budget. |
| **Tuning.** An implementer who cannot reach agreement is tempted to read the oracle and transcribe it, or to nudge one rule at a time until the run is green — which produces a passing conformance run and no second implementation. An import ban is checkable; transcription is not. | High | High | Two disclosures rather than trust: the per-code derivation ledger of Task-102, recording for each of the 30 codes whether its rule was read from a published clause or from the corpus register (15 of 30 are `provenance: "minted"`), and the first-run divergence count of Task-103, Task-113 and Task-114, recorded before any fix. |
| **Shared machine-generated artifacts.** `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`, `src/compiler/inventory.json` and the `spec/tests.md` execution summary are each a function of the merged set of issues #21, #22 and #23, and all three branches are live. | High | Medium | Every acceptance criterion in this bundle states a delta, never a whole-corpus absolute, and NFR-025 says the four are regenerated on rebase and never merged textually. The cross-ticket reconciliation is filed as issue #63 and is not this ticket's to close. |
| **Volatility from open contract questions.** GAP-004 first: `contracts-v1.md` names `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere, and `normalized` feeds every fingerprint FR-067 stamps into every generated file. Then #61 (a diagnostic's severity and locus), #62 (128 against 256), #64 (the version-uplift rule), #58 (the union wire form and `bytes`), and GAP-011 last — it touches four cases and one constant. | Medium | Medium | Every reading is declared, cited to its issue, and confined to one place: `IDENTITY_SET_PATHS` and the key-ordering rule as data, `REFERENCE_POLICY` as a single constant, `MODELLED_CHANGES` as an exported list. A settled question is then a data edit. |
| **Suite runtime.** 70 admitted cases generated and typechecked, on a suite that currently finishes in about 30s; one `tsc --noEmit` over this repository takes about 2.3s. | Medium | Medium | One TypeScript compiler-API program over every generated package, not one process per case, stated in FR-065 and Task-110. |
| **The committed generated package is a golden the implementation mints.** | Medium | Low | It is labelled a regression baseline, not an oracle; its oracles are the conformance run and the ajv differential. It is kept to the smallest IR document exercising all eight kinds, because every change to FR-064..FR-067 rewrites it. |
| **GAP-011's owner is closed.** Issue #9 is named as the owner of GAP-003, GAP-004, GAP-006, GAP-010 and GAP-011 and can decide none of them. | Certain | Low | Recorded rather than worked around: every citation names the gap row and issue #59, which asks for a live owner. |

## Non-Disruption

NFR-025's path sets, restated here once so a task does not have to guess.

**Permitted:** `spec/**`, `plan/**`, `reviews/**`, `test/**`, `tests/**`,
`Makefile`, `src/compiler/backends/seam.mjs`, `src/compiler/backends/seam.d.mts`,
`src/compiler/backends/typescript-v1/**`, `src/compiler/backends/format.mjs`,
`src/compiler/backends/format.d.mts`, `src/compiler/cli.mjs`,
`src/compiler/diagnostics.mjs`, `src/compiler/inventory.json`,
`docs/semantic-data-system/compiler-diagnostics.md`,
`conformance/adapters/registry.json`,
`conformance/adapters/typescript-backend/**`, `conformance/coverage.json`, and
one named edit to `tsconfig.json` — adding `test/fixtures/backends/typescript`
to its `exclude`, and nothing else in that file.

**Prohibited:** every other path, and in particular `schema/**`, `fixtures/**`,
`spikes/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `poetry.lock`,
`pyproject.toml`, `src/generated.ts`, `agent_ix_core_data/**`, `scripts/**`,
`src/compiler/index.mjs`, `src/compiler/index.d.mts`, `src/compiler/ir/**`,
`src/compiler/compat/**`, `src/compiler/frontend/**`,
`src/compiler/packages/**`, `src/compiler/backends/typescript.mjs`,
`src/compiler/backends/rust.mjs`, `src/compiler/backends/type-names.mjs`,
`conformance/cases/**`, `conformance/bases/**`, `conformance/oracle/**`,
`conformance/runner/**`, `conformance/corpus.json`, `conformance/corpus.mjs`,
`conformance/thresholds.json`, `conformance/defects.json`,
`conformance/contract-gaps.json`, `conformance/mutations.json`,
`conformance/diagnostic-codes.json`, `conformance/divergences.json`,
`conformance/schema/**`, `biome.json`, and `tsconfig.build.json`.

Reading a prohibited path is permitted and is how the corpus judges this backend
at all. `conformance/divergences.json` is prohibited rather than permitted on
purpose: a registered divergence converts a failing case into a matched one, so
a permission to register divergences is a permission to pass.

## Coordination Rules

- Task-105 alone writes `model.mjs`; every renderer consumes it and none walks the IR document itself.
- Task-102 and Task-103 share `admit.mjs` and are serial for that reason; Task-104 alone writes `loss.mjs`.
- Task-101 alone writes `canonical.mjs`; Task-113 alone writes `classify.mjs`.
- Task-111 alone writes `format.mjs` and touches `src/compiler/cli.mjs`; Task-112 alone writes under `test/fixtures/backends/typescript/` and makes the one `tsconfig.json` edit.
- Task-114 alone touches `conformance/`; nothing else in this bundle writes there.
- `conformance/coverage.json` is generated only by `make conformance` and is never hand-edited. `docs/semantic-data-system/compiler-diagnostics.md` is generated only by `scripts/build-compiler-docs.mjs`. The `spec/tests.md` execution summary is generated only by `scripts/test-matrix-summary.mjs`.
- Nothing in this bundle edits `schema/`, `fixtures/`, `spikes/`, `packages/`, either lockfile, or `package.json`. Reading them is required; writing them is not permitted.
- Merge sequencing: Tasks 100..115 on `spec/22-typescript-backend`, then `/code-review` and `/gap-analysis`, then the three-state verification, then the mergeable comment. The owner merges.
