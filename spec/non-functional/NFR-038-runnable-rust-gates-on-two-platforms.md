---
id: NFR-038
title: "Runnable Rust gates on two platforms"
type: NFR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: "depends_on"
---
# NFR-038: Runnable Rust gates on two platforms

## Statement

Every Rust gate this repository declares SHALL be runnable from a single named
`make` target and from a dispatchable continuous-integration lane, on at least
two platforms differing in operating system and processor architecture.

## Scope

- Applies to: the workspace build, format, lint, test and conformance gates, and
  the `crates/extraction-frontend` gates qualified on their own toolchain.
- Operational context: a clean checkout with no repository state beyond the
  commit under test, and a runner that installs its toolchains from scratch.
- Out of scope: which events start a run. The lane is started deliberately;
  nothing here adds an event trigger, and the `workflow_dispatch`-only policy is
  unchanged by this requirement.
- Out of scope: publication. No gate here publishes to any registry.

## Rationale

This requirement answers [filament-core-data#60](https://github.com/agent-ix/filament-core-data/issues/60).

The Rust gates ran in no lane at all. The reused Node workflow installs no Rust
toolchain, so `cargo clippy`, `cargo fmt --check` and every Rust suite were
unreachable from continuous integration — while `make test` invoked them through
`test-node`, a target named for another language, which is why their absence
from the Node lane was not obvious.

The cause is recorded rather than inferred: `.github/**` was a prohibited
changed path for issues #21, #22 and #23, so none of the three tickets that
introduced Rust to this repository was permitted to add a Rust job. The gap is
a consequence of a scope fence, not an oversight, and it does not close until a
ticket is allowed to cross that fence.

A second platform is required because [FR-060](../functional/FR-060-produce-deterministic-rustfmt-clean-output.md)
claims byte-identical generated output and one runner cannot evidence a claim
about two. The claim has been asserted and never measured. A second platform
that differs only in operating system would leave the architecture half
unmeasured, and the development host can evidence neither: it has no cross
linker and no emulation for a second architecture, so a local cross-architecture
gate fails on apparatus rather than on the property.

A gate that cannot pass is worth less than no gate, because it trains readers to
discount a red result. A lane is therefore not delivered until the gates in it
pass on a clean checkout — which is a stronger statement than it appears, since
several gates passed only on hosts carrying residue from earlier work.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Rust gates reachable from one named make target | all | all | Inspection |
| Rust gates reachable from a dispatchable lane | all | all | Inspection |
| Platforms the lane runs on | 2 | 2 | Inspection |
| Distinct processor architectures across those platforms | 2 | 2 | Inspection |
| Workspace crates covered by the lint gate | all | all | Analysis |
| Event triggers added to any workflow | 0 | 0 | Inspection |
| Rust gates failing on a clean checkout | 0 | 0 | Test |

## Verification

Run the named target on a clean checkout and observe it exits zero. Read the
workflow and observe its trigger set is exactly `workflow_dispatch`, its platform
matrix names two runners of differing operating system and architecture, and it
does not cancel a sibling platform on first failure — cancelling hides the
single-platform defect the matrix exists to find. Read the `make` targets and
observe every declared Rust gate is reachable from the named target, and that no
Rust gate is reachable only through a target named for another toolchain.

Falsify the lint metric by introducing a lint violation in a workspace member
other than the one previously covered, and observe the gate reports it.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| NFR-038-AC-1 | One named `make` target runs every declared Rust gate, and it exits zero on a clean checkout | Test |
| NFR-038-AC-2 | The lane's only trigger is `workflow_dispatch`, and no workflow in the repository gains a `push` or `pull_request` trigger | Inspection |
| NFR-038-AC-3 | The lane runs on two platforms differing in operating system and processor architecture, and reports both even when one fails | Inspection |
| NFR-038-AC-4 | The lint gate covers every workspace member, and a violation planted in any member is reported | Analysis |
| NFR-038-AC-5 | No Rust gate is reachable only through a target named for another toolchain | Inspection |
| NFR-038-AC-6 | Each platform records the crates it generated, so a cross-platform byte comparison is possible without re-running either | Inspection |
| NFR-038-AC-7 | A gate whose toolchain is absent fails naming the toolchain it could not run, and never skips | Test |

## Dependencies

- **Upstream**: [NFR-033](./NFR-033-qualified-toolchain-and-licensed-dependencies.md) names the qualification toolchain once, which the lane installs rather than restates
- **Downstream**: [FR-060](../functional/FR-060-produce-deterministic-rustfmt-clean-output.md) byte-identical output, whose cross-platform half this requirement makes measurable
