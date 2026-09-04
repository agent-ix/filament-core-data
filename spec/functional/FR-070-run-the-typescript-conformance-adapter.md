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
computation, so that the backend's agreement with the independent oracle is the
acceptance evidence for this work rather than any golden the work produced.

The slot exists already. Issue #20 declared four of them, wrote the result
contract and the comparison, and deliberately implemented no adapter: its
registry says in as many words that supplying the command and the result emitter
is the owning issue's obligation. That obligation is this one. Until it is
discharged the harness synthesises `support: "unavailable"` for all 111 cases,
and the corpus records 111 unmet rows and zero passes against issue #22 — the
correct reading of a backend that does not exist, and an unmet row rather than a
gap in the corpus.

The one thing an adapter must not do is derive its answer from the oracle. An
adapter that calls `oracleVerdict` agrees with the oracle on every case and
demonstrates nothing about the backend, which is the failure mode the whole
independent-corpus design exists to prevent.

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
- The measured conformance figures recorded in `spec/tests.md`

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
- The adapter SHALL answer `support: "supported"` for every corpus case.
- The adapter SHALL NOT call `oracleVerdict` or `compare`.
- The adapter SHALL NOT import `conformance/oracle/oracle.mjs`, `conformance/oracle/schema-layer.mjs`, or `conformance/corpus.mjs`.
- The adapter SHALL declare an `adapterVersion` that moves when the backend's decisions move.
- The adapter SHALL read no clock, no environment variable, and no network, so its output is a function of the corpus and the backend alone.
- The adapter SHALL produce byte-identical output on two consecutive runs, from a different working directory, and under a different locale.

### What an unmet answer means

- An `unavailable` answer from a slot registered `available` SHALL be treated by this requirement as a failure rather than as an unmet row, and this adapter emits none.
- An `unsupported` answer SHALL be admissible only where the case's own `unsupportedBy` array declares this adapter.
- This requirement SHALL NOT add an `unsupportedBy` entry to any case, because declaring a case unsupported to avoid answering it converts a failing row into a silent one.

### Disagreement

- Where the backend and the oracle disagree, the disagreement SHALL be recorded in `conformance/divergences.json` with an owner, a verdict, and a review date.
- A disagreement SHALL NOT be resolved by editing a corpus case, a base, the oracle, the harness, or a threshold.
- A recorded divergence that the run no longer reproduces SHALL fail the run, so a repaired defect cannot stay suppressed.
- The `typescript-backend` row of `conformance/thresholds.json` SHALL remain `proposed` with the measured figures reported against it rather than written into it, because accepting a promotion threshold is an act of the publication gate rather than of this ticket.

### Generation over the corpus

- For every case the backend admits, generation SHALL produce a package that typechecks under `tsc --noEmit` with the repository's strict configuration.
- For every case the backend admits, the generated validators SHALL accept each positive payload the case supplies.
- For every case the backend admits, the generated validators SHALL reject each negative payload the case supplies.
- For a case the backend refuses on representability, generation SHALL emit no file, because the committed `typescript` target contract sets `unsupportedFeaturePolicy` to `fail`.

### Accounting

- `conformance/coverage.json` SHALL be regenerated and committed with the run that makes the slot available.
- The regenerated `coverage.json` SHALL record 111 fewer unmet cases than the committed 444, leaving 333 across the three slots issues #19, #21, and #23 still own.
- `spec/tests.md` SHALL record the measured pass count, the measured divergence count, and what each number counts, rather than a claim that the corpus passes.
- The `typescript-backend` component of `src/compiler/inventory.json` SHALL have its FR-042-CON-3 limitation discharged for the conformance-corpus clause only, leaving the property and fuzz, release compatibility matrix, and downstream adoption clauses as written.
- The `rust-serde-backend` component of `src/compiler/inventory.json` SHALL be left byte-unchanged, because its limitation is discharged by issue #21.

### Corpus isolation

- This requirement SHALL change no byte under `conformance/cases/`, `conformance/bases/`, `conformance/oracle/`, or `conformance/runner/`.
- This requirement SHALL change no byte of `conformance/corpus.json`, `conformance/thresholds.json`, `conformance/defects.json`, `conformance/contract-gaps.json`, `conformance/diagnostic-codes.json`, or `conformance/mutations.json`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-070-CON-1 | The adapter SHALL derive no member of its answer from the oracle, so a static check finds no reference to `oracleVerdict` or `compare` in the adapter or in any module it reaches. | Correctness | Static analysis |
| FR-070-CON-2 | The corpus SHALL NOT be edited to make the backend agree with it; the permitted edits are the registry row and the regenerated coverage account, and nothing else under `conformance/`. | Integrity | Change-set diff |
| FR-070-CON-3 | The adapter run SHALL record a measured divergence as a divergence rather than absorb it, even where the backend is the side that is wrong. | Integrity | Test |
| FR-070-CON-4 | This requirement SHALL neither publish a package nor move a consumer, because the corpus run is evidence for the publication gate and not a substitute for it. | Safety | Registry inspection |
| FR-070-CON-5 | The adapter SHALL be reached as a process and never imported by the harness, which is the isolation TC-310 already asserts. | Maintainability | Static analysis |
| FR-070-CON-6 | The `unmetCases` figure SHALL be read from the regenerated coverage account rather than restated in prose, so the account and the claim cannot drift apart. | Integrity | Test |

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
| FR-070-AC-8 | The regenerated `conformance/coverage.json` reproduces from a fresh run byte for byte, and records 333 unmet cases against the three slots this issue does not own. | Snapshot |
| FR-070-AC-9 | `conformance/cases/**`, `conformance/bases/**`, `conformance/oracle/**`, `conformance/runner/**`, `conformance/corpus.json`, `conformance/thresholds.json`, `conformance/defects.json`, `conformance/contract-gaps.json`, `conformance/diagnostic-codes.json`, and `conformance/mutations.json` are byte-unchanged in this change's own path set. | Analysis |
| FR-070-AC-10 | Every case the backend admits generates a package that passes `tsc --noEmit` under the repository's strict configuration. | Compile |
| FR-070-AC-11 | Every positive payload a case supplies is accepted and every negative payload is rejected by the generated validators, with no case both accepted and rejected. | Integration |
| FR-070-AC-12 | A case the backend refuses on representability produces no generated file and a diagnostic naming the construct. | Test |
| FR-070-AC-13 | A seeded disagreement between the backend and the oracle appears in the harness report as a divergence with an owner and a verdict, and removing the seeded defect while leaving the divergence registered fails the run. | Test |
| FR-070-AC-14 | The `compiler-frontend`, `rust-backend`, and `python-backend` registry rows and the `rust-serde-backend` inventory component are byte-unchanged. | Analysis |
| FR-070-AC-15 | The `typescript-backend` inventory limitation names the discharged conformance clause and retains the property and fuzz, compatibility matrix, and downstream adoption clauses. | Test |
| FR-070-AC-16 | No package was published to any registry by this work. | Manual |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md)
- **Downstream**: issue #11 (publication), issue #52 (the `compiler-frontend` slot, which this requirement neither wires nor blocks)
- **Constrained by**: [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions**: GAP-011, the unstated resolution rule for a `reference` target, is owned by `agent-ix/filament-core-data#9`. This adapter answers cases REF-001..004 under the `strict` default of [FR-068](./FR-068-decide-and-report-ir-admissibility.md), which is conformance with the corpus's published reading and not a ruling on the contract. If issue #9 settles GAP-011 the other way, those four rows move with a `corpus-defect` verdict and this backend follows by one edit.
