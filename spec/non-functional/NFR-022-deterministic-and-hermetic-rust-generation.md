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
  - target: "ix://agent-ix/filament-core-data/FR-062"
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
- Operational context: an offline workstation with the pinned Rust toolchain and
  a warm cargo cache. The repository has no CI lane carrying a Rust toolchain,
  which is why the platform population below is one row.

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

The second platform row is unreachable in this ticket, and the metrics below say
so rather than scoring around it. The repository's only CI is
`.github/workflows/build-test.yml`, a Node-only reusable workflow triggered on
`workflow_dispatch` alone, with no Rust toolchain and no OS matrix; `.github/**`
is a prohibited path under
[NFR-023](./NFR-023-non-disruptive-rust-backend.md), so this change cannot add a
Rust lane. Measuring "byte differences across the rows that have evidence" would
therefore score a perfect zero over a population of one, which is a number that
cannot fail. The two metrics below replace it: one measures the determinism this
ticket can actually measure, on the authoring platform, over every corpus base;
the other measures the honesty of the matrix, counting rows claimed supported
without named measured evidence. Cross-platform determinism is a claim this
ticket does not make and the support matrix records as unmet with its owning
issue.

The published `rust` target contract already constrains the runtime dependency
set to `serde` alone. That constraint is what makes offline generation and
offline consumption reachable at all, and it is why the pattern work of FR-057
generates a matcher rather than reaching for an engine.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte differences between two generations of one request on the authoring platform, over every corpus base | 0 | 0 | Byte comparison over an actual second run |
| Byte differences across the declared environment perturbations | 0 | 0 | Byte comparison under varied `TZ`, `LANG`, `HOME`, `PWD` |
| Platform matrix rows listed as supported without named measured evidence | 0 | 0 | Inspection of the support matrix against the named runs |
| Live references to a clock, RNG, environment, cwd, or child process in the generator's module graph | 0 | 0 | Static analysis |
| Runtime dependencies of a generated crate other than `serde` | 0 | 0 | Manifest inspection |
| Network calls during generation, build, and consumption | 0 | 0 | Offline run |
| `rustfmt --check` changes over generated output, under the pinned `rustfmt` version | 0 | 0 | Formatter check |
| Unsupported constructs silently mapped to `String`, an open value, or an untyped map | 0 | 0 | Degradation scan of every generated declaration against `mapping-table.json` |
| Injected degradations the scan fails to catch | 0 | 0 | Fault injection of a `String` substitution for a constrained scalar |
| Values on which the crate's ECMAScript number formatter disagrees with `JSON.stringify` | 0 | 0 | Differential comparison over the declared value set of FR-059-AC-15 |
| Panics from the Rust reader over mutated inputs | 0 | 0 | Fuzz under a failing panic hook |

## Verification

Generate each corpus base twice into two scratch directories and compare bytes;
repeat under each declared environment perturbation and compare across them;
inspect the support matrix and confirm every row listed supported names the
triple, the toolchain version, the `rustfmt` version, and the run its evidence
came from; scan the generator's module graph for clock, RNG, environment, cwd,
and child-process references; inspect every generated `Cargo.toml` dependency
section; run generation, build, and consumption with the network denied and
cargo in offline mode; run `rustfmt --check` under the pinned version over every
generated crate; run the degradation scan over every generated declaration
against `src/compiler/backends/rust-serde/mapping-table.json` and re-run it
against an emitter deliberately degraded to substitute `String` for a
constrained scalar, which the scan must fail on; compare the crate's ECMAScript
number formatter against `JSON.stringify` over the declared value set; and fuzz
the Rust reader under a panic hook that fails the test. Every gate reports the
number it measured, and a gate that cannot run fails saying so rather than
passing.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-022-AC-1 | A gate that cannot resolve its inputs fails naming what it could not read, and never passes vacuously or skips. | Test (TC-736) |
| NFR-022-AC-2 | The degradation scan is measured against `src/compiler/backends/rust-serde/mapping-table.json`, not against a copy of the generated output, so it cannot pass by comparing bytes to themselves. | Test (TC-735) |
| NFR-022-AC-3 | Every platform matrix row is either supported with named measured evidence or recorded unmet with its reason and owning issue. | Inspection (TC-735) |
| NFR-022-AC-4 | The offline run is a genuine offline run: the build fails if the network is reachable and depended upon, demonstrated by removing a cached crate and observing the failure. | Test (TC-734) |
| NFR-022-AC-5 | An emitter deliberately degraded to substitute `String` for a constrained scalar makes the degradation scan fail naming the declaration, so the scan is proven able to fail on the defect it exists to catch. | Test (TC-735) |
| NFR-022-AC-6 | Two generations of each corpus base on the authoring platform differ in zero bytes, measured over an actual second run rather than a cached result. | Test (TC-731) |
| NFR-022-AC-7 | The crate's ECMAScript number formatter agrees with `JSON.stringify` on every value of the declared set of FR-059-AC-15, and a disagreement fails the gate naming the value. | Test (TC-733) |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [NFR-019](./NFR-019-deterministic-contract-compilation.md)
- **Downstream**: [FR-060](../functional/FR-060-produce-deterministic-rustfmt-clean-output.md), [FR-062](../functional/FR-062-cover-every-mapping-branch.md), issue #11, issue #7
