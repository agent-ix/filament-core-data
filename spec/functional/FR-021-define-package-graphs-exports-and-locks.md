---
id: FR-021
title: "Define package graphs, exports, profiles, and locks"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
---
# [FR-021] Define package graphs, exports, profiles, and locks

## Description

The v1 package contract SHALL define globally namespaced identity, semantic
version, imports, public exports, profiles, target selections, schema
fingerprints, and a deterministic resolved lock without conflating these concerns.

## Inputs

- Package manifest and structural schema set
- Declared dependency constraints and export visibility
- Named profiles, targets, mappings, compatibility posture, and source locations

## Outputs

- Validated package graph
- Public export surface per profile
- Fully resolved content-addressed lock suitable for offline compilation

## Behavior

- Package identity SHALL be an opaque globally namespaced owner/name independent of registry URL or checkout path.
- The manifest SHALL declare its own contract version, package semantic version, schema dialect, source roots, exports, imports, profiles, targets, and mapping references.
- Imports SHALL identify package identity, compatible version constraint, and required export names or capabilities.
- Exports SHALL reference stable semantic type identities.
- Exports SHALL NOT expose unselected private definitions.
- Profiles SHALL select exports, targets, mappings, options, and compatibility posture by name without modifying the underlying definitions.
- The lock SHALL resolve every import to exact package version, content digest, source identity, and transitive dependency closure.
- Fingerprints SHALL use a named digest algorithm over a specified canonical byte form.
- The fingerprint contract SHALL identify every included and excluded input class.
- Resolution SHALL reject identity/version/digest disagreement, unresolved imports, duplicate stable identities, undeclared cycles, and contradictory profile selections.
- Manifest validation SHALL reject unknown keys except inside a declared namespaced extension container.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-021-AC-1 | A package graph with compatible imports resolves to one deterministic transitive lock. | Test |
| FR-021-AC-2 | A version, digest, identity, export, or cycle conflict fails with every conflicting locus identified. | Test |
| FR-021-AC-3 | Selecting a profile changes only its export/target/mapping configuration and does not mutate semantic definitions. | Property |
| FR-021-AC-4 | Unknown top-level manifest keys fail while namespaced extension data remains explicit and preserved. | Test |
| FR-021-AC-5 | Dynamic package loading and finite generated export selection derive from the same locked identities. | Analysis |
| FR-021-AC-6 | The shared package contract leaves Quoin registry transport and installation policy to `agent-ix/quoin#293` and #287. | Inspection |
| FR-021-AC-7 | Equivalent package inputs with different file or object ordering produce one fingerprint, while any included semantic byte change produces a different fingerprint. | Property |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: Quoin issue #293 manifest specialization, issue #287 catalog locks, compiler issue #5
