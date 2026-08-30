# Filament contract census snapshot

Collected at `2026-08-30T00:18:21Z` for
[`filament-core-data#10`](https://github.com/agent-ix/filament-core-data/issues/10).
The machine-readable authority for this snapshot is [snapshot.json](./snapshot.json).

## Scope

Eight repositories are in scope: the shared contract owner, four named Filament
consumer/boundary repositories, Quire, Quoin, and the governed complete-graph
corpus. Default semantic-module repositories are intentionally delegated to
`quoin#288`; their exact Quoin catalog pins are retained here.

| Repository | Revision | State | Audit consequence |
|---|---|---|---|
| `filament-core-data` | `c542b34` | dirty audit branch | Issue #10 output is not source-contract evidence |
| `filament-domain-events` | `c01b699` | clean `main` | Exact committed Python DTO baseline |
| `filament-core-service` | `a50e899` | two dirty paths | Dirty core-data test/dependency work excluded from committed model claims |
| `filament-parser-lib` | `8ef0128` | clean issue #8 branch | Measures the unmerged Quire compatibility shim |
| `filament-ide-rs` | `b63141f` | clean `main`, six worktrees | Worktrees are active overlap; main is the contract baseline |
| `quire-rs` | `0f4cc5f` | one untracked non-contract path | Committed extraction boundary remains source evidence |
| `quoin` | `1a0092f` | dirty branch plus two worktrees | Default module pins are committed; active spec work is overlap |
| `quire-corpus` | `68eb2c7` | clean `main` | Governed truth-set revision delivered by `quire-rs#385` |

## Collection completeness

Named issues, the architecture PR, the parser branch, local worktrees, and Quoin
pins were read successfully. Project 17 and 18 item lists each returned exactly
the requested 200-item cap, so those two collections are explicitly
`incomplete`; they are not used to claim that all active ecosystem work was
enumerated. Direct program issue queries and local worktrees provide the named
overlap evidence, and confidence remains low for unknown work beyond the cap.

## Immediate sequencing facts

- The architecture record is mergeable in PR #16 but still requires independent review.
- `quire-rs#385` is closed and the governed corpus is pinned at `68eb2c7`.
- `filament-parser-lib#8` is In review on local branch `8ef0128` but has no PR.
- `filament-ide-rs#511` remains in Specify, with graph/assurance/core worktrees active.
- No source, branch, worktree, project item, package, catalog pin, or corpus file was changed by collection.
