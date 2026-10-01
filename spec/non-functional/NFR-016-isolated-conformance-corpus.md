---
id: NFR-016
title: "Isolated, non-disruptive conformance corpus"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-039"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-016] Isolated, non-disruptive conformance corpus

## Statement

The conformance corpus SHALL keep every artifact it owns under `conformance/`,
with its entry points reached only through the repository's existing test and
Make targets.

## Scope


## Rationale

Issue #27 is promoting the prototype emitters into `src/` on its own branch and
issue #19 is rewriting the compiler behind it. This ticket runs in parallel
precisely so that the yardstick is not authored by the implementer; that only
holds if the two change sets do not touch the same files. The corpus is also the
gate for the issue #11 publication, so it must not itself publish or enlarge a
consumer surface. Its gates run inside `make test`, which CI already calls, so
no workflow change is needed.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| New runtime or development dependencies | 0 | 0 | Manifest diff |
| Conformance entry points outside `make test` and `make conformance` | 0 | 0 | Makefile and script inspection |

## Verification

Confirm the conformance suites run from
`make test` and `poetry run pytest` with the network unavailable.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-016-AC-2 | `package.json` names no dependency. | Analysis |
| NFR-016-AC-3 | The conformance suites run from `make test` and `poetry run pytest` with no network connection and no clock read. | Test |
| NFR-016-AC-4 | A changed-path and manifest analysis shows the change publishes no package and alters no consumer, catalog pin, or Avro contract. | Analysis |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md)
- **Downstream**: issue #27, issue #19, issue #11
