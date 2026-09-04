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
---
# [FR-048] Build and verify the package lock and the v1 fingerprint

## Description

The compiler SHALL account for the exact inputs a compile consumed, by building
a package lock from the resolved graph and by verifying a supplied lock against
it, so that a compile either proves it used the inputs the lock names or reports
precisely which of them moved. The two obligations are stated separately under
Behavior.

## Inputs

- A resolved package graph from FR-047
- The bytes of every source file, manifest, mapping, and profile the graph selects
- An optional existing `package-lock.json`, valid against `schema/semantic/v1/package-lock.schema.json`
- The compiler contract version string

## Outputs

- `src/compiler/packages/canonical.mjs`: `canonicalize(value)`, the `RFC8785-JCS-with-identity-sorted-sets-v1` byte form, and `digest(bytes)` returning `sha256:<64 hex>`
- `src/compiler/packages/lock.mjs`: `buildLock(resolution)` and `verifyLock(lock, resolution)`
- A lock document whose `canonicalization.included` is `["schema-bytes", "manifest", "mappings", "profiles", "resolved-packages", "compiler-contract-version"]` and whose `excluded` is `["object-order", "set-order", "source-path", "working-directory", "timestamp", "hostname", "locale"]`

## Behavior

- `canonicalize` SHALL serialise objects with keys sorted by UTF-16 code unit as RFC 8785 requires.
- `canonicalize` SHALL serialise numbers in the RFC 8785 form.
- `canonicalize` SHALL escape strings as RFC 8785 requires.
- `canonicalize` SHALL sort every array the caller declares to be an identity-keyed set by its members' `identity` before serialising it.
- `canonicalize` SHALL preserve the order of every array not declared to be an identity-keyed set.
- The compiler SHALL compute `fingerprint` as the SHA-256 of the canonical byte form of the ordered tuple of the six included inputs.
- The compiler SHALL NOT admit any excluded input into that tuple.
- The compiler SHALL compute each package's `contentDigest` as the SHA-256 of the canonical byte form of that package's path-sorted source file list, each entry being its package-root-relative `/`-separated path and its bytes.
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
| FR-048-CON-3 | The lock verifier SHALL work offline, reading no file the resolution did not already name. | Security | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-048-AC-1 | `canonicalize` matches the RFC 8785 published test vectors for string escaping, number formatting, and key ordering. | Test |
| FR-048-AC-2 | Permuting object key order, permuting an identity-keyed set, changing the working directory, and changing the host locale each leave the fingerprint unchanged. | Property |
| FR-048-AC-3 | Changing one byte of a source file, of a manifest, of a mapping, of a profile, of a resolved package version, and of the compiler contract version each changes the fingerprint. | Property |
| FR-048-AC-4 | A built lock validates against `package-lock.schema.json`, and its `canonicalization` block equals the algorithm named here. | Test |
| FR-048-AC-5 | `STALE_LOCK`, `STALE_LOCK_PACKAGE`, `LOCK_GRAPH_MISMATCH`, and `UNSUPPORTED_CANONICALIZATION` each fire on a fixture, each at the declared locus, each naming both values it compared. | Test |
| FR-048-AC-6 | Verifying a lock leaves the lock file byte-unchanged on disk. | Test |
| FR-048-AC-7 | Building the lock twice over the same graph produces identical bytes. | Test |
| FR-048-AC-8 | `contentDigest` is unchanged when a package's files are enumerated in a different directory order and changes when any source byte changes. | Test |

## Dependencies

- **Upstream**: [FR-047](./FR-047-resolve-the-package-graph.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
