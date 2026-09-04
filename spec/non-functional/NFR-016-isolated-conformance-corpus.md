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

The issue #20 change set SHALL change no prototype, compiler source,
semantic-core package, frozen fixture, published schema, lockfile, consumer, or
repository owned by another project.

## Scope

- Permitted: `conformance/**`, `spec/**`, `plan/**`, `reviews/**`, `spec/reviews/**`, `test/conformance-corpus.test.ts`, `tests/test_conformance_corpus.py`, `Makefile` (new targets only), and `package.json` (a `conformance` script only).
- Prohibited: `/spikes/**`, `/src/**`, `/packages/**`, `/schema/**`, `/fixtures/**`, `/docs/**`, `/agent_ix_core_data/**`, `/pnpm-lock.yaml`, `/poetry.lock`, `/pyproject.toml`, `/biome.json`, `/tsconfig*.json`, `/.github/**`, generated language packages, catalog pins, and any file in another repository.
- The `schema/**` prohibition is anchored at the repository root and does not reach `conformance/schema/**`, which this issue owns.

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
| Changed paths outside the permitted list | 0 | 0 | Changed-path gate |
| Files changed under `/spikes/`, `/src/`, `/packages/`, `/schema/`, `/fixtures/`, `/docs/` | 0 | 0 | Changed-path gate |
| Lockfile changes (`pnpm-lock.yaml`, `poetry.lock`) | 0 | 0 | Changed-path gate |
| New runtime or development dependencies | 0 | 0 | Manifest diff |
| `package.json` `exports` or `files` entries added | 0 | 0 | Manifest diff |
| Workflow files changed | 0 | 0 | Changed-path gate |
| Conformance entry points outside `make test` and `make conformance` | 0 | 0 | Makefile and script inspection |

## Verification

Diff the branch against `main` and classify every changed path against the
permitted list. Diff `package.json` and `pyproject.toml` for added dependencies
and for `exports` or `files` entries. Confirm the conformance suites run from
`make test` and `poetry run pytest` with the network unavailable.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-016-AC-1 | The branch changes no file under `/spikes/`, `/src/`, `/packages/`, `/schema/`, `/fixtures/`, `/docs/`, `/.github/`, and no lockfile. | Analysis |
| NFR-016-AC-2 | The change adds no dependency to `package.json` or `pyproject.toml`, and no `exports` or `files` entry. | Analysis |
| NFR-016-AC-3 | The conformance suites run from `make test` and `poetry run pytest` with no network connection and no clock read. | Test |
| NFR-016-AC-4 | A changed-path and manifest analysis shows the change publishes no package and alters no consumer, catalog pin, or Avro contract. | Analysis |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md)
- **Downstream**: issue #27, issue #19, issue #11
