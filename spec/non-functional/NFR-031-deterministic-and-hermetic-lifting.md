---
id: NFR-031
title: "Deterministic and hermetic lifting"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "depends_on"
---
# [NFR-031] Deterministic and hermetic lifting

## Statement

The extraction frontend SHALL produce byte-identical IR and diagnostic output
for identical bundle, module, and limit inputs on the pinned toolchain, with
every host-varying input — working directory, `HOME`, locale, clock, hostname,
environment, network, cargo target directory, and file-system enumeration
order — either supplied explicitly or excluded from the output, and SHALL
terminate on any input that exceeds a declared limit with a blocking,
source-located diagnostic rather than by exhausting memory or time.

## Scope

- Applies to: `crates/extraction-frontend/**` — the library, its command line,
  its `limits.json`, and every byte it emits.
- Does not apply to: the `quire-rs` engine it consumes, whose own determinism is
  NFR-006 of that crate and is taken as given at the pinned revision; and the
  TypeSpec frontend, which this change does not touch.
- Operational context: an offline workstation with Rust 1.98.1 installed
  beside the workspace's pinned channel, cargo in offline mode, and a warm
  cache. There is no CI lane carrying a Rust toolchain, so the platform
  population is one row; cross-platform determinism is not claimed here.

## Rationale

The lifted document is the input to every backend and the subject of the
cross-frontend parity check of FR-098. If two lifts of one bundle disagree by
a byte, the parity check cannot tell a frontend defect from a host difference,
and the fifth acceptance criterion of issue #36 — a table-authored and a
fence-authored declaration produce identical IR — becomes a claim about one
machine on one afternoon.

The repository has paid for each of the ambient inputs listed above at least
once. NFR-019 records a locale-dependent sort and an ambient working
directory in the prototype path; NFR-022 records a `--check` gate that
reproduced only on its minting workstation because the evidence carried that
host's tool versions (issue #42); and the Phase 0 gate for this ticket found a
stale module installed under `~/.ix` that differs from the module on `main`,
which is exactly why FR-091 forbids ambient module discovery. A frontend that
read `HOME` would lift the same bundle to two different documents on two
machines and call both correct.

Hermeticity is the same property stated as an obligation on inputs. The
frontend reads two things — a bundle root and a set of module roots — through
the engine's own loaders, and nothing else. The cargo target directory is named
explicitly because the workspace `Makefile` sets it per checkout for exactly the
reason NFR-022 gives: a shared target directory serves a determinism gate an
artifact another checkout built.

Bounded inputs are the other half of the same claim. A bundle is untrusted
input in the sense NFR-020 gives the term: a corpus repository is read-only and
its authors are not this frontend's authors. A document with ten thousand
fields, a bundle with ten thousand documents, or a clause fence of a hundred
megabytes must fail at a stated limit with a diagnostic naming the limit and
the locus, never by allocating until the host kills the process. The limits are
data in the crate, read at run time and asserted by test, so that the number
the diagnostic names and the number the code enforces cannot drift.

Iteration order is where determinism most often leaks in Rust. The engine's own
audit bans `HashMap` in every module whose iteration order is observable; this
crate mirrors that rule rather than trusting itself to remember which maps are
observed. `unsafe_code = "forbid"` at the crate root is the same posture the
workspace's existing members take: with no first-party `unsafe`, there is no
first-party undefined behaviour to reason about.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte difference between two lifts of one bundle in one process | 0 | 0 | Repeat-run comparison |
| Byte difference between two lifts in separate processes | 0 | 0 | Repeat-run comparison over the command line |
| Byte difference across a changed working directory, `HOME`, `TZ`, `LANG`, `LC_ALL`, and `CARGO_TARGET_DIR` | 0 | 0 | Varied-environment run |
| Byte difference between the table-form and fence-form lift of one declaration | 0 | 0 | Cross-form comparison |
| Byte difference across two injected directory-enumeration orders | 0 | 0 | Instrumented enumeration test |
| Ambient inputs read without an explicit parameter (cwd, `HOME`, environment, clock, hostname, RNG) | 0 | 0 | Static analysis of the crate's source |
| Network connections opened during a lift | 0 | 0 | Offline run |
| Files opened by the crate itself, outside the engine's loaders, while loading a bundle | 0 | 0 | Static analysis + instrumented run |
| Declared limits in `limits.json` not enforced by a blocking diagnostic | 0 | 0 | Limit-probe tests, one per limit |
| Limit values named in a diagnostic that differ from `limits.json` | 0 | 0 | Test reading both |
| Lifts of an over-limit input that terminate other than by the limit's diagnostic | 0 | 0 | Limit-probe tests under a memory and time cap |
| `HashMap` or `HashSet` in a module whose iteration order reaches the output | 0 | 0 | Static audit mirroring `quire-rs`'s |
| First-party `unsafe` blocks | 0 | 0 | `unsafe_code = "forbid"` at the crate root |
| Panics from the frontend over mutated bundles | 0 | 0 | Fuzz under a failing panic hook |

