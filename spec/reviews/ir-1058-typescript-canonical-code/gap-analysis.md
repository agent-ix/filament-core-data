---
id: SR-16470
title: "IR-1058 PR #319 gap-analysis review"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; PR #319; spec/tests.md; src/compiler/backends/typescript-v1/canonical.mjs; test/typescript-backend.test.ts"
review_set: subset
---

## Summary

Plan completion: not assessed. Scoped matrix reports FR-069-AC-1/2/26 and FR-067-AC-6 untagged because this test module uses Traces comments rather than recognized tags; the review manually checked test-to-AC bindings. No runtime suite was run in this read-only review; node_modules is absent. Ticket: IR-1058. Frozen head: 5769bc2350b91e3b9238b0d35d5fb218bb5772ba.

## Verdict

**CONDITIONAL** — One finding requires same-PR repair.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | TC-792 exercises fingerprintIrForTarget directly but never observes the CLI lockFingerprint or generated fingerprint; its admitted set permutation covers types only, leaving constraints and extensions untested on admitted documents. | test/typescript-backend.test.ts:1439-1508 |

## Coverage

Plan completion: not assessed. FR-069-AC-1/2/26 and FR-067-AC-6 manually examined; computed matrix marks them untagged due test comment binder convention.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | TC-792 now asserts the CLI source imports and assigns fingerprintIrForTarget(ir), and admitted documents independently reverse types, constraints, and extensions while preserving the digest; admitted fields, supertypes, and params reversals change it. |
