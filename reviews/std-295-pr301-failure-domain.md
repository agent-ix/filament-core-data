---
id: SR-15522
title: STD-295 PR 301 spec-review failure-domain
type: SpecReview
analysis: failure-domain
scope: "agent-ix/filament-core-data@2469e44cf3ad15cf6f1df0fc7ba35c6b803070cb; PR 301; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, spec/tests.md"
review_set: subset
---

## Summary

Ticket: STD-295. Failure-domain pass of `/quoin:spec-review` over FR-146's refusal codes, their loci and ordering, identity collisions and numeric edges. It was checked against the FCD Rust reader's existing rules (`crates/semantic-ir/src/rules.rs`), FR-050, FR-058, FR-141 and FR-144, and against QSpec FR-142 and FR-154.

## Verdict

FAIL, with two blocking findings (FND-001, FND-002). FR-146-CON-1 requires every reader to return the same verdict, code and locus, and FR-050-AC-3 compares code sets across the Rust, TypeScript and Python readers. FR-146 does not yet fix which codes fire, or where, for its own refusal cases.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The new codes overlap existing reader rules, and no precedence is given. A clock field or a unit-typed field that carries `unit` also meets FR-050's `UNIT_ON_NON_SCALAR`: `rules.rs` emits it for any field with `unit` whose `typeRef` does not resolve to a scalar. A `min` constraint also meets `CONSTRAINT_NOT_APPLICABLE`, a `textProfile` meets FR-141's `SCHEMA_VIOLATION`, a `decimal` meets FR-144's decimal-policy codes, and a `defaultValue` meets `INVALID_DEFAULT_VALUE`. "`ix://quire/native/Clock` anywhere other than a field" also covers `supertypes`, relationship targets and population members, which already refuse `UNRESOLVED_CONSTRUCT_REF`, `UNRESOLVED_RELATIONSHIP_TARGET` or `UNRESOLVED_TYPE_REF`. AC-2 and AC-6 say each case "refuses `INVALID_CLOCK_FIELD`" or "`INVALID_QUANTITY_MEMBER`" without saying whether the older code is suppressed or also raised. Under CON-1, three readers can each comply and still disagree. FR-146 should state for each case the exact code set and pointer, or a precedence rule. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:85-96, 168-178; crates/semantic-ir/src/rules.rs:1536-1546 |
| FND-002 | high | The locus and multiplicity of `INVALID_UNIT_GRAPH` are undefined. FR-146 refuses "naming the dimension and the units shown", but the "shown" column is QSpec FR-142's Retains column, which FR-146 does not reproduce. The pointer is given as "at the dimension" for the term defects and is unstated for the six unit defects. FR-146 also disowns FR-142's first-defect order and says nothing in its place: does a dimension with two defects get one diagnostic or two, and is a two-unit cycle one diagnostic or one per unit, and at which unit? CON-1 requires the same locus from every reader, so FR-146 needs its own pointer per defect and an "every defect" or "first defect" rule. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:116-119, 144-153 |
| FND-003 | medium | FR-146 does not address two dimensions, or two units, with one `name`. Because identity is minted from the name, they share an identity. It does not say whether FR-050's `DUPLICATE_IDENTITY` ("node identities are unique within each list") applies to `/dimensions` and `/units`. Resolving a unit reference by name ("equal to the `name` of a unit node") is then ambiguous. QSpec FR-142 refuses two units of one name as `ambiguous_declaration`. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:126-130, 162-163 |
| FND-004 | medium | The oracle in FR-146-AC-5 is not determined: each bad spelling refuses "`INVALID_OPERAND` (or `SCHEMA_VIOLATION` where the schema refuses the type)". FR-146 does not say whether the published schema carries a rational-string pattern. If it does, every bad string is `SCHEMA_VIOLATION`; if it does not, they are `INVALID_OPERAND`. The test cannot tell which outcome is correct, so the AC should name the code for each spelling. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:131-143, 239 |
| FND-005 | medium | The integer magnitude of exponents and of rational `n`/`d` is unstated. FR-146 cites FR-144 canonical integer strings, and FR-144 bounds integer values with `INTEGER_OUTSIDE_I128`. QSpec FR-142 says dimension exponents "cannot [be narrowed] to a machine integer", and scales are exact rationals. FR-146 should state whether `INTEGER_OUTSIDE_I128` applies to `exponent`, `scale` and `offset`. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:110-113, 131-135 |
| FND-006 | medium | Resolving a single-segment unit reference to the document's unit has no observable effect. A resolved reference and an unresolved one are both "accepted with no diagnostic", no reader output exposes the resolution, and the backends raise `UNDECLARED_LOSS` either way. The first clause of FR-146-AC-6 cannot fail. FR-146 should either name an observable consequence (a reader result, or a check that depends on it) or drop the resolution clause. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:162-167, 240 |
| FND-007 | low | The unconditional `UNDECLARED_LOSS` does not address FR-058's declared-loss rule, under which a profile's `allowedOmissions` naming an identity makes dropping it a non-blocking `DECLARED_LOSS`. FR-146 should say whether a profile may omit a clock or unit-typed member. "Ignore `dimensions` and `units` that no member references" can also lose its qualifier: a referencing member already refuses. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:195-201; spec/functional/FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md:134-139 |
| FND-008 | low | Behavior refuses a mis-minted dimension identity as `INVALID_UNIT_GRAPH`, but FR-146-AC-4 tests only a mis-minted unit identity (`msec` on `ms`), so that branch has no case. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:116-119, 238 |

