---
id: FR-047
title: "Resolve package manifests, imports, exports, profiles, and targets"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-022"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-023"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-047] Resolve package manifests, imports, exports, profiles, and targets

## Description

The compiler SHALL resolve a root package manifest and its transitive imports
into one ordered package graph, so that every selection a compile depends on —
imported package versions, required exports and capabilities, the named profile,
its targets and mappings — is either resolved to an exact entry or reported as a
diagnostic at the manifest position that declared it.

## Inputs

- A package root directory containing `package-manifest.json`, valid against `schema/semantic/v1/package-manifest.schema.json`
- An ordered list of package search directories, each holding candidate package directories
- The name of the profile to select, or none
- Mapping documents at `<package root>/mappings/<identity tail>.json`, valid against `schema/semantic/v1/mapping.schema.json`
- Profile documents at `<package root>/profiles/<profile name>.json`, valid against `schema/semantic/v1/profile.schema.json`
- The injected host of NFR-019 and NFR-020, and the FR-049 limits

## Outputs

- `src/compiler/packages/manifest.mjs`: `readManifest(host, dir)` returning `{ manifest, text, path, digest, pointers }` or diagnostics
- `src/compiler/packages/resolve.mjs`: `resolvePackageGraph(request)` returning `{ root, packages, profile, mappings, exports, sourceFiles, diagnostics }`
- `src/compiler/json-locus.mjs`: `indexJsonPointers(text)`, `locateJsonPointer(text, pointer, prefer)`, and `offsetToPosition(text, offset)`
- `fixtures/compiler/packages/**`: the concrete package trees, one per case of `fixtures/semantic/v1/package-graph-cases.json`, which remains the read-only case index they are keyed to
- A resolution whose `packages` are ordered by package identity under code-point comparison, independent of discovery order

## Behavior

### Reading and locating

- The compiler SHALL validate each manifest, mapping, and profile against its published schema before reading any field.
- If a document fails its schema, then the compiler SHALL raise `agent-ix.compiler.INVALID_MANIFEST`, `agent-ix.compiler.INVALID_MAPPING`, or `agent-ix.compiler.INVALID_PROFILE` for each schema error at the position of the failing JSON pointer, preferring the offending member's key position.
- Where the exact failing pointer is absent from the document, the compiler SHALL locate the nearest present ancestor pointer, so a diagnostic always lands inside the structure that owns the defect.
- The compiler SHALL set every locus `path` to the document's package-root-relative `/`-separated path, and `sourceIdentity` to `ix://<owning package identity>/source/manifest`, `.../source/mapping`, `.../source/profile`, or `.../source/lock`.
- Where a document belongs to an imported package, whose file cannot be named by a root-package-relative path, the compiler SHALL set `path` to that document's path relative to its own package root and `sourceIdentity` to that package's identity, so no locus contains `..`.

### Candidate selection

- The compiler SHALL accept exactly two version-constraint forms, an exact `x.y.z` and a caret `^x.y.z`.
- If an import declares any other version-constraint form, then the compiler SHALL raise `agent-ix.compiler.UNSUPPORTED_VERSION_CONSTRAINT` at the constraint's locus rather than interpreting it.
- The compiler SHALL select, among the candidates satisfying every constraint on one identity, the one with the highest version under semantic-version precedence.
- Where two candidates share the highest satisfying version, the compiler SHALL select the one from the earlier search directory in the caller's declared order, because that order is a declared input rather than an ambient one.
- If two selected entries for one package identity carry different content digests, then the compiler SHALL raise `agent-ix.compiler.DIGEST_CONFLICT` naming both digests and both loci.
- If no search directory supplies a package with an imported identity, then the compiler SHALL raise `agent-ix.compiler.IMPORT_NOT_FOUND` at that import entry's locus.
- If no candidate for an identity satisfies its constraint, then the compiler SHALL raise `agent-ix.compiler.IMPORT_VERSION_UNSATISFIED` at that import entry's locus, naming the versions found.
- If two manifests in one graph constrain the same identity and no candidate satisfies both, then the compiler SHALL raise `agent-ix.compiler.IMPORT_VERSION_CONFLICT` once, at the requiring locus that is first in package-identity order, with every other requiring locus as a related locus.

### Exports, capabilities, and cycles

- If an import names an export the imported manifest does not declare, then the compiler SHALL raise `agent-ix.compiler.IMPORT_EXPORT_MISSING` at the naming entry's locus.
- If an import names an export the imported manifest declares with visibility `private`, then the compiler SHALL raise `agent-ix.compiler.IMPORT_EXPORT_PRIVATE` at the naming entry's locus.
- If an import names a capability no profile of the imported package declares in its `options.capabilities`, then the compiler SHALL raise `agent-ix.compiler.IMPORT_CAPABILITY_MISSING` at the naming entry's locus.
- If the import graph contains a cycle, then the compiler SHALL raise `agent-ix.compiler.PACKAGE_CYCLE` once per back edge found by a depth-first traversal that visits packages in code-point order of identity, naming every import locus on the cycle starting at the least package identity on it and following the cycle's own direction.
- A recursive type graph within one package SHALL NOT be treated as a package cycle.
- If a manifest exports a type identity twice, or two packages in the graph export the same type identity, then the compiler SHALL raise `agent-ix.compiler.DUPLICATE_EXPORT` at the second declaring locus in package-identity order.

