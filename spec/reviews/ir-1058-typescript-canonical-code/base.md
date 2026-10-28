---
id: SR-16471
title: "IR-1058 PR #319 spec-review/base review"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; PR #319; spec/tests.md; src/compiler/backends/typescript-v1/canonical.mjs; test/typescript-backend.test.ts"
review_set: subset
---

## Summary

Reviewed the changed spec/tests.md table rows against merged FR-067 and FR-069. TC-806 and TC-1871 describe their updated obligations; TC-792 is stale. Ticket: IR-1058. Frozen head: 5769bc2350b91e3b9238b0d35d5fb218bb5772ba.

## Verdict

**CONDITIONAL** — One finding requires same-PR repair.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | TC-792 still describes only set-order invariance and generic semantic-value sensitivity; it omits the ordered fields, supertypes, and params reversals and CLI equality now required by FR-067-AC-6. | spec/tests.md:668 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | TC-792 catalog row now names admitted types/constraints/extensions permutations, ordered fields/supertypes/params reversals, and the CLI lockFingerprint backend function. |
