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

## Scope

- Applies to: the whole branch.
- Permitted paths: as NFR-019.
- Prohibited paths: as NFR-019. A prohibited path is one this branch changes no byte of; reading such a file, and invoking a program under `tests/`, remain permitted and are how the differential oracle of FR-050-AC-3 is run.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by this work | 0 | 0 | Registry inspection |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files` | 0 | 0 | Manifest comparison |
| Changes to `schema/**`, `fixtures/semantic/**`, `fixtures/semantic-core/**`, `packages/**` | 0 | 0 | Branch diff |
| Changes to `spikes/**` and its committed goldens | 0 | 0 | Branch diff |
| Changes to `conformance/**` | 0 | 0 | Branch diff |
| Changes to the frozen prototype modules | 0 | 0 | Branch diff |
| Downstream repositories changed | 0 | 0 | Inspection |
| Test cases failing after a revert of this branch | 0 | 0 | Restore rehearsal |
| Added package manifests without `AGPL-3.0-only` | 0 | 0 | Licence inspection |

## Verification

Diff the branch against `origin/main` and confirm every changed path is
permitted and none is prohibited; compare `package.json` metadata fields;
re-run the full suite on a revert of the branch; inspect every added manifest
for the licence; confirm no registry publication occurred.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-021-AC-1 | Every changed path on the branch is in the permitted set and none is in the prohibited set. | Analysis |
| NFR-021-AC-2 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from `origin/main`. | Analysis |
| NFR-021-AC-3 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, `backends/**`, and `inventory.json` are byte-unchanged from `origin/main`. | Analysis |
| NFR-021-AC-4 | The four committed issue #4 goldens and every file under `spikes/` are byte-unchanged. | Analysis |
| NFR-021-AC-5 | Nothing under `conformance/` is changed by this branch. | Analysis |
| NFR-021-AC-6 | Reverting the branch leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand. | Test |
| NFR-021-AC-7 | Every added package manifest declares `"license": "AGPL-3.0-only"`. | Analysis |
| NFR-021-AC-8 | No package was published and no downstream repository was changed. | Inspection |

## Dependencies

- **Upstream**: [NFR-018](./NFR-018-non-disruptive-promotion-and-rollback.md), [NFR-012](./NFR-012-non-disruptive-contract-specification.md)
- **Downstream**: issues #11, #20, #21, #22, #23