### Profiles, mappings, and targets

- If the caller names a profile the root manifest does not declare, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_PROFILE` naming the declared profile names.
- If a selected profile names a mapping identity the manifest's `mappings` does not contain, or a mapping document that does not resolve at its declared path, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_MAPPING` at that entry's locus.
- If a selected profile names a target outside the manifest's `targets`, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_TARGET` at that entry's locus.
- If a selected profile's `compatibilityPosture` is `strict` and any resolved mapping declares `preservation: "declared-lossy"`, then the compiler SHALL raise `agent-ix.compiler.UNDECLARED_LOSS` at the mapping's `preservation` locus.

### Confinement and bounds

- The compiler SHALL read every file through the injected host and SHALL resolve every candidate path to its real path before reading it.
- If a real path lies outside the package root and the declared search directories, then the compiler SHALL raise `agent-ix.compiler.PATH_ESCAPE` and SHALL NOT read it.
- If the graph exceeds `maxNodes` packages, if a document exceeds `maxInputBytes`, or if the JSON pointer index exceeds `maxDepth` nesting levels, then the compiler SHALL raise the corresponding blocking limit diagnostic and stop.
- The compiler SHALL resolve the graph identically for any permutation of an `imports` array, and for any permutation of the search directories in which no two directories supply the same package identity at the same version.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-047-CON-1 | Resolution SHALL work offline, opening no network connection and reading nothing outside the declared package root and search directories. | Security | Instrumented run |
| FR-047-CON-2 | A resolved package path SHALL NOT escape its search directory through `..` or a symbolic link; an escape is `agent-ix.compiler.PATH_ESCAPE`, not a resolved package. | Security | Test |
| FR-047-CON-3 | The resolver SHALL implement version-constraint satisfaction in this repository against the two accepted forms, adding no semver dependency. | Maintainability | Dependency inspection |
| FR-047-CON-4 | The resolver SHALL NOT execute any file it reads; manifests, mappings, profiles, and locks are data. | Security | Instrumented run |
| FR-047-CON-5 | `fixtures/semantic/v1/package-graph-cases.json` SHALL remain byte-unchanged; it is the read-only case index, and the concrete trees live under `fixtures/compiler/packages/**`. | Non-disruption | Branch diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-047-AC-1 | The concrete tree for the `order-independent` case resolves to the same ordered result under both permutations named in the case index. | Property |
| FR-047-AC-2 | The `version-conflict` tree yields exactly one `IMPORT_VERSION_CONFLICT` naming both requiring loci. | Test |
| FR-047-AC-3 | The `digest-conflict` tree yields `DIGEST_CONFLICT` naming both digests and both loci. | Test |
| FR-047-AC-4 | The `package-cycle` tree yields exactly one `PACKAGE_CYCLE` naming both import loci and starting at the least package identity, and entering the graph from either package produces the identical message. | Test |
| FR-047-AC-5 | The `recursive-type-is-not-package-cycle` tree resolves successfully and emits no cycle diagnostic. | Test |
| FR-047-AC-6 | A manifest failing its schema yields one `INVALID_MANIFEST` per schema error, each at the line and column of the failing pointer's key, verified against hand-computed positions; a mapping and a profile do the same with their own codes. | Test |
| FR-047-AC-7 | `locateJsonPointer` returns exact positions for a pointer into an object, an array element, a nested array element, and a tab-indented document, and falls back to the nearest present ancestor for an absent pointer. | Test |
| FR-047-AC-8 | `IMPORT_NOT_FOUND`, `IMPORT_VERSION_UNSATISFIED`, `IMPORT_EXPORT_MISSING`, `IMPORT_EXPORT_PRIVATE`, and `IMPORT_CAPABILITY_MISSING` each fire on a fixture and each names the offending entry's locus, not the file's first line. | Test |
| FR-047-AC-9 | `UNKNOWN_PROFILE`, `UNKNOWN_MAPPING`, `UNKNOWN_TARGET`, and `UNDECLARED_LOSS` each fire on a fixture at the declared locus. | Test |
| FR-047-AC-10 | `DUPLICATE_EXPORT` fires for a repeated identity within one manifest and for the same identity exported by two packages. | Test |
| FR-047-AC-11 | A version constraint of `>=1.0.0` yields `UNSUPPORTED_VERSION_CONSTRAINT` rather than a resolution, and `^1.2.0` selects `1.9.0` over `1.3.0` when both are offered. | Test |
| FR-047-AC-12 | A search directory entry that is a symlink to a directory outside the search root yields `PATH_ESCAPE` and no resolved package. | Test |
| FR-047-AC-13 | A full fixture compile reads no path outside the package root and search directories, and opens no network connection, verified by the instrumented host. | Integration |
| FR-047-AC-14 | Every locus the resolver emits carries a `sourceIdentity` and a relative `path` free of `..`, including a locus inside an imported package. | Test |
| FR-047-AC-15 | Exceeding `maxNodes`, `maxInputBytes`, and `maxDepth` each terminates resolution with the corresponding blocking limit diagnostic. | Test |
| FR-047-AC-16 | Two permutations of the search-path order, where no two directories supply the same identity at the same version, produce identical output. | Property |

## Dependencies

- **Upstream**: [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-022](./FR-022-define-mappings-profiles-and-transformations.md), [FR-023](./FR-023-specify-representation-contracts.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md)
- **Downstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
