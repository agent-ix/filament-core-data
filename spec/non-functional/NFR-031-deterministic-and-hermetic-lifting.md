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
order — either supplied explicitly or excluded from the output.

If an input exceeds a declared limit, then the frontend SHALL terminate with a
blocking, source-located diagnostic naming the limit, within 512 MiB resident
memory and 30 s wall time on the fixture set.

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
structural cross-frontend parity check of FR-098. If two lifts of one bundle
disagree by a byte, the parity check cannot tell a frontend defect from a host
difference, and the table-form and fence-form identity of FR-093-AC-1 becomes
a claim about one machine on one afternoon.

The repository has paid for each of the ambient inputs listed above at least
once. NFR-019 records a locale-dependent sort and an ambient working
directory in the prototype path; NFR-022 records a `--check` gate that
reproduced only on its minting workstation because the evidence carried that
host's tool versions (issue #42); and the Phase 0 gate for this ticket found a
stale module installed under `~/.ix` that differs from the module on `main`,
which is exactly why FR-091 forbids ambient module discovery and why the
FR-091-AC-4 control plants a *conflicting* module under a fake `HOME`. A
frontend that read `HOME` would lift the same bundle to two different
documents on two machines and call both correct.

Hermeticity is the same property stated as an obligation on inputs. The
frontend reads two things — a bundle root and a set of module roots — through
the engine's own loaders (plus each module root's `manifest.yaml`, read once by
`write::read_manifest` in `write.rs` for FR-095's digests, FR-091-CON-2), and nothing else. The cargo target directory is named
explicitly because the workspace `Makefile` sets it per checkout for exactly the
reason NFR-022 gives: a shared target directory serves a determinism gate an
artifact another checkout built.

Determinism is not proved by the code under test judging itself. Two lifts
that agree prove only that the serializer is stable, not that its bytes are
right; every repeat-run criterion here therefore compares against the
committed golden of FR-098 (`expected/semantic-ir.json`,
`expected/diagnostics.json`) as the fixed point and against
`agent_ix_semantic_ir::decide({"ir": doc}).normalized` as the second,
independently written canonical form (FR-097).

Bounded inputs are the other half of the same claim. A bundle is untrusted
input in the sense NFR-020 gives the term: a corpus repository is read-only and
its authors are not this frontend's authors. A document with ten thousand
fields, a bundle with ten thousand documents, or a clause fence of a hundred
megabytes must fail at a stated limit with a diagnostic naming the limit and
the locus, never by allocating until the host kills the process. The limits are
data in the crate, read at run time and asserted by test, so that the number
the diagnostic names and the number the code enforces cannot drift. Two of the
limits are checked after the engine has read the bundle: `maxDocuments` and
`maxDocumentBytes` can only be counted once `quire_rs::corpus::load_repo` has
returned, because FR-091-CON-2 permits no other read, so those two bound what
is lowered rather than what is read, and the engine's own bounds cover the
read. The 512 MiB and 30 s budget is what the fixture set measures under; the
per-limit values themselves live in `limits.json`.

Iteration order is where determinism most often leaks in Rust. The engine's own
audit bans `HashMap` in every module whose iteration order is observable; this
crate mirrors that rule rather than trusting itself to remember which maps are
observed. Directory enumeration order is the engine's: `load_repo` returns
documents sorted by path (`quire-rs/src/corpus/walk.rs`, TC-473, its NFR-006),
and the crate opens no directory itself, so there is no enumeration seam to
inject and the criterion is analytic. `unsafe_code = "forbid"` at the crate
root is the same posture the workspace's existing members take: with no
first-party `unsafe`, there is no first-party undefined behaviour to reason
about.

