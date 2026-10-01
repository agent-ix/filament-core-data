---
id: NFR-018
title: "Non-disruptive promotion with a clean rollback"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-044"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-018] Non-disruptive promotion with a clean rollback

## Statement

The promotion SHALL leave every consumer, schema, fixture, catalog pin, and
published package entry point unchanged.

## Scope

- Applies to: the whole promotion change set.
- Operational context: the safety gate on issue #27 forbids extraction from
  coinciding with package publication or consumer cutover; publication stays
  gated on issue #11 and `agent-ix/quoin#290`.

## Rationale

The compiler chain is being pulled forward ahead of publication. If the
promotion also moved a consumer or shipped a package entry point, a defect found
later could not be backed out without a consumer migration. Keeping the change
set inert means the only thing at risk is the compiler source itself. The
repository's `files` list already ships `src/`, so the promotion does enlarge the
published tarball; that enlargement is source-only and is recorded rather than
denied.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by the promotion | 0 | 0 | Workflow and tag inspection |
| Non-AGPL-3.0-or-later original source files added | 0 | 0 | Licence inspection |
| Third-party dependencies added without a pin and an attribution | 0 | 0 | Dependency and licence inspection |

## Verification

Read the licence field of every package manifest under `src/compiler/` and of
every manifest the branch adds, and confirm no third-party dependency was added.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-018-AC-4 | Every package manifest under `src/compiler/**` in the working tree, and every package manifest the branch adds, declares `"license": "AGPL-3.0-or-later"`. | Inspection |
| NFR-018-AC-7 | No workflow file, tag, or registry publication step is added or triggered by the promotion. | Inspection |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md), [NFR-017](./NFR-017-deterministic-promoted-compilation.md)
- **Downstream**: issues #19, #21, #22, #23, #11, `agent-ix/quoin#290`
