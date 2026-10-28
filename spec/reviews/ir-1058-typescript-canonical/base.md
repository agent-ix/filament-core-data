---
id: SR-16465
title: "IR-1058 review of TypeScript canonical forms"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; spec/functional/FR-067, FR-069, FR-146; IR-1058"
review_set: base
---

## Summary

Reviewed FCD PR #318 at 7c31b52681df46cbc2be8e4a6ed60e2e98dc39c7. Examined FR-067-AC-6, FR-069-AC-1/2 and FR-146-AC-20 against FR-050-AC-7, FR-097-AC-4, FR-048, FR-145, QSpec FR-154-AC-32 and FR-208-AC-18. The eleven-set definition and ordered declaration treatment are consistent. FR-069 introduces a separate TypeScript fingerprint domain without the domain-specific vectors FR-145 requires.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | Supply TypeScript fingerprint vectors for the newly named identity-sorted-set domain; unchanged FR-048 package-lock vectors do not verify that distinct byte domain. | spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md:238; spec/functional/FR-145-name-the-normalized-ir-canonicalization.md:51 | correct-requirement-no-evidence |

## Dispositions

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | At 574d3827d7de98a5ce1c61ae60e9b93e15350cd3, FR-069 names its own fixed TypeScript fingerprint vector file and AC-26 reads committed expected bytes and SHA-256; five vectors independently match their specified permutations and reversals. FR-048 package-lock vectors remain separate. |
