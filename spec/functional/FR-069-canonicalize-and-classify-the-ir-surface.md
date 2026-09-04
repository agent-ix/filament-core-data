---
id: FR-069
title: "Canonicalize the IR and classify its surface"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-069] Canonicalize the IR and classify its surface

## Description

The TypeScript backend SHALL produce one canonical byte string for a semantic IR
document, and one compatibility classification for an ordered pair of them, from
rules stated in the published contract rather than inherited from another
implementation.

Both are things a generated package needs on its own terms rather than
conveniences for the conformance run. A backend that claims byte-reproducible
generation needs one canonical form of its input, or "the same IR" is a
judgement instead of a comparison. A backend that regenerates a package needs to
know whether the regeneration is a patch, an addition, or a break, or the
generated package's own version number is guesswork. That the corpus also asks
for both is what makes them checkable.

As with [FR-068](./FR-068-decide-and-report-ir-admissibility.md), these are
second implementations beside `src/compiler/ir/normalize.mjs` and
`src/compiler/compat/diff.mjs`, written from the contract and not from those
modules, because a canonical form that agrees with itself proves nothing.

## Inputs

- A semantic IR document at `contractVersion` `1.0.0` or `1.1.0`
- For classification, an ordered pair of such documents — the `before` and the `after`
- A consumer policy valid against `schema/semantic/v1/consumer-policy.schema.json`, where one is supplied
- `docs/semantic-data-system/ir-compatibility-policy.md` and `docs/semantic-data-system/compatibility.md`, the published classification rules
- `docs/semantic-data-system/contracts-v1.md`, which names the canonicalization algorithm

## Outputs

- `src/compiler/backends/typescript-v1/canonical.mjs`: `canonicalize(value, { sets })`, `normalizeIrForTarget(document)` returning the canonical string, `digestOf(text)` returning `sha256:<64 hex>`, and `IDENTITY_SET_PATHS`
- `src/compiler/backends/typescript-v1/canonical.d.mts` declaring that surface
- `src/compiler/backends/typescript-v1/classify.mjs`: `classifySurface(before, after, { consumerPolicy })` returning `{ classification, changes }`, and `CLASSIFICATION_ORDER`
- `src/compiler/backends/typescript-v1/classify.d.mts` declaring that surface

## Behavior

### Canonicalization

