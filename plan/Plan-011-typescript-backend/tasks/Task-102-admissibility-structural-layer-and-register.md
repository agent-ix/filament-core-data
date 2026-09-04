---
id: Task-102
title: "The admissibility structural layer, code register, and derivation ledger"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-101"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-797"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-801"
    type: verifies
---
# Task-102: The admissibility structural layer, code register, and derivation ledger

## Scope

Land the structural half of `admit.mjs`: schema validation with the deepest-location collapse, the closed code register, the declared severity and locus rules, and the per-code derivation ledger that makes the independence claim falsifiable.

## Subtasks

- [ ] Validate the document against the published `semantic-ir.schema.json` with a JSON Schema 2020-12 implementation, and collapse multiple schema errors at one instance location to a single `SCHEMA_VIOLATION` at the deepest failing location.
- [ ] Stop before the cross-field layer when the structural layer reports anything: a structurally invalid document yields only structural diagnostics.
- [ ] Declare the module's own closed code register as an exported frozen object in the manner of `DIAGNOSTIC_CODES`, and spell a code nowhere else.
- [ ] Assert the register stands in exact bijection with the `agent-ix.semantic-ir.` half of `conformance/diagnostic-codes.json`, in both directions, by a test rather than by an import — a module under `src/` that reads the corpus at run time makes the corpus a dependency of the thing it judges.
- [ ] Implement the declared severity rule: every registered admissibility code carries severity `error` and `blocking` true. Because of that, `admitIr` returns only `success` or `invalid` today; the `lossy` arm exists for a future warning code and is exercised by temporarily setting one register entry to `warning`.
- [ ] Implement the declared locus rule: a diagnostic carries a `locus` exactly when the nearest enclosing node carries a schema-valid `origin.source` or a clause `sourceSpan`, and no `locus` member otherwise.
- [ ] Carry the citation for both rules: neither appears in any published contract artifact, and issue #61 records that. This is a declared reading, not an invention.
- [ ] Emit every diagnostic as a `common.schema.json#/$defs/diagnostic` document with the RFC 6901 pointer beside it and never inside it — the published diagnostic is sealed, which the corpus records as GAP-003.
- [ ] Order diagnostics by pointer, then code, then message, then canonical form, all code point and never `localeCompare`.
- [ ] Build the per-code derivation ledger: one entry per registered code naming either a quoted published clause that occurs verbatim in the named artifact, or the corpus register. `conformance/diagnostic-codes.json` marks 15 of its 30 codes `provenance: "minted"`, so the ledger is what discloses how much of the rule set was read from the yardstick.

## Deliverables

- `src/compiler/backends/typescript-v1/admit.mjs` (structural layer, register, ledger)
- `src/compiler/backends/typescript-v1/admit.d.mts`

## Notes

- An import ban is checkable; transcription is not. The ledger and Task-114's first-run divergence count are the two disclosures that make the independence claim falsifiable at all.
- A quoted clause in the ledger is checked to occur verbatim in the named artifact, exactly as the corpus checks its own `derivedFrom` quotes. A citation that does not occur is a failing check, not a rounding error.
- Do not read codes out of `conformance/diagnostic-codes.json` at run time. The bijection is a test.
