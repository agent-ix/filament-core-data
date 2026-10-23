---
id: SR-16292
title: "spec-review of STD-399 Bytes, Duration and JsonObject native scalars (filament-core-data PR 305)"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@adc1575c; spec/functional/FR-032-define-the-kernel-scalar-library.md; spec/functional/FR-054-map-the-semantic-ir-to-rust-serde-declarations.md; spec/functional/FR-066-generate-runtime-validators.md; spec/functional/FR-100-map-semantic-ir-to-json-schema.md; spec/tests.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-032
    type: references
  - target: ix://agent-ix/filament-core-data/FR-054
    type: references
  - target: ix://agent-ix/filament-core-data/FR-064
    type: references
  - target: ix://agent-ix/filament-core-data/FR-066
    type: references
  - target: ix://agent-ix/filament-core-data/FR-100
    type: references
  - target: ix://agent-ix/filament-core-data/FR-058
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1853
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1854
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1863
    type: references
---

# Spec review of STD-399 Bytes, Duration and JsonObject native scalars (filament-core-data PR 305)

## Summary

Ticket: STD-399. One spec-review pass over the PR's own delta against origin/main. Checked: the standing no-drop/no-narrowing/no-deferral rule, testable vectors (key vectors derived by hand), id uniqueness across open PR heads, name consistency with the QSL and QSpec PRs, and mergeability.

Examined, clean:

- The Bytes pattern in FR-032 was run against every two- and three-character final group: it matches exactly the canonical padded base64 strings, and every FR-032-AC-10 vector classifies as stated. The octet arithmetic of the Duration vectors in FR-032-AC-8 (93784.5 s, 129600 s) holds.
- The Bytes wire form is restated once in FR-032 and cited, not copied, by FR-054, FR-064, FR-066 and FR-100; UNDECLARED_WIRE_FORM and its FR-058 row are removed, and no other file still names it.
- QSpec names cited (FR-154-AC-21, FR-149, FR-322 "Model-owned members") exist with the same spelling in quire-specification PR 408.
- Ids TC-1853, TC-1854, TC-1863, FR-032-AC-7/8/10, FR-054-AC-22, FR-100-AC-16 are defined on no other open PR head.

Gate: vitest 605 passed, 54 failed (659 tests). origin/main in the same environment: 606 passed, 53 failed. The one extra failure, test/fcd-268-regressions.test.ts "enforces native Integer enumValues and proves the missing check is red", passes 13/13 when run alone (load timeout while three suites ran concurrently), and PR 306, which contains this head, ran 606/53. No new failure.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | scope-deferral: the PR rewrites the #58 text for Bytes but keeps the union discriminator wire form as a "declared backend decision pending agent-ix/filament-core-data#58" (FR-066 bullet, FR-066-CON-9, FR-066-AC-29, the FR-064 open-contract line, TC-786). The text was already on main and the discriminator is not Bytes, so the lead decides: either state the union wire form in this PR or open a new STD ticket for it and remove the pending wording the PR touches. The standing rule counts "pending <ticket>" as not done. | spec/functional/FR-066-generate-runtime-validators.md:120-125, :214; spec/functional/FR-064-lower-ir-type-definitions-to-typescript.md:97-100 | missing-requirement |
| FND-002 | low | FR-032 acceptance criteria run AC-7, AC-8, AC-10: AC-9 is never defined. Renumber AC-10 to AC-9 (and TC-1863, FR-054-AC-22 trace) or add the missing AC. | spec/functional/FR-032-define-the-kernel-scalar-library.md:72-74 | wrong-requirement |

## Verdict

Not mergeable: FND-001 (high) block the PR.

Mergeable into origin/main (main is an ancestor, merge-tree clean). Conflicts with open PR 292 (FR-091, spec/tests.md, extraction fixtures) and PR 84 (FR-050, FR-066, spec/tests.md, kernel validators); whoever merges second resolves them.

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-003 | low | the Rust backend mapping table and rust-backend.md still say a union is externally tagged and a `bytes` scalar is refused with UNDECLARED_WIRE_FORM (issue #58), contradicting FR-054 as rewritten. Update them with the spec, or the implementation ticket must name them. | docs/semantic-data-system/rust-backend.md:26,75,158-159; src/compiler/backends/rust-serde/mapping-table.json:39,300 | wrong-requirement |
| FND-004 | low | TC-1864 says the TypeScript validator, the JSON Schema oneOf and the Rust adjacently tagged enum refuse identically, but no vector covers `{"kind":"b","value":null}` for a payload-free variant: the schema and FR-066 refuse the extra `value`, while serde reads the content of an adjacently tagged unit variant as unit and accepts null. Add the vector and state the Rust rule. | spec/functional/FR-054-map-the-semantic-ir-to-rust-serde-declarations.md:360; spec/tests.md TC-1864 | missing-requirement |

## Dispositions

Round 1, fix head c42cd244. Union wire form hand-derived: `{"kind":"a","value":"x"}` and `{"kind":"b"}` match exactly one branch of the closed oneOf and the adjacently tagged serde form; `{}`, `{"kind":"c"}`, `{"kind":"a"}`, `{"kind":"a","value":1}`, `{"kind":"b","value":"x"}`, `{"a":"x"}` and `{"kind":"b","extra":1}` each fail on a missing tag, an unknown variant, a missing or ill-typed value, or an extra member. All hold. FR-066-CON-9 and FR-066-AC-29 no longer name #58 and no pending wording remains in spec/functional.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-002 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-003 | still-open | New finding of this round; docs and mapping table still describe the old wire forms. |
| FND-004 | still-open | New finding of this round; no vector for a null `value` on a unit variant. |

Round 1 verdict: Mergeable after the two low findings are fixed or dispositioned by the lead; neither is blocking by rubric, but both are still-open.
