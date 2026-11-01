---
id: SR-16482
title: "base review of IR-1243 option reader specification"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; IR-1243; PR #336; FR-148 Outputs/Inputs/AC-9 and TC-1896"
review_set: subset
---

## Summary

Ticket: IR-1243. Scoped independent review of spec-only FCD #336 at
`a0db77cb0a931954a832094498f584ed7271d386`, based on
`b68a5290e154f0a47670d996ed1f0822754192d2`. The changed documents are
FR-148 and the authored TC-1896 summary in spec/tests.md. No implementation
or generated-output delivery evidence is claimed by this spec review.

## Verdict

**CONDITIONAL** — one medium finding requires same-PR correction.

The amendment explicitly assigns full option semantic rules to Node,
independent TS and Python and requires the by-reference OP-01..41 comparison
against existing Rust mapping. Native envelopes and original schema causes
are retained; available severity/blocking fields must be checked. The shared
base projections and intake cases account for every vector. The published
FR-079 link resolves and retains real generator/check obligations. Unchanged
AC-1..8 remain context, including absent-inner and constraint locus mapping.

One medium ambiguity remains: the exactly-one-refusal phrase can be read as
requiring one raw compiler diagnostic, conflicting with the existing
per-AJV-error envelope. Specify mapped cardinality, retain/inspect all raw
diagnostics, and reject any extra distinct violated member. Documented
normalization must preserve the existing Rust vector locus, including the
absent-inner-at-type mapping; it must not turn arbitrary schema errors into
the expected refusal.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | Exactly-one refusal cardinality is not explicitly the mapped result while preserving the multi-error native compiler envelope. Clarify raw-error inspection and reject extra distinct violations. | spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md:163; spec/tests.md:1406 |

## Scope

```yaml
scope:
- id: FR-148 Inputs
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: QSpec repository at git ref `fa6be9cd` or later and never copied
- id: FR-148 reader Outputs
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: "The reader verdicts below, independently from the Rust reader\n  (`agent_ix_semantic_ir::decide`),\
    \ which every lift of the extraction frontend\n  passes through (FR-097), the Node `readContractIr`,\
    \ the independent TypeScript\n  reader `test/semantic-ir-v1-1-reader.ts` and the Python reader\n \
    \ `tests/semantic_ir_reader.py`; each applies the published schema for the shape\n  rows and the semantic\
    \ rules below, and each refusal is a typed, located\n  diagnostic in its existing public envelope."
- id: FR-148 generated Python Outputs
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: "The option-bearing generated Python surfaces\n  `python_backend/generated/<profile-id>/semantic_ir_schema.py`,\
    \ regenerated\n  through the existing generation route and checked under\n  [FR-079-CON-2](./FR-079-emit-the-python-package-layout.md),\
    \ rather than hand-edited"
- id: FR-148-AC-9
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: 'For every vector OP-01 to OP-41 read by ref from the QSpec input above, the Node `readContractIr`,
    independent TypeScript reader and Python reader agree with the existing Rust reader on the corresponding
    semantic IR document: OP-01 to OP-10 and OP-20 are accepted with no diagnostic; each rejection row
    yields exactly one refusal for the code and located member required by AC-2 to AC-5.'
- id: FR-148-AC-9 envelope mapping
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: The gate documents the mapping from each existing reader envelope to the Rust vector mapping,
    preserving each vector's expected path and cause, each reader's published ABI, and severity and blocking
    status where exposed.
- id: FR-148-AC-9 schema mapping
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: For the schema shape rows OP-23, OP-25 to OP-32 and OP-34 to OP-39, the compiler's `INVALID_IR`
    envelope is mapped using its original schema error and pointer to the evidence readers' `SCHEMA_VIOLATION`,
    rather than synthesizing a matching result; semantic refusals retain their existing codes and locations.
- id: TC-1896
  path: spec/tests.md
  role: examined
  excerpt: Over QSpec OP-01 to OP-41 read by ref at fa6be9cd or later, Node readContractIr, the independent
    TypeScript reader, Python and Rust agree on admission and each rejection's code and located member
    through a documented mapping of their existing envelopes to the Rust vector mapping. Accepted rows
    have no diagnostic; rejections have exactly one refusal, preserving vector path and cause, published
    ABIs, and severity and blocking where exposed. Shape rows OP-23, OP-25 to OP-32 and OP-34 to OP-39
    inspect the compiler INVALID_IR envelope's original schema error and pointer when mapping
- id: FR-079-CON-2
  path: spec/functional/FR-079-emit-the-python-package-layout.md
  role: context_only
  excerpt: The maintainer SHALL commit the generated tree as a regenerable, `--check`-verified artefact
    rather than hand-edit it.
- id: FR-050-CON-1
  path: spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md
  role: context_only
  excerpt: 'The compiler''s reader is deliberately a third implementation beside the issue #34 TypeScript
    and Python readers; it SHALL NOT import either, so their agreement remains evidence rather than a
    tautology. Their agreement is a drift guard; the schema and FR-027..029 remain the authority.'
- id: FR-148 FR-079 relationship
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: "- target: \"ix://agent-ix/filament-core-data/FR-079\"\n    type: \"references\""
- id: FR-148-AC-1
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: The kind enumeration names `option` in the schema, the extraction frontend and the reader,
    and a kind outside it is refused; the vector documents OP-09, OP-10 and OP-20 (an option over a native,
    a unit and a record, an alias of an option, an option at a sequence `items`, map `values`, tuple position
    and variant payload, and presence `optional` on a collection of options) are accepted with no diagnostic
    (QSpec FR-154-AC-39).
- id: FR-148-AC-2
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: 'An option with no `inner`, a `null`, empty, numeric, object, one-element-array or two-element-array
    `inner`, an `inner` of `Integer`, and one declaring a field, an operation, a supertype, a position,
    an `items` member or a non-empty `constraints` each raise exactly one `SCHEMA_VIOLATION` at the member
    (the type for an absent `inner`): vectors OP-25 to OP-32 and OP-34 to OP-39 (QSpec FR-154-AC-41).'
- id: FR-148-AC-3
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: 'An option whose `inner` is an option, an alias of one, itself, `ix://quire/native/Clock`,
    an alias of it, a namespace or `ix://quire/native/Int` raises exactly one `INVALID_OPTION_INNER` at
    `inner`, and one whose `inner` is a package identity naming no node raises exactly one `UNRESOLVED_OPTION_INNER`:
    vectors OP-11 to OP-17 and OP-33 (QSpec FR-154-AC-40, AC-41).'
