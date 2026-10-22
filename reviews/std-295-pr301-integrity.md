---
id: SR-15520
title: STD-295 PR 301 spec-review integrity
type: SpecReview
analysis: integrity
scope: "agent-ix/filament-core-data@2469e44cf3ad15cf6f1df0fc7ba35c6b803070cb; PR 301; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, spec/spec.md, spec/tests.md"
review_set: subset
---

## Summary

Ticket: STD-295. Integrity pass of `/quoin:spec-review` over `git diff origin/main...HEAD` (base 6e2c98fc, head 2469e44c, verified as the live PR head). The PR is spec-only: it adds FR-146, lists it in the `spec/spec.md` FR range with a paragraph, and adds TC-1842 to TC-1849 to `spec/tests.md`. The review checked FR-146 against FCD's own FR-027, FR-050, FR-058, FR-069, FR-092, FR-100, FR-141, FR-144 and FR-145, the FCD Rust reader (`crates/semantic-ir/src/rules.rs`), QSpec FR-142, FR-154 and FR-322 (origin/main 35fc4ea), QSL FR-230, FR-185 and FR-393 (origin/main 85f6f62a0), and quire-rs FR-070.

Gate: `quire validate --scope . 'spec/**/*.md'` (quire 0.36.2, engine 0.50.2) exits 0 on head and on main. Both produce 68 warning lines, and the outputs are identical once the paths are normalized. None is in FR-146, and neither run has an error line. The author's claim holds.

Ids: FR-146, TC-1842 to TC-1849 and the six new codes (`CLOCK_OUTSIDE_FIELD`, `INVALID_CLOCK_FIELD`, `UNRESOLVED_DIMENSION_REF`, `UNRESOLVED_UNIT_REF`, `INVALID_UNIT_GRAPH`, `INVALID_QUANTITY_MEMBER`) occur nowhere else in the repo at head. They also occur on no other remote branch and in neither of the open PRs, #292 and #84.

## Verdict

FAIL, with two blocking findings (FND-001, FND-002).

Lead defaults, judged:

1. Clock as the native reference `ix://quire/native/Clock`, not a scalar: sound. It follows the FR-092 and QSpec FR-154 native-reference pattern. It needs QSpec FR-154 amended (FND-003), and it has the refusal-code overlap recorded in SR-15522 FND-001.
2. Fixed clock field shape: sound. It matches QSL FR-230 (one clock per object and field, zero initially, written only by resets).
3. Units declarable in the domain package: sound. QSL FR-230 already expects package-supplied units and has a `conflicting_declaration` rule for `Time`. QSpec FR-322 step 4 contradicts it (FND-003).
4. Wire spellings: sound. The integer bound on exponents and rationals is unstated (SR-15522 FND-005).
5. Graph shape only, with no base-dimension rule and no first-defect order: sound in scope. FR-146 must then define its own locus and multiplicity (SR-15522 FND-002). The shape cannot carry a dimensionless dimension (FND-002).
6. An unmatched unit is admitted unresolved: sound. It matches QSpec FR-154 ("intake admits it without resolving it") and leaves the error to FR-322's `missing-name`. The single-segment resolution it adds has no observable effect (SR-15522 FND-006).
7. Normalized form in authored order, fingerprint form as sets: the intent is sound, but the text contradicts FR-069 (FND-001).
8. Additive and breaking rules: sound. They follow the FR-069-AC-17 classifier vocabulary.
9. Five backends refuse with `UNDECLARED_LOSS`: sound, and consistent with FR-100 and FR-144. The `allowedOmissions` interaction is unstated (SR-15522 FND-007).
10. Extraction does not lift Clock: sound. quire-rs FR-070's kernel scalar list has no `Clock`, so a `Clock` cell is an `unknown-token` placeholder and becomes FR-092 `UNRESOLVED_TYPE_TOKEN`. It becomes an `Object` only when a bundle artifact is named `Clock`.

