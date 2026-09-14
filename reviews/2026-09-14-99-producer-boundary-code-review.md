---
id: SR-222
title: "Rust review — producer interface 1.2 static boundary (PR #99)"
type: SpecReview
analysis: code-review
scope: "crates/baseline-producer/**, Cargo.lock, against US-016, FR-112..FR-118, NFR-036, US-018, FR-127..FR-129 and Plan-017"
review_set: subset
---

# Rust review — producer interface 1.2 static boundary (PR #99)

## Summary

Reviewed the complete Rust crate and its tests after the native-fixture
qualification changes, using the repository's `rustfmt.toml`, root Cargo
workspace policy, and the Rust review checklist. The crate is unpublished,
contains no unsafe code or placeholder path, and exposes one admitted static
bundle boundary with stable refusals. Five review defects were fixed. No Rust
code defect remains; the separate two-architecture evidence gate is still
blocked on a missing local aarch64 linker and runner.

## Verdict

**CONDITIONAL** — code review passes with all findings fixed. PR completion is
still conditional on the Plan-017 gap verdict for TC-1648 and TC-1652.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1888 | medium | `project_endpoints` returned the 144-byte `EndpointProjectionLoss` by value. Fixed: the public result now returns `Box<EndpointProjectionLoss>` and retains the typed loss record. | `relationship.rs::project_endpoints` |
| FND-1889 | low | The permutation helper accepted `&mut Vec<T>` although it requires only a mutable slice. Fixed: it accepts `&mut [T]`. | `static_fixture::reorder` |
| FND-1890 | low | A removed source-census constant left a doc comment separated from and accidentally documenting `configuration`. Fixed: the stale comment was removed. | `endpoint_type_exports.rs::configuration` |
| FND-1891 | medium | The producer-local native export-table fixture parser accepted unknown members, weakening the claimed closed evidence input. Fixed: table and entry types use `deny_unknown_fields`; the manifest note and exact `native-state-model/2` profile are consumed and checked. | FR-129, TC-1722 |
| FND-1892 | high | TC-1730 called `checked_bound` directly with values it supplied, so deleting a bound from the complete verifier would not fail the test. Fixed: actual artifact bytes, table bytes, export count, maximum path length, and definition closure now drive `verify_native_fixture` at the exact configured bound and one-past it. | FR-129-AC-13, TC-1730 |

## Gates

| Gate | Result |
| --- | --- |
| `cargo fmt --all -- --check` | pass |
| `cargo clippy --locked --offline -p agent-ix-baseline-producer --all-targets --all-features --target-dir target-codex-backends -- -D warnings` | pass |
| `cargo test --locked --offline -p agent-ix-baseline-producer --all-features --target-dir target-codex-backends` | pass — 108 executable tests after TC-1731, 9 compile-fail doctests; 7 named-lane helpers/evidence controls ignored by the default run |
| `make CARGO_TARGET_DIR=.../target-codex-backends baseline-producer-ambient-evidence` | pass — 16 documents, 12 interposed symbols, 5 categories, 0 ambient reads; planted clock and environment reads each detected |
| Placeholder / panic / unsafe / lint-suppression scan over `src/` | pass — no `todo!`, `unimplemented!`, TODO/FIXME/XXX, `dbg!`, unsafe, or new allow attribute; three `expect`s are internal construction/write invariants and not caller-input paths |
| `git diff --check` | pass |

All final recorded Cargo gates ran locally and offline with
`CARGO_BUILD_JOBS=1` under `/tmp/quire-heavy-check.lock` and used
`target-codex-backends`.

## Remaining evidence condition

`baseline-producer-cross-architecture` records 16 canonical documents and 20
numeric decisions on `x86_64-unknown-linux-gnu`, then fails explicitly because
`aarch64-linux-gnu-gcc` is absent. Neither qemu aarch64 runner is installed and
the inspected local Docker base images are amd64. This is not waived or called a
pass; it is the open Plan-017 gap recorded by the gap analysis.
