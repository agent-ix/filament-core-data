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
version, imports, public exports, profiles, and target selections without
conflating these concerns. Cargo.lock is the repository's dependency lock.

## Inputs

- Package manifest and structural schema set
- Declared dependency constraints and export visibility
- Named profiles, targets, mappings, compatibility posture, and source locations

## Outputs

- Validated package graph
- Public export surface per profile
- Fully resolved package graph suitable for offline compilation

## Behavior

- Package identity SHALL be an opaque globally namespaced owner/name independent of registry URL or checkout path.
- The manifest SHALL declare its own contract version, package semantic version, schema dialect, source roots, exports, imports, profiles, targets, and mapping references.
- Imports SHALL identify package identity, compatible version constraint, and required export names or capabilities.
- Exports SHALL reference stable semantic type identities.
- Exports SHALL NOT expose unselected private definitions.
- Profiles SHALL select exports, targets, mappings, options, and compatibility posture by name without modifying the underlying definitions.
- Resolution SHALL bind every import to an exact package version, source identity, and transitive dependency closure.
- Resolution SHALL reject identity/version disagreement, unresolved imports, duplicate stable identities, undeclared cycles, and contradictory profile selections.
- Manifest validation SHALL reject unknown keys except inside a declared namespaced extension container.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-021-AC-1 | A package graph with compatible imports resolves to one deterministic transitive graph. | Test |
| FR-021-AC-2 | A version, identity, export, or cycle conflict fails with every conflicting locus identified. | Test |
| FR-021-AC-3 | Selecting a profile changes only its export/target/mapping configuration and does not mutate semantic definitions. | Property |
| FR-021-AC-4 | Unknown top-level manifest keys fail while namespaced extension data remains explicit and preserved. | Test |
| FR-021-AC-5 | Dynamic package loading and finite generated export selection derive from the same resolved identities. | Analysis |
| FR-021-AC-6 | The shared package contract leaves Quoin registry transport and installation policy to `agent-ix/quoin#293` and #287. | Inspection |
| FR-021-AC-7 | Equivalent package inputs with different file or object ordering resolve to the same graph; a semantic change that alters an import, export, selected package version, or declared profile changes that graph. | Property |

## PLAT-1205 retirement

The former content-addressed package lock, digest conflict, and graph fingerprint
criteria were retired because they duplicate repository dependency custody while
adding a second lock and digest-keyed staleness check. Package identity, version,
export, graph, and deterministic resolution obligations remain.

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: Quoin issue #293 manifest specialization, issue #287 catalog locks, compiler issue #5
