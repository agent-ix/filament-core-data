---
title: "AGE-2229 FR-144 evidence report"
type: Evidence
---

# AGE-2229 numeric evidence

The executable backend smoke test is `test/numeric-backend-matrix.test.ts`.
It reports 204 generated cells and exercises generated TypeScript validators,
JSON Schema through AJV, and a Rust serde consumer. The source generator
reports 663 generated type definitions. This test does not claim to execute
the Python backend, oracle, raw JSON lexeme handling, SysML, or TypeSpec
lowering.

The independent reader check is `test/exact-numeric-traces.test.ts`, which
compares one exact integer-bound diagnostic from the Node reader with
`tests/semantic_ir_reader.py`. The TypeSpec width and narrowing corpus is
`test/compiler-core.test.ts`; it compiles `int8`, `uint64`, and a real
`@maxValueExclusive(100) uint64` property, then checks the lowered aliases and
public TypeScript output.

| Surface | Test | Assertion |
| --- | --- | --- |
| TypeScript | `numeric-backend-matrix.test.ts` | Every cell accepts its valid value, rejects its invalid value, preserves the wire value, and checks nullable fields. |
| JSON Schema | `numeric-backend-matrix.test.ts` | Every cell compiles under AJV and checks valid, invalid, and nullable values. |
| Rust serde | `numeric-backend-matrix.test.ts` | Every cell is deserialized, serialized, round-tripped, and checked against an invalid value. |
| TypeSpec frontend | `compiler-core.test.ts` | Real width aliases and an exclusive bound are lowered; the public TypeScript backend emits a usable alias. |
| Node/Python readers | `exact-numeric-traces.test.ts` | The readers agree on the exact integer overflow diagnostic code; each reader's location representation is asserted independently. |

The matrix's `rawLexeme` and `oracleWidth` labels are fixture metadata and are
not presented as reader execution evidence. The complete FR-144-CON-1
Rust/Node/Python/oracle byte corpus, every raw exponent spelling, every
diagnostic pointer, and SysML generation remain explicit gaps outside this
code PR. Whole-repository assurance matrix debt is also outside this PR.
