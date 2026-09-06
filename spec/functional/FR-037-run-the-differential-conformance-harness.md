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
with another implementation's result, and that fails on any divergence the
divergence register does not record.

## Inputs

- The corpus and the oracle (FR-035, FR-036)
- `conformance/adapters/registry.json`: the declared adapter roster — `id`, `language`, `owningIssue`, `status`, `pointerCompatible`, and, when runnable, the command that produces its results
- `conformance/divergences.json`: the divergence register
- `conformance/contract-gaps.json`: the register of disagreements with the published contract or with a merged artifact that is not an adapter

## Outputs

- `conformance/runner/differential.mjs`: the harness
- A run report `{ corpusVersion, adapters[], cases[], unmet[], divergences[], exitCode }` written to stdout as JSON and rendered as a table
- A non-zero exit code on any undeclared divergence, unreproduced register entry, or failed adapter

## Behavior

- The harness SHALL obtain each adapter's result as an `adapter-result.schema.json` document carrying `adapter`, `adapterVersion`, `caseId`, `caseDigest`, `support`, `resultState`, `diagnostics[]`, `classification`, and `normalized`.
- The harness SHALL reject an adapter result whose `caseDigest` differs from the corpus manifest's digest for that case, so that an adapter cannot answer for an input it did not read.
- The harness SHALL compare an adapter result only with the oracle verdict for the same case.
- The harness SHALL NOT compare one adapter result with another adapter result.
- The harness SHALL evaluate `support` before `resultState`, so that the two vocabularies cannot both decide one case.
- The harness SHALL treat an adapter result whose `support` is `supported` as matching only when its `resultState` equals the oracle's, its ordered sequence of diagnostic `code`, `severity`, and `locus` equals the oracle's, its `classification` equals the oracle's for a `compatibility` case, and its `normalized` bytes equal the oracle's.
- The harness SHALL additionally compare the ordered diagnostic `pointer` sequence when the registry declares that adapter `pointerCompatible`, so that an adapter that locates by a different but valid pointer scheme is not failed for the scheme.
- The harness SHALL accept `support: "unsupported"` only when the case declares that adapter in `unsupportedBy` with an owning issue.
- The harness SHALL report every other `unsupported` result as a failure naming the case and the adapter.
- The harness SHALL accept `support: "unavailable"` only when the registry declares that adapter's `status` as `unavailable` with an `owningIssue`.
- The harness SHALL record every accepted `unavailable` result as an unmet row in the run report.
- The harness SHALL NOT count an `unavailable` result as a pass.
- The harness SHALL fail when an adapter whose registry `status` is `available` returns `unavailable` for any case.
- The harness SHALL fail when an adapter returns a result for a case id absent from the corpus, or omits a result for a case id present in it.
- The harness SHALL report each divergence with the case id, the adapter id, the oracle's expected result, the adapter's observed result, and the exact source locus the oracle addressed or, where the oracle emitted nothing, the locus of the node the adapter addressed.
- The harness SHALL suppress a divergence only when `conformance/divergences.json` carries an entry matching the case id, the adapter id, and the diagnostic code, with an `owningIssue`, an `owner`, a `severity`, a `verdict` of `implementation-defect`, `corpus-defect`, or `contract-gap`, a `rationale`, and a `reviewBy` date.
- The harness SHALL fail when the divergence register carries an entry that the run does not reproduce, so that a fixed defect cannot stay suppressed.
- The harness SHALL read no clock, so that its report is a function of the corpus and the adapter results alone.
- A separate audit target SHALL report every divergence entry whose `reviewBy` date has passed.
- The audit target SHALL be the only conformance entry point that reads a clock.
- Tests that seed divergence-register entries SHALL run the real harness or audit in unique scratch repository copies, preserving the corpus's exact predecessor reference and installed toolchain.
- Each divergence-register mutation test SHALL first require the real command to complete successfully on the unchanged register, then observe SIGKILL after a child writes only the copied register and require the intended exit-1 diagnostic.
- Each divergence-register mutation test SHALL compare unchanged source corpus bytes before scratch cleanup without source restoration in teardown.
- The harness SHALL record a disagreement between the oracle and a merged artifact that is not a registered adapter in `conformance/contract-gaps.json`, never in the divergence register.
- The harness SHALL run every adapter over every case in the case order `corpus.json` declares.
- The harness SHALL produce a byte-identical report for two runs over an unchanged corpus and adapter set.
- If an adapter command exits non-zero, or emits a result that fails `adapter-result.schema.json`, then the harness SHALL report that adapter as failed for every case it did not answer.
- If any adapter is reported as failed, then the harness SHALL exit non-zero.
- The harness SHALL NOT write to any path outside `conformance/`.
- The harness SHALL NOT modify a case file, a base bundle, or the corpus manifest.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-037-CON-1 | The registry SHALL declare one adapter slot for the issue #19 compiler frontend and one for each of Rust (issue #21), TypeScript (issue #22), and Python (issue #23), each with its owning issue and its status, whether or not it is runnable today. | Completeness | Analysis |
| FR-037-CON-2 | The harness SHALL obtain every adapter result from a process it starts using that adapter's registry command, never by importing the adapter's internals. | Isolation | Analysis |
| FR-037-CON-3 | The registry SHALL record that supplying an adapter command and an `adapter-result.schema.json` emitter is the owning issue's obligation, not this issue's. | Ownership | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-037-AC-1 | The harness runs the whole corpus against every registered adapter and exits zero on the committed corpus, registry, and divergence register. | Test |
| FR-037-AC-2 | A stub adapter result seeded with an extra, missing, reordered, repointed, relocated, or reclassified diagnostic fails, and the report names the case, the adapter, and the locus. | Test |
| FR-037-AC-3 | Two stub adapters that agree with each other but disagree with the oracle both fail. | Test |
| FR-037-AC-4 | An `unavailable` adapter is an unmet row naming its owning issue and is excluded from the pass count; an `available` adapter returning `unavailable` fails. | Test |
| FR-037-AC-5 | A divergence-register entry that the run does not reproduce fails the run, and the audit target reports an entry whose `reviewBy` date has passed. | Test |
| FR-037-AC-6 | Two consecutive runs over an unchanged corpus produce byte-identical reports, and the harness source contains no clock read. | Test |
| FR-037-AC-7 | An adapter command that exits non-zero, or emits a result failing `adapter-result.schema.json`, produces a non-zero harness exit and a per-case failure rather than a skip. | Test |
| FR-037-AC-8 | An `unsupported` result is accepted only where the case declares that adapter in `unsupportedBy`; an undeclared one fails and names the case and the adapter. | Test |
| FR-037-AC-9 | A source analysis of `conformance/runner/` reports no comparison between two adapter results and no import of an adapter's internals. | Analysis |
| FR-037-AC-10 | An adapter result whose `caseDigest` does not match the manifest is rejected, so a canned result cannot pass. | Test |
| FR-037-AC-11 | A `pointerCompatible: false` adapter that matches on code, severity, locus, classification, and normalized bytes passes despite a different pointer scheme; the same adapter fails on a wrong locus. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-036](./FR-036-implement-the-independent-semantic-oracle.md)
- **Downstream**: issue #19, issue #21, issue #22, issue #23, issue #11
