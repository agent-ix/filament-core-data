---
id: SR-16488
title: "Code review of PLAT-1303 single-extent populations and quire-rs bump"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; PLAT-1303, PLAT-1305 (filament-core-data half); PR #340 head 77934234; crates/extraction-frontend (Cargo.toml, src/constructs.rs, tests/constructs.rs, tests/dependency_features.rs, fixtures/modules/fixture-domain), tests/test_fixture_domain_expressions.py, FR-091"
review_set: subset
---

## Summary

Ticket: PLAT-1303 (primary), PLAT-1305 (filament-core-data half). Code review
with the Rust lane (rust-style loaded) of `git diff origin/main...HEAD` at
head `77934234`. The PR bumps quire-rs from `5b4be36d` to `71a1f970`, follows
the `quire-rust-extraction` -> `quire-code-extraction` rename, adapts
`TransitionDecl.emits` (now `Option<String>`), moves fixture-domain to
single-extent populations, and admits `guardExpression` / `operationExpressions`
in the fixture-domain schemas.

Evidence run locally: `cargo fmt -p agent-ix-extraction-frontend -- --check`
(fails, FND-002); `cargo test --locked --no-fail-fast -p agent-ix-extraction-frontend` after `pnpm install` (every binary passes except tests/toolchain.rs tc_1326, the fmt check, FND-002);
`pytest tests/test_fixture_domain_expressions.py` (5 passed); and a CLI probe
lifting copies of the `business` fixture through the built
`extraction-frontend lift` binary (FND-001).

## Verdict

**FAIL** on FND-001 (high) and FND-002 (medium).