- `canonicalize` SHALL implement RFC 8785 JSON Canonicalization Scheme, extended by sorting the members of a declared set of containers by their `identity` before serialization.
- `IDENTITY_SET_PATHS` SHALL be exactly these thirteen container paths: `/types`, `/types/*/fields`, `/types/*/variants`, `/types/*/constraints`, `/types/*/relationships`, `/types/*/operations`, `/types/*/clauses`, `/types/*/extensions`, `/types/*/fields/*/extensions`, `/types/*/operations/*/params`, `/types/*/operations/*/params/*/extensions`, `/occurrences`, and `/extensions`.
- `canonicalize` SHALL order object keys by code point.
- `canonicalize` SHALL drop a key whose value is `undefined` rather than serializing a placeholder for it.
- `canonicalize` SHALL refuse a non-finite number rather than serializing it, because JSON has no representation for one and a silent substitution would change the document.
- `canonicalize` SHALL refuse a value nested deeper than the declared depth bound rather than recursing without bound.
- Because `docs/semantic-data-system/contracts-v1.md` names the algorithm `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere, which `conformance/contract-gaps.json` records as GAP-004, `canonical.mjs` SHALL publish its own definition of that algorithm with the gap cited beside it.
- `normalizeIrForTarget` SHALL, for a `1.1.0` document, materialize `multiplicity` on every field and every operation parameter, deriving it from `presence` where it is absent by the rule `optional → { lower: 0, upper: 1 }` and `required → { lower: 1, upper: 1 }`.
- `normalizeIrForTarget` SHALL, for a `1.1.0` document, re-derive `presence` from `multiplicity.lower` by the rule `lower >= 1 → required`, otherwise `optional`.
- `normalizeIrForTarget` SHALL, for a `1.1.0` document, force `nullable` to a literal boolean on every field and every operation parameter.
- `normalizeIrForTarget` SHALL add no member to a `1.0.0` document, so a document that predates multiplicity is canonicalized as written.
- `normalizeIrForTarget` SHALL be idempotent, so normalizing a normalized document yields identical bytes.
- `normalizeIrForTarget` SHALL leave its argument byte-identical, so a caller's document is never mutated by being canonicalized.
- `digestOf` SHALL return the SHA-256 of the canonical bytes, prefixed `sha256:`.
- Canonicalization SHALL read no clock, no environment variable, and no network.
- Canonicalization SHALL produce identical bytes from any working directory and under any locale.

### Classification

- `classifySurface` SHALL classify the ordered pair over the IR surface only.
- `CLASSIFICATION_ORDER` SHALL be exactly `invalid`, `breaking`, `unknown`, `conditional`, `additive`, `patch`, most restrictive first.
- `classifySurface` SHALL return, as the aggregate, the most restrictive classification among the changes it records, starting from `patch` where it records none.
- If either document is inadmissible under [FR-068](./FR-068-decide-and-report-ir-admissibility.md), then `classifySurface` SHALL return `invalid` without classifying further, because a comparison against an invalid document is not a compatibility statement.
- `classifySurface` SHALL classify a removed type as `breaking`.
- `classifySurface` SHALL classify an added type as `additive`.
- `classifySurface` SHALL classify a changed `kind` as `breaking`.
- `classifySurface` SHALL classify a changed `scalar`, `target`, `items`, or `values` as `breaking`.
- `classifySurface` SHALL classify a field that became required as `breaking`.
- `classifySurface` SHALL classify a field that became optional as `additive`.
- `classifySurface` SHALL classify a change to a field's `nullable` as `breaking`, in either direction, because each direction breaks one side of the contract.
- `classifySurface` SHALL classify a change to a field's `defaultKind` or `defaultValue` as `conditional`.
- `classifySurface` SHALL classify an added relationship as `conditional`.
- `classifySurface` SHALL classify a removed relationship as `conditional`.
- `classifySurface` SHALL classify an added extension whose `required` is true as `breaking`.
- `classifySurface` SHALL classify an added extension whose `required` is false as `additive`.
- `classifySurface` SHALL classify a removed extension as `breaking`.
- `classifySurface` SHALL classify a changed package identity as `breaking`.
- `classifySurface` SHALL classify a move between contract versions as `conditional`.
- `classifySurface` SHALL classify a move of `unknownPolicy` to `reject` as `breaking`.
- `classifySurface` SHALL classify any other change of `unknownPolicy` as `conditional`, because `docs/semantic-data-system/contracts-v1.md` leaves the tightening direction unordered, which `conformance/contract-gaps.json` records as GAP-010 against `agent-ix/filament-core-data#25`.
- If a change falls under no rule above, then `classifySurface` SHALL classify it as `unknown`, so an unclassifiable change cannot pass as compatible.
- Where a consumer policy admits unknown members, `classifySurface` SHALL soften an added optional field from `additive` to `patch`, reading the softening from the policy rather than assuming it.
- `classifySurface` SHALL record, for every change, its classification, its RFC 6901 pointer, and a message naming what moved.
- `classifySurface` SHALL order recorded changes by pointer, then by classification, comparing both by code point.
- `classifySurface` SHALL NOT override `schema/semantic/v1/compatibility-report.schema.json`, which stays the authority for the profile, mapping, representation, target, and consumer surfaces this classification does not read.

### Independence

