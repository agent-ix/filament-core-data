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
contract rather than from the output of any implementation it judges, and SHALL
produce byte-identical oracle verdicts, harness reports, and coverage accounts
for identical inputs.

## Scope

- Applies to: `conformance/**`, the oracle, the harness, and every case file.
- Judged implementations: the issue #4 prototype emitter, the issue #19 compiler frontend, and the issue #21, #22, and #23 backends.
- Operational context: offline, no network, no clock read, no locale-sensitive comparison, and no dependence on the working directory.

## Rationale

An oracle written by the implementer of the thing it checks is not an oracle.
The only defect class this corpus exists to catch — every implementation wrong
in the same direction — is invisible to any evidence captured by running one of
them. Determinism is the second half: a corpus whose expectations shift with
locale, path, or ordering cannot tell a regression from an environment.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Cases with `blessedFromRun: true` and no reviewed `blessing` block | 0 | 0 | Corpus gate |
| Cases with no `derivedFrom` entry resolving to a contract artifact | 0 | 0 | Corpus gate |
| Byte differences between two oracle runs over the corpus | 0 | 0 | Repeat-run comparison |
| Byte differences between two harness reports over an unchanged corpus | 0 | 0 | Repeat-run comparison |
| Byte differences in the report under `LC_ALL=tr_TR.UTF-8` and `LC_ALL=C` | 0 | 0 | Locale-varied run |
| Byte differences in the report when run from a different working directory | 0 | 0 | Directory-varied run |
| Oracle imports of a judged implementation | 0 | 0 | Static import analysis |
| Reads of the clock, network, environment, or a path outside `conformance/` and `schema/` in the oracle | 0 | 0 | Static analysis |

## Verification

Run the oracle and the harness twice, once under a Turkish locale and once from
a different working directory, and compare bytes. Statically analyse the
oracle's imports and its use of clock, network, environment, and filesystem
APIs. Read every case's `derivedFrom` and confirm the quoted text occurs in the
named contract artifact.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-015-AC-1 | Every case's `derivedFrom` quote occurs verbatim in the named contract artifact and no case is blessed from a run. | Test |
| NFR-015-AC-2 | Oracle verdicts, harness reports, and the coverage account are byte-identical across two runs, across `tr_TR.UTF-8` and `C`, and across two working directories. | Test |
| NFR-015-AC-3 | Static analysis reports zero oracle imports of `spikes/`, `src/`, `test/`, `tests/`, or `conformance/adapters/`, and zero clock, network, or environment reads. | Analysis |
| NFR-015-AC-4 | Where the corpus disagrees with a merged implementation in this repository, the disagreement is recorded in `conformance/divergences.json` with its owning issue rather than resolved by changing the expected result. | Inspection |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [FR-035](../functional/FR-035-define-the-conformance-corpus.md)
- **Downstream**: issue #19, issues #21..#23, issue #11 publication gate
