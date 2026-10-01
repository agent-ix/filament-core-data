---
id: NFR-021
title: "Non-disruptive compiler core"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-018"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-021] Non-disruptive compiler core

## Statement

The compiler core SHALL land without publishing a package, changing a published
contract, changing a downstream consumer, or altering the frozen prototype path,
so that a defect found later can be backed out by reverting this work alone.

## Rationale

The ticket's own safety gate says no language package publication and no
downstream consumer change, and the IR v1 freeze depends on the conformance and
compatibility tickets passing rather than on this one landing. Two frozen
records are at risk in particular: the four issue #4 goldens that are the only
oracle proving the #27 promotion was faithful, and the issue #34 and #35
schemas, fixtures, and readers that this compiler is measured against. A
compiler that edits its own oracle proves nothing.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by this work | 0 | 0 | Registry inspection |
| Downstream repositories changed | 0 | 0 | Inspection |
| Added package manifests without `AGPL-3.0-or-later` | 0 | 0 | Licence inspection |

## Verification

Inspect every added manifest for the licence; confirm no registry publication
occurred.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-021-AC-7 | Every added package manifest declares `"license": "AGPL-3.0-or-later"`. | Analysis |
| NFR-021-AC-8 | No package was published and no downstream repository was changed. | Inspection |

## Dependencies

- **Upstream**: [NFR-018](./NFR-018-non-disruptive-promotion-and-rollback.md), [NFR-012](./NFR-012-non-disruptive-contract-specification.md)
- **Downstream**: issues #11, #20, #21, #22, #23
