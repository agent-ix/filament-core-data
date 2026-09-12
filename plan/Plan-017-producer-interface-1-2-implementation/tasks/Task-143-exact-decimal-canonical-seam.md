---
id: Task-143
title: "FR-118 exact-decimal canonical seam and the numeric-path float audit"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-118"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-036"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1440"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1441"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1442"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1443"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1444"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1445"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1446"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1447"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1449"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1454"
    type: verifies
---
# Task-143: FR-118 exact-decimal canonical seam and the numeric-path float audit

## Scope

Make the canonicalizer's input exact. Enable `serde_json`'s
`arbitrary_precision` for the crate so a parsed JSON number keeps its original
lexeme, read that lexeme through `Number::as_str` instead of
`Number::to_string()`, add `ProducerDecimal(String)` so an authored decimal
never passes through `f64` in the typed API at all, take the numeric resource
limit from the configuration document's declared
`resourceLimits.numericResourceLimit` instead of the crate's two hardcoded
constants, and declare which arrays are sets and which carry semantic order.

`canonical_number` itself is **not rewritten**. The design measurement of
2026-09-11 (FND-1750, D18) establishes that it was always correct and was being
fed a binary64-rounded lexeme: with the feature enabled every probe row
round-trips exactly, `1`/`1.0`/`1e0` still collapse to `1`, and the
trailing-coefficient-zero rule still fires. That is established fact, not a
hypothesis to re-test.

## Subtasks

- [ ] **Red: exactness.** `tests/canonical.rs`: `tc_1440_` (`1`, `1.0`, `1e0`
  canonicalize to the one byte string `1` and agree on one
  `filament-canonical-json-1` digest), `tc_1441_` (`9007199254740992` and
  `9007199254740993` canonicalize to different byte strings and different
  digests), `tc_1442_` (property: a decimal carrying more significant digits
  than binary64 represents exactly round-trips to the same arbitrary-precision
  coefficient and exponent — the five probe rows of the design measurement are
  the seed cases, including `0.1000000000000000055511151231257827`,
  `123456789012345678901234567890.12345678901234567890` and
  `0.3333333333333333333333333333333333`, each of which today returns `0.1`,
  a corrupted integer, and an invented digit respectively).
- [ ] **Red: order and escapes.** `tc_1443_` (keys whose locale collation order
  and whose encoded byte length both differ from their Unicode scalar-value order
  emit in scalar-value order, sorted by the canonicalizer itself and not by a map
  implementation's iteration order), `tc_1447_` (a document assembled in an
  insertion-order-preserving map emits scalar-value order and a permuted
  iteration order changes no byte; a document whose members arrive in the
  consumer wire member order `domain, version, algorithm, value` canonicalizes to
  the emitted byte string and recomputes the declared digest), `tc_1444_` (a
  string containing `"`, `\`, U+0000 and U+001F escapes the quote and the
  backslash and emits each control character as a lowercase `\u00xx` escape; a
  document carrying a string that is not valid Unicode refuses blocking and
  digests nothing).
- [ ] **Red: sets, limits, self-digest.** `tc_1445_` (property: two documents
  differing only in the member order of one declared set array digest
  identically; two differing only in the member order of one semantic-order array
  digest differently; a set array's membership stays a separate declaration from
  a semantic-order array's order), `tc_1446_` (a number exceeding the
  configuration's declared `maximumCoefficientDigits` or
  `maximumExponentMagnitude` refuses **before** canonicalization with neither a
  rounded nor a substituted binary64 value, and a configuration declaring no
  `numericResourceLimit` member refuses naming that absent member with no
  host-chosen limit applied in its place), `tc_1449_` (an object's own digest
  member is excluded from the canonical bytes that object digests, and the
  exclusion is applied only here).
- [ ] **Red: float audit.** `tc_1454_` (static audit over the declared
  numeric-path population — the crate's number parse seam, its
  coefficient-and-exponent representation, its canonical serializer, and the
  pinned JSON parser entry point: zero `f32`/`f64` types, zero `as f32`/`as f64`
  conversions, zero `as_f64`/`as_f32` calls; the gate reports the count it
  measured).
- [ ] **Green: parse seam.** `serde_json = { workspace = true, features =
  ["arbitrary_precision"] }` in `crates/baseline-producer/Cargo.toml`; replace
  `canonical_number(&number.to_string())` with the exact lexeme from
  `Number::as_str`; add `ProducerDecimal(String)` with a `Serialize`
  implementation that emits the lexeme as a JSON number and a validating
  constructor; keep `canonical_number` byte-for-byte as it stands.
- [ ] **Green: declared limits.** Replace `MAX_CANONICAL_NUMBER_DIGITS` and the
  nesting constant's numeric role with the configuration document's declared
  `resourceLimits.numericResourceLimit { maximumCoefficientDigits,
  maximumExponentMagnitude }`; refuse a configuration declaring no such member.
  One spelling across the interface: `resourceLimits` with `numericResourceLimit`
  inside it, FR-109 the owner (FND-1814, E11).
- [ ] **Green: set declaration.** Declare, as an explicit list beside the
  canonicalizer, which members are sets (sorted by canonical member bytes before
  digesting) and which carry producer-declared semantic order (emitted in that
  order). No array is a set by inference from its element type.
- [ ] **Falsify.** Plant an `as f64` conversion in a scratch copy of the numeric
  path and prove `tc_1454_` fails naming it; record the measured count both ways.
  Plant a locale-collation key sort in a scratch copy and prove `tc_1443_` fails.

## Exit conditions

- `make rust-build` and `make rust-test` are green for the **whole workspace**
  under feature unification — `quire-rs`, `jsonschema`, `crates/semantic-ir`,
  `crates/conformance-adapter` and `crates/extraction-frontend` all recompiling —
  except the two pre-existing reds `tc_1299` and `tc_1310` this plan does not own.
- TC-1440..TC-1447, TC-1449 and TC-1454 are traced executable controls, each
  reporting the number it measured.
- No `f32`, no `f64`, no `as_f64` anywhere between the parse seam and the
  canonical serializer, proven by an audit that fails on a planted conversion.
- `canonical_number`'s body is unchanged by this task's diff.

## Deliverables

- `crates/baseline-producer/Cargo.toml` (`arbitrary_precision`)
- `crates/baseline-producer/src/canonical.rs` (extracted from `lib.rs`),
  `src/decimal.rs` (`ProducerDecimal`)
- `crates/baseline-producer/tests/canonical.rs`, `tests/numeric_audit.rs`

## Notes

- FR-118 owns the self-digest exclusion and is its sole owner (FR-118-CON-4,
  FND-1722); FR-112's digest task cites it and does not restate it.
- The wire member order is never a digest input (FR-118-CON-6, FND-1717); TC-1447
  is where that is measured for the canonicalizer and TC-1405 is where it is
  measured for the digest selection, in Task-144.
- Cross-architecture agreement of the admit-versus-refuse decision under one
  declared `numericResourceLimit` is TC-1448, in Task-150; it needs the second
  architecture this task does not provide.
- Unblocks: Task-144 (every digest selection is taken over these bytes).
