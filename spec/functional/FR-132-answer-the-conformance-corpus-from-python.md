---
id: FR-132
title: "Answer the conformance corpus from Python"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: "depends_on"
---
# FR-132: Answer the conformance corpus from Python

## Description

A Python IR reader SHALL answer every conformance case with a result state, a
diagnostic list carrying registry codes, and a normalized form, so the corpus's
`python-backend` adapter slot reports a verdict rather than remaining
unavailable.

The slot has been unavailable since issue #23, and the cause is a shape mismatch
rather than a scheduling one. A package of generated types decides whether a
value satisfies its own shape. The oracle's readings — `UNRESOLVED_TYPE_REF`,
`PRESENCE_MULTIPLICITY_MISMATCH`, `V1_1_NODE_IN_V1_0` — are cross-field
judgements over a resolved document, which no generated type can make. The
artifact the slot needs is a *reader*, and a reader is a different thing from the
types issue #23 qualified.

This requirement therefore specifies the reader. It does not force the generated
package into the adapter's shape, which is the move that would make the slot
report something while measuring nothing.

## Inputs

- A semantic IR document, in either contract version the corpus carries
- The published diagnostic registry, which the reader's codes are drawn from

## Outputs

- One `adapter-result.schema.json` document per case, carrying a result state, a
  diagnostic list, and a normalized form

## Behavior

- The Python reader SHALL emit a result state for every case the corpus
  declares.
- The Python reader SHALL emit each diagnostic under a code the published
  registry declares.
- The Python reader SHALL emit a normalized form that the corpus can compare
  against another adapter's.
- The Python reader SHALL reach its verdict from the document alone, without
  consulting another adapter's answer.
- The Python reader SHALL NOT import the generated Python package, so its
  agreement with that package is measured rather than assumed.
- The corpus SHALL report the `python-backend` slot as available once the reader
  answers, and as unavailable with its owning issue named until then.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-132-CON-1 | The reader SHALL be an independent implementation, sharing no code with the TypeScript or Rust readers, so a shared defect cannot produce agreement | Integrity | Inspection |
| FR-132-CON-2 | The reader SHALL emit no code outside the published registry, in either direction | Interface | Test |
| FR-132-CON-3 | The Python reader SHALL report a case it cannot decide as undecided rather than as a pass | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-132-AC-1 | The reader answers every case the corpus declares, and the slot's unmet count reaches zero | Test |
| FR-132-AC-2 | The set of codes the reader emits equals the published registry's, asserted in both directions | Test |
| FR-132-AC-3 | Each of `UNRESOLVED_TYPE_REF`, `PRESENCE_MULTIPLICITY_MISMATCH` and `V1_1_NODE_IN_V1_0` is emitted by at least one case | Test |
| FR-132-AC-4 | The reader's normalized form for a case equals the Rust and TypeScript adapters' for that case, or the disagreement is recorded as a corpus finding with a named owner | Test |
| FR-132-AC-5 | A document the reader cannot decide yields an undecided verdict, and the corpus counts it as neither a pass nor a failure | Test |
| FR-132-AC-6 | The reader imports no module of the generated Python package | Inspection |
| FR-132-AC-7 | With the reader absent, the slot reports unavailable naming its owning issue, and no case is counted as passing | Test |

## Dependencies

- **Upstream**: [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), the same obligation discharged from Rust; the published diagnostic registry
- **Downstream**: the cross-language agreement gate, which cannot claim four-language agreement while two of four adapter slots report nothing