## Coverage

Each TC row (TC-1842 to TC-1849) states an input and an expected verdict that a unit or integration test can assert, apart from the oracles named in FND-001, FND-002, FND-004 and FND-006. Checked and sound: the clock refusal on parameters and results matches QSL FR-230, which leaves those positions unspecified. Refusing `ix://quire/unit/3ms` is stricter than QSpec FR-154, which admits any non-empty name, and that is harmless for a producer contract. Admitting an unmatched unit unresolved matches QSpec FR-154 and FR-322-AC-80, which refuse it as `missing-name` downstream.

## Examined scope

```yaml
scope:
- {id: FR-146-AC-2, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "a clock field with multiplicity `{0, 1}`, presence `optional`, `nullable: true`, `defaultKind: semantic`, a `unit` of `ms`, or a `min` constraint each refuse `INVALID_CLOCK_FIELD` at the field naming the member."}
- {id: FR-146-AC-4, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "each refuse `INVALID_UNIT_GRAPH` naming the dimension and the units shown; a dimension `Time` with no units is accepted."}
- {id: FR-146-AC-5, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "each refuse `INVALID_OPERAND` (or `SCHEMA_VIOLATION` where the schema refuses the type) at the member"}
- {id: FR-146-AC-6, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "A field and an operation parameter typed `ix://quire/unit/ms` in the AC-3 document resolve to the unit `ms`; the same references in a document that declares no units are accepted with no diagnostic"}
- {id: FR-146-AC-1, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock."}
- {id: FR-146-AC-3, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "the same document without `dimensions` and `units` serializes with neither member."}
- {id: FR-146-AC-7, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "adding a unit classifies additive, and removing one or changing its `scale` classifies breaking."}
- {id: FR-146-AC-8, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "each make every generation backend raise the blocking `UNDECLARED_LOSS` naming the clock or unit-typed member and write no file"}
- {id: FR-146-CON-1, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Every IR reader SHALL return the same verdict, code and locus"}
- {id: rules.rs#field_rules, path: crates/semantic-ir/src/rules.rs, role: context_only, excerpt: "if field.has(\"unit\") { ... if !scalar { sink.emit(child(&field_at, \"unit\"), UNIT_ON_NON_SCALAR, ...) } }"}
```

## New findings (disposition pass 1)

Head edceaaac288b147eb40d37ba46ccbd2673dbd4d0.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-009 | low | Term cycles are reported "once per cycle", but a dimension can have several terms, so elementary cycles may overlap, share a pointer, or be exponentially many. Report per strongly connected component (once, at its least-index dimension's first term inside the component), which also matches QSpec FR-142's per-dimension cycle refusal. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:168-172 |
| FND-010 | low | An operation result (`returns`) has no `identity` in the schema (`typeRef`, `decimal`, `multiplicity`, `nullable` only), so `allowedOmissions` cannot name a unit-typed result and it always raises UNDECLARED_LOSS. Say whether a result is omitted through its operation's identity, or only with the whole operation. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:286-289 |
| FND-011 | low | The exclusivity claim ("INVALID_CLOCK_FIELD is the one code each such member carries") lists the suppressed codes but not INVALID_MULTIPLICITY (a clock `{2,1}`), UNKNOWN_CONSTRAINT_KEYWORD or INVALID_PATTERN (inside a clock or unit-typed member's `constraints`). Read literally they still fire beside the FR-146 code, which is deterministic but contradicts the "one code" wording; list them or narrow the claim. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:128-132 |

## New findings (disposition pass 2)

Head e8a665fa1a51390042299eec82030b759d90185b.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-012 | low | The round-2 result rule says a unit-typed operation result raises blocking UNDECLARED_LOSS "whatever `allowedOmissions` names". FR-058 lets `allowedOmissions` name any semantic identity, an operation's included, and dropping a named identity is a non-blocking DECLARED_LOSS. When the profile omits the owning operation, its result is dropped with it, and FR-146 then contradicts FR-058. State that omitting the owning operation omits its unit-typed result under that operation's DECLARED_LOSS, and keep UNDECLARED_LOSS for the case where the operation is generated. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:316-319, 365 |

## New findings (disposition pass 3)

Head fbd12c7cb76ce201bae90a1c5a55dd458352ecf0.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-013 | low | The round-3 result rule drops a unit-typed result with its omitted operation, but the omission bullets at lines 306-315 still key on the member's own identity. A unit-typed parameter of an operation that `allowedOmissions` names, or a clock or unit-typed field of an omitted type, is named by no `allowedOmissions` entry itself, so read literally it raises blocking UNDECLARED_LOSS although it is never generated. Apply the same rule: a member dropped with an omitted owner raises no loss of its own. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:306-315 |

## Dispositions

Round 1, head edceaaac288b147eb40d37ba46ccbd2673dbd4d0 (fix commit edceaaa).

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | - |
| FND-002 | fixed | - |
| FND-003 | fixed | - |
| FND-004 | fixed | - |
| FND-005 | fixed | - |
| FND-006 | fixed | - |
| FND-007 | fixed | - |
| FND-008 | fixed | - |
| FND-009 | fixed | round 2, head e8a665f |
| FND-010 | fixed | round 2, head e8a665f |
| FND-011 | fixed | round 2, head e8a665f |
| FND-012 | fixed | round 3, head fbd12c7 |
| FND-013 | fixed | round 4, head 5c26453 |
