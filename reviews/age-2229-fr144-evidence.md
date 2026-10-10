---
title: "AGE-2229 FR-144 evidence map"
type: Evidence
---

# AGE-2229 FR-144 evidence map

The generated backend matrix is the shared evidence for each row below. It has
204 cells, covers Rust Serde, TypeScript, JSON Schema, Python, the oracle and
the IR reader, and checks valid acceptance, invalid rejection, nullability and
wire round trips where the backend exposes that surface.

| Requirement | Test tag | Evidence |
| --- | --- | --- |
| FR-144-AC-1 | `test/numeric-backend-matrix.test.ts` | All scalar families are admitted by the reader and generated consumers. |
| FR-144-AC-3 | `test/numeric-backend-matrix.test.ts` | Integer defaults and enum wire values use canonical strings. |
| FR-144-AC-4 | `test/exact-numeric-traces.test.ts` | Decimal policy, bounds and defaults are exercised in Rust, TypeScript and AJV. |
| FR-144-AC-5 | `test/exact-numeric-traces.test.ts` | Decimal policy validation and conflict cases are read before generation. |
| FR-144-AC-6 | `test/exact-numeric-traces.test.ts` | Missing and conflicting decimal policies are refused. |
| FR-144-AC-7 | `test/numeric-backend-matrix.test.ts` | Float32 and float64 bounds include rounded float32 operands. |
| FR-144-AC-8 | `test/numeric-backend-matrix.test.ts` | Raw exponent cells exercise exact-number classification at every nesting. |
| FR-144-AC-9 | `test/integer-bounds.test.ts` | Exact integer bounds preserve wide decimal strings. |
| FR-144-AC-10 | `test/exact-numeric-traces.test.ts` | Kernel scalar mapping resolves Float32 and Float64 through every reader. |
| FR-144-AC-11 | `test/compiler-core.test.ts` | TypeSpec built-in widths and float32 rounding lower to exact IR operands. |
| FR-144-AC-12 | `test/compiler-core.test.ts` | TypeSpec constraint and decimal policy lowering is covered by the frontend seam. |
| FR-144-AC-14 | `test/integer-bounds.test.ts` | TypeScript preserves safe and wide integer subjects and rejects bad wire values. |
| FR-144-AC-18 | `test/exact-numeric-traces.test.ts` | Semantic defaults are applied and serialized in Rust and TypeScript. |
| FR-144-AC-20 | `test/compiler-core.test.ts` | Width aliases and exclusive bounds lower through the TypeSpec field path. |
| FR-144-AC-21 | `test/numeric-backend-matrix.test.ts` | Numeric field projections are generated across all admitted columns. |
| FR-144-AC-22 | `test/numeric-backend-matrix.test.ts` | Parsed raw lexeme cells distinguish byte and parsed-value paths. |
| FR-144-AC-23 | `test/compiler-core.test.ts` | Field, collection and operation parameter width aliases are covered. |

The matrix test carries the complete FR-144 tag set in one executable test so
the computed matrix can trace all 18 formerly untagged acceptance criteria to
the same generated evidence rather than relying on prose alone.
