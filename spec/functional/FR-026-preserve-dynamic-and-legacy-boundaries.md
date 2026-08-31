---
id: FR-026
title: "Preserve dynamic modules and legacy compatibility boundaries"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: "depends_on"
---
# [FR-026] Preserve dynamic modules and legacy compatibility boundaries

## Description

The v1 contract SHALL allow dynamic schema validation and finite generated
packages to coexist. The v1 contract SHALL define explicit legacy adapters. The
v1 contract SHALL fail closed on unknown or contradictory metadata without
invalidating current inputs.

## Behavior

- A dynamic consumer SHALL validate an uncompiled package through its locked JSON Schema and preserve namespaced unknown data according to the selected profile.
- A static consumer SHALL expose a finite generated export set.
- A static consumer SHALL preserve, reject, or surface unknown modules/extensions according to its declared policy.
- Dynamic and static consumers SHALL use the same package, semantic type, field, profile, mapping, and fingerprint identities.
- Existing Quoin manifests SHALL remain valid under an explicit legacy compatibility profile until the Project 18 advisory and promotion gates pass.
- Existing Avro artifacts and generated bindings SHALL remain readable through a versioned bridge until all known readers pass the final retirement gate.
- Legacy adapters SHALL declare source/target versions, preservation, omissions, diagnostics, and retirement prerequisites.
- Unknown contract versions, unresolved schemas, contradictory identities, or unavailable adapters SHALL produce explicit failures.
- Failed validation SHALL NOT yield empty models or zero-value success.
- The shared contract SHALL NOT move Quire rendering, package generation, registry sourcing, application policy, or persistence ownership into Quire.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-026-AC-1 | One fixture is accepted dynamically and through generated Rust, TypeScript, and Python packages with the same semantic fingerprint. | Test |
| FR-026-AC-2 | A static consumer's unknown-module policy preserves, rejects, or surfaces data exactly as its profile declares. | Test |
| FR-026-AC-3 | Every current Quoin manifest validates through the legacy profile without being rewritten. | Test |
| FR-026-AC-4 | Existing Avro positive and negative fixtures cross the bridge without semantic widening. | Test |
| FR-026-AC-5 | Missing versions, imports, adapters, or contradictory identities fail visibly and emit no empty model. | Test |
| FR-026-AC-6 | Quire, Quoin, module repositories, compiler, and consumer responsibilities remain consistent with the accepted ownership ADRs. | Inspection |

## Dependencies

- **Upstream**: [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), Quoin architecture and corpus reviews
- **Downstream**: Quoin #293/#287, Quire semantic extraction, package publication, consumer readiness, retirement
