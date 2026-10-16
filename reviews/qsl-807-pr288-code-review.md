---
id: SR-11692
title: QSL-807 PR 288 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@dd3fc374e8ba2b2df8ec2a64e8808e24c55c713d; PR 288;
  crates/semantic-ir/src/schema.rs, crates/semantic-ir/src/rules.rs,
  crates/semantic-ir/tests/model_document.rs, schema/semantic/v1/semantic-ir.schema.json
review_set: subset
---

## Summary

Ticket: QSL-807 (also QSL-806, QSL-522). One pass: code-review with the rust-review lane, plus a manual acceptance-criteria-to-tests check against QSL FR-154 / TC-1043, QSL FR-056 / TC-1044 / TC-897, and the QSpec Frames row and value-type binding (cited by id). No build was run. Repo convention: FCD keeps review artifacts under top-level `reviews/` as `<ticket>-pr<N>-<method>.md`; this file belongs at `reviews/qsl-807-pr288-code-review.md`.

## Verdict

FAIL, one blocking finding (FND-001).

Checked and correct. The frame schema admits the three optional members with the types QSL FR-154 and the QSpec Frames row state. A wrong type and a non-string element are reported at the member, which gives TC-1043 I10. The three arrays stay required, and the members stay plain strings with no uniqueness check. The hand-edited `$defs.frame` agrees with `frame_schema()` member for member. No generator writes `semantic-ir.schema.json`. The Rust walk and the oracle's ajv walk are tied only through the conformance corpus, which has no frame case. The copies do not drift today.

`Text` resolves to `string`, so TC-897 step 3 now reaches QSL's reader. The Node, Python, oracle and TS readers still refuse `ix://quire/native/Text`. No corpus case uses it, so no gate breaks, and QSL pins only the Rust validator.

The applicability change only widens. Before this PR, every keyword in the table was refused on a construct kind. A string value type now takes minLength, maxLength, format, pattern, enumValues and nonEmpty. An integer value type takes min, max, exclusiveMin, exclusiveMax and enumValues. QSpec binds value types only as `Int[lo, hi]` and `Text[min, max; profile]`. The extra keywords therefore reach QSL's reader, and QSL FR-056 step 1 refuses them with `declaration-form`. FR-056-AC-38 requires exactly that for `pattern`, so a Text value type with `pattern` now reaches the reader as QSL wants. No existing valid document becomes invalid.

The tests fail under each plausible wrong implementation named in the brief, except one: dropping the `!scalar.is_empty()` guard is not caught (recorded below).

Known gap, the acme-orders v2 fixture, recorded as a decision for the planner. The fixture side must change, not this PR. (i) Its `identified` constructs omit `identityFields` in `members`, which FCD's vocabulary rule requires (rule unchanged, pre-existing). (ii) Its integer `min`/`max` operands are JSON numbers. FCD FR-144 and QSL FR-056 both require a canonical integer string and name `INVALID_OPERAND` for a JSON number, and QSpec states no operand encoding. The earlier `CONSTRAINT_NOT_APPLICABLE` was the wrong refusal, and this PR exposes the right one.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | An unnamed frame member and an absent required frame member are reported at the frame object, not at the member that QSL FR-154 / TC-1043 I11, I12 and the QSpec Frames row name. QSL derives its member path from this pointer, so I11 and I12 report at `frame`. The test asserts the frame-object pointer. | crates/semantic-ir/src/schema.rs:1842-1849; crates/semantic-ir/tests/model_document.rs:111-135 |

## Coverage

Recorded, not blocking:

- Medium, pre-existing: `identityList` has `uniqueItems`, so a `modifies` entry written twice is refused. The QSpec Frames row says a field written twice with one scope is one entry. This is for the planner (QSL-522 filter, or drop `uniqueItems` on the frame arrays).
- Medium: no test pins "a construct with no `scalar` is unchanged". Dropping the guard would admit `enumValues` on a record construct with no failing test.
- Medium: FCD's own spec is not amended. The FR-141 `frame` row still lists exactly three members, the `spec/tests.md` TC-1807 row still says "the same names", and the nine new tests carry no tracing tag.
- Low: no test pins `Text` to `string`. `("Text","integer")` would pass every test.
- Low: a decimal value type can never pass `min`/`max`, because `decimal_policy` is looked up on the construct.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: crates/semantic-ir/src/schema.rs#frame_schema
  path: crates/semantic-ir/src/schema.rs
  role: examined
  excerpt: "require_members(frame, at, FRAME_MEMBERS, f); ... forbid_extra(frame, at, &allowed, f); ... string_list(...); expect_bool(...)"
- id: crates/semantic-ir/src/rules.rs#constraint_rules
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: "Some(_) if !scalar.is_empty() => \"scalar\","
- id: crates/semantic-ir/src/rules.rs#NATIVE_SCALARS
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: "(\"Text\", \"string\"),"
- id: schema/semantic/v1/semantic-ir.schema.json#frame
  path: schema/semantic/v1/semantic-ir.schema.json
  role: examined
  excerpt: "modifies_receiver: array of string; deletes_receiver: boolean; deletes_parameters: array of string; additionalProperties false"
- id: crates/semantic-ir/tests/model_document.rs
  path: crates/semantic-ir/tests/model_document.rs
  role: examined
  excerpt: "9 tests: frame members, native Text, value-type applicability"
- id: QSL FR-154
  path: quire-spec-language spec/functional/FR-154-scope-a-modifies-entry-to-the-receiver.md
  role: examined
  excerpt: "A member the list does not name, a member of the wrong JSON type, or an array element that is not a string refuses invalid_model_binding/malformed-declaration at the member."
- id: QSL TC-1043
  path: quire-spec-language spec/test-cases/TC-1043-receiver-scoped-frame-entries-and-scoped-deletes-in-the-frame-node-and-decision.md
  role: examined
  excerpt: "I10 refuses invalid_model_binding/malformed-declaration at deletes_receiver, I11 at modifies_self, and I12 at the absent deletes, before any entry is read."
- id: QSL FR-056
  path: quire-spec-language spec/functional/FR-056-admit-domain-package-model-declarations.md
  role: examined
  excerpt: "a minLength, maxLength or format constraint whose appliesTo is a value type whose scalar is string must count as applicable"
- id: QSpec model-complete.md#Frames
  path: quire-specification proposals/quire-v1/definitions/model-complete.md
  role: examined
  excerpt: "(QSpec text not quoted)"
- id: QSpec FR-322-AC-44
  path: quire-specification spec/objects/interfaces/FR-322-checked-package-artifact.md
  role: context_only
  excerpt: "(QSpec text not quoted)"
- id: qsl-semantics intake semantic_member_path
  path: quire-spec-language qsl-semantics/src/model/intake.rs
  role: context_only
  excerpt: "let member = semantic_member_path(&located.pointer);"
```
