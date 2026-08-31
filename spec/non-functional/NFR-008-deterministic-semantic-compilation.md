---
id: NFR-008
title: "Deterministic and reproducible semantic compilation"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "constrains"
---
# [NFR-008] Deterministic and reproducible semantic compilation

## Statement

Given identical locked inputs and tool identities, semantic compilation SHALL
produce byte-identical normalized IR, diagnostics, manifests, and target outputs
without network access or environment-dependent ordering.

## Scope

- Package resolution after a lock exists, normalization, IR construction, compatibility analysis, and every generated target.
- Timestamps, absolute paths, hostnames, locale, and nondeterministic map ordering are excluded or normalized explicitly.

## Rationale

Generated contracts become review and supply-chain inputs. Unexplained drift
makes compatibility evidence unreliable and lets local environment state change
published APIs.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Normalized fingerprint differences across two clean runs | 0 | 0 | Reproducible-build test |
| Unlocked or network-resolved inputs during locked compilation | 0 | 0 | Sandboxed integration test |
| Output files absent from the output manifest | 0 | 0 | Manifest reconciliation |
| Environment-specific absolute paths in retained outputs | 0 | 0 | Static scan |

## Verification

Run the same locked conformance corpus twice in isolated directories with varied
locale, working path, and process ordering; compare canonical file inventories,
content digests, diagnostics, and package manifests.

## Dependencies

- **Upstream**: [FR-019](../functional/FR-019-select-v1-structural-source-and-ir.md), [FR-021](../functional/FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: compiler and publication provenance gates
