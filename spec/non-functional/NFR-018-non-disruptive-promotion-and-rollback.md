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

The promotion SHALL publish no package, change no consumer, schema, fixture, or
catalog pin, and SHALL be revertible by reverting its own commits, leaving the
issue #4 spike as the only generator once more.

## Scope

- Applies to: the whole promotion change set.
- Operational context: the safety gate on issue #27 forbids extraction from
  coinciding with package publication or consumer cutover; publication stays
  gated on issue #11 and `agent-ix/quoin#290`.

## Rationale

The compiler chain is being pulled forward ahead of publication. If the
promotion also moved a consumer or shipped a package, a defect found later could
not be backed out without a consumer migration. Keeping the change set inert
means the only thing at risk is the compiler source itself.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Packages published by the promotion | 0 | 0 | Registry and workflow inspection |
| Files changed under `schema/`, `fixtures/`, `packages/`, `agent_ix_core_data/` | 0 | 0 | Changed-path gate |
| Corpus repository files changed | 0 | 0 | Changed-path gate |
| Public export surface of `@agent-ix/filament-core-data` changed | 0 entries | 0 entries | `package.json` `exports` comparison |
| Non-AGPL-3.0-only original source files added | 0 | 0 | Licence inspection |
| Commits needed to revert the promotion | branch revert only | branch revert only | Revert rehearsal |

## Verification

Diff the branch against `origin/main` and assert every changed path is on the
[NFR-017](./NFR-017-deterministic-promoted-compilation.md) permitted list;
compare `package.json` `exports`, `main`, `module`, and `types`; read the licence
field of every added package manifest; rehearse `git revert` of the promotion
commits on a scratch branch and re-run the gates.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-018-AC-1 | Every changed path on the branch is on the permitted list, and none is on the prohibited list. | Test |
| NFR-018-AC-2 | `package.json` `exports`, `main`, `module`, and `types` are byte-identical to `origin/main`. | Test |
| NFR-018-AC-3 | Every added package manifest declares `"license": "AGPL-3.0-only"`, and every third-party dependency the promotion relies on is already pinned and attributed by the existing manifests. | Inspection |
| NFR-018-AC-4 | Reverting the promotion commits restores `spikes/typespec-feasibility/emitter/`, restores the retained `evidence/custom.json` command, and leaves `spike:typespec:check` in the state it had on `origin/main`. | Demonstration |
| NFR-018-AC-5 | No workflow, tag, or registry publication is triggered by the promotion. | Inspection |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md), issue #11, `agent-ix/quoin#290`
- **Downstream**: issues #19, #21, #22, #23
