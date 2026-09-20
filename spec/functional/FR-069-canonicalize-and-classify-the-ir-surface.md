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

The two obligations share one file deliberately, and the pairing is stated
rather than assumed. They share the set-ordering rule — a classifier that
compares two documents member by member has to agree with the canonical form
about which containers are sets and which are sequences, or the same revision
classifies differently depending on how its arrays were serialized — and they
are exactly the two answers an adapter must produce beyond a verdict. Splitting
them would put one rule in two files. The cost is that this requirement is
larger than its neighbours, and the review pass records that as accepted rather
than as unnoticed.

As with [FR-068](./FR-068-decide-and-report-ir-admissibility.md), these are
second implementations beside `src/compiler/ir/normalize.mjs` and
`src/compiler/compat/diff.mjs`, written from the contract and not from those
modules, because a canonical form that agrees with itself proves nothing.

Canonicalization reads nothing from admissibility: it takes a JSON value and
returns bytes, and it is defined for a document `admitIr` would refuse. So
[FR-068](./FR-068-decide-and-report-ir-admissibility.md) and this requirement do
not form a dependency cycle, and `canonical.mjs` can be built and measured
against all 114 corpus `normalized` strings before `admit.mjs` exists.
Classification is the half that depends on admissibility, and only for the
`invalid` arm.

## Inputs

- A semantic IR document at `contractVersion` `2.0.0`
- For classification, an ordered pair of such documents — the `before` and the `after`
- A consumer policy valid against `schema/semantic/v1/consumer-policy.schema.json`, where one is supplied
- `docs/semantic-data-system/compatibility.md`, the published classification rules
- `docs/semantic-data-system/contracts-v1.md`, which names the canonicalization algorithm

## Outputs

- `src/compiler/backends/typescript-v1/canonical.mjs`: `canonicalize(value, { sets })`, `normalizeIr(document)` returning the materialized document, `normalizeIrForTarget(document)` returning the corpus-comparable canonical string, `fingerprintIrForTarget(document)` returning the contract fingerprint, `digestOf(text)` returning `sha256:<64 hex>`, `IDENTITY_SET_PATHS`, `KEY_ORDER`, `MAX_CANONICAL_DEPTH`, and `CanonicalError`
- `src/compiler/backends/typescript-v1/canonical.d.mts` declaring that surface
- `src/compiler/backends/typescript-v1/classify.mjs`: `classifySurface(before, after, { consumerPolicy })` returning `{ classification, changes }`, `CLASSIFICATION_ORDER`, `MODELLED_CHANGES`, and `VARIANT_ADDITION_POLICY`
- `src/compiler/backends/typescript-v1/classify.d.mts` declaring that surface

## Behavior

### Canonicalization

- The backend SHALL carry **two** named canonical forms, because the published
  record names two and they are not the same algorithm.
- `canonicalize(value, { sets: false })` SHALL implement RFC 8785 JSON
  Canonicalization Scheme unextended, leaving every array in document order;
  this is the `agent-ix-conformance-jcs-v1` form the conformance corpus declares
  and the form an adapter answer's `normalized` member carries.
- `canonicalize(value, { sets: true })` SHALL implement the same scheme extended
  by sorting the members of a declared set of containers by their `identity`
  before serialization; this is the `RFC8785-JCS-with-identity-sorted-sets-v1`
  form `docs/semantic-data-system/contracts-v1.md` names for the v1 fingerprint,
  and it is what makes two documents differing only in set order carry one
  fingerprint.
- The requirement stated one form before this was measured. The first run of the
  canonicalizer against the corpus matched **1 of 111** cases, and the single
  cause was that the corpus's `normalized` is the unextended form while this
  requirement described the extended one; with the two separated the same run
  matches 111 of 111. Which of the two a `normalized` answer must carry is
  stated in no contract document, and that is filed as
  `agent-ix/filament-core-data#67` beside GAP-004.
