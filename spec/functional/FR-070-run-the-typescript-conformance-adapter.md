---
id: FR-070
title: "Run the TypeScript backend against the conformance corpus"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-070] Run the TypeScript backend against the conformance corpus

## Description

The `typescript-backend` slot of `conformance/adapters/registry.json` SHALL
become available and SHALL answer every corpus case from the backend's own
computation in agreement with the independent oracle, so that the backend's
agreement is the acceptance evidence for this work rather than any golden the
work produced.

The slot exists already. Issue #20 declared four of them, wrote the result
contract and the comparison, and deliberately implemented no adapter: its
registry says in as many words that supplying the command and the result emitter
is the owning issue's obligation. That obligation is this one. Until it is
discharged the harness synthesises `support: "unavailable"` for all 111 cases
and records 111 unmet rows and zero passes against issue #22 — the correct
reading of a backend that does not exist, and an unmet row rather than a gap in
the corpus.

The one thing an adapter must not do is derive its answer from the oracle. An
adapter that calls `oracleVerdict` agrees with the oracle on every case and
demonstrates nothing about the backend, which is the failure mode the whole
independent-corpus design exists to prevent.

Agreement is stated here as an obligation and not only as a threshold row. A
requirement that says only "record a disagreement" is satisfied by an adapter
that disagrees with every case and records 111 disagreements, and a promotion
threshold left `proposed` cannot close that hole because a proposed threshold
gates nothing. So this requirement obliges the agreement itself, and separately
obliges honesty about how the agreement was reached.

## Inputs

- The committed corpus: `conformance/corpus.json`, `conformance/bases/`, and the 111 cases under `conformance/cases/`
- The declared import API of `conformance/oracle/index.mjs`: `loadCorpus`, `loadCase`, `listCases`, `loadManifest`, `buildInput`, and `buildBefore`
- `conformance/schema/adapter-result.schema.json`, the result contract
- The backend's own decision modules: `admitIr` and `representability` ([FR-068](./FR-068-decide-and-report-ir-admissibility.md)), `normalizeIrForTarget` and `classifySurface` ([FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md)), and the generated validators ([FR-066](./FR-066-generate-runtime-validators.md))

## Outputs

- `conformance/adapters/typescript-backend/adapter.mjs`, the result emitter the harness spawns
- The rewritten `typescript-backend` row of `conformance/adapters/registry.json`, carrying `status: "available"`, a `command`, and a rationale naming what now exists
- The regenerated `conformance/coverage.json`
- The discharged TypeScript half of the FR-042-CON-3 qualification limitation in `src/compiler/inventory.json`
- The measured conformance figures, including the first-run divergence count, recorded in `spec/tests.md`

## Behavior

### The registry row

- The `typescript-backend` row SHALL carry `status: "available"`.
- The `typescript-backend` row SHALL carry a `command` whose first element is `node` and whose remaining elements resolve from the harness's working directory, which is `conformance/` and not the repository root.
- The `typescript-backend` row's `rationale` SHALL be rewritten to describe the backend that now exists rather than the absence that used to.
- The `typescript-backend` row SHALL keep `pointerCompatible: true`, because this backend locates by the same RFC 6901 scheme the oracle uses.
- No other row of the registry SHALL be changed, so the `compiler-frontend`, `rust-backend`, and `python-backend` slots stay exactly as their owning issues left them.

### The adapter

- The adapter SHALL write one JSON array to standard output carrying one `conformance/schema/adapter-result.schema.json` document per corpus case.
- The adapter SHALL exit `0` whatever verdicts it computed, because a non-zero exit is read by the harness as an adapter failure rather than as a case failure.
- The adapter SHALL read the corpus only through the declared import API of `conformance/oracle/index.mjs`.
- The adapter SHALL take each result's `caseDigest` from the corpus manifest rather than recomputing it from bytes it chose, so a case it misread cannot be made to agree with itself.
- The adapter SHALL compute `resultState` and `diagnostics` from `admitIr`.
- The adapter SHALL compute `normalized` from `normalizeIrForTarget`.
- For a case whose `kind` is `compatibility`, the adapter SHALL compute `classification` from `classifySurface` over the `before` and `after` bundles.
- The adapter SHALL carry no suppression from `admitIr` into its result, because a suppression is a record that a rule did not run and the result contract admits no member for one.
- The adapter SHALL answer `support: "supported"` for every corpus case.
- The adapter SHALL NOT call `oracleVerdict` or `compare`.
- The adapter SHALL NOT import `conformance/oracle/oracle.mjs`, `conformance/oracle/schema-layer.mjs`, or `conformance/corpus.mjs`.
- The adapter SHALL declare an `adapterVersion` that moves whenever any of the backend's decision modules changes a verdict it produces.
- The adapter SHALL read no clock, no environment variable, and no network, so its output is a function of the corpus and the backend alone.
- The adapter SHALL produce byte-identical output on two consecutive runs, from a different working directory, and under a different locale.

