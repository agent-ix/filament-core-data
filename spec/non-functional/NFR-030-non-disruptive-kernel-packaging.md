---
id: NFR-030
title: "Non-disruptive kernel packaging behind the publication gate"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-090"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [NFR-030] Non-disruptive kernel packaging behind the publication gate

## Statement

Kernel packaging SHALL generate every package and publish none of them, changing
no byte of the kernel source it reads, the schemas it validates against, the
conformance corpus it is judged by, or the three backends it drives, so that the
publication decision stays with `agent-ix/quoin#290` and a defect found later can
be backed out by reverting this work alone.

## Rationale

Adding a kernel package to `exports` or `files` is the act of
publishing it from this repository, and that act is behind `agent-ix/quoin#290`,
a human sign-off that has not been given. The gate is kept mechanically as well
as by rule: the generated Rust manifest carries `publish = false`
unconditionally, and no generated manifest names a registry.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published to npm, crates.io, or a Python index | 0 | 0 | Registry inspection |
| Git tags pushed | 0 | 0 | Inspection |
| Generated manifests permitting registry publication | 0 | 0 | Manifest inspection |
| Third-party dependencies added to any lockfile | 0 | 0 | Lockfile comparison |

## Verification

Inspect every generated manifest for a publication-permitting field and every
registry for a published artifact.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-030-AC-8 | No generated package manifest permits registry publication: the Rust manifest carries `publish = false`, and no generated manifest names a registry, a `publishConfig`, or a distribution index. | Static |
| NFR-030-AC-9 | No package was published and no tag was pushed, and the publication step is recorded as blocked with `agent-ix/quoin#290` named. | Inspection |

## Dependencies

- **Upstream**: [NFR-016](./NFR-016-isolated-conformance-corpus.md),
  [NFR-023](./NFR-023-non-disruptive-rust-backend.md),
  [NFR-025](./NFR-025-non-disruptive-typescript-backend.md),
  [NFR-027](./NFR-027-reproducible-non-disruptive-python-generation.md)
- **Downstream**: the publication gate `agent-ix/quoin#290`; the reopened
  `agent-ix/filament-core-data#21` and `agent-ix/filament-core-data#22`
- **Constrains**: [FR-081](../functional/FR-081-declare-the-semantic-kernel-bundle.md),
  [FR-085](../functional/FR-085-generate-the-kernel-typescript-package.md),
  [FR-086](../functional/FR-086-generate-the-kernel-rust-crate.md),
  [FR-087](../functional/FR-087-generate-the-kernel-python-package.md),
  [FR-088](../functional/FR-088-ship-the-modular-kernel-json-schema.md),
  [FR-090](../functional/FR-090-prove-cross-language-agreement.md)
