---
id: NFR-023
title: "Non-disruptive Rust backend"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: "depends_on"
---
# NFR-023: Non-disruptive Rust backend

## Statement

The Rust backend SHALL land without publishing a crate, changing a published
schema or fixture, changing the conformance corpus beyond the one adapter slot
it is obliged to fill, or changing a downstream consumer, so that a defect found
later can be backed out by reverting this work alone.

## Rationale

The safety gate on issue #21 forbids crate publication until the cross-language
compatibility and release-readiness gates pass, and those gates have not moved.
Every crate manifest this work produces — emitted or hand-written — therefore
carries `publish = false`, and no step of this work contacts a registry.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Crates published by this work | 0 | 0 | Registry inspection and command inspection |
| Crate manifests without `publish = false`, emitted or hand-written | 0 | 0 | Analysis over every manifest in the change set and every emitted manifest |
| Downstream repositories changed | 0 | 0 | Inspection |
| Third-party crates without a pinned version, a recorded licence, and an attribution entry | 0 | 0 | Inspection of `Cargo.lock` against `THIRD-PARTY-NOTICES.md` |
| Added package manifests without `AGPL-3.0-or-later` | 0 | 0 | Licence inspection |

## Verification

Inspect every crate manifest, emitted and hand-written, for `publish = false`,
and every added manifest for the licence. Compare `Cargo.lock`'s third-party
entries against `THIRD-PARTY-NOTICES.md`. Confirm no registry publication
occurred.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-023-AC-5 | Every crate manifest this work produces carries `publish = false` — the emitted one and each of the hand-written crates — and removing that emission, or dropping it from a hand-written manifest, makes a test fail. | Test |
| NFR-023-AC-6 | No crate was published and no downstream repository was changed. | Inspection |
| NFR-023-AC-7 | Every added package manifest declares `AGPL-3.0-or-later`, and every third-party crate in `Cargo.lock` has a pinned version, a recorded SPDX licence compatible with AGPL-3.0-or-later, and an entry in `THIRD-PARTY-NOTICES.md`. | Analysis |

## Dependencies

- **Upstream**: [NFR-021](./NFR-021-non-disruptive-compiler-core.md), [NFR-016](./NFR-016-isolated-conformance-corpus.md)
- **Downstream**: issues #11, #7, #22, #23