## Verification

Lift the `config-version` fixture bundle twice in one process and twice through
the command line into two scratch directories and compare bytes; repeat with a
different working directory and with `HOME` pointed at an empty directory,
`TZ`, `LANG`, `LC_ALL`, and `CARGO_TARGET_DIR` set to values a second host would
carry, and compare across every run; lift the table-form and fence-form copies
of the same artifact and compare; drive a lift through an injected enumeration
order reversed from the first and compare; grep the crate's source for
`SystemTime`, `Instant`, `std::env`, `env!`, `option_env!`, `hostname`,
`rand`, `HashMap`, `HashSet`, `std::fs`, `std::net`, and `Command`, and confirm
each hit is either absent or confined to the command-line binary's argument
parsing; run the suite with the network denied and cargo in offline mode; for
every entry of `limits.json`, construct a bundle one past the limit and confirm
the lift returns the named blocking diagnostic at the offending locus within a
bounded memory and time budget, and that the number the diagnostic names is
read from `limits.json` rather than restated; run the `HashMap` audit over
`src/`; confirm the crate root carries `#![forbid(unsafe_code)]`; and fuzz the
frontend over mutated bundle trees under a panic hook that fails the test.
Every gate reports the number it measured, and a gate that cannot run fails
saying so rather than passing.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-031-AC-1 | Two lifts of the `config-version` fixture bundle, within one program run and across two program runs, produce identical IR and diagnostic bytes. | Test (TC-1300) |
| NFR-031-AC-2 | A lift with the working directory changed, `HOME` pointed at an empty directory, and `TZ`, `LANG`, `LC_ALL`, and `CARGO_TARGET_DIR` set to values differing from the first run produces bytes identical to the first run. | Test (TC-1301) |
| NFR-031-AC-3 | The table-form and fence-form copies of one declaration lift to identical bytes. | Test (TC-1302) |
| NFR-031-AC-4 | Two injected directory-enumeration orders produce identical output. | Test (TC-1303) |
| NFR-031-AC-5 | No module under `crates/extraction-frontend/src/` references `SystemTime`, `Instant`, `std::env`, `env!`, `option_env!`, a hostname API, an RNG, `std::net`, or `std::process::Command`, and none but the command-line binary and the engine's loaders references `std::fs`. | Analysis (TC-1304) |
| NFR-031-AC-6 | `limits.json` declares `maxDocuments`, `maxDocumentBytes`, `maxFieldsPerRecord`, `maxClauseBytes`, and `maxDepth`; for each, a bundle one past the limit yields exactly one blocking `agent-ix.extraction-frontend.LIMIT_*` diagnostic at the offending document, within a bounded memory and time budget, and the value the diagnostic names equals the file's. | Test (TC-1305) |
| NFR-031-AC-7 | A lift with the network denied and cargo in offline mode succeeds; the crate declares no dependency that opens a socket. | Test (TC-1306) |
| NFR-031-AC-8 | The `HashMap` audit over `crates/extraction-frontend/src/` reports zero hits, and every map whose iteration order reaches the output is a `BTreeMap` or an `IndexMap`. | Analysis (TC-1307) |
| NFR-031-AC-9 | The crate root carries `#![forbid(unsafe_code)]` and `cargo +1.98.1 build` fails on an injected `unsafe` block. | Test (TC-1308) |
| NFR-031-AC-10 | Over 256 mutated bundle trees the frontend returns a result or a diagnostic and never panics. | Fuzz (TC-1309) |

## Dependencies

- **Upstream**: [NFR-019](./NFR-019-deterministic-contract-compilation.md), [NFR-020](./NFR-020-bounded-and-safe-compilation.md), [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md), issue #42
- **Downstream**: [FR-091](../functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-093](../functional/FR-093-lower-field-declarations-to-ir-fields.md), [FR-097](../functional/FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