### Agreement

- The adapter's answer SHALL match the oracle's verdict for every one of the 111 corpus cases, on `resultState`, on the ordered diagnostic list, on `normalized`, and on `classification` where the case is a compatibility case.
- The harness SHALL report zero unsuppressed divergences for the `typescript-backend` slot.
- An adapter that answers every case and disagrees with the oracle SHALL NOT satisfy this requirement, whatever it records about the disagreement.
- Agreement SHALL be obliged here rather than left to `conformance/thresholds.json`, because the `typescript-backend` threshold row stays `proposed` and a proposed threshold gates nothing.

### What an unmet answer means

- An `unavailable` answer from a slot registered `available` SHALL be treated by this requirement as a failure rather than as an unmet row, and this adapter emits none.
- An `unsupported` answer SHALL be admissible only where the case's own `unsupportedBy` array declares this adapter.
- This requirement SHALL NOT add an `unsupportedBy` entry to any case, because declaring a case unsupported to avoid answering it converts a failing row into a silent one.

### Disagreement

- This work SHALL register no entry in `conformance/divergences.json`.
- A registered divergence converts a failing case into a matched one, and an unbounded permission to register divergences is a permission to pass, so a disagreement this work cannot close SHALL be left failing rather than suppressed.
- Where a disagreement remains at the end of the work, the pull request SHALL name the case, the member that disagreed, both values, and which side this work believes is wrong, and the owner SHALL disposition it.
- A disagreement SHALL NOT be resolved by editing a corpus case, a base, the oracle, the harness, or a threshold.
- The `typescript-backend` row of `conformance/thresholds.json` SHALL remain `proposed` with the measured figures reported against it rather than written into it, because accepting a promotion threshold is an act of the publication gate rather than of this ticket.
- That row permits zero divergences while the `rust-backend` row permits one for the RE2 locus-pattern gap GAP-002, and this requirement SHALL record the asymmetry as the corpus's own proposal rather than treat either figure as a gate it has accepted.
- Because no divergence is available to this slot even as a proposal, a disagreement arising from an open contract question SHALL be reported to the owner rather than suppressed, which is the same disposition as any other disagreement.

### Disclosed independence

- The first complete run of the adapter over the corpus SHALL be measured before any fix is made to the backend, and the number of cases that disagreed on that run SHALL be recorded in `spec/tests.md` as the first-run divergence count.
- The first-run divergence count SHALL be reported beside the final figure, because after the first run every change to the backend is a change made with the oracle's answer in hand, and the first count is the only measure of how much of the agreement was reached independently.
- The count of admissibility rules the [FR-068](./FR-068-decide-and-report-ir-admissibility.md) derivation ledger attributes to the corpus register rather than to a published clause SHALL be reported beside it.
- `mutationDetectionScore` SHALL NOT be adopted as a gate for this slot, because `mutationScore()` in `conformance/runner/differential.mjs` computes detection from `oracleVerdict(...)` and therefore scores the oracle rather than any adapter, and no per-adapter form of it exists to run.
- This requirement SHALL say plainly that neither disclosure proves independence, because transcription of `conformance/oracle/oracle.mjs` is not detectable by any check this repository can run, and an undetectable property is better disclosed than asserted.

### Generation over the corpus

