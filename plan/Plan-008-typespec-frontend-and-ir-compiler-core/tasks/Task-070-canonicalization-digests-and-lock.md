---
id: Task-070
title: "RFC 8785 canonicalization, digests, and the package lock"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-477"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-478"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-479"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-480"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-481"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-482"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-483"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-484"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-485"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-486"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-487"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-488"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-489"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-490"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-491"
    type: verifies
---
# Task-070: RFC 8785 canonicalization, digests, and the package lock

## Scope

The byte-level foundation of every determinism claim: one canonical form, one digest per named byte set, one fingerprint, and lock build and verification.

## Subtasks

- [x] Transcribe the RFC 8785 §3.2 string-escaping, number-formatting, and key-ordering vectors into `test/fixtures/compiler/rfc8785/vectors.json`, citing the RFC section each row comes from.
- [x] `src/compiler/packages/canonical.mjs`: `canonicalize(value, sets)` with UTF-16 code-unit key ordering, RFC 8785 number serialisation, RFC 8785 string escaping, identity-sorted declared sets, order-preserving other arrays, and a `maxDepth` bound.
- [x] `digest(bytes)` returning `sha256:<64 hex>` via `node:crypto`.
- [x] `src/compiler/packages/lock.mjs`: `sourceFiles`, `contentDigest`, `fingerprint` over the six included inputs, `buildLock`, `verifyLock` with its four diagnostics located through `json-locus`.
- [x] Property tests for the inclusion and exclusion contract: every included input changes the fingerprint, no excluded input does.

## Deliverables

- `canonical.mjs`, `lock.mjs`, the RFC vectors fixture, and their tests.

## Notes

- SR-066 FND-503 and SR-070 FND-585: every digest is defined by its byte set here, in code and in a test, not by its name.
