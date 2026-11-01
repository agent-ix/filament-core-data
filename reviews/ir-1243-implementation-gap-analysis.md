---
id: SR-16487
title: IR-1243 implementation gap-analysis
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data; IR-1243 PR337; src/compiler, test/option-value-type.test.ts,
  test/semantic-ir-v1-1-reader.ts, tests/semantic_ir_reader.py, tests/option_vector_reader.py,
  generated diagnostics docs
review_set: subset
---

## Summary

Reviewed frozen b709d80454b054d85391795b97ebbb601dab20ee against merged spec base 9af3be7. Node, independent TS and Python rule code, all seven changed files, published schema and by-reference QSpec projection examined. No copied vector corpus or generated Python hand edits. Separate reader implementations are required by FR-050; no shared semantic rule implementation was introduced.

## Verdict

FAIL — scoped computed matrix reports AC-9 untagged; existing AC-1..8 remain tagged. Runtime gate assertions are substantive, but the new criterion is absent from computed traceability.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-148-AC-9 has no computed test binding: the cross-reader test uses `Traces:` rather than the supported `Trace:` tag, so quire matrix reports it untagged. | test/option-value-type.test.ts:309 |

## Coverage

Examined option resolution, aliases, Clock, nesting, presence, reference and constraints, iterative cycle termination, native loci and unchanged non-option paths. Schema normalization reads actual schema errors, retains distinct forbidden siblings, and keeps native diagnostic count/code/severity/blocking/pointers. OP-01..08 share one admission document; OP-09..41 are 33 intake variants; Rust accessor controls are separately 8/8. Scoped existing logs: four option tests pass; Python regressions five pass; Node published-case passes; selected format/type checks pass. Real Python generator write/check exit 0 with no generated diff; imports and strict mypy 43 files pass. These are inspected logs, not a rerun or aggregate qualification. Parent owns final gate. No applicable AssuranceProfile found. No Rust changes; Rust review and spec analyses skipped. Optional standalone semantic gap-analysis pass not run; code-review directly assesses behavior. Plan completion: not assessed

Examined units (verbatim excerpts):

```yaml
scope:
- id: FR-148-AC-1
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: The kind enumeration names `option` in the schema, the extraction frontend
    and the reader, and a kind outside it is refused; the vector documents OP-09,
    OP-10 and OP-20 (an option over a native, a unit and a record, an alias of an
    option, an option at a sequence `items`, map `values`, tuple position and variant
    payload, and presence `optional` on a collection of options) are accepted with
    no diagnostic (QSpec FR-154-AC-39).
- id: FR-148-AC-2
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'An option with no `inner`, a `null`, empty, numeric, object, one-element-array
    or two-element-array `inner`, an `inner` of `Integer`, and one declaring a field,
    an operation, a supertype, a position, an `items` member or a non-empty `constraints`
    each raise exactly one `SCHEMA_VIOLATION` at the member (the type for an absent
    `inner`): vectors OP-25 to OP-32 and OP-34 to OP-39 (QSpec FR-154-AC-41).'
- id: FR-148-AC-3
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'An option whose `inner` is an option, an alias of one, itself, `ix://quire/native/Clock`,
    an alias of it, a namespace or `ix://quire/native/Int` raises exactly one `INVALID_OPTION_INNER`
    at `inner`, and one whose `inner` is a package identity naming no node raises
    exactly one `UNRESOLVED_OPTION_INNER`: vectors OP-11 to OP-17 and OP-33 (QSpec
    FR-154-AC-40, AC-41).'
- id: FR-148-AC-4
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'A field typed by an option value type, or by an alias of one, with presence
    `optional` and multiplicity `[1, 1]` in either flag order raises exactly one `INVALID_OPTION_PRESENCE`
    at its `presence`, and the same field with presence `required` or with a collection
    multiplicity raises nothing: vectors OP-18, OP-19, OP-20 and OP-41 (QSpec FR-154-AC-40).'
- id: FR-148-AC-5
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'A `reference` to an option raises `UNRESOLVED_TYPE_REF` at `target`, a
    field typed `ix://quire/native/Option`, `ix://quire/native/Option<Integer>` or
    `ix://quire/native/option` is refused at its `typeRef`, and a constraint applying
    to an option raises `CONSTRAINT_NOT_APPLICABLE`: vectors OP-21 to OP-24, OP-39
    and OP-40 (QSpec FR-154-AC-40, AC-41).'
- id: FR-148-AC-6
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: '`Document::option_inner` and `Document::member_option` read the field
    and operation types of vectors OP-01 to OP-08 as `Option<Integer>` for `a`, `b`,
    `g` and the operation parameter and result, `Option<Quantity<ms>>` for `c`, `Sequence<Option<Integer>>[0,
    3]` for `d`, `Option<Sequence<Integer>[0, 3]>` for `e` and an option over the
    record for `f`; `a` and `b` name the same `T` through the two spellings (QSpec
    FR-322-AC-298).'
- id: FR-148-AC-7
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: The extraction frontend's `Kind::Option` serializes as `option`, its `TypeDefinition`
    carries `inner` and exposes it through `option_inner`, and a definition of any
    other kind exposes none.
- id: FR-148-AC-8
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: A generation request whose IR declares an option value type is refused
    for every target by the generation seam with state `unsupported` and one blocking
    `UNSUPPORTED_CONSTRUCT_SHAPE`, and a request with none is unchanged.
- id: FR-148-AC-9
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'For every vector OP-01 to OP-41 read by ref from the QSpec input above,
    the Node `readContractIr`, independent TypeScript reader and Python reader agree
    with the existing Rust reader on the corresponding semantic IR document: OP-01
    to OP-10 and OP-20 are accepted with no diagnostic; each rejection row yields
    exactly one mapped canonical vector result for the code and located member required
    by AC-2 to AC-5, without requiring a single raw native diagnostic. The gate documents
    the mapping from each existing reader envelope to the Rust vector mapping, preserving
    each vector''s expected path and ca'
- id: FR-148-CON-1
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: Adding the kind SHALL change no byte of a document that declares none.
- id: FR-148-CON-2
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: No layer SHALL approximate an option as its `inner`, a nullable member
    or an optional field.
```

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | Round 1: commit 70c82d330a3e056174e3069ee8984d023d287f9c changes the cross-reader test comment to supported `Trace:`. Computed matrix now binds FR-148-AC-9 to the real cross-reader test at test/option-value-type.test.ts:310. No behavioral assertions changed. |

## Current verdict

PASS — sole finding fixed; no new findings in the scoped disposition delta. Parent owns final aggregate qualification.