- `canonical.mjs` and `classify.mjs` SHALL NOT import `src/compiler/ir/normalize.mjs`, `src/compiler/packages/canonical.mjs`, `src/compiler/compat/diff.mjs`, or `src/compiler/compat/evolution.mjs`.
- `canonical.mjs` and `classify.mjs` SHALL NOT import any module under `conformance/`.
- Neither module SHALL add a runtime dependency to the repository.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-069-CON-1 | The canonical form and the classifier are deliberately second implementations beside the compiler's; neither SHALL import the compiler's normalization, canonicalization, diff, or evolution module, so agreement between them is evidence rather than a tautology. | Correctness | Static analysis |
| FR-069-CON-2 | `canonical.mjs` SHALL declare `IDENTITY_SET_PATHS` as data in one place, so a fourteenth container path is a data edit that a test can see rather than a scattered code change. | Maintainability | Test |
| FR-069-CON-3 | The GAP-004 citation SHALL stay in `canonical.mjs` until `agent-ix/filament-core-data#9` publishes a definition of the named algorithm, so the local definition is never mistaken for the contract's. | Integrity | Static analysis |
| FR-069-CON-4 | `classifySurface` SHALL NOT read the clock, so a report is a function of the two documents alone. | Determinism | Static analysis |
| FR-069-CON-5 | This requirement SHALL NOT change a byte of `schema/semantic/v1/**` or `docs/semantic-data-system/**`; where the contract is ambiguous the gap is cited, not amended. | Non-disruption | Change-set diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-069-AC-1 | Two documents differing only in object key order and in the order of the thirteen identity-keyed containers canonicalize to identical bytes. | Property |
| FR-069-AC-2 | Two documents differing in any semantic value canonicalize to different bytes. | Property |
| FR-069-AC-3 | `normalizeIrForTarget(normalizeIrForTarget(d))` equals `normalizeIrForTarget(d)` for every positive fixture and for generated documents. | Property |
| FR-069-AC-4 | A `1.1.0` document with a field carrying `presence` and no `multiplicity` gains the derived multiplicity, the re-derived presence, and a literal `nullable`; the same field in a `1.0.0` document gains no member. | Unit |
| FR-069-AC-5 | Canonicalizing every conformance base and case input produces byte-identical output on a second run, from a different working directory, and under `LC_ALL=tr_TR.UTF-8`. | Integration |
| FR-069-AC-6 | A non-finite number and a value past the depth bound are each refused with a named error rather than serialized. | Unit |
| FR-069-AC-7 | Canonicalization leaves its argument byte-identical for every corpus case. | Property |
| FR-069-AC-8 | Each of the seventeen classification rules fires on a constructed pair and yields exactly its stated classification at a hand-computed pointer. | Test |
| FR-069-AC-9 | A pair carrying one `breaking` and one `additive` change aggregates to `breaking`; a pair carrying only `patch` changes aggregates to `patch`. | Unit |
| FR-069-AC-10 | A pair whose `before` is inadmissible aggregates to `invalid`, and so does a pair whose `after` is. | Unit |
| FR-069-AC-11 | A change the rules do not model aggregates to `unknown` rather than to `patch`. | Unit |
| FR-069-AC-12 | An added optional field classifies `additive` with no consumer policy and `patch` with a policy admitting unknown members. | Unit |
| FR-069-AC-13 | The five compatibility cases of the conformance corpus receive the classification the oracle records for them, and a divergence is reported rather than absorbed. | Integration |
| FR-069-AC-14 | `canonical.mjs` and `classify.mjs` contain no import of the compiler's normalization, canonicalization, diff, or evolution modules, and none of any module under `conformance/`. | Static |
| FR-069-AC-15 | `pnpm-lock.yaml` gains no entry from this requirement, and neither module imports a package outside the Node standard library. | Analysis |

## Dependencies

- **Upstream**: [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions**: GAP-004 (the canonicalization algorithm is named and never defined) is recorded in `conformance/contract-gaps.json` and owned by `agent-ix/filament-core-data#9`; GAP-010 (the unknown-policy tightening direction is unordered) is owned by `agent-ix/filament-core-data#25`. Both are cited here and settled elsewhere.