- `IDENTITY_SET_PATHS`, which applies to the fingerprint form only, SHALL be exactly these thirteen container paths: `/types`, `/types/*/fields`, `/types/*/variants`, `/types/*/constraints`, `/types/*/relationships`, `/types/*/operations`, `/types/*/clauses`, `/types/*/extensions`, `/types/*/fields/*/extensions`, `/types/*/operations/*/params`, `/types/*/operations/*/params/*/extensions`, `/occurrences`, and `/extensions`.
- `canonicalize` SHALL order object keys by code point.
- Where two members of an identity-sorted container carry the same `identity`, the fingerprint form SHALL order them by the code-point order of their own canonical forms.
- Where two members remain equal under that tie-break, `canonicalize` SHALL keep their original array order, so the ordering is total on every input.
- The tie-break SHALL be stated rather than left to the sort's stability, because `DUPLICATE_IDENTITY` is a registered admissibility code, documents carrying duplicate identities therefore exist in the corpus, and the adapter emits `normalized` for those cases as well as for admissible ones.
- `canonicalize` SHALL drop a key whose value is `undefined` rather than serializing a placeholder for it.
- `canonicalize` SHALL refuse a non-finite number rather than serializing it, because JSON has no representation for one and a silent substitution would change the document.
- `canonicalize` SHALL serialize the number negative zero as `0`, following RFC 8785, so that a document differing only in the sign of a zero canonicalizes identically.
- `canonicalize` SHALL refuse a value nested deeper than the declared depth bound rather than recursing without bound.
- Because `docs/semantic-data-system/contracts-v1.md` names the algorithm `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere, which `conformance/contract-gaps.json` records as GAP-004, `canonical.mjs` SHALL publish its own definition of both forms with the gap cited beside them.
- `normalizeIrForTarget` SHALL use the unextended form, so that the string an adapter answer carries is the corpus's.
- `fingerprintIrForTarget` SHALL use the extended form, so that the value stamped into a generated file's banner is the contract's.
- `normalizeIrForTarget` SHALL force `nullable` to a literal boolean on every field and every operation parameter, unconditionally on `contractVersion`. `nullable` materializes `true` only where the authored member is the JSON literal `true`; every other value or its absence — `null`, `false`, a number, a string, an array, or an object, or no member at all — materializes `false` (fcd#187).
- `normalizeIrForTarget` SHALL NOT derive `multiplicity` from `presence` or `presence` from `multiplicity`: both members are schema-required and independently authored under contract `2.0.0` (FR-106-CON-2), so neither is ever materialized from the other, and `normalizeIrForTarget` adds no member beyond the literal `nullable`.
- `normalizeIrForTarget` SHALL be idempotent, so normalizing a normalized document yields identical bytes.
- `normalizeIrForTarget` SHALL leave its argument byte-identical, so a caller's document is never mutated by being canonicalized.
- `digestOf` SHALL return the SHA-256 of the canonical bytes, prefixed `sha256:`.
- Canonicalization SHALL read no clock, no environment variable, and no network.
- Canonicalization SHALL produce identical bytes from any working directory and under any locale.
- Canonicalization SHALL depend on no member of the admissibility answer, so a document `admitIr` refuses still canonicalizes.

### Classification

- `classifySurface` SHALL classify the ordered pair over the IR surface only.
- `CLASSIFICATION_ORDER` SHALL be exactly `invalid`, `breaking`, `unknown`, `conditional`, `additive`, `patch`, most restrictive first.
- `classifySurface` SHALL return, as the aggregate, the most restrictive classification among the changes it records, starting from `patch` where it records none.
- If either document is inadmissible under [FR-068](./FR-068-decide-and-report-ir-admissibility.md), then `classifySurface` SHALL return `invalid` without classifying further, because a comparison against an invalid document is not a compatibility statement.
- `classifySurface` SHALL classify a removed type as `breaking`.
- `classifySurface` SHALL classify an added type as `additive`.
- `classifySurface` SHALL classify a changed `kind` as `breaking`.
- `classifySurface` SHALL classify a changed `scalar`, `target`, `items`, or `values` as `breaking`.
- `classifySurface` SHALL classify a removed field as `breaking`, because `docs/semantic-data-system/compatibility.md` names a field removal breaking.
- `classifySurface` SHALL classify an added required field as `breaking`, because `docs/semantic-data-system/compatibility.md` admits a new required field only where every representation already carried an unambiguous compatible default.
- `classifySurface` SHALL classify an added optional field as `conditional` where no consumer policy is supplied, because `docs/semantic-data-system/compatibility.md` says an optional addition is additive "only when every target and known consumer preserves, ignores, or surfaces them as declared", which an absent policy does not establish.
- `classifySurface` SHALL classify a field that became required as `breaking`.
- `classifySurface` SHALL classify a field that became optional as `additive`.
- `classifySurface` SHALL classify a change to a field's `nullable` as `breaking`, in either direction, because each direction breaks one side of the contract.
- `classifySurface` SHALL classify a change to a field's `defaultKind` or `defaultValue` as `conditional`.
- `classifySurface` SHALL classify a removed enum or union variant as `breaking`.
- `classifySurface` SHALL classify an added enum or union variant as `additive` where a consumer policy admits unknown members, and, where none does, as the single named `VARIANT_ADDITION_POLICY` constant decides.
- `classifySurface` SHALL classify an added relationship as `conditional`.
- `classifySurface` SHALL classify a removed relationship as `breaking`, because `docs/semantic-data-system/compatibility.md` names a removal breaking; an *added* relationship stays `conditional`.
- `classifySurface` SHALL classify an added extension whose `required` is true as `breaking`.
- `classifySurface` SHALL classify an added extension whose `required` is false as `additive`.
- `classifySurface` SHALL classify a removed extension as `breaking`.
- `classifySurface` SHALL classify a changed package identity as `breaking`.
- `classifySurface` SHALL classify a move of `unknownPolicy` to `reject` as `breaking`.
- `classifySurface` SHALL classify any other change of `unknownPolicy` as `conditional`, because `docs/semantic-data-system/contracts-v1.md` leaves the tightening direction unordered, which `conformance/contract-gaps.json` records as GAP-010 against `agent-ix/filament-core-data#25`.
- If a change falls under no rule above, then `classifySurface` SHALL classify it as `unknown`, so an unclassifiable change cannot pass as compatible.
- Where a consumer policy admits unknown members, `classifySurface` SHALL soften an added optional field from `conditional` to `additive`, reading the softening from the policy rather than assuming it.
- `classifySurface` SHALL record, for every change, its classification, its RFC 6901 pointer, and a message naming what moved.
- `classifySurface` SHALL order recorded changes by pointer, then by classification, comparing both by code point.
- `classifySurface` SHALL NOT override `schema/semantic/v1/compatibility-report.schema.json`, which stays the authority for the profile, mapping, representation, target, and consumer surfaces this classification does not read.

