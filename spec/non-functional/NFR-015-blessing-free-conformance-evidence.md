---
id: NFR-015
title: "Blessing-free, deterministic conformance evidence"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: "depends_on"
---
# [NFR-015] Blessing-free, deterministic conformance evidence

## Statement

The conformance corpus SHALL derive every expected result from the published
contract rather than from the output of any implementation it judges.

The conformance corpus SHALL produce byte-identical oracle verdicts, harness
reports, and coverage accounts for identical inputs, across two runs, two
locales, and two working directories.

## Scope

- Applies to: `conformance/**`, the oracle, the harness, the coverage account, and every case file.
- Judged implementations: the issue #4 prototype emitter, the issue #19 compiler frontend, and the issue #21, #22, and #23 backends.
- Operational context: offline, no network, no clock read outside the audit target, no locale-sensitive comparison, and no dependence on the working directory.

## Rationale

An oracle written by the implementer of the thing it checks is not an oracle.
The only defect class this corpus exists to catch — every implementation wrong
in the same direction — is invisible to any evidence captured by running one of
them. Determinism is the second half: a corpus whose expectations shift with
locale, path, or ordering cannot tell a regression from an environment. The
corpus cannot prove its own oracle right, so provenance is the substitute: each
expectation names the clause it was read from, and a reader can check the
derivation without running anything.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Cases with `blessedFromRun: true` and no reviewed `blessing` block | 0 | 0 | Corpus gate |
| Cases with no `derivedFrom` entry whose quote occurs in the named artifact | 0 | 0 | Corpus gate |
| Byte differences between two oracle runs over the corpus | 0 | 0 | Repeat-run comparison |
| Byte differences between two harness reports over an unchanged corpus | 0 | 0 | Repeat-run comparison |
| Byte differences in the report and coverage account under `LC_ALL=tr_TR.UTF-8` and `LC_ALL=C` | 0 | 0 | Locale-varied run |
| Byte differences in the report and coverage account run from a different working directory | 0 | 0 | Directory-varied run |
| Oracle imports of a judged implementation | 0 | 0 | Static import analysis |
| Clock, network, or environment reads in the oracle and the harness | 0 | 0 | Static analysis |
| Divergences resolved by editing an expected result rather than by a register entry | 0 | 0 | Register and diff inspection |

## Verification

Run the oracle and the harness twice, once under a Turkish locale and once from
a different working directory, and compare bytes. Statically analyse the oracle
and the harness for imports of a judged implementation and for clock, network,
environment, and out-of-tree filesystem access. Read every case's `derivedFrom`
and confirm the quoted text occurs in the named artifact. Read the divergence
and contract-gap registers for entries whose rationale does not match the run.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-015-AC-1 | Every case's `derivedFrom` quote occurs verbatim in the named contract artifact, and no case is blessed from a run. | Test |
| NFR-015-AC-2 | Oracle verdicts, harness reports, and the coverage account are byte-identical across two runs, across `tr_TR.UTF-8` and `C`, and across two working directories. | Test |
| NFR-015-AC-3 | Static analysis reports zero oracle or harness imports of `spikes/`, `src/`, `test/`, `tests/`, or `conformance/adapters/`, and zero clock, network, or environment reads outside the audit target. | Analysis |
| NFR-015-AC-4 | Each divergence register entry carries the owner and the verdict that says which side is wrong, and each disagreement with the published contract or a merged non-adapter artifact appears in `conformance/contract-gaps.json` with its owning issue. | Inspection |
| NFR-015-AC-5 | A `corpus-defect` verdict is the only route by which an expected result changes, and it carries the major `corpusVersion` bump FR-035 requires. | Analysis |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [FR-035](../functional/FR-035-define-the-conformance-corpus.md)
- **Downstream**: issue #19, issues #21..#23, issue #11 publication gate