Every static gate in this requirement names its exemption list and carries a
planted-token control — a scratch copy of the source with the forbidden token
inserted, on which the gate must fail — because a grep whose allowlist is
widened at implementation time measures whatever was widened.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte difference between a lift of one bundle and its committed golden, and between two lifts in one process | 0 | 0 | Golden comparison and repeat-run comparison |
| Byte difference between two lifts in separate processes and the committed golden | 0 | 0 | Repeat-run comparison over the command line |
| Byte difference across a changed working directory, `HOME`, `TZ`, `LANG`, `LC_ALL`, and `CARGO_TARGET_DIR` | 0 | 0 | Varied-environment run against the golden |
| Byte difference in `types[]` and diagnostics between the table-form and fence-form lift of one declaration at one bundle-relative path (`source.digest` differs by construction) | 0 | 0 | Cross-form comparison over two line-aligned bundle roots |
| Directories enumerated by the crate outside `quire_rs::corpus::load_repo` and `Registry::load_module_set` | 0 | 0 | Static analysis citing quire-rs path-sorted loading (TC-473) |
| Ambient inputs read without an explicit parameter (cwd, `HOME`, environment, clock, hostname, RNG) | 0 | 0 | Static analysis with a named exemption list and a planted-token control |
| Network connections opened during a lift | 0 | 0 | Offline run under `unshare -rn`, or an equivalent unprivileged network namespace |
| Files opened by the crate itself, outside the engine's loaders and `write.rs`, while lifting a bundle | 0 | 0 | Static analysis + instrumented run |
| Declared limits in `limits.json` not enforced by a blocking diagnostic | 0 | 0 | Limit-probe tests, one per limit |
| Limit values named in a diagnostic that differ from `limits.json` | 0 | 0 | Test reading both |
| Peak resident memory and wall time of a limit-probe lift over the fixture set | < 512 MiB, < 30 s | 512 MiB, 30 s | Limit-probe tests under a memory and time cap |
| `HashMap` or `HashSet` in a module whose iteration order reaches the output | 0 | 0 | Static audit mirroring `quire-rs`'s, with a planted-token control |
| First-party `unsafe` blocks | 0 | 0 | `unsafe_code = "forbid"` at the crate root, proved by a `compile_fail` doctest |
| Panics from the frontend over mutated bundles | 0 | 0 | `proptest` bundle-tree strategy under a failing panic hook |

## Verification

