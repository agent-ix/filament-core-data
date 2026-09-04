---
id: FR-048
title: "Build and verify the package lock and the v1 fingerprint"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
---
# [FR-048] Build and verify the package lock and the v1 fingerprint

## Description

The compiler SHALL account for the exact inputs a compile consumed, by building
a package lock from the resolved graph and by verifying a supplied lock against
it, so that a compile either proves it used the inputs the lock names or reports
precisely which of them moved. The two obligations are stated separately under
Behavior.

## Inputs

- A resolved package graph from FR-047, carrying each package's selected source files
- An optional existing `package-lock.json`, valid against `schema/semantic/v1/package-lock.schema.json`
- The compiler contract version string, `1.1.0`
- The published schema bytes named below

## Outputs

- `src/compiler/packages/canonical.mjs`: `canonicalize(value, sets)`, the `RFC8785-JCS-with-identity-sorted-sets-v1` byte form, and `digest(bytes)` returning `sha256:<64 hex>`
- `src/compiler/packages/lock.mjs`: `buildLock(resolution)`, `verifyLock(lock, lockText, resolution)`, `contentDigest(files)`, and `fingerprint(resolution)`
- `test/fixtures/compiler/rfc8785/vectors.json`: the RFC 8785 §3.2 string, number, and key-ordering vectors transcribed from the RFC text, with their expected canonical bytes
- A lock document whose `canonicalization.included` is `["schema-bytes", "manifest", "mappings", "profiles", "resolved-packages", "compiler-contract-version"]` and whose `excluded` is `["object-order", "set-order", "source-path", "working-directory", "timestamp", "hostname", "locale"]`

## Behavior

### Canonicalization

- `canonicalize` SHALL serialise objects with keys sorted by UTF-16 code unit as RFC 8785 requires.
- `canonicalize` SHALL serialise numbers in the RFC 8785 form.
- `canonicalize` SHALL escape strings as RFC 8785 requires.
- `canonicalize` SHALL sort every array whose path the caller names in `sets` by its members' `identity` before serialising it, and SHALL preserve the order of every other array.
- If a value nests more deeply than `maxDepth`, then `canonicalize` SHALL raise the blocking `maxDepth` limit diagnostic rather than recursing.

### The digested byte sets

- `sourceFiles(package)` SHALL be every file beneath each entry of that package's manifest `sourceRoots`, in ascending code-point order of its package-root-relative `/`-separated path; no other file beneath the package root is a source file.
- `contentDigest(package)` SHALL be `digest(canonicalize([[path, digest(bytes)], …]))` over `sourceFiles(package)`.
- `manifestDigest(package)` SHALL be `digest` of that manifest's raw bytes; the same rule SHALL give each mapping's and profile's digest.
- `source.digest` of an emitted IR document SHALL equal `contentDigest` of its root package.
- `schema-bytes` SHALL be `[[filename, digest(bytes)], …]` over the files of `schema/semantic/v1/` whose name ends `.schema.json`, in ascending code-point order of filename.
- `fingerprint` SHALL be `digest(canonicalize([schemaBytes, manifestDigest, mappingDigests, profileDigests, resolvedPackages, contractVersion]))`, where `mappingDigests` and `profileDigests` are identity-sorted sets, `resolvedPackages` is the identity-sorted list of `{ identity, version, contentDigest }`, and no excluded input appears.
- `package.lockDigest` of an emitted IR document SHALL be `digest` of the raw bytes of the lock the caller supplied, or, where the caller supplied none, of the serialised lock the compile built for itself.

### Building and verifying

- The compiler SHALL emit `packages` sorted by package identity, and each entry's `dependencies` sorted by identity, under code-point comparison.
- If a supplied lock's `fingerprint` differs from the computed fingerprint, then the compiler SHALL raise `agent-ix.compiler.STALE_LOCK` at the lock's `fingerprint` locus, naming both fingerprints.
- If a supplied lock names a package whose resolved `contentDigest` differs, then the compiler SHALL raise `agent-ix.compiler.STALE_LOCK_PACKAGE` at that package entry's locus, naming both digests.
- If a supplied lock omits a resolved package, or names a package the graph does not resolve, then the compiler SHALL raise `agent-ix.compiler.LOCK_GRAPH_MISMATCH` at the lock's `packages` locus, naming the identity.
- If a supplied lock's `canonicalization` block does not equal the algorithm this requirement names, then the compiler SHALL raise `agent-ix.compiler.UNSUPPORTED_CANONICALIZATION` at that block's locus.
- The compiler SHALL NOT rewrite a supplied lock as a side effect of verifying it; writing a lock is an explicit command.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-048-CON-1 | The fingerprint SHALL change for every change to an included input, and stay equal for every change confined to an excluded input. | Correctness | Property test |
| FR-048-CON-2 | The canonical form SHALL be produced by this repository; no canonical-JSON dependency is added. | Maintainability | Dependency inspection |
| FR-048-CON-3 | The lock verifier SHALL work offline, reading no file the resolution did not already name. | Security | Instrumented run |
| FR-048-CON-4 | Every digest this requirement defines SHALL be defined by its byte set, not by its name, so two implementations cannot disagree about what was hashed. | Determinism | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-048-AC-1 | `canonicalize` reproduces every vector in `test/fixtures/compiler/rfc8785/vectors.json` for string escaping, number formatting, and key ordering. | Test |
| FR-048-AC-2 | Permuting object key order, permuting a declared identity-keyed set, changing the working directory, and changing the host locale each leave the fingerprint unchanged. | Property |
| FR-048-AC-3 | Changing one byte of a source file, of a manifest, of a mapping, of a profile, of a resolved package version, of a published schema file, and of the contract version each changes the fingerprint. | Property |
| FR-048-AC-4 | A built lock validates against `package-lock.schema.json`, and its `canonicalization` block equals the algorithm named here. | Test |
| FR-048-AC-5 | `STALE_LOCK`, `STALE_LOCK_PACKAGE`, `LOCK_GRAPH_MISMATCH`, and `UNSUPPORTED_CANONICALIZATION` each fire on a fixture, each at the declared locus, each naming both values it compared. | Test |
| FR-048-AC-6 | Verifying a lock leaves the lock file byte-unchanged on disk. | Test |
| FR-048-AC-7 | Two lock builds over the same graph produce identical bytes. | Snapshot |
| FR-048-AC-8 | `contentDigest` is unchanged when a package's files are enumerated in a different order and changes when any source byte changes; a file beneath the package root but outside `sourceRoots` changes nothing. | Property |
| FR-048-AC-9 | `source.digest` of a compiled document equals `contentDigest` of its root package, asserted by recomputation. | Test |
| FR-048-AC-10 | `package.lockDigest` equals the digest of a supplied lock's bytes, and, with no lock supplied, of the lock the compile built. | Test |
| FR-048-AC-11 | A value nested past `maxDepth` terminates `canonicalize` with the blocking limit diagnostic. | Test |

## Dependencies

- **Upstream**: [FR-047](./FR-047-resolve-the-package-graph.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md)
