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
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-016] Isolated, non-disruptive conformance corpus

## Statement

The conformance corpus SHALL live entirely under `conformance/` with its own
tests, and its introduction SHALL change no prototype, compiler source,
semantic-core package, frozen v1 fixture, published schema, consumer, or corpus
repository owned by another project.

## Scope

- Permitted: `conformance/**`, `spec/**`, `plan/**`, `reviews/**`, `spec/reviews/**`, `test/conformance-corpus.test.ts`, `tests/test_conformance_corpus.py`, `Makefile` (new targets only), and `package.json` (a `conformance` script, the `./conformance` export, and the `files` entry).
- Prohibited: `spikes/**`, `src/**`, `packages/**`, `schema/**`, `fixtures/**`, `docs/semantic-data-system/**` other than reading, `pnpm-lock.yaml`, `poetry.lock`, `agent_ix_core_data/**`, generated language packages, catalog pins, and any file in another repository.

## Rationale

Issue #27 is promoting the prototype emitters into `src/` on its own branch and
issue #19 is rewriting the compiler behind it. This ticket runs in parallel
precisely so that the yardstick is not authored by the implementer; that only
holds if the two change sets do not touch the same files. The corpus is also
the gate for issue #11 publication, so it must not itself publish or mutate a
consumer surface.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Changed paths outside the permitted list | 0 | 0 | Changed-path gate |
| Files changed under `spikes/`, `src/`, `packages/`, `schema/`, `fixtures/` | 0 | 0 | Changed-path gate |
| Lockfile changes (`pnpm-lock.yaml`, `poetry.lock`) | 0 | 0 | Changed-path gate |
| New runtime dependencies | 0 | 0 | Manifest inspection |
| Packages published by this change | 0 | 0 | Inspection |
| Corpus repository files changed | 0 | 0 | Changed-path gate |

## Verification

Diff the branch against `main` and classify every changed path against the
permitted list. Inspect `package.json` and `pyproject.toml` for added runtime
dependencies. Confirm no release or publish workflow is triggered.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-016-AC-1 | The branch changes no file under `spikes/`, `src/`, `packages/`, `schema/`, or `fixtures/`, and no lockfile. | Analysis |
| NFR-016-AC-2 | The change adds no runtime dependency to `package.json` or `pyproject.toml`. | Analysis |
| NFR-016-AC-3 | The conformance tests run from `make test` and `poetry run pytest` without a network connection. | Test |
| NFR-016-AC-4 | The change publishes no package and alters no consumer, catalog pin, or Avro contract. | Inspection |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md)
- **Downstream**: issue #27, issue #19, issue #11
