---
id: Task-084
title: "The ECMA-262 classifier, the generated matcher, and the proved-validator registry"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-081"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-679"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-680"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-681"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-682"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-683"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-684"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-687"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-688"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-689"
    type: verifies
---
# Task-084: The ECMA-262 classifier, the generated matcher, and the proved-validator registry

## Scope

Answer GAP-002. Land `patterns.mjs`: the classifier over the declared subset, the lowering to a generated matcher program, and the proved-validator registry with its differential equivalence harness.

## Subtasks

- [x] Write the ECMA-262 parser for the declared subset — no `u`, `v`, `s`, `m`, `i` or `g` flag, over UTF-16 code units — and the `expressible` / `proved` / `unsupported` classification.
- [x] Lower an expressible pattern to a matcher program with a declared step bound.
- [x] Write the `sourceLocus.path` registry entry: the exact pattern text, the validator name, the equivalence argument, the probe alphabet carrying all four line terminators and U+0000, and the harness id.
- [x] Write the differential harness: exhaustive strings of length 0..6 over the entry alphabet, every corpus and fixture locus path, and 100000 seeded random strings from a pool including an astral character.
- [x] Write the pattern-aware subject generator with its 20-per-cent engine-acceptance floor, and the 40-pattern agreement property.
- [x] Write the catastrophic-backtracking catalogue and the step-bound fuzz.
- [x] Write the perturbation tests: an LF-only line-terminator rule and a dropped drive-letter rule must both fail the harness naming the input.

## Deliverables

- `src/compiler/backends/rust-serde/patterns.mjs`
- `src/compiler/backends/rust-serde/proved-validators.json`

## Notes

The declared language was measured before this task was written: zero disagreements over 149,899 exhaustive strings across three alphabets and 200,000 seeded random strings. The measurement also produced issue #56.
