---
id: SR-16477
title: "Code review of Semantic IR digest retirement in FCD PR 326"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; IR-1105; PR #326 commit 09819d0; schema/semantic/v1, crates/semantic-ir, crates/extraction-frontend, src/compiler, python_backend, conformance, fixtures, packages/semantic-kernel, tests"
review_set: subset
---

## Summary

Reviewed FCD PR #326 commit 09819d0 against its parent 99ac8ac, with independent Claude Opus judgment and manual source verification. The three envelope members are removed in the main schema, readers, and producers, but the JSON Schema frontend and two committed IR artifacts still carry them. The change also deletes a still-required semantic-IR `STALE_LOCK` rule.

## Verdict

**FAIL** — three live paths still produce invalid IR under the tightened schema, and FR-068's required `STALE_LOCK` code and judgment have been removed.

## Coverage

- Examined FR-019-AC-2, FR-048-AC-9/10, FR-084-AC-6, FR-095-AC-3/4/11, FR-068's `STALE_LOCK` rule and register obligation, and the relevant source, schema, fixtures and tests.
- Inspected Rust style and repository rules; no Rust idiom defect found in the changed envelope/schema code. The code lead owns the final aggregate gate; this review ran no full builds.
- Preserved source-backed digest obligations: `constructs[].manifestDigest`, input-bundle `manifestDigest`, package lock fingerprint and `contentDigest`, and compiler `STALE_LOCK` remain present.
- SysML backend is quarantined under IR-1129 and untouched. At `src/compiler/backends/sysml-v2/index.mjs:341`, an admitted digest-free IR yields `state=success` and a generated comment containing literal `digest undefined`; no current SysML test asserts that comment. This is a separate quarantine residual, not a requested change in #326.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | JSON Schema frontend still emits retired `source.digest`, so its default lowering fails Semantic IR admission and kernel regeneration. | src/compiler/frontend/json-schema/lower.mjs:595 |
| FND-002 | high | Checked-in semantic kernel IR retains all three retired envelope fields and is now rejected by the schema. | packages/semantic-kernel/semantic-ir.json:11 |
| FND-003 | high | Positive SysML domain IR fixture retains all three retired envelope fields; the pilot gate rejects it before backend generation. | fixtures/semantic/v1/positive/sysml-config-domain-bundle.json:11 |
| FND-004 | high | Removing semantic-IR `STALE_LOCK` from the register and all readers leaves FR-068's lock-versus-manifest/source rule unimplemented. | src/compiler/backends/typescript-v1/admit.mjs:83 |

## Evidence

- `bundleSource()` in `src/compiler/frontend/json-schema/lower.mjs` returns a literal digest; `scripts/build-semantic-kernel.mjs` passes that document to the TypeScript backend, whose schema admission rejects unknown source fields.
- Both committed JSON documents list `source.digest`, `package.manifestDigest`, and `package.lockDigest`. `schema/semantic/v1/semantic-ir.schema.json` now sets `additionalProperties: false` on both envelopes without those members.
- `scripts/check-sysml-pilot.mjs` validates the positive domain fixture before projecting. `make test` and `make test-all` include `sysml-pilot-check`.
- FR-068's rule table still specifies `STALE_LOCK`; its register-bijection obligation remains. This PR deletes the code from `admit.mjs`, `conformance/diagnostic-codes.json`, the oracle, Rust and Python readers, and the negative case. The separate compiler lock verification in `src/compiler/packages/lock.mjs` remains and does not satisfy the independent semantic-IR admission rule.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | Head 45b94f1 removes `digest` from `bundleSource()`; default JSON Schema lowering now emits only identity, version and dialect. |
| FND-002 | fixed | Head 45b94f1 deletes all three retired members from committed `packages/semantic-kernel/semantic-ir.json`. |
| FND-003 | fixed | Head 45b94f1 deletes all three retired members from the positive SysML domain IR fixture; this concerns fixture admission, not the quarantined SysML backend. |
| FND-004 | deferred | Merged spec-first PLAT-1205 PR #327 at 895f6de explicitly retires the semantic-IR `STALE_LOCK` rule, code and PKG-006 case in FR-068. The original finding was valid against old main, but that requirement is now retired in the authoritative spec; no code restoration is due in #326. The later PLAT-1205 code slice owns remaining compiler digest-keyed lock removal under revised FR-048. |

## Current verdict

**CONDITIONAL** — FND-001–003 are fixed and FND-004 has an explicit merged spec-first retirement; no open defect in this PR's three-field removal. Final aggregate gate and the later PLAT-1205 code slice remain code-lead work.