- For every case the backend admits, generation SHALL produce a package that typechecks under the generated-package TypeScript configuration of [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md).
- Every generated package produced from the corpus SHALL be typechecked as one TypeScript program rather than one process per case, so the obligation costs one compilation and not seventy.
- For a case the backend refuses on representability, generation SHALL emit no file, because the committed `typescript` target contract sets `unsupportedFeaturePolicy` to `fail`.
- This requirement SHALL NOT claim that a corpus case supplies an instance payload, because `conformance/schema/input-bundle.schema.json` is `additionalProperties: false` over `ir`, `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, and carries no instance of a declared type.
- Instance-level evidence for the generated validators SHALL be the authored instance corpus and its second-validator differential of [FR-066](./FR-066-generate-runtime-validators.md), and this requirement SHALL cite that evidence rather than restate it.

### Accounting

- `conformance/coverage.json` SHALL be regenerated and committed with the run that makes the slot available.
- The regenerated `coverage.json` SHALL record the `typescript-backend` row's `unmet` falling from 111 to 0 and its `matched` rising to 111.
- The regenerated `coverage.json` SHALL record a corpus-wide `unmetCases` total 111 lower than the total the committed account carried immediately before this change.
- No acceptance criterion of this requirement SHALL name a whole-corpus absolute, because `conformance/coverage.json` carries one row per adapter and issues #21 and #23 each flip their own row in the same window, so an absolute encodes a merge order that nobody controls and fails the branch that merges second for work it did not do.
- `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`, `src/compiler/inventory.json`, and the `spec/tests.md` execution summary are machine-generated or shared with issues #21 and #23, and on rebase they SHALL be regenerated from the rebased tree rather than merged hunk by hunk.
- `agent-ix/filament-core-data#63` records that three concurrent backend tickets each regenerate those four artifacts and asks for a reconciliation owner, and this requirement SHALL cite it rather than assume a merge order.
- `spec/tests.md` SHALL record the measured pass count, the measured divergence count, the first-run divergence count, and what each number counts, rather than a claim that the corpus passes.
- The `typescript-backend` component of `src/compiler/inventory.json` SHALL have its FR-042-CON-3 limitation discharged for the conformance-corpus clause only, leaving the property and fuzz, release compatibility matrix, and downstream adoption clauses as written.
- The `rust-serde-backend` component of `src/compiler/inventory.json` SHALL be left byte-unchanged, because its limitation is discharged by issue #21.

### Corpus isolation

