---
id: FR-039
title: "Account for corpus coverage, declare promotion thresholds, and publish the import API"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-038"
    type: "depends_on"
---
# [FR-039] Account for corpus coverage, declare promotion thresholds, and publish the import API

## Description

The conformance corpus SHALL publish a machine-readable coverage account, the
promotion thresholds it proposes to each backend's owning issue, and one stable
import surface through which a downstream repository consumes cases, bases, and
oracle verdicts without copying them.

## Inputs

- The construct register and the case set (FR-038)
- The differential run report and the adapter registry (FR-037)
- The promotion boundary of `docs/semantic-data-system/contracts-v1.md` and the issue #11 publication gate

## Outputs

- `conformance/coverage.json`: the generated coverage account — per register row, the case ids by class, the adapters that answered, the unmet rows, and the unmet areas
- `conformance/thresholds.json`: the proposed promotion thresholds and their owning issues
- `conformance/mutations.json`: the committed mutation catalogue
- `conformance/oracle/index.mjs`: the import API

## Behavior

- The harness SHALL regenerate `conformance/coverage.json` on every run.
- If the regenerated coverage account differs from the committed one, then the coverage gate SHALL fail and name the differing rows.
- The coverage account SHALL report, per register row, the case ids by class, each adapter's verdict count, and each adapter's unmet count.
- The coverage account SHALL report a register row with zero cases as an unmet row rather than omitting it.
- The coverage account SHALL report, as an unmet area with its owning issues, every deliverable the corpus does not cover, including cross-language generated-package serialization parity.
- The coverage account SHALL exclude every value that varies with the machine, the clock, or the environment, so that two runs on different hosts produce the same bytes.
- `conformance/thresholds.json` SHALL declare, for each of Rust (issue #21), TypeScript (issue #22), Python (issue #23), and the compiler frontend (issue #19), the proposed construct-register coverage, corpus pass rate, permitted count of declared divergences, and mutation-detection score, each with the issue that owns the decision.
- `conformance/thresholds.json` SHALL record each threshold row's status as `proposed` until its owning issue accepts it, so that this issue proposes and does not impose.
- If a threshold row names an adapter absent from the registry, or the registry names an adapter absent from the thresholds, then the threshold gate SHALL fail and name the adapter.
- The corpus SHALL declare its mutation-detection score as the fraction of the committed mutation catalogue that at least one case detects, where a mutation is a named, reproducible change to a base bundle that the contract forbids.
- The corpus SHALL record that the mutation score measures the corpus and the oracle together, and that it is reported per backend only as the score the backend is judged under.
- The mutation catalogue SHALL contain at least one mutation per construct-register family.
- If the corpus fails to detect a catalogued mutation, then the mutation gate SHALL fail and name that mutation.
- The import API SHALL export `corpusVersion`, `loadCorpus()`, `listCases(filter)`, `loadCase(id)`, `buildInput(case)`, `oracleVerdict(case)`, and `compare(case, adapterResult)`.
- The import API SHALL resolve corpus paths relative to its own module location, so that a consumer needs no particular working directory.
- The import API SHALL return a deep copy from every loader, so that a consumer mutating a returned value cannot affect a later load.
- The import API SHALL remain additive across a minor `corpusVersion` change.
- The corpus SHALL NOT remove an export, or give one an incompatible signature, without a major `corpusVersion` bump.
- `corpusVersion` SHALL be the only version a consumer pins for corpus content.
- The npm package version SHALL govern the published package alone, never the corpus content.
- If a consumer requests a case id the corpus does not declare, then `loadCase` SHALL throw an error naming the id and the `corpusVersion`.
- The corpus SHALL NOT require a consumer to copy a case, a base, or an expected result into its own repository.
- This issue SHALL NOT add the corpus to the published package's `exports` or `files`, because enlarging the published surface belongs to the issue #11 publication gate.
- `conformance/README.md` SHALL record the import path a consumer uses today and name issue #11 as the owner of publishing it.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-039-CON-1 | The harness SHALL generate `coverage.json`, and the coverage gate compares a fresh generation with the committed file so that a hand edit fails. | Reproducibility | Test |
| FR-039-CON-2 | The import API SHALL expose no mutable reference to corpus data, so that a consumer mutating a returned case cannot affect a later load. | Integrity | Test |
| FR-039-CON-3 | The mutation catalogue SHALL be committed and fixed, so that a score cannot be raised by removing a mutation. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-039-AC-1 | Regenerating `coverage.json` reproduces the committed file byte-for-byte; adding a case without regenerating fails the gate. | Test |
| FR-039-AC-2 | `thresholds.json` declares a `proposed` row for each of issues #19, #21, #22, and #23, each naming its coverage, pass-rate, divergence, and mutation-score thresholds and its owning issue. | Test |
| FR-039-AC-3 | Every mutation in the committed catalogue is detected by at least one case; suppressing one detecting case drops the score and fails the gate. | Test |
| FR-039-AC-4 | The mutation catalogue carries at least one mutation for every construct-register family. | Test |
| FR-039-AC-5 | A consumer importing `conformance/oracle/index.mjs` from a different working directory loads the corpus, builds an input, and obtains an oracle verdict. | Test |
| FR-039-AC-6 | `loadCase` on an unknown id throws an error naming the id and the corpus version, and mutating a returned case does not affect a later load. | Test |
| FR-039-AC-7 | A registry adapter with no threshold row, and a threshold row with no registry adapter, each fail the gate. | Test |
| FR-039-AC-8 | `package.json` gains no `exports` entry and no `files` entry for `conformance/`, and the coverage account names cross-language serialization parity as an unmet area with its owning issues. | Analysis |
| FR-039-AC-9 | The coverage account is byte-identical when regenerated from a different working directory and under a different locale. | Test |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-038](./FR-038-cover-every-ir-construct-and-compatibility-rule.md)
- **Downstream**: issue #11 publication gate, issues #19, #21, #22, #23, `agent-ix/quire-contract-ir#52`
