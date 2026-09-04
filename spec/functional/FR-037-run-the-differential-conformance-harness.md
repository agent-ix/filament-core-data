---
id: FR-037
title: "Run the differential conformance harness against declared backend adapters"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "depends_on"
---
# [FR-037] Run the differential conformance harness against declared backend adapters

## Description

The repository SHALL ship a differential harness that compares every declared
implementation's result for every corpus case with the oracle's verdict, never
with another implementation's result, and fails on any divergence that is not
recorded in the divergence register.

## Inputs

- The corpus and the oracle (FR-035, FR-036)
- `conformance/adapters/registry.json`: the declared adapter roster, each with `id`, `language`, `owningIssue`, `status`, and, when runnable, the command that produces its results
- `conformance/divergences.json`: the dated divergence register

## Outputs

- `conformance/runner/differential.mjs`: the harness
- A run report `{ corpusVersion, adapters[], cases[], unmet[], exitCode }` written to stdout as JSON and rendered as a table
- A non-zero exit code on any undeclared divergence, expired divergence, or unmet required row

## Behavior

- The harness SHALL obtain each adapter's result as an `adapter-result.schema.json` document carrying `adapter`, `adapterVersion`, `caseId`, `support`, `resultState`, `diagnostics[]`, and `normalized`.
- The harness SHALL compare an adapter result only with the oracle verdict for the same case.
- The harness SHALL NOT compare one adapter result with another adapter result.
- The harness SHALL treat an adapter result whose `support` is `supported` as matching only when its `resultState` equals the oracle's, its diagnostic `code` and `pointer` sequence equals the oracle's in order, and, for a case whose class is `positive`, its `normalized` bytes equal the oracle's.
- The harness SHALL accept `support: "unsupported"` only when the case declares that adapter in `expected.unsupportedBy` with an owning issue.
- The harness SHALL report every other `unsupported` result as a failure naming the case and the adapter.
- The harness SHALL accept `support: "unavailable"` only when the registry declares that adapter's `status` as `unavailable` with an `owningIssue`.
- The harness SHALL record every accepted `unavailable` result as an unmet row in the run report.
- The harness SHALL NOT count an `unavailable` result as a pass.
- The harness SHALL fail when an adapter whose registry `status` is `available` returns `unavailable` for any case.
- The harness SHALL fail when an adapter returns a result for a case id absent from the corpus, or omits a result for a case id present in it.
- The harness SHALL report each divergence with the case id, the adapter id, the oracle's expected result, the adapter's observed result, and the exact source locus the oracle addressed.
- The harness SHALL suppress a divergence only when `conformance/divergences.json` carries an entry matching the case id, the adapter id, and the diagnostic code, with an `owningIssue`, a `severity`, a `rationale`, and a `reviewBy` date.
- If a matching divergence entry's `reviewBy` date has passed, then the harness SHALL fail and name that entry.
- The harness SHALL fail when the divergence register carries an entry that no run reproduces, so that a fixed defect cannot stay suppressed.
- The harness SHALL run every adapter over every case in a fixed case order taken from `corpus.json`.
- The harness SHALL produce a byte-identical report for two runs over an unchanged corpus and adapter set.
- If an adapter command exits non-zero or emits a result that fails `adapter-result.schema.json`, then the harness SHALL report that adapter as failed for every case it did not answer.
- If any adapter is reported as failed, then the harness SHALL exit non-zero.
- The harness SHALL NOT write to any path outside `conformance/`.
- The harness SHALL NOT modify a case file, a base document, or the corpus manifest.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-037-CON-1 | The registry SHALL declare one adapter per language named by issue #21 (Rust), issue #22 (TypeScript), and issue #23 (Python), and one for the issue #19 compiler frontend, each with its owning issue, whether or not it is runnable today. | Completeness | Test |
| FR-037-CON-2 | The harness SHALL obtain every adapter result from a process it starts using that adapter's registry command, never by importing the adapter's internals. | Isolation | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-037-AC-1 | The harness runs the whole corpus against every registered adapter and exits zero on the committed corpus, adapter set, and divergence register. | Test |
| FR-037-AC-2 | An adapter result seeded with an extra diagnostic, a missing diagnostic, a reordered diagnostic list, or a changed pointer fails, and the report names the case, the adapter, and the locus. | Test |
| FR-037-AC-3 | Two adapters that agree with each other but disagree with the oracle both fail; no comparison in the harness reads a second adapter's result. | Test |
| FR-037-AC-4 | An `unavailable` adapter is reported as an unmet row with its owning issue and is excluded from the pass count; an `available` adapter returning `unavailable` fails. | Test |
| FR-037-AC-5 | A divergence-register entry with a past `reviewBy` date fails the run, and an entry that no run reproduces fails the run. | Test |
| FR-037-AC-6 | Two consecutive runs over an unchanged corpus produce byte-identical reports. | Test |
| FR-037-AC-7 | An adapter command that exits non-zero, or emits a result failing `adapter-result.schema.json`, produces a non-zero harness exit and a per-case failure rather than a skip. | Test |
| FR-037-AC-8 | An `unsupported` result is accepted only for a case declaring that adapter in `expected.unsupportedBy` with an owning issue; an undeclared `unsupported` fails and names the case and the adapter. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-036](./FR-036-implement-the-independent-semantic-oracle.md)
- **Downstream**: issue #19, issue #21, issue #22, issue #23, issue #11
