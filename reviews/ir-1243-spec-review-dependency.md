---
id: SR-16485
title: "dependency review of IR-1243 option reader specification"
type: SpecReview
analysis: dependency
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

**PASS** — no findings in this analysis; overall PR conditional on SR-16482.

The added FR-079 edge is a reference to an existing generator/check
obligation, not a new hard prerequisite or second generator. The link and
CON-2 target resolve; FR-079's existing route consumes FR-076's real generator.
The logical sequence is this contract amendment, independent reader-rule and
Python regeneration work, then expanded cross-reader TC-1896 qualification.
There is no new dependency on the separate Contract IR strict-reader lane.
FR-148's hard prerequisite graph is acyclic. Referenced FR-079's old ancestor
metadata already has cycles through FR-076/074/077/078; this reference delta
does not introduce or change them, and this scoped review makes no clean
legacy-global-DAG claim. No new dependency finding is attributable to this
amendment; overall PR approval still waits on SR-16482 FND-001.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

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
