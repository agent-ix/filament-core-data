---
id: SR-196
title: AGE-2230 Rust slice code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@698a6800933ee8afb8d9fe0f4982f90558aecc9a; PR 271;
  AGE-2230; Rust generator, generated artifacts, extraction diagnostic registry
review_set: subset
---

## Summary

Ticket: AGE-2230. Reviewed the exact frozen head for PR #271, including all 22 changed files. The Rust lane is folded into this code-review artifact. The owned source template emits slice serializers (three macro instances plus the nullable generic serializer); the constraint renderer drops one leading borrow only when accessing a named wrapper, leaving primitive and optional/nullable paths intact. Regenerated fixtures and kernel files match the real emitter. No unrelated scope or new defect was found. Existing local generated outputs follow this repository's documented generator/golden architecture; the PR introduces no separately maintained duplicate authority.

## Verdict

**PASS for the PR delta** — no new code or Rust review findings. The queued focused Cargo gates remain required before claiming runtime/clippy verification.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

- Independent `make rust-check CARGO_TARGET_DIR=/tmp/age-2230-rust-review-698a680/target`: exit 0. Three corpus crates match their goldens; 3 manifests / 43 entries sorted; nine determinism comparisons each compare 46 files / 436737 bytes with zero differences; rustfmt passes 34 generated sources. Evidence: `rust-check.log`, `rust-check.exit` in this scratchpad.
- Independent `cargo fmt --all -- --check`: exit 0 (`cargo-fmt.log`, `cargo-fmt.exit`).
- Independent Rust kernel regeneration from committed semantic IR through the real Rust backend: all 87 emitted artifacts match all 87 committed files (`kernel-rust-check.log`).
- Both registry pages match the real renderer output captured in `/tmp/age-2230-registry-prebuilt.log`; the captured output has 28 registry rows, including DECIMAL_POLICY_MISSING. Copy: `registry-rendered.md`. The renderer source is unchanged in this PR. This is supplied renderer evidence plus independent byte comparison, not a fresh Cargo test pass.
- Supplied coder evidence `/tmp/age-2230-kernel-check.log`: 97 kernel artifacts current. Independent all-language repeat: unavailable at module loading because ajv is absent (`kernel-check.log`, exit 1); the Rust-only independent result above is separate.
- NOTRUN/pending shared build lock: `make extraction-frontend-test`, `make spec-to-targets`, and aggregate `make rust-test`, each with a private CARGO_TARGET_DIR. No final-head Cargo test or generated architecture clippy pass is claimed.
- Exact head and clean tracked worktree verified before and after checks. No diff in `.github/`, Makefile, Cargo.toml, Cargo.lock, spec/, or test trace tags. No new allow suppression, unsafe, dependency, runtime I/O, async state, panic path, or weakened gate.

## Examined scope

