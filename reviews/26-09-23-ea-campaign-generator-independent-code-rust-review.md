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
