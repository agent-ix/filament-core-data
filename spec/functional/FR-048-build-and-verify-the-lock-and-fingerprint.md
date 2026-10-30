---
id: FR-048
title: "Canonicalize resolved package data"
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
# [FR-048] Canonicalize resolved package data

## Description

The compiler SHALL canonicalize the resolved package graph and its declared
source files for deterministic inspection and compilation. Cargo.lock is the
repository dependency lock; this compiler SHALL NOT mint or verify a second
package lock, content digest, or fingerprint.

## Inputs

- The resolved package graph from FR-047 and each package's declared source roots
- The compiler contract version and the published structural schemas

## Outputs

- `src/compiler/packages/canonical.mjs`: `canonicalize(value, { sets, maxDepth })`,
  the RFC 8785 byte form, with the declared identity-set ordering
- A deterministic, directly inspectable resolved package graph
- `test/fixtures/compiler/rfc8785/vectors.json`, with expected canonical bytes

## Behavior

- `canonicalize` SHALL serialise objects with keys sorted by UTF-16 code unit,
  numbers in RFC 8785 form, and escaped strings as RFC 8785 requires.
- `canonicalize` SHALL sort each array whose path is named in `sets` by identity
  and preserve every other array's order.
- A value deeper than `maxDepth` SHALL raise the blocking limit diagnostic.
- `sourceFiles(package)` SHALL enumerate only files beneath the package's
  manifest `sourceRoots`, sorted by package-root-relative path in code-point order.
- The compiler SHALL emit resolved packages sorted by identity and each package's
  dependencies sorted by identity.
- The compiler SHALL NOT write or require `package-lock.json`,
  `manifestDigest`, `contentDigest`, `lockFingerprint`, or an equivalent
  computed digest as package-resolution evidence.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-048-CON-2 | The canonical form SHALL be produced by this repository; no canonical-JSON dependency is added. | Maintainability | Dependency inspection |
| FR-048-CON-3 | Package resolution SHALL work offline and read only files named by its injected host and selected graph. | Security | Instrumented run |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-048-AC-1 | `canonicalize` reproduces every string, number, and key-order vector in `test/fixtures/compiler/rfc8785/vectors.json`. | Test |
| FR-048-AC-2 | Permuting object keys or a declared identity set, changing working directory, or changing host locale leaves canonical graph bytes unchanged; changing an ordered sequence changes them. | Property |
| FR-048-AC-3 | Changing an import, export, selected package version, profile selection, or contract version changes the canonical resolved graph where that fact is represented. | Property |
| FR-048-AC-4 | The resolved graph contains every selected package exactly once and names its selected version and dependencies in identity order. | Test |
| FR-048-AC-6 | Package resolution does not create or rewrite a second lock file. | Test |
| FR-048-AC-7 | Two resolutions of the same graph produce identical canonical bytes. | Test |
| FR-048-AC-8 | `sourceFiles` enumerates the same paths regardless of filesystem order and excludes files outside `sourceRoots`. | Property |
| FR-048-AC-9 | A compiled IR omits `source.digest` and every package content digest. | Test |
| FR-048-AC-10 | A compiled IR omits `package.lockDigest`, and compilation has no package-lock fingerprint verification. | Test |
| FR-048-AC-11 | A value nested past `maxDepth` terminates `canonicalize` with the blocking limit diagnostic. | Test |

## PLAT-1205 retirement

The earlier `FR-048-CON-1`, `FR-048-CON-4`, and `FR-048-AC-5` obligations,
including `STALE_LOCK`, `STALE_LOCK_PACKAGE`, `LOCK_GRAPH_MISMATCH`, and
`UNSUPPORTED_CANONICALIZATION`, are explicitly retired. The former
`contentDigest`, manifest digest, schema-byte digest, and lock fingerprint
algorithm was a digest-keyed second lock whose freshness checks duplicated
Cargo.lock. The remaining criteria above retain graph completeness, offline
resolution, canonical byte determinism, and absence checks.

## Dependencies

- **Upstream**: [FR-047](./FR-047-resolve-the-package-graph.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md)
