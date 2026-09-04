---
id: SR-032
title: "Risk and complexity review of the semantic IR v1.1 revision"
type: SpecReview
analysis: risk-complexity
scope: "US-006, FR-027..030, FR-020 (amended), NFR-013, spec/tests.md TC-203..236"
review_set: all
---
# Risk and complexity review

## Summary

Issue #34 adds five node families (multiplicity/unit, relationships,
operations, clauses, closed constraint keywords) and rebinds `source.dialect`
and manifest targets, all under an additive-only constraint against a v1
baseline whose schemas pin `contractVersion` to `"1.0.0"` and close every node
with `additionalProperties: false`. The largest technical risks are the
undecided versioning mechanism for the schema files themselves, the amount of
validation that JSON Schema cannot express and that therefore needs a second
validator two readers must agree on, and a classifier rule that would label the
revision breaking by its own text. The largest volatility is in the three
enumerations the revision borrows from contracts owned elsewhere.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-081 | high | The revision does not say how one `schema/semantic/v1/` directory serves both contracts: v1 schemas pin `contractVersion: "1.0.0"` and close `field`/`typeDefinition` with `additionalProperties: false`, yet FR-030-CON-1/TC-231 require "the v1 schema" to keep accepting the v1 dialect constant while FR-030-AC-2 requires v1.1 to reject it. Either every new node is wrapped in `if contractVersion` conditionals or a second schema set is added; both `test/typespec-feasibility.test.ts` (allowed-path list) and `test/semantic-contract.test.ts` (`schemaRoot` assertion) hard-code the single directory. Decide before plan generation. | NFR-013, FR-030-CON-1, FR-030-AC-2, TC-231, FR-019-CON-2 |
| FND-082 | high | Five v1.1 rules are cross-node checks JSON Schema cannot express: `unit` only when `typeRef` resolves to a `scalar` definition, `pre[]`/`post[]` resolving inside the same type's `clauses[]`, `presence` agreeing with `multiplicity`, `ordered`/`unique` only on collections, and manifest targets matching the target-contract enumeration by reference. The repository currently has only an Ajv harness, so "IR validation SHALL fail at the locus" implies a validator that does not yet exist, and the two-reader parity test (TC-232) then measures agreement between two hand-written validators, not two schema readers. | FR-027-AC-3..5, FR-028-AC-4, FR-028-AC-7, FR-020-AC-8, TC-232 |
| FND-083 | high | FR-029-CON-2 classifies a keyword "removed or retyped" as breaking, but the v1 -> v1.1 change retypes `keyword` from `string` to a closed enum and `operands` from `{}` to per-keyword shapes. By its own rule the classifier must call the revision breaking, while NFR-013-AC-3 requires the corpus to record it as `additive`. The only reason it is additive in practice is that no v1 positive fixture carries a constraint (`"constraints": []` throughout), which makes FR-029-CON-1 and TC-224 vacuously true rather than evidence. | FR-029-CON-1, FR-029-CON-2, NFR-013-AC-3, TC-224, TC-225, TC-235 |
| FND-084 | medium | Three enumerations are borrowed from contracts this repository does not own: relationship `category` from quire-rs FR-040, clause `language` from the not-yet-built quire-contract-ir#52 frontends, and `source.dialect: spec-bundle` from the not-yet-built issue #36 frontend. Each is pinned as a closed set in the IR schema, so any upstream change is a v1.2 schema revision plus a classifier case. | FR-028 Behavior, FR-030 Behavior, FR-028-AC-6, TC-215, TC-227 |
| FND-085 | medium | Presence and nullability stay required on `field` while `multiplicity` is optional for v1 compatibility, so every v1.1 field carries redundant state that must be kept consistent (EC-027). Derivation (`presence` -> `1..1`/`0..1`) is reader behavior, not schema, so byte-identical round-trip (TC-203, TC-233) depends on an unspecified rule for whether the normalized form materializes derived multiplicity. | FR-027-CON-1, FR-027 Behavior, FR-020-AC-7, TC-203, TC-208, TC-233 |
| FND-086 | medium | The compatibility classifier that FR-029-CON-2 and NFR-013-AC-3 rely on lives inside `test/semantic-contract.test.ts` as a family list over `fixtures/semantic/v1/compatibility/cases.json`; adding `keyword`, `multiplicity`, `relationship`, `operation`, and `clause` families is test-code change, not product change, and there is no published classifier for a second reader to agree with. | FR-029-CON-2, FR-025, TC-225, TC-235 |
| FND-087 | low | The `pattern` operand fixes `dialect: "ecma-262"` while the rust and python targets use different regex engines; FR-020-CON-2 covers the lossy diagnostic, but no v1.1 test names the cross-target case. | FR-029 Behavior, FR-020-CON-2, TC-219 |
| FND-088 | low | NFR-013 measures "corpus repository files changed = 0" and "spike byte-identical", but the changed-path gate (TC-236) can only observe this repository, and TC-234 requires running `spike:typespec:check`, whose pinned toolchain is a separate pnpm workspace under `spikes/`. Both are inspection-strength, not test-strength, unless the plan wires them into CI. | NFR-013-AC-2, NFR-013-AC-4, TC-234, TC-236 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| US-006 | Medium | Medium | Aggregates FR-027..030; reader-agreement risk named in the story | Fixture-backed agreement (FR-020-AC-8) as the exit gate |
| FR-020 (amended) | High | Low | AC-7 byte-identical round-trip and AC-8 two-reader parity across five new node kinds | Decide normalized-form materialization rule (FND-085); build the second reader before the golden fixtures, not after |
| FR-027 | Medium | Low | Redundant presence/multiplicity state; unit-on-scalar needs `typeRef` resolution | Property test over the four multiplicity classes x nullable x default; validator, not schema, owns the resolution check |
| FR-028 | High | High | Cross-node clause resolution; borrowed FR-040 categories and clause languages | Spike the validator first; keep both enumerations as single `common.schema.json` definitions so a v1.2 bump touches one place |
| FR-029 | High | Low | Type narrowing masquerading as additive; classifier rule self-contradiction; no v1 constraint evidence | Reword FR-029-CON-2 or NFR-013-AC-3 so they agree (FND-083); add one positive fixture per keyword before closing the vocabulary |
| FR-030 | Medium | High | Dialect semantics inverted from v1; `spec-bundle` names an unbuilt frontend; shared target enum across three schemas | Single `$ref` target enumeration (FR-030-AC-4); versioning decision from FND-081 |
| NFR-013 | High | Low | Additive-only under `additionalProperties: false` and a pinned `contractVersion` constant | Resolve FND-081 first; the changed-path gate and spike check run in CI, not by hand |

