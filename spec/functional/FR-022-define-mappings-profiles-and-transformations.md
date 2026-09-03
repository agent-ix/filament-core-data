---
id: FR-022
title: "Define mappings, representation profiles, and transformations"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
---
# [FR-022] Define mappings, representation profiles, and transformations

## Description

The v1 contract SHALL define mappings and transformations independently from
target selection. Every representation profile SHALL state authority, edit
direction, preservation, lossiness, provenance, determinism, and effects.

## Behavior

- A mapping SHALL identify source and target type identities, mapping version, named representation, and field/variant/locus correspondences.
- A profile SHALL identify source authority, permitted edit direction, round-trip level, unknown-value policy, allowed omissions, enrichment, and materialization lifetime.
- The preservation vocabulary SHALL distinguish byte-lossless, structure-lossless, semantic-lossless, declared-lossy, and one-way transformations.
- Codec, lens, projection, extraction, rendering, aggregation, enrichment, and materialization SHALL be distinct transformation kinds.
- A lens SHALL declare its get/put laws and conflict behavior before claiming bidirectional editing.
- An aggregation SHALL declare grouping keys, window, ordering, late-data policy, and aggregate semantics.
- An enrichment SHALL identify its external sources.
- An enrichment SHALL include external-source identities in output provenance.
- Every transformation SHALL declare purity, determinism, external reads/writes, failure outcomes, and whether retries require idempotency.
- A declared-lossy success SHALL enumerate omitted or altered semantic identities.
- Undeclared loss SHALL fail.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-022-AC-1 | Export selection, target selection, mapping selection, and profile options are four independently validated concerns. | Test |
| FR-022-AC-2 | Every transformation kind has a distinct required contract and cannot be substituted by a generic mapping label. | Inspection |
| FR-022-AC-3 | A lossy projection succeeds only when the profile permits loss and identifies every known omission. | Test |
| FR-022-AC-4 | A bidirectional mapping that violates its declared lens laws fails qualification. | Property |
| FR-022-AC-5 | Effectful transforms expose external reads/writes and provenance; pure transforms cannot access them. | Test |
| FR-022-AC-6 | Invalid, unsupported, unavailable, partial, and lossy outcomes remain distinct machine-readable results. | Test |

## Dependencies

- **Upstream**: [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), architecture transformation taxonomy
- **Downstream**: [FR-023](./FR-023-specify-representation-contracts.md), mapping compiler and analytical projections