- This requirement SHALL change no byte under `conformance/cases/`, `conformance/bases/`, `conformance/oracle/`, or `conformance/runner/`.
- This requirement SHALL change no byte of `conformance/corpus.json`, `conformance/thresholds.json`, `conformance/defects.json`, `conformance/contract-gaps.json`, `conformance/diagnostic-codes.json`, `conformance/mutations.json`, or `conformance/divergences.json`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-070-CON-1 | The adapter SHALL derive no member of its answer from the oracle, so a static check finds no reference to `oracleVerdict` or `compare` in the adapter or in any module it reaches. | Correctness | Static analysis |
| FR-070-CON-2 | The corpus SHALL NOT be edited to make the backend agree with it; the permitted edits are the registry row and the regenerated coverage account, and nothing else under `conformance/`. | Integrity | Change-set diff |
| FR-070-CON-3 | A measured disagreement SHALL be left failing and reported to the owner rather than suppressed by a divergence entry, because a suppressed case counts as matched and this work registers none. | Integrity | Test |
| FR-070-CON-4 | This requirement SHALL neither publish a package nor move a consumer, because the corpus run is evidence for the publication gate and not a substitute for it. | Safety | Registry inspection |
| FR-070-CON-5 | The adapter SHALL be reached as a process and never imported by the harness, which is the isolation TC-310 already asserts. | Maintainability | Static analysis |
| FR-070-CON-6 | Every figure this requirement claims SHALL be read from the regenerated coverage account rather than restated in prose, so the account and the claim cannot drift apart. | Integrity | Test |
| FR-070-CON-7 | No acceptance criterion SHALL name a whole-corpus absolute; a criterion states this slot's own delta, so a sibling backend landing first cannot falsify it. | Maintainability | Analysis |
| FR-070-CON-8 | The implementer SHALL measure the first-run divergence count before making the first fix, and never again afterwards, because a count taken after tuning measures nothing. | Integrity | Manual |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-070-AC-1 | `make conformance` runs the `typescript-backend` command over all 111 cases and the harness reports no `adapter`, `unknown-case`, `duplicate-answer`, `case-digest`, or `missing-answer` problem. | Integration |
| FR-070-AC-2 | Every document the adapter emits validates against `conformance/schema/adapter-result.schema.json`. | Test |
| FR-070-AC-3 | The adapter answers `support: "supported"` for all 111 cases and `unavailable` for none. | Test |
| FR-070-AC-4 | The measured match count, failure count, and divergence count are recorded in `spec/tests.md` with the command that produced them, and a claimed figure that the regenerated coverage account contradicts fails the suite. | Analysis |
| FR-070-AC-5 | The adapter source, and the transitive module set it imports, contain no reference to `oracleVerdict`, `compare`, `conformance/oracle/oracle.mjs`, `conformance/oracle/schema-layer.mjs`, or `conformance/corpus.mjs`. | Static |
| FR-070-AC-6 | Replacing the backend's admissibility answer with the oracle's makes at least one deliberately seeded backend defect invisible, demonstrating that the independence constraint is load-bearing. | Test |
| FR-070-AC-7 | Two consecutive adapter runs, one from a different working directory and one under `LC_ALL=tr_TR.UTF-8`, produce byte-identical output. | Integration |
| FR-070-AC-8 | The regenerated `conformance/coverage.json` reproduces from a fresh run byte for byte; its `typescript-backend` row records `matched` 111 and `unmet` 0; and its corpus-wide `unmetCases` total is exactly 111 lower than the total the account carried at this change's base commit. | Snapshot |
| FR-070-AC-9 | `conformance/cases/**`, `conformance/bases/**`, `conformance/oracle/**`, `conformance/runner/**`, `conformance/corpus.json`, `conformance/thresholds.json`, `conformance/defects.json`, `conformance/contract-gaps.json`, `conformance/diagnostic-codes.json`, `conformance/mutations.json`, and `conformance/divergences.json` are byte-unchanged in this change's own path set. | Analysis |
| FR-070-AC-10 | Every case the backend admits generates a package, and all of those packages typecheck as one program under the generated-package configuration with no error. | Compile |
| FR-070-AC-11 | The harness reports 111 matched cases and zero unsuppressed divergences for the `typescript-backend` slot, and a single seeded backend defect reduces the matched count. | Integration |
| FR-070-AC-12 | A case the backend refuses on representability produces no generated file and a diagnostic naming the construct. | Test |
| FR-070-AC-13 | A seeded disagreement, run against an injected divergence register rather than the committed one, appears in the harness report as a divergence with an owner and a verdict; and removing the seeded defect while leaving that injected divergence registered fails the run. | Test |
| FR-070-AC-14 | The `compiler-frontend`, `rust-backend`, and `python-backend` registry rows and the `rust-serde-backend` inventory component are byte-unchanged. | Analysis |
| FR-070-AC-15 | The `typescript-backend` inventory limitation names the discharged conformance clause and retains the property and fuzz, compatibility matrix, and downstream adoption clauses. | Test |
| FR-070-AC-16 | No package was published to any registry by this work. | Manual |
| FR-070-AC-17 | `spec/tests.md` records the first-run divergence count, the final divergence count, and the count of FR-068 ledger entries derived from the corpus register rather than from a published clause, each labelled with what it counts. | Analysis |
| FR-070-AC-18 | `conformance/divergences.json` is byte-unchanged, and a run that registers a divergence for this slot fails the change-set gate. | Analysis |
| FR-070-AC-19 | The adapter's `adapterVersion` changes when a backend decision module changes a verdict, asserted by a test that mutates a decision and observes both the verdict and the declared version move. | Unit |
| FR-070-AC-20 | No acceptance criterion or Behavior statement of this requirement claims an absolute value for the corpus-wide `unmetCases` total or for any adapter row this issue does not own, asserted by a check over this requirement's own text. | Static |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md)
- **Downstream**: issue #11 (publication), issue #52 (the `compiler-frontend` slot, which this requirement neither wires nor blocks)
- **Constrained by**: [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Concurrent tickets**: issues #21 and #23 own the `rust-backend` and `python-backend` slots and regenerate the same `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md`, and `src/compiler/inventory.json`. This requirement states every figure as its own slot's delta so that merge order cannot falsify it, and regenerates rather than merges those artifacts on rebase.
- **Open contract questions**: GAP-011, the unstated resolution rule for a `reference` target, names `agent-ix/filament-core-data#9` as its owner and that issue is closed, so it has no live decider; `agent-ix/filament-core-data#59` records that and asks for one. This adapter answers cases REF-001..004 under the `strict` default of [FR-068](./FR-068-decide-and-report-ir-admissibility.md), which is conformance with the corpus's published reading and not a ruling on the contract. When a live owner settles GAP-011 the other way, those four rows move with a `corpus-defect` verdict and this backend follows by one edit. The contract-version round-trip rule of [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), recorded as `agent-ix/filament-core-data#64`, is a second point where a measured disagreement is reported to the owner rather than absorbed. `agent-ix/filament-core-data#61` and `agent-ix/filament-core-data#62`, which FR-068 cites, bear on the diagnostic comparison this adapter's answers are keyed on.
