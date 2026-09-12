---
id: Task-150
title: "NFR-036 cross-architecture, numeric-refusal and ambient-read apparatus"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-149"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-036"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-118"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1448"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1452"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1456"
    type: verifies
---
# Task-150: NFR-036 cross-architecture, numeric-refusal and ambient-read apparatus

## Scope

Provide the apparatus NFR-036 names this plan the owner of and that Task-149 does
not: the second architecture of the named set and the runner that supplies it, the
instrumented ambient-read run, and the unprivileged network namespace. Then take
the three measurements that depend on them.

The named architecture set is exactly `x86_64-unknown-linux-gnu` and
`aarch64-unknown-linux-gnu`. No third architecture is claimed and cross-platform
determinism beyond that set is not asserted.

## Subtasks

- [ ] **Green: the runner.** Add the `aarch64-unknown-linux-gnu` execution path as a
  Makefile target beside the existing `rust-*` targets, naming its runner explicitly.
  A run that cannot reach the second architecture **fails saying so** and reports
  which architecture it could not reach; it never passes vacuously and never skips.
- [ ] **Red: cross-architecture bytes.** `tc_1452_` (every digested document's
  canonical byte string agrees across both architectures of the named set against the
  one committed golden Task-149 cut, and every admit-versus-refuse decision agrees
  too; the gate reports the document count and the architecture it ran on).
- [ ] **Red: cross-architecture numeric refusals.** `tc_1448_` (one configuration
  document's declared `numericResourceLimit` refuses the same numbers and admits the
  same numbers on each architecture of the named set, so no admit-versus-refuse
  decision differs by host; the refused set is compared element by element, not by
  count — FND-1716 is why this is measured beside byte agreement rather than assumed
  from it).
- [ ] **Red: ambient reads.** `tc_1456_` (`Static` plus runtime: a call-graph analysis
  over the canonicalization and admission path counting locale reads, environment
  reads, working-directory resolutions, clock reads and socket opens — target zero,
  **no exemption list** (FND-1741) — plus an instrumented offline run inside an
  unprivileged network namespace recording every such read; both report the number
  they measured).
- [ ] **Green: the namespace and instrumentation.** The offline run uses an
  unprivileged network namespace; if the namespace cannot be created, the gate fails
  reporting that it did not run. The instrumentation records reads rather than
  asserting their absence, so the evidence is a measured zero and not an unexercised
  assertion.
- [ ] **Falsify.** Plant a `std::env::var` read on the canonicalization path in a
  scratch copy and prove the call-graph half of `tc_1456_` fails naming it; plant a
  clock read and prove the instrumented half records it. Plant a host-derived numeric
  limit in a scratch copy and prove `tc_1448_` fails.

## Exit conditions

- Both architectures of the named set actually run, and a run that cannot reach one
  fails naming it.
- TC-1448, TC-1452 and TC-1456 are traced executable controls that report measured
  numbers, with zero ambient reads and zero exemptions.
- No gate in this plan is left in the "apparatus missing, did not run" state.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from the
  two pre-existing reds.

## Deliverables

- Makefile targets for the second architecture and the instrumented offline run
- `crates/baseline-producer/tests/ambient_audit.rs`,
  `tests/cross_architecture.rs`

## Notes

- NFR-036-M-3 measures admit-versus-refuse agreement **beside** byte agreement
  because without it two hosts could report 100% byte agreement while disagreeing on
  which documents exist at all.
- The float-coercion audit (TC-1454) is Task-143's; this task adds no second numeric
  audit.
- Unblocks: Task-151.