### The variant addition

- `docs/semantic-data-system/compatibility.md` SHALL be the authority for how an
  added enum or union variant classifies, because it is the document the rule
  above cites and the only one that states an answer rather than an owner.
- That document states that an enum addition is "additive only for open-enum
  consumers", that a closed generated enum requires "an unknown variant or
  coordinated breaking release", and it names "closed-enum expansion" in its
  **Breaking** change class. It declares three classes — patch, additive and
  breaking — and `conditional` is not one of them, so softening a closed-enum
  expansion into something a consumer may ignore is a reading the cited
  authority does not carry.
- The contract's reading of a variant addition is therefore `additive` where a
  consumer policy admits unknown members and `breaking` where none does.
- `docs/semantic-data-system/contracts-v1.md` says only "Open/closed enum
  behavior is consumer policy, not a language default", which states who decides
  and not what the answer is when nobody has; the conformance corpus reads the
  absent policy as `conditional` and cites that weaker sentence.
- The disagreement was measured rather than predicted: under the contract's
  reading the corpus cases `ENUM-004` and `UNION-004` — both on the base
  `core-2-0`, which carries no consumer policy — answer `breaking` against an
  expected `conditional`, and the compatibility family is 22 of 24. Under the
  corpus's reading both answer `conditional` and the family is 24 of 24. No
  other case's answer moves between the two settings.
- `classify.mjs` SHALL carry a single named `VARIANT_ADDITION_POLICY` constant
  with exactly two admissible settings, `corpus` and `contract`, in the manner
  of the `REFERENCE_POLICY` of
  [FR-068](./FR-068-decide-and-report-ir-admissibility.md).
- `VARIANT_ADDITION_POLICY` SHALL default to the corpus's published reading, so
  that the backend conforms to the yardstick the acceptance criteria name.
