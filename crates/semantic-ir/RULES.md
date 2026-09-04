# Derivation ledger for `crates/semantic-ir`

FR-059-CON-1 confines this crate's sources to three artifacts:

- `schema/semantic/v1/*.json`
- `docs/semantic-data-system/contracts-v1.md`
- `conformance/diagnostic-codes.json`

together with the corpus's own declarations of shape and expectation
(`conformance/schema/*.json`, `conformance/corpus.json`, `conformance/bases/`,
`conformance/cases/`) and this repository's requirements under `spec/`. Nothing
under `conformance/oracle/` or `src/compiler/ir/` was opened, read, grepped, or
linked while this crate was written. Where a question could only have been
answered by looking at the oracle, it is written down in the **Open questions**
section below and answered from the published schema instead.

## The JSON and number layer (Task-087)

| Rule | Derived from |
|---|---|
| The reader retains every number's source lexeme, object member order, and repeated member names. | `conformance/README.md`, "Case and base digests are over raw file bytes, so a one-byte edit anywhere is detected" — a reader that normalises on the way in cannot report what the document carried. |
| A duplicate object member resolves to its last occurrence. | ECMA-262 `JSON.parse`, the reader that produced every `expected` block in the corpus. |
| The canonical form orders object members by code point, preserves array order, and writes no insignificant whitespace. | `conformance/README.md`, "The corpus comparison form is `agent-ix-conformance-jcs-v1`: object keys ordered by code point, no insignificant whitespace, array order preserved." |
| Strings are escaped exactly as `JSON.stringify` escapes them: `"`, `\`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\u00xx` below `0x20`; nothing else. | Same clause: the comparison form is produced by `JSON.stringify`, so its escape set is the form's escape set. Checked against the corpus's own strings, which carry no escape beyond the printable ASCII set. |
| Every number is rendered by the ECMAScript `Number::toString` algorithm applied to the lexeme's parsed `f64`. | Same clause. The assumption that a lexeme is re-emitted through the formatter rather than echoed was **verified against the corpus** rather than assumed: the corpus carries 35 distinct numbers, every one an integer between 0 and 258, for which lexeme and rendering coincide, so the two readings cannot be told apart here and the `JSON.parse`-then-`JSON.stringify` reading is the one the comparison form names. |
| A non-finite number is written as `null`. | ECMA-262 `JSON.stringify`. Unreachable from a JSON document that a conforming reader accepts, but reachable from a mutated one. |
| The reader bounds nesting depth and input size and returns a positioned error rather than recursing without bound. | `contracts-v1.md`, "Graph depth, reference expansion, collection sizes, input bytes, and diagnostic volume must have declared finite limits and terminate with source-located diagnostics." |
| A lone surrogate escape becomes `U+FFFD`. | A Rust `String` is well-formed UTF-8 and cannot hold one. No corpus string carries a surrogate escape. |

### The number formatter

`crates/semantic-ir/src/number.rs` implements ECMA-262 `Number::toString`:
the shortest round-tripping digits come from Rust's `LowerExp`, which is
documented to print the shortest representation that round-trips; the *layout*
of those digits — the `k <= n <= 21`, `0 < n <= 21`, `-6 < n <= 0` and exponent
branches — is ECMAScript's and not Rust's, which is exactly where Rust's own
`Display` disagrees.

It is measured against Node directly:
`number::node_agreement::tc_700_agrees_with_node_json_stringify_on_the_declared_values`
feeds 1400 declared values to `node -e` as raw `f64` bit patterns and compares
both `String(x)` and `JSON.stringify(x)` with this formatter's output. The set
covers both exponent thresholds and the values either side of them, negative
zero, trailing zeros, integral floats, `f64::MIN_POSITIVE`, `f64::MAX`, the
smallest subnormal, and a seeded pseudo-random spread of bit patterns.

## Open questions

None outstanding.