```yaml
scope:
- id: crates/extraction-frontend/fixtures/registry-doc/expected/extraction-frontend-diagnostics.md
  path: crates/extraction-frontend/fixtures/registry-doc/expected/extraction-frontend-diagnostics.md
  role: examined
  excerpt: '---'
- id: crates/extraction-frontend/tests/diagnostics.rs
  path: crates/extraction-frontend/tests/diagnostics.rs
  role: examined
  excerpt: '//! FR-096: the closed diagnostic registry, its severity and blocking
    table,'
- id: docs/semantic-data-system/extraction-frontend-diagnostics.md
  path: docs/semantic-data-system/extraction-frontend-diagnostics.md
  role: examined
  excerpt: '---'
- id: packages/semantic-kernel/rust/src/support.rs
  path: packages/semantic-kernel/rust/src/support.rs
  role: examined
  excerpt: //! Support types the generated declarations are composed from.
- id: packages/semantic-kernel/rust/src/types/decimal_policy.rs
  path: packages/semantic-kernel/rust/src/types/decimal_policy.rs
  role: examined
  excerpt: //! DecimalPolicy
- id: packages/semantic-kernel/rust/src/types/max_length_constraint.rs
  path: packages/semantic-kernel/rust/src/types/max_length_constraint.rs
  role: examined
  excerpt: //! MaxLengthConstraint
- id: packages/semantic-kernel/rust/src/types/min_length_constraint.rs
  path: packages/semantic-kernel/rust/src/types/min_length_constraint.rs
  role: examined
  excerpt: //! MinLengthConstraint
- id: packages/semantic-kernel/rust/src/types/multiplicity.rs
  path: packages/semantic-kernel/rust/src/types/multiplicity.rs
  role: examined
  excerpt: //! Multiplicity
- id: packages/semantic-kernel/rust/src/types/source_locus.rs
  path: packages/semantic-kernel/rust/src/types/source_locus.rs
  role: examined
  excerpt: //! SourceLocus
- id: src/compiler/backends/rust-serde/crate.mjs
  path: src/compiler/backends/rust-serde/crate.mjs
  role: examined
  excerpt: /**
- id: src/compiler/backends/rust-serde/support-template.rs
  path: src/compiler/backends/rust-serde/support-template.rs
  role: examined
  excerpt: //! Support types the generated declarations are composed from.
- id: test/fixtures/rust-serde/goldens/core-2-0/src/support.rs
  path: test/fixtures/rust-serde/goldens/core-2-0/src/support.rs
  role: examined
  excerpt: //! Support types the generated declarations are composed from.
- id: test/fixtures/rust-serde/goldens/core-2-0/src/types/count.rs
  path: test/fixtures/rust-serde/goldens/core-2-0/src/types/count.rs
  role: examined
  excerpt: //! Count
- id: test/fixtures/rust-serde/goldens/core-2-0/src/types/millis.rs
  path: test/fixtures/rust-serde/goldens/core-2-0/src/types/millis.rs
  role: examined
  excerpt: //! Millis
- id: test/fixtures/rust-serde/goldens/core-2-0/src/types/node.rs
  path: test/fixtures/rust-serde/goldens/core-2-0/src/types/node.rs
  role: examined
  excerpt: //! Node
- id: test/fixtures/rust-serde/goldens/core-2-0/src/types/root.rs
  path: test/fixtures/rust-serde/goldens/core-2-0/src/types/root.rs
  role: examined
  excerpt: //! Root
- id: test/fixtures/rust-serde/goldens/minimal-2-0/src/support.rs
  path: test/fixtures/rust-serde/goldens/minimal-2-0/src/support.rs
  role: examined
  excerpt: //! Support types the generated declarations are composed from.
- id: test/fixtures/rust-serde/goldens/package-2-0/src/support.rs
  path: test/fixtures/rust-serde/goldens/package-2-0/src/support.rs
  role: examined
  excerpt: //! Support types the generated declarations are composed from.
- id: test/fixtures/rust-serde/goldens/package-2-0/src/types/count.rs
  path: test/fixtures/rust-serde/goldens/package-2-0/src/types/count.rs
  role: examined
  excerpt: //! Count
- id: test/fixtures/rust-serde/goldens/package-2-0/src/types/millis.rs
  path: test/fixtures/rust-serde/goldens/package-2-0/src/types/millis.rs
  role: examined
  excerpt: //! Millis
- id: test/fixtures/rust-serde/goldens/package-2-0/src/types/node.rs
  path: test/fixtures/rust-serde/goldens/package-2-0/src/types/node.rs
  role: examined
  excerpt: //! Node
- id: test/fixtures/rust-serde/goldens/package-2-0/src/types/root.rs
  path: test/fixtures/rust-serde/goldens/package-2-0/src/types/root.rs
  role: examined
  excerpt: //! Root
- id: FR-060-AC-1
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: Two consecutive generations from each corpus base produce byte-identical
    crates, compared file by file including file ordering.
- id: FR-060-AC-2
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: Generation under `TZ=UTC` and `TZ=Pacific/Kiritimati`, `LANG=C` and `LANG=tr_TR.UTF-8`,
    two different working directories, and two different `HOME` values produces identical
    bytes.
- id: FR-060-AC-3
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: '`rustfmt --check` over every generated crate reports no change.'
- id: FR-060-AC-4
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: The committed goldens equal a fresh generation, and the check names the
    differing file when they do not.
- id: FR-060-AC-5
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: '`make rust-check` leaves `git status --porcelain` empty.'
- id: FR-060-AC-10
  path: spec/functional/FR-060-produce-deterministic-rustfmt-clean-output.md
  role: examined
  excerpt: The output manifest's file list is sorted by path by code point, checked
    over every base.
- id: FR-096-AC-1
  path: spec/functional/FR-096-emit-stable-source-located-frontend-diagnostics.md
  role: examined
  excerpt: Every `Code` variant serialises to a code matching the published pattern
    and, instantiated, validates as a `diagnostic` against `common.schema.json`, including
    a variant instantiated with no `locus`.
- id: FR-096-AC-2
  path: spec/functional/FR-096-emit-stable-source-located-frontend-diagnostics.md
  role: examined
  excerpt: The severity and blocking table above holds for every variant, asserted
    variant by variant, including `KERNEL_NAME_SHADOWED` as `warning` non-blocking
    and `INVALID_IR`, `DUPLICATE_IDENTITY`, `DUPLICATE_CONSTRAINT`, `CONSTRAINT_NOT_APPLICABLE`,
    `IMPORT_UNSUPPORTED`, and `DUPLICATE_ARTIFACT_ID` as `error` blocking.
- id: FR-096-AC-13
  path: spec/functional/FR-096-emit-stable-source-located-frontend-diagnostics.md
  role: examined
  excerpt: '`docs/semantic-data-system/extraction-frontend-diagnostics.md` lists every
    code with severity, blocking, and owner, and regenerating it from the enum reproduces
    the committed file byte for byte.'
- id: FR-144-AC-12
  path: spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md
  role: examined
  excerpt: 'The spec-bundle frontend lifts `versionNumber \| Integer \| 1 \| min:
    1` with operand `"1"`, a constrained `Decimal` row with policy `(10, 2)` and `min:
    1.50` to an alias carrying `decimal` `{precision: 10, scale: 2}` and operand `"1.5"`,
    and a `Decimal` row with no policy to a blocking `DECIMAL_POLICY_MISSING` at the
    row.'
bindings:
- test_id: tc_1259_every_variant_serialises_to_the_published_pattern_and_validates_with_and_without_locus
  ac_id: FR-096-AC-1
  trace: correct
- test_id: tc_1271_the_docs_page_lists_every_code_with_severity_blocking_and_owner_and_regenerates_byte_for_byte
  ac_id: FR-096-AC-13
  trace: correct
```
