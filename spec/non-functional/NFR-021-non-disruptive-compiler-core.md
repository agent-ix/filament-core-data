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

The set of paths this change touched is a fixed historical fact, and the gate
must read it as one. Measured as a live range against a moving reference it
degrades in one of two directions: against the trunk it empties on merge and
every prohibition passes over nothing, and from a fixed base to the current head
it grows, annexing each later ticket's paths and failing this ticket for work it
never did. Issue #20 measured the second on this requirement's own gate — 236
paths and no prohibited hit against the merged trunk, 406 paths and 139
prohibited hits against a sibling branch, all of them `conformance/**` and
`tests/` that NFR-016 legitimately permits for issue #20. The prohibitions here
are not widened to accommodate that; the range is narrowed to what this change
actually did.

## Scope

- Applies to: this change's own path set — the paths between the commit it
  replaced and the commit that introduced it, both located from history, plus
  the uncommitted paths in the tree that no later commit has taken over. It does
  not extend to paths a later ticket lands on top of this one.
- Permitted paths: as NFR-019.
- Prohibited paths: as NFR-019. A prohibited path is one this change changes no byte of; reading such a file, and invoking a program under `tests/`, remain permitted and are how the differential oracle of FR-050-AC-3 is run.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by this work | 0 | 0 | Registry inspection |
| Changes to `package.json` `exports`, `main`, `module`, `types`, `files` | 0 | 0 | Manifest comparison |
| Changes to `schema/**`, `fixtures/semantic/**`, `fixtures/semantic-core/**`, `packages/**` | 0 | 0 | Change-set diff |
| Changes to `spikes/**` and its committed goldens | 0 | 0 | Change-set diff |
| Changes to `conformance/**` | 0 | 0 | Change-set diff |
| Changes to the frozen prototype modules | 0 | 0 | Change-set diff |
| Paths this change's set gains when a later ticket lands on top of it | 0 | 0 | Accretion rehearsal |
| Downstream repositories changed | 0 | 0 | Inspection |
| Test cases failing after a revert of this branch | 0 | 0 | Restore rehearsal |
| Added package manifests without `AGPL-3.0-or-later` | 0 | 0 | Licence inspection |

## Verification

Resolve this change's own commit range from history — the parent of the
earliest commit that added one of its sentinel artifacts, through the latest
commit that added one — and confirm every path in that range, and every
uncommitted path in the tree that no later commit has taken over, is permitted
and none is prohibited; compare `package.json` metadata fields; re-run the full
suite on a revert of that range; inspect every added manifest for the licence;
confirm no registry publication occurred. Rehearse the range on a synthetic
history in which an unrelated change lands on top, and confirm the set does not
grow.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-021-AC-1 | Every path in this change's own set is in the permitted set and none is in the prohibited set. | Analysis |
| NFR-021-AC-2 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the pre-change baseline. | Analysis |
| NFR-021-AC-3 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, `backends/**`, and `inventory.json` are byte-unchanged from the pre-change baseline. | Analysis |
| NFR-021-AC-4 | The four committed issue #4 goldens and every file under `spikes/` are byte-unchanged. | Analysis |
| NFR-021-AC-5 | Nothing under `conformance/` is changed by this change. | Analysis |
| NFR-021-AC-6 | Reverting this change's own commit range leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand. | Test |
| NFR-021-AC-7 | Every added package manifest declares `"license": "AGPL-3.0-or-later"`. | Analysis |
| NFR-021-AC-8 | No package was published and no downstream repository was changed. | Inspection |
| NFR-021-AC-9 | Every gate in this requirement resolves both ends of its range from history rather than from a branch ref or the current head, and still fails on the same input after the change is merged. | Test |
| NFR-021-AC-10 | A later unrelated change landing on top of this one adds no path to this change's set, and a prohibited path at a path no later commit owns still fails the gate. | Test |

## Dependencies

- **Upstream**: [NFR-018](./NFR-018-non-disruptive-promotion-and-rollback.md), [NFR-012](./NFR-012-non-disruptive-contract-specification.md)
- **Downstream**: issues #11, #20, #21, #22, #23
