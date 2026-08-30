# Filament contract census evidence contract

This directory is the read-only evidence packet for
[`filament-core-data#10`](https://github.com/agent-ix/filament-core-data/issues/10).
It records what exists at pinned revisions; it does not define replacement
contracts or authorize migration.

## Evidence files

| File | Purpose |
|---|---|
| `snapshot.json` / `snapshot.md` | Initial repositories, revisions, dirty/worktree state, governed pins, collection access, and active-work baseline |
| `inventory.json` / `inventory.md` | Contract and evidence-locus inventory with explicit unknown/none/unavailable states |
| `parity.json` / `parity.md` | One fit disposition per contract and field-level comparison of repeated concepts |
| `conflicts.json` | Material type, identity, optionality, version, provenance, lifecycle, relationship, and loss mismatches |
| `missing-contracts.json` | Missing and deliberately unsupported representation families |
| `impact.json` / `impact.md` | Repository/concept effort, risk, dependency, wave, confidence, control, gate, and active-overlap assessment |
| `signoff-refresh.json` | Separate volatile-source refresh and drift disposition immediately before review |
| `validation.json` | Deterministic fingerprint and zero-mutation/publication/enforcement gate evidence |

## Explicit state model

Every nullable audit observation uses one of `known`, `none`, `not-applicable`,
`unknown`, or `unavailable`. `unknown` and `unavailable` require a consequence;
an empty string is never evidence. Fit uses exactly one of `fit`,
`fit-with-extension`, `duplicate`, `representation-local`, `split-required`,
`replacement-candidate`, or `missing`. Incomplete equivalence defaults to a
conflict-bearing disposition, never `fit`.

## Determinism and safety

`test/contract-census.test.ts` validates the packet, recomputes a canonical
SHA-256 fingerprint, resolves source loci, and rejects any audit output that
implies migration approval. Its initial TDD run on 2026-08-29 produced nine
expected failures because every evidence file was absent. All examined
repositories are read-only; pre-existing dirty state is evidence, not something
this audit cleans or modifies.
