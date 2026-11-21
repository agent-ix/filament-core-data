---
id: SR-16508
title: QSL-2737 PR 361 spec-review (contract)
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@35a1af39f6fc87f9ddface92b7c1d140844ec82d; PR 361; docs/semantic-data-system/contracts-v1.md, conformance/diagnostic-codes.json, crates/semantic-ir/RULES.md, spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md, spec/functional/FR-059-answer-the-conformance-corpus-from-rust.md, spec/functional/FR-068-decide-and-report-ir-admissibility.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-141
    type: references
  - target: ix://agent-ix/filament-core-data/FR-059
    type: references
  - target: ix://agent-ix/filament-core-data/FR-068
    type: references
---

## Summary

Ticket: QSL-2737. Contract and spec review of the three modified contract rows,
checked against their owning requirements and the FSpec source. I did not reopen
the arch ruling: FSpec `proposals/filament-v1/definitions/model-complete.md`
line 178 says "Every `subsets[]` entry names a field of the owning type or of a
supertype". The ruling allows an owning-type or supertype target for subsets and
keeps redefines ancestors-only. The local filament-specification checkout is at
7aab94cf; the same row is in the cargo checkout 1946638.

The contract rows implement that ruling exactly. contracts-v1.md:316 now reads
"Fields of the owning type or a supertype whose values include this field's
values", and :317 (redefines) is unchanged. The diagnostic-codes.json
`UNRESOLVED_FEATURE_REF` row now separates the two rules: "A subsets entry
naming no field of the owning type or a transitive supertype, or a redefines
entry naming no field or operation of a transitive supertype". The old row left
out redefines operations, so the new one is more accurate. Its citation is a
verbatim substring of contracts-v1.md. The RULES.md ledger row cites both
quotes. Each emitted code still cites its derivation source, as FR-059-CON-1
and FR-059-AC-7 require. FR-068 is unaffected: no code is added or removed, so
the register bijection (FR-068-CON-2, FR-068-AC-9) holds.

FR-059 makes contracts-v1.md and diagnostic-codes.json the Rust reader's
derivation sources, so the reader follows its contract. But FR-141, the
requirement that owns the model members and that diagnostic-codes.json
references through TC-1742, was not updated. It still states the
supertype-only rule.

## Verdict

FAIL. One high finding: the owning requirement FR-141 contradicts the amended
contract and the reader.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | FR-141 Behavior still says a reader SHALL raise `UNRESOLVED_FEATURE_REF` for a `subsets` entry naming no field of a transitive supertype. Its member table (`subsets`: "The supertype fields whose values include this field's values") and FR-141-AC-3 ("naming no supertype field") say the same. The reader and contracts-v1.md now admit an owning-type field, so the code violates FR-141 as written and the spec and contract disagree. | spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:69, spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:31, spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:90, docs/semantic-data-system/contracts-v1.md:316 |