Keeping the contract at `2.0.0` with additive optional members follows FR-141's precedent. The schema root has `additionalProperties: false`, so readers that predate FR-146 refuse documents that use it. That is accepted while the contract is pre-release.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The fingerprint rule contradicts FR-069. FR-069 says `IDENTITY_SET_PATHS` "SHALL be exactly these thirteen container paths", and `canonicalize(value, {sets})` (FR-048, FR-069) sorts set members by their `identity`. FR-146 makes `/dimensions` and `/units` identity-sorted sets and makes each `/dimensions/*/terms` a set sorted by `dimension`, a member that is not `identity`. It does not amend FR-069's path list or add a keyed-sort rule. FR-069-CON-2 and CON-6 make that list the single data source, so FR-069 and FR-146 cannot both be implemented as written. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:182-185; spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md:85-95 |
| FND-002 | high | The dimensionless dimension cannot be represented. FR-146 says it mirrors QSpec FR-142, but in FR-146 an empty `terms` declares a base dimension, a repeated term dimension is `INVALID_UNIT_GRAPH`, and exponent `0` is `INVALID_UNIT_GRAPH`. QSpec FR-142's `dimension N = L / L` (an empty normalized map, which the checker "SHALL admit" and which creates no base-dimension obligation) therefore has no FCD spelling. Written with empty terms, it is read as a new base dimension, which gives wrong products (`L*N` becomes `{L:1, N:1}`, not `{L:1}`) and a spurious base-dimension obligation in QSL. FR-146 needs an explicit base-or-derived marker, or must state that dimensionless dimensions are out of scope and refused. Adding a marker later would change the meaning of empty `terms`. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:111-119 |
| FND-003 | medium | "How QSL consumes it" and the Description state cross-repo behaviour as settled, but the QSpec sources contradict it today. QSpec FR-154's native-name set is closed (`Boolean` to `Timestamp`), and any other `ix://quire/native/<Name>` refuses `invalid_model_binding`/`malformed-declaration`, so a Clock field is refused at QSpec intake. QSpec FR-322 step 4's unit row says "the declaring unit of compilation supplies the unit, not the domain package", and its element-type table has no Clock row (a declared type outside the table gives `operator-ineligible`). FR-146 should name these as pending upstream amendments, with their ticket ids, so no reader takes them as current behaviour. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:203-215 |
| FND-004 | low | The Description table defines derived dimensions as "products of base dimensions raised to integer exponents". Behavior lets a term name any dimension node of the document, derived ones included, as QSpec FR-142 does (`Volume = Area * L`). The table should say "products of dimensions". | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:50 |
| FND-005 | low | FR-146 does not say that `Clock` is outside the FR-032 kernel scalar library and `kernel-scalars.json`. FR-092 defines native references as kernel scalars, and FR-144's TC-1807 ties the reader's native set to `kernel-scalars.json`. FR-146 should state that the native set becomes the kernel scalars plus `Text` plus `Clock`, and that `Clock` maps to no `irScalar`. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:82-84 |
| FND-006 | low | FR-050's cross-field rule table names the code for each reader rule, but it gains none of FR-146's six new codes. FR-146 also reuses `INVALID_OPERAND` for scale and offset spelling, while FR-050 defines that code only as "a bound operand or an `enumValues` item". FR-144's rules were added to that table, so FR-146 should either add its codes there or widen the `INVALID_OPERAND` row. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:142-143; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:75-105 |

## Coverage

- `spec/spec.md`: the range edit, from FR-130 through FR-146, and the paragraph are correct. The duplicated "Functional" rows in that table predate this PR.
- `spec/tests.md`: TC-1842 to TC-1849 each map to an existing FR-146 AC or CON, and every AC and CON has a TC. The rows sit between TC-1841 and an older TC-1819 row, an ordering that predates this PR.
- Frontmatter relationships resolve to real artifacts: QSpec FR-142, FR-154, FR-322 and FR-415, and QSL FR-230, FR-185 and FR-393 exist on their origin/main.
- The quire-rs reader claim checks out. `resolves()` in `crates/semantic-ir/src/rules.rs` admits only `NATIVE_SCALARS` or declared identities, so `ix://quire/unit/<name>` is `UNRESOLVED_TYPE_REF` today.

## Examined scope

```yaml
scope:
- {id: FR-146, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "The semantic IR at contract `2.0.0` SHALL carry three things a timed domain model needs"}
- {id: FR-146-CON-1, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Every IR reader SHALL return the same verdict, code and locus for each clock, dimension, unit and unit-reference case of this requirement."}
- {id: FR-146-CON-2, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them."}
- {id: spec/spec.md, path: spec/spec.md, role: examined, excerpt: "FR-146 (Linear STD-295) gives the semantic IR the clock field type, the quantity type reference and the package dimension and unit graph"}
- {id: spec/tests.md#TC-1842..TC-1849, path: spec/tests.md, role: examined, excerpt: "TC-1842 .. TC-1849 rows mapping FR-146-AC-1..AC-8, CON-1, CON-2"}
- {id: FR-069, path: spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md, role: context_only, excerpt: "`IDENTITY_SET_PATHS`, which applies to the fingerprint form only, SHALL be exactly these thirteen container paths"}
- {id: FR-145, path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md, role: context_only, excerpt: "The normalizer SHALL apply no identity-sorted-set rule while encoding the normalized document."}
- {id: FR-141, path: spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md, role: context_only, excerpt: "The schema SHALL admit each member of the table only in a `2.0.0` document"}
- {id: QSpec FR-142, path: "agent-ix/quire-specification spec/functional/type-model/FR-142-evaluate-quantities-and-units.md", role: context_only, excerpt: "A derived dimension whose normalized map is empty, such as `dimension N = L / L;`, is the dimensionless dimension: the checker SHALL admit it."}
- {id: QSpec FR-154, path: "agent-ix/quire-specification spec/functional/type-model/FR-154-admit-domain-package-model.md", role: context_only, excerpt: "`<Name>` is exactly one of `Boolean`, `Integer`, `Rational`, `Decimal`, `Float32`, `Float64`, `Text`, `String`, `UUID` and `Timestamp`"}
- {id: QSpec FR-322, path: "agent-ix/quire-specification spec/objects/interfaces/FR-322-checked-package-artifact.md", role: context_only, excerpt: "the declaring unit of compilation supplies the unit, not the domain package"}
- {id: QSL FR-230, path: "agent-ix/quire-spec-language spec/functional/FR-230-check-time-declarations-clocks-and-clock-constraints.md", role: context_only, excerpt: "together with those the admitted domain package supplies"}
```
