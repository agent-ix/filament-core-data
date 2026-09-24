---
id: SR-183
title: "Independent review of FCD campaign generator revision"
type: SpecReview
analysis: code-review
scope: "FCD de00ad3 generator, extraction fixture migration, and EA campaign generation support"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-136"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: references
---

## Summary

Independent Sol review of the handwritten generator changes used by EA's
candidate campaign output. The EA output names this exact FCD revision in
`GENERATION.md`. The review inspected native annotation rendering, Rust
constructor and multiplicity emission, and extraction fixture migration. It
did not complete a fresh byte-for-byte campaign regeneration.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The new Python native annotation table renders `ix://quire/native/JsonObject` as `dict[str, object]`, while the normative kernel scalar catalog declares its `irScalar` as `any` and its domain as any JSON value. A valid operation with a JSON string, array, number, boolean, or null parameter is therefore exposed in generated `Protocol` typing as accepting only a dictionary; static consumers reject valid calls. Map this to the target's any-value annotation and test a generated operation with each JSON shape. | `python_backend/runner/constructs.py:230`; `packages/semantic-core/kernel-scalars.json`; FR-032, FR-136 |

## Review coverage and gates

- A direct call to `_Classes({}, {}).annotation("ix://quire/native/JsonObject")` returned `dict[str, object]`.
- `node --check src/compiler/backends/rust-serde/crate.mjs` passed.
- `python3 -m py_compile` of the changed Python runner and migration script passed.
- No CI workflow changed in the FCD diff. Focused pytest could not start on this host: `poetry` is unavailable and system Python has no `pytest`.
- The new native annotation branch has no focused test in `tests/test_python_backend_runner.py`.

## Disposition

**CONDITIONAL** for this scoped generator review pending correction and a generated-package test of the JSON value annotation. This does not accept EA's 0.5 matrix.

## Remediation recheck — 2026-09-23

FCD commit `9ef44b34dc80c825f625e04e5264d6c0c0952e31` maps native `JsonObject` to `Any`, imports it only when used, and adds a generated Protocol test that compiles and resolves both parameter and return type hints to `typing.Any`. A direct stdlib execution of that rendering and type-hint path passes; Node syntax checking of the Rust backend passes. Focused pytest remains unavailable on this host because Poetry and system pytest are absent.

**FND-001 closed. Recheck verdict: PASS for the reviewed generator finding.** EA's 0.5 matrix remains a separate, unaccepted candidate.

## Final independent recheck — 2026-09-24

Reviewed FCD code tree `f1ffe5ebdb2cdbc12f9ffdb13b3eb9a35b3c51ea`
at agent-authored commit `91e41b5`
against its merge base, `origin/main` at `75028ddfa91f3111fad8bec38f2c9b46ec811d42`.
This was a scoped code, Rust, and requirement-to-test gap recheck of the
campaign generator changes, semantic-core 0.3 extraction lift, and the
subsequent gate corrections. The local `main` ref is divergent and was not the
comparison base.

- **FND-001 remains closed.** Native `JsonObject` renders as `typing.Any` in
  generated Python Protocol parameters and returns, with a generated-module
  type-hint test (`TC-1784`; FR-032, FR-136).
- **The TC-1322 gate and matrix drift are closed.** The Rust test pins the
  reviewed Quire revision `92dbebc49f354f7a3d5050b94cd2d57d9084d99f`,
  and the TC-1322 matrix row names that revision (NFR-033-AC-3). The root
  reports TC-1320 passing with `EXTRACTION_LOCK_BASE=origin/main`; this is the
  branch's merge-base comparison, unlike the stale local `main` ref.
- **Fixture provenance is consistent.** The business module's
  `PROVENANCE.json` declares its local semantic-core 0.3 migration from
  source revision `7b7b0bc`. Its recorded manifest SHA-256 matches the
  committed manifest bytes. All 14 changed business-module schema JSON files
  differ from the merge base only by the semantic-core reference replacement
  performed by the migration script. FR-095-AC-15 now describes the locally
  migrated manifest digest; TC-1348 checks that the emitted provenance uses it.
- The extraction gate corrections cover the omitted dependency-audit Make
  targets and notices for `cc`, `find-msvc-tools`, and `shlex` (TC-1321,
  TC-1325; NFR-033-AC-2, AC-6). The root reports the selected extraction
  suite and Linux TC-1306 passing; this reviewer did not rerun those suites.
  The reviewed diff passed `git diff --check`.

**Recheck verdict: PASS for this scoped FCD review; no open high- or
medium-severity finding.** This does not certify a full campaign regeneration
or every test in the repository. CLA and code-owner checks remain external PR
gates; their completion is not established by this local review.