## Top hazards

1. FND-081 - the schema versioning mechanism is undecided and both existing test harnesses assume one directory.
2. FND-082 - most v1.1 validation is outside JSON Schema; the second reader is unbuilt.
3. FND-083 - the classifier rule and the additive claim contradict each other; the v1 fixtures cannot arbitrate because they carry no constraints.
4. FND-084 - three borrowed enumerations make FR-028 and FR-030 the most volatile requirements in the set.

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | v1 / v1.1 schema coexistence | Explicit versioning decision recorded before Plan generation |
| 2 | Non-schema validation and reader parity | Validator spike plus shared golden and negative fixtures |
| 3 | Additive claim vs keyword narrowing | Reconcile FR-029-CON-2 with NFR-013-AC-3; per-keyword fixtures |
| 4 | Borrowed enumerations | Single common definitions; v1.2 path documented |
| 5 | Redundant presence/multiplicity state | Normalized-form rule and property test |

## Failure-domain gaps

The v1 failure-domain review (SR-018, `spec/reviews/9-semantic-contract/failure-domain.md`)
recorded no open gap. This revision adds EC-027..031 in `spec/tests.md`; the
gaps that also raise risk here are EC-027 (redundant presence/multiplicity,
FND-085), EC-029 (duplicate `clauseId` across languages, FND-082), and EC-030
(v1 fixture with a free-form keyword, FND-083). No issue-#34 failure-domain
review exists yet; this register should be re-checked against it when it does.
