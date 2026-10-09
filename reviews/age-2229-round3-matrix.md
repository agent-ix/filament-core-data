# AGE-2229 numeric backend matrix evidence

This table records the focused regression cells for the exact numeric migration.
The TypeScript and JSON Schema cells are exercised by
`test/exact-numeric-traces.test.ts`; Rust cells are exercised by the generated
crate matrix in the same test and by the focused public probe; reader cells are
covered by `test/integer-bounds.test.ts` and the feature matrix reader test.
The Rust rules cells are the exact-number scanner path in `crates/semantic-ir`.

| Numeric kind | TypeScript | JSON Schema | Rust/Serde | Node reader | Rust rules scanner |
|---|---|---|---|---|---|
| integer safe | `test/exact-numeric-traces.test.ts` feature matrix: numeric default, enum, bounds | same test: AJV feature matrix | same test: bounded integer field | `test/integer-bounds.test.ts`: canonical safe bounds | `test/conformance-corpus.test.ts`: semantic reader corpus |
| integer wide negative | public matrix probe: string validator and lower endpoint | public matrix probe: signed interval pattern | public matrix probe: i128 newtype and string serde | `test/integer-bounds.test.ts`: `-9223372036854775809` | semantic-ir exact-number scanner corpus |
| integer wide unsigned | public matrix probe: string validator and u64 max | public matrix probe: unsigned interval pattern | public matrix probe: u64 newtype and string serde | `test/integer-bounds.test.ts`: `18446744073709551615` | semantic-ir exact-number scanner corpus |
| integer narrowed unsigned | public matrix probe: number validator and `[0,99]` | public matrix probe: integer `minimum: 0`, `maximum: 99` | public matrix probe: i64 checks with effective range | `test/integer-bounds.test.ts`: canonical operand admission | semantic-ir exact-number scanner corpus |
| decimal | `test/exact-numeric-traces.test.ts`: decimal enum and unique collection | same test: decimal policy pattern | same test: decimal serde normalization | semantic reader feature matrix | semantic-ir exact-number scanner corpus |
| float32 | `test/exact-numeric-traces.test.ts`: binary32 overflow rejection | same test: numeric schema and AJV | same test: generated `f32` matrix | reader probe and feature matrix: exact binary32 bound | semantic-ir exact-number scanner corpus |
| float64 | `test/exact-numeric-traces.test.ts`: float64 field matrix | same test: numeric schema | same test: generated `f64` matrix | reader feature matrix: finite float64 bounds | semantic-ir exact-number scanner corpus |

## Remaining assurance coverage

All exact numeric test comments use the supported `Trace:` binder spelling and
cover the FR-144 acceptance tests exercised in this file. The feature-matrix
TypeScript test invokes the generated validator for valid defaults, integer
bounds, and enum rejection; it is not an existence-only assertion. The focused
matrix command and the repository computed matrix are retained as separate
artifacts because the latter includes pre-existing repository-wide untagged
criteria outside AGE-2229's changed surface.

The i128 overflow distinction is asserted in `test/integer-bounds.test.ts`:
canonical decimal strings outside the i128 domain emit
`agent-ix.semantic-ir.INTEGER_OUTSIDE_I128`, while malformed spellings emit
`INVALID_OPERAND`. Exponent expansion has a bounded path for both non-zero and
zero mantissas; zero exponents canonicalize directly to `0` without allocation.
