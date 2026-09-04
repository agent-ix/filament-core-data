---
id: Task-087
title: "The Rust JSON layer, the ECMAScript number formatter, and the derivation ledger"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-080"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-700"
    type: verifies
---
# Task-087: The Rust JSON layer, the ECMAScript number formatter, and the derivation ledger

## Scope

Start the long pole. `crates/semantic-ir` carries its own JSON reader and writer so it declares no dependency, and its number formatter must agree with `JSON.stringify` byte for byte, because the corpus's canonical form is produced by one.

## Subtasks

- [x] Write the JSON reader retaining number lexemes, member order and repeated names.
- [x] Write the canonical writer: members sorted by code point, array order preserved, no insignificant whitespace.
- [x] Write the ECMAScript `Number::toString` formatter as a separately tested unit.
- [x] Write the 512-value agreement test against Node's `JSON.stringify`, covering the exponent thresholds, negative zero, trailing zeros, integral floats and the `f64` extremes.
- [x] Open `crates/semantic-ir/RULES.md` and record the derivation source of every rule as it is written.

## Deliverables

- `crates/semantic-ir/` JSON and number layer
- `crates/semantic-ir/RULES.md`

## Notes

FR-059-CON-1: this crate is derived from `schema/semantic/v1/`, `contracts-v1.md` and `conformance/diagnostic-codes.json` only. `conformance/oracle/` is not read while it is written, and the first full corpus run is recorded before any oracle output is inspected.
