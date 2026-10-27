---
id: SR-16461
title: "IR-1056 PR 317 code review with Rust lane"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@eafb7527; IR-1056; PR #317; crates/extraction-frontend/src/canonical.rs, crates/extraction-frontend/tests/document.rs, src/compiler/ir/normalize.mjs, test/compiler-core.test.ts"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-050
    type: references
  - target: ix://agent-ix/filament-core-data/FR-097
    type: references
---

# IR-1056 PR 317 code review with Rust lane

## Summary

Ticket: IR-1056. Reviewed PR #317 at eafb75278eb2964e21a4cc5ec0dfbf773a7eee1f against c77e0ce2c3fdfebb60d4d87ff75295ec141a12f4. Examined FR-050-AC-7, FR-097 canonical form and FR-097-AC-4/5. Review is limited to this PR's changed behavior; plan completion: not assessed.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The new end-to-end test claims the reversed lifted parameters change the fingerprint but checks only normalized bytes; the fingerprint assertion uses a separate synthetic document, so the lifted fixture never proves its fingerprint contract. | crates/extraction-frontend/tests/document.rs:493-552; test/compiler-core.test.ts:4268-4294 |

## Verdict

CONDITIONAL: FND-001 requires a same-fixture fingerprint assertion. Rust source preserves params order and parameter-extension sorting; JS removes only the params-set path. No copied artifacts or gate weakening in the diff.

## Coverage

The new two-parameter lift asserts [zeta, alpha] and byte change on reversal. The separate JS test asserts a fingerprint change and extension-set invariance. No Rust panic or wire conversion added. Full aggregate gates intentionally deferred to code lead. gh PR checks show CLA check failure, separate from review defects.

## Dispositions

Round 1, fix head 0e441e5cfa480e5f191ab8b7b24bfb134c693b84.

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | At 0e441e5c the lifted fixture test reverses the actual emitted document and asserts `fingerprint_ir(&reversed_bytes) != fingerprint_ir(bytes)` using a new helper that invokes production `fingerprintIr` through Node. |

Round 1 verdict: PASS for this method; no new defect in the fix delta.