- The default SHALL be recorded as conformance with the published corpus rather
  than as a ruling on the contract. It is not open to this requirement to settle
  it the other way by moving the corpus:
  [FR-070](./FR-070-run-the-typescript-conformance-adapter.md) states that a
  disagreement "SHALL NOT be resolved by editing a corpus case, a base, the
  oracle, the harness, or a threshold", and
  [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
  makes `conformance/cases/**`, `conformance/corpus.json`,
  `conformance/contract-gaps.json` and `conformance/divergences.json` prohibited
  paths, for the reason `conformance/README.md` gives — a backend that edits the
  corpus it is judged against has arranged its own verdict.
- The disagreement SHALL therefore be reported to the corpus's owner under
  [FR-070](./FR-070-run-the-typescript-conformance-adapter.md)'s Disagreement
  rule rather than absorbed, and when `ENUM-004` and `UNION-004` move under a
  `corpus-defect` verdict and a major `corpusVersion` bump, flipping this
  constant SHALL be one edit in one place.
- [FR-070](./FR-070-run-the-typescript-conformance-adapter.md) SHALL report the
  disagreement in the pull request whichever way the constant is set, so that a
  green conformance run does not make the open question invisible.

### The modelled-change set

- `MODELLED_CHANGES` SHALL be the declared list of change kinds the rules above name, exported as data.
- `MODELLED_CHANGES` SHALL be part of what the corpus agreement tests, because the `unknown` fallback makes the boundary of the modelled set observable: a backend that models one change kind more than the oracle turns an `unknown` verdict into a specific one and diverges.
- The corpus carries twenty-four `kind: "compatibility"` cases, one of which expects `unknown`, so the boundary is exercised rather than hypothetical.
- Where modelling a change kind the oracle does not model produces a divergence, [FR-070](./FR-070-run-the-typescript-conformance-adapter.md) SHALL report it rather than narrowing `MODELLED_CHANGES` to make the run green, because narrowing a rule set to match a yardstick is the tuning this bundle exists to prevent.

### Independence

- `canonical.mjs` and `classify.mjs` SHALL NOT import `src/compiler/ir/normalize.mjs`, `src/compiler/packages/canonical.mjs`, or `src/compiler/compat/diff.mjs`.
- `canonical.mjs` and `classify.mjs` SHALL NOT import any module under `conformance/`.
- Neither module SHALL add a runtime dependency to the repository.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-069-CON-1 | The canonical form and the classifier are deliberately second implementations beside the compiler's; neither SHALL import the compiler's normalization, canonicalization, or diff module, so agreement between them is evidence rather than a tautology. | Correctness | Static analysis |
| FR-069-CON-2 | `canonical.mjs` SHALL declare `IDENTITY_SET_PATHS` as data in one place, so a fourteenth container path is a data edit that a test can see rather than a scattered code change. | Maintainability | Test |
| FR-069-CON-3 | The GAP-004 citation SHALL stay in `canonical.mjs` until a published definition of the named algorithm exists, so the local definition is never mistaken for the contract's; the citation names the gap row and `agent-ix/filament-core-data#59`, because the row's declared owner `agent-ix/filament-core-data#9` is closed. | Integrity | Static analysis |
| FR-069-CON-4 | `classifySurface` SHALL NOT read the clock, so a report is a function of the two documents alone. | Determinism | Static analysis |
| FR-069-CON-5 | This requirement SHALL NOT change a byte of `schema/semantic/v1/**` or `docs/semantic-data-system/**`; where the contract is ambiguous the gap is cited, not amended. | Non-disruption | Change-set diff |
| FR-069-CON-6 | `canonical.mjs` SHALL declare `IDENTITY_SET_PATHS` and the key-ordering rule as data in one module, because GAP-004 leaves the named algorithm undefined and a later definition then becomes a data edit rather than a rewrite of every rule that reads them. | Maintainability | Test |
| FR-069-CON-7 | `MODELLED_CHANGES` SHALL NOT be narrowed to make a corpus case agree; a rule the backend models and the oracle does not is reported as a divergence for the owner. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-069-AC-1 | Two documents differing only in object key order and in the order of the thirteen identity-keyed containers canonicalize to identical bytes. | Property |
| FR-069-AC-2 | Two documents differing in any semantic value canonicalize to different bytes. | Property |
| FR-069-AC-3 | `normalizeIrForTarget(normalizeIrForTarget(d))` equals `normalizeIrForTarget(d)` for every positive fixture and for every corpus case input. | Property |
| FR-069-AC-4 | Any document's field gains a literal `nullable` and no other member, gated on no field of the document including `contractVersion`; `normalizeIrForTarget` never derives `multiplicity` from `presence` or `presence` from `multiplicity`; and `nullable` materializes `true` for the input `true`, and `false` for each of `1`, `"true"`, `null`, `{}`, and an absent `nullable` member. | Unit |
| FR-069-AC-5 | Canonicalizing every conformance base and case input produces byte-identical output on a second run, from a different working directory, and under `LC_ALL=tr_TR.UTF-8`. | Integration |
| FR-069-AC-6 | A non-finite number and a value past the depth bound are each refused with a named error rather than serialized. | Unit |
| FR-069-AC-7 | Canonicalization leaves its argument byte-identical for every corpus case. | Property |
| FR-069-AC-8 | Each classification rule this requirement states fires on a constructed pair and yields exactly its stated classification at a hand-computed pointer, and the count of rules exercised equals the count of rules stated. | Test |
| FR-069-AC-9 | A pair carrying one `breaking` and one `additive` change aggregates to `breaking`; a pair carrying only `patch` changes aggregates to `patch`. | Unit |
| FR-069-AC-10 | A pair whose `before` is inadmissible aggregates to `invalid`, and so does a pair whose `after` is. | Unit |
| FR-069-AC-11 | A change the rules do not model aggregates to `unknown` rather than to `patch`. | Unit |
| FR-069-AC-12 | An added optional field classifies `conditional` with no consumer policy and `additive` with a policy admitting unknown members, which is the same edit judged twice and is what the two committed compatibility bases discriminate. | Unit |
| FR-069-AC-13 | The twenty-four `kind: "compatibility"` cases of the conformance corpus receive the classification the oracle records for them, and a divergence is reported rather than absorbed. | Integration |
| FR-069-AC-14 | `canonical.mjs` and `classify.mjs` contain no import of the compiler's normalization, canonicalization, or diff modules, and none of any module under `conformance/`. | Static |
| FR-069-AC-15 | `pnpm-lock.yaml` gains no entry from this requirement, and neither module imports a package outside the Node standard library. | Analysis |
| FR-069-AC-22 | `normalizeIrForTarget` reproduces the oracle's `normalized` string byte for byte for all 114 corpus cases, measured with no admissibility answer computed. | Snapshot |
| FR-069-AC-23 | The unextended and the extended forms differ for a document whose set members are out of identity order, and agree for one already in order, so the two named algorithms are demonstrably two. | Unit |
| FR-069-AC-16 | A document carrying two members with the same `identity` in an identity-sorted container canonicalizes to the same bytes whatever order those two members arrive in, and a document carrying two byte-identical such members canonicalizes without dropping either. | Property |
| FR-069-AC-17 | A removed field, an added required field, a removed variant, and a removed relationship each classify `breaking`; an added optional field classifies `conditional` with no consumer policy; and an added variant classifies `additive` under a policy admitting unknown members, `breaking` with no policy under the `contract` setting of `VARIANT_ADDITION_POLICY`, and `conditional` with no policy under its default `corpus` setting. | Unit |
| FR-069-AC-25 | `VARIANT_ADDITION_POLICY` is the only place in the backend that decides how a variant addition with no consumer policy classifies; under `contract` an added variant classifies `breaking` with no policy and `additive` under a policy admitting unknown members; and flipping it changes the answer for the corpus cases `ENUM-004` and `UNION-004` and for no other case. | Static |
| FR-069-AC-19 | `MODELLED_CHANGES` is exported as data, and a rule stated in this requirement but absent from that list fails the module's own contract test. | Test |
| FR-069-AC-20 | `canonicalize` and `normalizeIrForTarget` run over every corpus case with no admissibility answer computed, demonstrating that canonicalization depends on nothing from FR-068. | Unit |
| FR-069-AC-21 | The number negative zero canonicalizes to the same bytes as positive zero, and a document differing only in that sign yields one canonical form. | Unit |

## Dependencies

- **Upstream**: [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions**: GAP-004 is the highest-volatility open question this ticket carries, ranked above GAP-011. `docs/semantic-data-system/contracts-v1.md` names `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere; `normalized` is compared byte for byte on all 114 corpus cases; and the fingerprint [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) stamps into every generated file's banner derives from it. A later definition that changed the set-path list or the key-ordering rule would move every case, every fingerprint, and every committed generated fixture at once, which is why FR-069-CON-6 requires both to be declared as data in one place. The GAP-004 row names `agent-ix/filament-core-data#9` as its owner and that issue is closed, so the definition has no live decider; `agent-ix/filament-core-data#59` records that and asks for one. GAP-010 (the unknown-policy tightening direction is unordered) is owned by `agent-ix/filament-core-data#25` and moves one rule.