Lift the `config-version-table` fixture bundle twice in one process and twice
through the command line into two scratch directories and compare every run's
bytes against the committed golden and against
`decide({"ir": doc}).normalized`; repeat with a different working directory
and with `HOME` pointed at an empty directory, `TZ`, `LANG`, `LC_ALL`, and
`CARGO_TARGET_DIR` set to values a second host would carry, and compare across
every run; lift the `config-version-table` and `config-version-fence` bundle
roots, whose line-aligned copies of `FR-006` sit at the same bundle-relative
path, and compare their `types[]` and diagnostics; cite `quire-rs/src/corpus/walk.rs` for path-sorted loading and the
FR-091-CON-2 gate for the absence of any other read; grep the crate's source
for `SystemTime`, `Instant`, `std::env`, `env!`, `option_env!`, `hostname`,
`rand`, `HashMap`, `HashSet`, `std::fs`, `std::net`, and `Command`, confirm
each hit is either absent or on the exemption list named in NFR-031-AC-5, and
confirm the grep fails on a scratch copy carrying a planted token; run the
suite under `unshare -rn` (or an equivalent unprivileged network namespace) with cargo in offline mode; for every entry of
`limits.json`, construct a bundle one past the limit and confirm the lift
returns the named blocking diagnostic at the offending locus within 512 MiB
resident memory and 30 s wall time, and that the number the diagnostic names is
read from `limits.json` rather than restated; run the `HashMap` audit over
`src/` with its planted-token control; confirm the crate root carries
`#![forbid(unsafe_code)]` through a `compile_fail` doctest; and run the
`proptest` bundle-tree strategy under `crates/extraction-frontend/tests/` with
a panic hook that fails the test. Every gate reports the number it measured,
and a gate that cannot run fails saying so rather than passing.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-031-AC-1 | Two lifts of the `config-version-table` fixture bundle, within one program run and across two program runs, produce IR and diagnostic bytes identical to each other, to the committed `expected/semantic-ir.json` and `expected/diagnostics.json`, and to `decide({"ir": doc}).normalized`. | Test (TC-1300) |
| NFR-031-AC-2 | A lift with the working directory changed, `HOME` pointed at an empty directory, and `TZ`, `LANG`, `LC_ALL`, and `CARGO_TARGET_DIR` set to values differing from the first run produces bytes identical to the committed golden. | Test (TC-1301) |
| NFR-031-AC-3 | The `config-version-table` and `config-version-fence` bundle roots, each holding one line-aligned copy of `FR-006` at `spec/functional/FR-006-config-version-entity.md`, lift to identical `types[]` and diagnostics bytes; only `source.digest` differs, by construction. | Test (TC-1302) |
| NFR-031-AC-4 | The crate enumerates no directory itself: every document and module reaches it through `quire_rs::corpus::load_repo` and `Registry::load_module_set`, whose results are sorted by path (`quire-rs/src/corpus/walk.rs`, TC-473), so enumeration order cannot reach the output. | Analysis (TC-1303) |
| NFR-031-AC-5 | No module under `crates/extraction-frontend/src/` references `SystemTime`, `Instant`, `std::env`, `env!`, `option_env!`, a hostname API, an RNG, `std::net`, or `std::process::Command`; `std::fs` appears only in `write.rs`, the crate's sole `std::fs` module, whose reads are exactly `<module root>/manifest.yaml` per supplied module root (`write::read_manifest`, called from `lift.rs`, FR-091-CON-2), the golden walk, and `inspect --ir`, and whose writes are the atomic outputs of FR-097; every other module is `std::fs`-free, and `bundle.rs` reaches the file system only through `quire_rs::corpus::load_repo` and `Registry::load_module_set`; the exemption list is exactly `write.rs` for `std::fs` and the command-line binary's argument parsing for `std::env`; and the gate fails on a scratch copy with a planted `std::env::var` in `lower.rs`. | Analysis (TC-1304) |
| NFR-031-AC-6 | `limits.json` declares `maxDocuments`, `maxDocumentBytes`, `maxFieldsPerRecord`, `maxClauseBytes`, and `maxDepth`; for each, a bundle one past the limit yields exactly one blocking `agent-ix.extraction-frontend.LIMIT_*` diagnostic at the offending document, within 512 MiB resident memory and 30 s wall time, and the value the diagnostic names equals the file's. | Test (TC-1305) |
| NFR-031-AC-7 | The crate suite run under `unshare -rn`, or an equivalent unprivileged network namespace, with cargo in offline mode passes, and the crate declares no dependency that opens a socket. | Static (TC-1306) |
| NFR-031-AC-8 | The `HashMap` audit over `crates/extraction-frontend/src/` reports zero hits with an empty exemption list, fails on a scratch copy with a planted `HashMap` in `lower.rs`, and every map whose iteration order reaches the output is a `BTreeMap` or an `IndexMap`. | Analysis (TC-1307) |
| NFR-031-AC-9 | The crate root carries `#![forbid(unsafe_code)]` and a `compile_fail` doctest proves an injected `unsafe` block does not build under `cargo +1.98.1`. | Test (TC-1308) |
| NFR-031-AC-10 | Over 256 bundle trees generated by the crate's `proptest` bundle-tree strategy the frontend returns a result or a diagnostic and never panics. | Fuzz (TC-1309) |

## Dependencies

- **Upstream**: [NFR-019](./NFR-019-deterministic-contract-compilation.md), [NFR-020](./NFR-020-bounded-and-safe-compilation.md), [NFR-022](./NFR-022-deterministic-and-hermetic-rust-generation.md), issue #42
- **Downstream**: [FR-091](../functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-093](../functional/FR-093-lower-field-declarations-to-ir-fields.md), [FR-097](../functional/FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](../functional/FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
