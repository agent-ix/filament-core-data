---
id: FR-047
title: "Resolve package manifests, imports, exports, profiles, and targets"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
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
- Zero or more package search directories, each holding candidate package directories
- The name of the profile to select, or none
- Mapping documents named by the manifest, valid against `schema/semantic/v1/mapping.schema.json`
- Profile documents named by the manifest, valid against `schema/semantic/v1/profile.schema.json`

## Outputs

- `src/compiler/packages/manifest.mjs`: `readManifest(dir)` returning `{ manifest, text, path, digest }` or diagnostics
- `src/compiler/packages/resolve.mjs`: `resolvePackageGraph(request)` returning `{ root, packages, profile, mappings, exports, diagnostics }`
- `src/compiler/json-locus.mjs`: `locateJsonPointer(text, pointer)` returning the 1-based line and column of a JSON pointer within the document text
- A resolution result whose `packages` are ordered by package identity under code-point comparison, independent of discovery order

## Behavior

- The compiler SHALL validate each manifest against its published schema before reading any field.
- If a manifest fails its schema, then the compiler SHALL raise `agent-ix.compiler.INVALID_MANIFEST` for each schema error at the locus of the failing JSON pointer.
- The compiler SHALL accept exactly two version-constraint forms, an exact `x.y.z` and a caret `^x.y.z`.
- If an import declares any other version-constraint form, then the compiler SHALL raise `agent-ix.compiler.UNSUPPORTED_VERSION_CONSTRAINT` at the constraint's locus rather than interpreting it.
- If no search directory supplies a package with an imported identity, then the compiler SHALL raise `agent-ix.compiler.IMPORT_NOT_FOUND` at that import entry's locus.
- If a candidate package's version does not satisfy the constraint, then the compiler SHALL raise `agent-ix.compiler.IMPORT_VERSION_UNSATISFIED` at that import entry's locus, naming the version found.
- If two manifests in one graph require versions of the same package identity that no single candidate satisfies, then the compiler SHALL raise `agent-ix.compiler.IMPORT_VERSION_CONFLICT` once, at the first requiring locus in package order, with every other requiring locus as a related locus.
- If two resolved entries for one package identity carry different content digests, then the compiler SHALL raise `agent-ix.compiler.DIGEST_CONFLICT` naming both digests and both loci.
- If an import names an export the imported manifest does not declare, then the compiler SHALL raise `agent-ix.compiler.IMPORT_EXPORT_MISSING` at the naming entry's locus; if it names a capability no resolved profile of that package declares, then `agent-ix.compiler.IMPORT_CAPABILITY_MISSING`.
- If an import names an export the imported manifest declares with visibility `private`, then the compiler SHALL raise `agent-ix.compiler.IMPORT_EXPORT_PRIVATE` at the naming entry's locus.
- If the import graph contains a cycle, then the compiler SHALL raise `agent-ix.compiler.PACKAGE_CYCLE` once per elementary cycle, naming every import locus on the cycle in the order the cycle traverses them.
- The compiler SHALL NOT report one elementary cycle twice under a rotated starting point.
- A recursive type graph within one package SHALL NOT be treated as a package cycle.
- If a manifest exports a type identity twice, or two packages in the graph export the same type identity, then the compiler SHALL raise `agent-ix.compiler.DUPLICATE_EXPORT` at the second declaring locus.
- If the caller names a profile the root manifest does not declare, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_PROFILE` naming the declared profile names.
- If a selected profile names a mapping identity the manifest's `mappings` does not contain, or a mapping document that does not resolve, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_MAPPING` at that entry's locus.
- If a selected profile names a target outside the manifest's `targets`, then the compiler SHALL raise `agent-ix.compiler.UNKNOWN_TARGET` at that entry's locus.
- If a selected profile's `compatibilityPosture` is `strict` and any resolved mapping declares `preservation: "declared-lossy"`, then the compiler SHALL raise `agent-ix.compiler.UNDECLARED_LOSS` at the mapping's locus.
- The compiler SHALL resolve the graph identically for any permutation of the search directories and of an `imports` array, once diagnostics are ordered by FR-049.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-047-CON-1 | Resolution SHALL be offline: no network access, and no read outside the declared package root and the declared search directories. | Security | Test and static analysis |
| FR-047-CON-2 | A resolved package path SHALL NOT escape its search directory through `..` or a symbolic link; an escape is `agent-ix.compiler.PATH_ESCAPE`, not a resolved package. | Security | Test |
| FR-047-CON-3 | The resolver SHALL implement version-constraint satisfaction in this repository against the two accepted forms, adding no semver dependency. | Maintainability | Dependency inspection |
| FR-047-CON-4 | The resolver SHALL NOT execute any file it reads. Manifests, mappings, and profiles are data. | Security | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-047-AC-1 | The `order-independent` case of `fixtures/semantic/v1/package-graph-cases.json` resolves to the same ordered result under both listed permutations. | Test |
| FR-047-AC-2 | The `version-conflict` case yields exactly one `IMPORT_VERSION_CONFLICT` naming both requiring loci. | Test |
| FR-047-AC-3 | The `digest-conflict` case yields `DIGEST_CONFLICT` naming both digests and both loci. | Test |
| FR-047-AC-4 | The `package-cycle` case yields exactly one `PACKAGE_CYCLE` naming both import loci, and rotating the entry package does not produce a second diagnostic. | Test |
| FR-047-AC-5 | The `recursive-type-is-not-package-cycle` case resolves successfully and emits no cycle diagnostic. | Test |
| FR-047-AC-6 | A manifest failing its schema yields one `INVALID_MANIFEST` per schema error, each at the line and column of the failing pointer, verified against hand-computed positions. | Test |
| FR-047-AC-7 | `locateJsonPointer` returns the exact line and column for a pointer into an object, an array element, and a nested array element, including a document indented with tabs. | Test |
| FR-047-AC-8 | `IMPORT_NOT_FOUND`, `IMPORT_VERSION_UNSATISFIED`, `IMPORT_EXPORT_MISSING`, `IMPORT_EXPORT_PRIVATE`, and `IMPORT_CAPABILITY_MISSING` each fire on a fixture and each names the offending entry's locus, not the file's first line. | Test |
| FR-047-AC-9 | `UNKNOWN_PROFILE`, `UNKNOWN_MAPPING`, `UNKNOWN_TARGET`, and `UNDECLARED_LOSS` each fire on a fixture at the declared locus. | Test |
| FR-047-AC-10 | `DUPLICATE_EXPORT` fires for a repeated identity within one manifest and for the same identity exported by two packages. | Test |
| FR-047-AC-11 | A version constraint of `>=1.0.0` yields `UNSUPPORTED_VERSION_CONSTRAINT` rather than a resolution. | Test |
| FR-047-AC-12 | A search directory entry that is a symlink to a directory outside the search root yields `PATH_ESCAPE` and no resolved package. | Test |
| FR-047-AC-13 | The resolver reads no path outside the package root and search directories during a full fixture compile, verified by an instrumented file-system reader. | Test |

## Dependencies

- **Upstream**: [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-022](./FR-022-define-mappings-profiles-and-transformations.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