Confirmed correct: `Population.json` declares `extent` optional (not in
`required`), so the engine's declaration record, which never carries
`model.population`, is not refused; the frontend never validates records
against the fixture-domain `data_schema` at all. `PopulationMember.json`
drops `extent` consistently with the manifest's single `Type` column. The
PO-001 refusal case reaches its specific rule ("a population `Members`
table"), so it is not vacuous. The crate rename edits are complete
(`dependency_features.rs`, notices, FR-091). The `emits` adaptation with
`std::slice::from_ref` is correct and allocation-free.

tc_1785 cases PR_001 (`EV_999`) and SM_001 (`EV_001, EV_001`) now refuse
through the engine: quire-rs 71a1f970 resolves Emits/Consumes cells to a
SemanticId (an unknown id is unresolvable) and refuses more than one item in
a transition `Emits` cell, which makes `availability.model` unavailable. The
changed expectation is a legitimate consequence of engine behaviour, not a
weakening to pass, but it lost specificity (FND-003) and the frontend's own
duplicate refusal lost its only test (FND-004).

PLAT-1303 item 2 (construct references carrier): filament-core-data never
builds a `FilamentObjectType` / `SemanticSnapshot`; `extract.rs` builds its
own `SemanticContext` without a relation vocabulary, so engine admission is
`Admission::Any` (quire-rs `src/semantic/model.rs:974-977`) and admission is
enforced by the frontend's own `References::identities`
(`src/constructs.rs:871-990`), which reads the construct `references` roles.
No change is needed in this repository; see the gap-analysis artifact for the
remaining owner.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | After the quire-rs bump, an inline expression in a transition Guard or an operation Pre/Post lowers silently to an unguarded transition / an operation with no condition; lift exits 0 | crates/extraction-frontend/src/constructs.rs:1010-1050 |
| FND-002 | medium | `cargo fmt --check` fails on the `emits` adaptation line: `make extraction-frontend-build` is red and tests/toolchain.rs tc_1326 fails | crates/extraction-frontend/src/constructs.rs:1035 |
| FND-003 | medium | tc_1785 cases PR_001 and SM_001 assert only the generic prefix "the engine's model extraction is unavailable"; any engine failure of the artifact passes | crates/extraction-frontend/tests/constructs.rs:1755 |
| FND-004 | low | The frontend's own "names X twice" refusal lost its only test; it is now reachable only through a mutated record | crates/extraction-frontend/src/constructs.rs:975-979 |
| FND-005 | low | tc_1785 comment still calls the population table an "extent table" after the move to single extent | crates/extraction-frontend/tests/constructs.rs:1826 |

## Finding detail

**FND-001.** quire-rs 71a1f970 (PLAT-57) now reads a non-identifier Guard
cell into `TransitionDecl.guard_expression` with `guard: None`, and a
non-identifier `Pre:`/`Post:` into `operation_expressions` with empty
`pre`/`post`, setting `lossy` and an advisory `semantic.expression-unchecked`.
Before the bump the same cell reached `decl.guard` and the frontend refused
it ("its guard `...` names no clause of the artifact"). The frontend reads
neither `guard_expression` nor `operation_expressions`, and
`unlowered_declaration` refuses only an `Unavailable` model, not a lossy one.
Reproduced: copying `fixtures/business`, changing SM_001's
`| placed | shipped | advance | | |` row to Guard `total > 0`, and lifting
produced a document byte-identical to the unmodified lift, exit 0, with only
the advisory engine diagnostic. Changing RP_001's `Pre: known_id` to
`Pre: id != null` dropped the precondition from the IR, exit 0. This violates
the frontend's own rule that a construct is never lowered from part of its
declarations (`unlowered_declaration` doc, constructs.rs:676-678). Fix: refuse
the artifact (ARTIFACT_NOT_LOWERED) when `guard_expression` or
`operation_expressions` is present until the IR carries expressions, with a
tc_1785 case for each.

**FND-003.** Assert the engine's reason too, for example the
`(entry-errors: lines N)` suffix for the authored line, or the engine
diagnostic for that line (unresolvable reference / more than one item), so
an unrelated engine failure of PR_001 or SM_001 cannot satisfy the case.

**FND-004.** Add a `lower_mutated` case, as the file already does for the
trigger and guard checks (tests/constructs.rs:1863-1876), giving a step
`emits` list a repeated id, so `References::identities`' duplicate branch
stays covered.

## Scope

```yaml
scope:
- id: FR-143-AC-6
  path: spec/functional/FR-143-lift-object-type-artifacts-to-their-constructs.md
  role: examined
  excerpt: "In the `business` fixture, each of these yields one blocking `ARTIFACT_NOT_LOWERED` naming the declaration and emits no type of that artifact: a transition emitting `EN_001`; a step consuming `EV_999`; a transition emitting `EV_001, EV_001`; a `Presence` column; a `Modifies:` line; an aggregate root's `Members` table; a population's `Members` table; a transition to an undeclared state; an engine transition record whose trigger names no operation, and one whose guard names no clause; ..."
- id: FR-091
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "the activated normal/build dependency graph SHALL contain no path to `quire-code-extraction`, `quire-code-parse`, the `tree-sitter` runtime, or any tree-sitter language or grammar package."
- id: crates/extraction-frontend/src/extract.rs
  path: crates/extraction-frontend/src/extract.rs
  role: context_only
  excerpt: "pub(crate) fn context_for(bundle: &Bundle, document: &Document, object_type: &ObjectType) -> SemanticContext"
```

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-006 | medium | The negative control in `test_operation_types_admit_operation_expressions` compares each type's errors against the StateMachine baseline, so for Entity, AggregateRoot, NestedEntity and Process it holds whatever the schema does | tests/test_fixture_domain_expressions.py:83-85 |

**FND-006.** `_errors(name, {**base, "operationExpressions": [{}]}) != _errors("StateMachine", base)`:
Entity, AggregateRoot, NestedEntity and Process report `'fields' is a required property`
for the base record and StateMachine reports `[] should be non-empty`, so the inequality
is true for those four types even if `operationExpressions` accepted `{}`. Compare against
`_errors(name, base)`. (Measured at head 59f534c6: the schemas do refuse `[{}]` for all
six types, so the code is right; only the check cannot fail.)

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | 59f534c6: `unlowered_declaration` refuses `operation_expressions` and any transition `guard_expression`; tc_1785 cases added; CLI probes now refuse SM_001 and RP_001 with ARTIFACT_NOT_LOWERED, exit 1 |
| FND-002 | fixed | 59f534c6 splits the call; tc_1326 (clippy + fmt) passes |
| FND-003 | fixed | 59f534c6 asserts `(entry-errors: lines 33)` and `(entry-errors: lines 49)` |
| FND-004 | fixed | 59f534c6 adds a lower_mutated PR_001 case repeating a step `consumes` id, asserting the "twice" rule |
| FND-005 | fixed | 59f534c6 comment now reads "population table" |
| FND-006 | fixed | a9a7462d compares against `_errors(name, base)`; with `required` emptied in a scratch copy of OperationExpression.json the test fails for all 12 type/slot cases, so the control can fail |
