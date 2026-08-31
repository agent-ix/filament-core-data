---
id: SR-022
title: "Risk and complexity review of the semantic package and projection contract"
type: SpecReview
analysis: risk-complexity
scope: "FR-019..026, NFR-008..012"
review_set: all
---
# Risk and complexity review

## Summary

The contract is high-impact and cross-repository, but its current delivery is
isolated specification enablement. The largest technical risks are custom
backend ownership, cross-language semantic drift, unsafe generation, incorrect
compatibility classification, and unstable identity/lock/fingerprint behavior.
The largest decision risk is promoting the proposed JSON Schema source before a
human reviews the completed evidence.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-035 | high | The proposed v1 source decision is intentionally volatile until the human promotion gate; merging it as normative before TC-199 would create an unauthorized architectural cascade. | FR-019-AC-1, NFR-012-AC-4, TC-199 |
| FND-036 | high | A retained custom compiler/backend is a reusable product, not incidental ticket code; it requires the separate AGPL repository, conformance corpus, release policy, ownership, and hardening tickets already allocated to the compiler campaign. | FR-024-AC-5..6, filament-core-data#5 |

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | Custom/upstream backend boundary | Qualification ledger and separate compiler ownership |
| 2 | Rust/TypeScript/Python semantic drift | Shared golden corpus and native parity gates |
| 3 | Schema/code-generation security | Isolation, bounds, negative tests, SAST, and SBOM |
| 4 | False compatibility result | Cross-target most-restrictive classification properties |
| 5 | Identity, lock, and fingerprint instability | Canonical input contract and order-independence properties |
