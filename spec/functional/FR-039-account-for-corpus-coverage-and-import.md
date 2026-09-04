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
promotion thresholds each backend has to meet, and one stable import surface
through which a downstream repository consumes cases, bases, and oracle verdicts
without copying them.

## Inputs

- The construct register and the case set (FR-038)
- The differential run report and the adapter registry (FR-037)
- The promotion boundary of `docs/semantic-data-system/contracts-v1.md` and the issue #11 publication gate

## Outputs

- `conformance/coverage.json`: the generated coverage account — per register row, the case ids by class, the adapters that answered, and the unmet rows
- `conformance/thresholds.json`: the declared promotion thresholds and their owning issues
- `conformance/oracle/index.mjs`: the import API
- A `./conformance` subpath export in `package.json` and the `conformance/` directory in the published `files` list

## Behavior

- The harness SHALL regenerate `conformance/coverage.json` on every run.
- If the regenerated coverage account differs from the committed one, then the coverage gate SHALL fail and name the differing rows.
- The coverage account SHALL report, per register row, the case ids by class, each adapter's verdict count, and each adapter's unmet count.
- The coverage account SHALL report a register row with zero cases as an unmet row rather than omitting it.
- `conformance/thresholds.json` SHALL declare, for each of Rust (issue #21), TypeScript (issue #22), Python (issue #23), and the compiler frontend (issue #19), the required construct-register coverage, the required corpus pass rate, the permitted count of declared divergences, and the required mutation-detection score, each with the issue that owns it.
- The corpus SHALL declare a backend's thresholds before that backend is promoted.
- If a threshold row names an adapter absent from the registry, or the registry names an adapter absent from the thresholds, then the threshold gate SHALL fail and name the adapter.
- The corpus SHALL declare its mutation-detection score as the fraction of a fixed, committed mutation catalogue that the corpus detects, where each mutation is a named, reproducible change to a document that the contract forbids.
- The mutation catalogue SHALL contain at least one mutation per construct-register family.
- If the corpus fails to detect a catalogued mutation, then the mutation gate SHALL fail and name that mutation.
- The import API SHALL export `corpusVersion`, `loadCorpus()`, `listCases(filter)`, `loadCase(id)`, `buildInput(case)`, `oracleVerdict(case)`, and `compare(case, adapterResult)`.
- The import API SHALL resolve corpus paths relative to its own module location, so that a consumer needs no particular working directory.
- The import API SHALL remain additive across a minor `corpusVersion` change.
- The corpus SHALL NOT remove an export, or give one an incompatible signature, without a major `corpusVersion` bump.
- If a consumer requests a case id the corpus does not declare, then `loadCase` SHALL throw an error naming the id and the `corpusVersion`.
- The corpus SHALL NOT require a consumer to copy a case, a base, or an expected result into its own repository.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-039-CON-1 | The harness SHALL generate `coverage.json`, and the coverage gate compares a fresh generation with the committed file so a hand edit fails. | Reproducibility | Test |
| FR-039-CON-2 | The import API SHALL expose no mutable reference to corpus data, so that a consumer mutating a returned case cannot affect a later load. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-039-AC-1 | Regenerating `coverage.json` reproduces the committed file byte-for-byte; adding a case without regenerating fails the gate. | Test |
| FR-039-AC-2 | `thresholds.json` declares a row for each of issues #19, #21, #22, and #23, each naming its coverage, pass-rate, divergence, and mutation-score thresholds and its owning issue. | Test |
| FR-039-AC-3 | Every mutation in the committed mutation catalogue is detected by at least one corpus case; suppressing one case that detects a mutation drops the score and fails the gate. | Test |
| FR-039-AC-4 | The mutation catalogue carries at least one mutation for every construct-register family. | Test |
| FR-039-AC-5 | A consumer importing `@agent-ix/filament-core-data/conformance` from a different working directory loads the corpus, builds an input, and obtains an oracle verdict. | Integration |
| FR-039-AC-6 | `loadCase` on an unknown id throws an error naming the id and the corpus version; mutating a returned case does not affect a later load. | Test |
| FR-039-AC-7 | A registry adapter with no threshold row, and a threshold row with no registry adapter, each fail the gate. | Test |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-038](./FR-038-cover-every-ir-construct-and-compatibility-rule.md)
- **Downstream**: issue #11 publication gate, issues #19, #21, #22, #23, `agent-ix/quire-contract-ir#52`
