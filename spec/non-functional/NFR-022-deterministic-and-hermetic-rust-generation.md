---
id: NFR-022
title: "Deterministic and hermetic Rust generation"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-060"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "depends_on"
---
# NFR-022: Deterministic and hermetic Rust generation

## Statement

The Rust backend SHALL produce byte-identical output for one request without
reading the clock, the network, the environment, the locale, the hostname, or
any path outside the request, so that a difference between two generated crates
is always a difference between two contracts.

## Scope

- Applies to: `src/compiler/backends/rust-serde/**`, the crates under
  `crates/**` this issue adds, and every emitted byte of a generated crate.
- Does not apply to: the frozen issue #4 prototype emitter
  `src/compiler/backends/rust.mjs`, which this issue does not change.
- Operational context: an offline workstation and an offline CI runner, both
  with the pinned Rust toolchain and a warm cargo cache.

## Rationale

A generator that is not deterministic cannot be checked against a golden, and a
golden that cannot be checked is a file nobody reads. The repository has already
paid for this lesson once: issue #42 records a `--check` gate that only
reproduces on the workstation that minted its evidence, because the evidence
carried the minting host's own tool versions.

Hermeticity is the same property stated as an obligation on inputs. The moment a
byte of output depends on `TZ`, `LANG`, `HOME`, `PWD`, or the wall clock, the
determinism claim becomes conditional on facts nobody records, and the failure
mode is not a red suite — it is a green suite on one machine and a red suite on
another, which reads as flakiness and gets retried.

The published `rust` target contract already constrains the runtime dependency
set to `serde` alone. That constraint is what makes offline generation and
offline consumption reachable at all, and it is why the pattern work of FR-057
generates a matcher rather than reaching for an engine.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte differences between two generations of one request | 0 | 0 | Byte comparison over an actual second run |
| Byte differences across the declared environment perturbations | 0 | 0 | Byte comparison under varied `TZ`, `LANG`, `HOME`, `PWD` |
| Byte differences across the declared platform matrix rows with measured evidence | 0 | 0 | Byte comparison per row |
| Live references to a clock, RNG, environment, cwd, or child process in the generator's module graph | 0 | 0 | Static analysis |
| Runtime dependencies of a generated crate other than `serde` | 0 | 0 | Manifest inspection |
| Network calls during generation, build, and consumption | 0 | 0 | Offline run |
| `rustfmt --check` changes over generated output | 0 | 0 | Formatter check |
| Unsupported constructs silently mapped to `String`, an open value, or an untyped map | 0 | 0 | Degradation scan over generated output |
| Platform matrix rows listed as supported without measured evidence | 0 | 0 | Inspection |
| Panics from the Rust reader over mutated inputs | 0 | 0 | Fuzz under a failing panic hook |

## Verification

Generate each corpus base twice into two scratch directories and compare bytes;
repeat under each declared environment perturbation and compare across them;
scan the generator's module graph for clock, RNG, environment, cwd, and
child-process references; inspect every generated `Cargo.toml` dependency
section; run generation, build, and consumption with the network denied and
cargo in offline mode; run `rustfmt --check` over every generated crate; run the
degradation scan over every generated declaration against the published mapping
table; and fuzz the Rust reader under a panic hook that fails the test. Every
gate reports the number it measured, and a gate that cannot run fails saying so
rather than passing.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-022-AC-1 | A gate that cannot resolve its inputs fails naming what it could not read, and never passes vacuously or skips. | Test |
| NFR-022-AC-2 | The degradation scan is measured against the published mapping table, not against a copy of the generated output, so it cannot pass by comparing bytes to themselves. | Inspection |
| NFR-022-AC-3 | Every platform matrix row is either supported with named measured evidence or recorded unmet with its reason and owning issue. | Inspection |
| NFR-022-AC-4 | The offline run is a genuine offline run: the build fails if the network is reachable and depended upon, demonstrated by removing a cached crate and observing the failure. | Test |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [NFR-019](./NFR-019-deterministic-contract-compilation.md)
- **Downstream**: [FR-060](../functional/FR-060-produce-deterministic-rustfmt-clean-output.md), issue #11, issue #7