- id: FR-148-AC-4
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: 'A field typed by an option value type, or by an alias of one, with presence `optional` and
    multiplicity `[1, 1]` in either flag order raises exactly one `INVALID_OPTION_PRESENCE` at its `presence`,
    and the same field with presence `required` or with a collection multiplicity raises nothing: vectors
    OP-18, OP-19, OP-20 and OP-41 (QSpec FR-154-AC-40).'
- id: FR-148-AC-5
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: 'A `reference` to an option raises `UNRESOLVED_TYPE_REF` at `target`, a field typed `ix://quire/native/Option`,
    `ix://quire/native/Option<Integer>` or `ix://quire/native/option` is refused at its `typeRef`, and
    a constraint applying to an option raises `CONSTRAINT_NOT_APPLICABLE`: vectors OP-21 to OP-24, OP-39
    and OP-40 (QSpec FR-154-AC-40, AC-41).'
- id: FR-148-AC-6
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: '`Document::option_inner` and `Document::member_option` read the field and operation types
    of vectors OP-01 to OP-08 as `Option<Integer>` for `a`, `b`, `g` and the operation parameter and result,
    `Option<Quantity<ms>>` for `c`, `Sequence<Option<Integer>>[0, 3]` for `d`, `Option<Sequence<Integer>[0,
    3]>` for `e` and an option over the record for `f`; `a` and `b` name the same `T` through the two
    spellings (QSpec FR-322-AC-298).'
- id: FR-148-AC-7
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: The extraction frontend's `Kind::Option` serializes as `option`, its `TypeDefinition` carries
    `inner` and exposes it through `option_inner`, and a definition of any other kind exposes none.
- id: FR-148-AC-8
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: context_only
  excerpt: A generation request whose IR declares an option value type is refused for every target by
    the generation seam with state `unsupported` and one blocking `UNSUPPORTED_CONSTRUCT_SHAPE`, and a
    request with none is unchanged.
```

## Validation and Limits

Quire validation of the two changed documents passed: 2/2 grammar-clean,
zero grammar findings. Installed-module duplicate archetype/inverse-edge
advisories remain. No applicable AssuranceProfile was found under spec/.
The requested direct subset is code-review, base, EARS, scope/boundary and
dependency; no applicable policy requires an enforced review run.

QSpec reference `6a021ef81926fdc227fbd98fcfae4752fed59666` contains eight
field_type_cases (OP-01..08) over a shared base and 33 intake_cases
(OP-09..41). Only OP-09, OP-10 and OP-20 are admitted intake cases. This is
not 41 independent input documents. The vectors are consumed externally;
none are copied by this diff. The user explicitly authorized the fa6be9cd-or-
later input reference; the review does not invent a new file/tool version pin.

No Cargo, runtime Node/Python, generator or backend/build was run. Source
inspection grounds the native envelopes; the parent also supplied the
coder's observed raw AJV member-plus-ancestor cardinality. New implementation
coverage is pending and must expand TC-1896 before code delivery. This
review does not count the old shape-only test as full AC-9 evidence.

## Disposition Round 1

Reviewed fix `80a558ba0a326bd4d8a835f5ff281cb03ef0d00c` against the initial
head. This section supersedes the initial overall-PR conditional status;
initial findings, excerpts and review history above remain unchanged.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | AC-9 and TC-1896 explicitly scope cardinality to one mapped canonical vector result, not raw native count. All original schema diagnostics remain retained and checked; only documented same-violation duplicate/ancestor normalization is permitted and any extra distinct violation fails. Existing ABI, expected cause/locus and exposed severity/blocking remain required. |

After excerpt (AC-9, verbatim):

> each rejection row yields exactly one mapped canonical vector result for the code and located member required by AC-2 to AC-5, without requiring a single raw native diagnostic.

## Final Verdict

**PASS** — round 1 closes the sole finding; no new findings. The native
multi-error diagnostic envelope is preserved, every raw schema error is
checked, canonical mapping is constrained to the same violation, and extra
distinct violations fail. No diagnostic cardinality ABI, code, expected path,
cause, severity/blocking rule, vector scope or generator ownership is weakened.
The changed Markdown validates; no runtime/build evidence is claimed.

### Round 1 examined scope

```yaml
scope:
- id: FR-148-AC-9
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: each rejection row yields exactly one mapped canonical vector result for the code and located
    member required by AC-2 to AC-5, without requiring a single raw native diagnostic.
- id: FR-148-AC-9 native diagnostic mapping
  path: spec/functional/FR-148-carry-option-value-types-in-the-semantic-ir.md
  role: examined
  excerpt: The gate retains and checks every native schema diagnostic, normalizes only documented duplicate
    or ancestor representations of the same violation, and fails on any extra distinct violation; semantic
    refusals retain their existing codes and locations.
- id: TC-1896
  path: spec/tests.md
  role: examined
  excerpt: Every native schema diagnostic is retained and checked; only documented duplicate or ancestor
    representations of the same violation normalize, and any extra distinct violation fails.
```
