---
id: NFR-025
title: "Non-disruptive TypeScript backend"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-070"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-025] Non-disruptive TypeScript backend

## Statement

The TypeScript backend SHALL land without publishing a package, moving a
consumer, enlarging the published package surface, or changing any byte of the
corpus, oracle, schemas, fixtures, spike goldens, or frozen prototype path it is
judged against, so that a defect found later can be backed out by reverting this
work alone.

## Rationale

The published surface is a risk. `package.json` `exports`, `main`,
`module`, `types`, and `files` are the contract downstream consumers install
against; enlarging them is the issue #11 publication gate's decision, taken
behind the `agent-ix/quoin#290` human sign-off, and that gate has not moved.
The generated package this work produces is written to a caller-named directory
and to a committed test fixture; it is not added to this repository's own
manifest and it is not sent to any registry.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by this work | 0 | 0 | Registry inspection |
| Symbols exported by `src/compiler/index.mjs` | 15 | 15 | Export-set test |
| Downstream repositories changed | 0 | 0 | Inspection |
| Added package manifests without an AGPL-3.0-or-later declaration | 0 | 0 | Licence inspection |

## Verification

Assert the narrow build interface still exports exactly fifteen symbols.
Inspect every added manifest for the licence and confirm no registry
publication occurred.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-025-AC-5 | `src/compiler/index.mjs` exports exactly fifteen symbols, and adding a sixteenth fails the export-set test. | Unit |
| NFR-025-AC-8 | No file this work generates is written under a path this repository publishes, and `npm pack --dry-run` over this repository lists no generated-package file. | Analysis |
| NFR-025-AC-9 | Every generated `package.json` and every added source file declares AGPL-3.0-or-later. | Static |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md),
  [NFR-016](./NFR-016-isolated-conformance-corpus.md),
  [NFR-021](./NFR-021-non-disruptive-compiler-core.md)
- **Downstream**: issue #11 (publication), issue #21, issue #23
- **Constrains**: [FR-063](../functional/FR-063-declare-the-generation-backend-seam.md),
  [FR-070](../functional/FR-070-run-the-typescript-conformance-adapter.md),
  [FR-071](../functional/FR-071-provide-the-generate-command-and-surface-fixtures.md)
