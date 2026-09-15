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

While the promotion is the only change on the branch, the maintainer SHALL
restore the issue #4 spike as the repository's only generator by reverting the
promotion commits.

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
| Files changed under `schema/`, `fixtures/`, `packages/`, `agent_ix_core_data/`, `audit/` | 0 | 0 | Changed-path gate |
| Corpus repository files changed | 0 | 0 | Changed-path gate over the branch diff |
| `exports`, `main`, `module`, `types` entries changed in `package.json` | 0 | 0 | Manifest comparison |
| Published `files` globs changed in `package.json` | 0 | 0 | Manifest comparison |
| Added tarball paths outside `src/compiler/` | 0 | 0 | Packed-file listing comparison |
| Promoted compiler modules absent from the packed-file set the `files` globs name | 0 | 0 | Packed-file listing over the working tree |
| Non-AGPL-3.0-or-later original source files added | 0 | 0 | Licence inspection |
| Third-party dependencies added without a pin and an attribution | 0 | 0 | Dependency and licence inspection |
| Promotion commits that survive a revert to the pre-promotion commit | 0 | 0 | Revert rehearsal against the commit the promotion replaced |

## Verification

Diff the branch against `origin/main` and assert every changed path is on the
[NFR-017](./NFR-017-deterministic-promoted-compilation.md) permitted list;
compare `package.json` `exports`, `main`, `module`, `types`, and `files`; assert that the branch adds no packed path
outside `src/compiler/` and that the packed-file set the `files` globs name over
the working tree contains the promoted compiler modules; read the licence field
of every package manifest under `src/compiler/` and of every manifest the branch
adds, and confirm no third-party dependency was added; rehearse the revert by
restoring every path that differs between the pre-promotion commit and `HEAD`
onto a scratch worktree and re-running the gates. The rehearsal's baseline is
the commit the promotion replaced — discovered from history through a file the
promotion created — and not the branch point, because `origin/main...HEAD` is
empty once the promotion merges and a rehearsal over an empty range rehearses
nothing.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-018-AC-1 | Every changed path on the branch is on the permitted list, and none is on the prohibited list. | Test |
| NFR-018-AC-2 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-identical to `origin/main`. | Test |
| NFR-018-AC-3 | Every packed path the branch adds lies under `src/compiler/**`, the packed-file set the `package.json` `files` globs name over the working tree contains the promoted compiler entry points, emitter, and backends, and the promotion records in `src/compiler/inventory.json` that the compiler ships as source only, with a public entry point deferred to issue #11. | Test |
| NFR-018-AC-4 | Every package manifest under `src/compiler/**` in the working tree, and every package manifest the branch adds, declares `"license": "AGPL-3.0-or-later"`. | Inspection |
| NFR-018-AC-5 | The promotion adds no third-party dependency, so no new attribution is owed; `package.json` dependency sets are byte-identical to `origin/main` apart from the removed spike-emitter entry. | Test |
| NFR-018-AC-6 | Restoring every path that differs between the pre-promotion commit and `HEAD` reproduces the pre-promotion tree exactly, including the restored `spikes/typespec-feasibility/emitter/` and the original `evidence/custom.json` command. The pre-promotion commit is the parent of the commit that added `src/compiler/inventory.json`, located from history so the rehearsal keeps a fixed baseline after the promotion merges. | Test |
| NFR-018-AC-7 | No workflow file, tag, or registry publication step is added or triggered by the promotion. | Inspection |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [NFR-014](./NFR-014-small-kernel-discipline.md), [NFR-017](./NFR-017-deterministic-promoted-compilation.md)
- **Downstream**: issues #19, #21, #22, #23, #11, `agent-ix/quoin#290`
