---
id: FR-057
title: "Enforce semantic constraints in generated Rust without a regex engine that cannot express them"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
---
# FR-057: Enforce semantic constraints in generated Rust without a regex engine that cannot express them

## Description

The generated crate SHALL enforce every constraint the IR declares at its
construction and deserialization boundary, and SHALL decide, for each
ECMAScript pattern it is asked to enforce, either that it can enforce the exact
language that pattern denotes or that it cannot — refusing generation in the
second case — so that a `pattern` constraint is never carried as an unchecked
`String`.

## Inputs

- The closed eleven-keyword constraint vocabulary of
  [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md) and the
  applicability table `src/compiler/ir/applicability.mjs` publishes
- Each `pattern` constraint's `regex` operand, whose `dialect` the schema fixes
  as `ecma-262`
- `schema/semantic/v1/common.schema.json`, whose `sourceLocus.path` pattern is
  the one published pattern this backend must enforce and cannot compile with an
  RE2-family engine (recorded as GAP-002 in
  `conformance/contract-gaps.json`, owned by this issue)
- `src/compiler/backends/rust-serde/proved-validators.json`, the registry of
  hand-written validators with their equivalence proofs

## Outputs

- `src/compiler/backends/rust-serde/constraints.mjs`: constraint lowering to
  generated Rust checks
- `src/compiler/backends/rust-serde/patterns.mjs`:
  `classifyPattern(regex)` returning `expressible`, `proved`, or `unsupported`,
  and `lowerPattern(regex)` returning the generated matcher program
- `src/compiler/backends/rust-serde/proved-validators.json` and, per entry, a
  generated Rust validator plus its differential equivalence harness at
  `src/compiler/backends/rust-serde/harness/locus-path-differential.mjs`
- `src/compiler/backends/rust-serde/published-patterns.json`: the `pattern`
  values the published schemas carry, read out of `schema/semantic/v1/` and
  pinned so the classification set is a committed fact rather than a re-scan
- `src/compiler/backends/rust-serde/support-source.mjs` and
  `src/compiler/backends/rust-serde/support-template.rs`: the emitted
  `src/support.rs`, held as Rust beside its emitter so its own backticks and
  braces need no escaping and so `rustfmt` can check it directly
- A generated `src/support.rs` carrying the pattern matcher, `SemanticIdentity`,
  `Nullable`, `SemanticValue`, the validated scalar newtypes, and
  `ValidationError`

## Behavior

### The ECMA-262 dialect this backend decides

- The backend SHALL decide patterns in ECMA-262 **without** the `u`, `v`, `s`,
  `m`, `i`, and `g` flags, over the subject's **UTF-16 code units**, which is
  the dialect `src/compiler/ir/reader.mjs` already compiles and therefore the
  dialect the repository's own reader accepts.
- The matcher SHALL iterate the subject as UTF-16 code units, so `.` matches one
  code unit and an astral character is two, exactly as the published engine
  behaves.
- If a subject that must be decided cannot be represented as a Rust `String` —
  a lone surrogate is the only such case — then the crate SHALL return a
  `ValidationError` naming the position, rather than lossily replacing it.

### Constraint enforcement

- Every generated type carrying a constraint SHALL expose a fallible
  constructor `try_new` returning `Result<Self, ValidationError>`, and its
  `Deserialize` SHALL route through that constructor, so a value that violates a
  constraint cannot be produced by deserialization.
- The backend SHALL lower each of the eleven keywords as follows, and SHALL
  lower no keyword outside the applicability table for its resolved subject:

| Keyword | Subject | Generated check |
|---|---|---|
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `integer`, `number` | IEEE-754 comparison against the operand parsed as `i64` or `f64` |
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `date`, `datetime` | comparison of the two values parsed to a normalized instant, so `2019-12-31T23:00:00-05:00` orders after `2020-01-01T00:00:00Z` |
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `duration` | refused — see below |
| `minLength`, `maxLength` | `string` | Unicode scalar-value count |
| `pattern` | `string` | the generated matcher of the section below |
| `enumValues` | any admitted scalar | membership in a generated constant slice, compared by the equality of the subject's Rust type |
| `nonEmpty` | `string`, `sequence`, `map` | non-zero length or item count |
| `unique` | `sequence` | pairwise inequality over the element's Rust equality |
| `format` | `string` | a named check from the generated format registry |

- If a `min`, `max`, `exclusiveMin`, or `exclusiveMax` constraint names a
  `duration` subject, then the backend SHALL raise a blocking
  `agent-ix.rust-backend.UNORDERED_SUBJECT`, because ISO 8601 durations are not
  totally ordered — `P1M` and `P30D` have no contract-defined order and `PT60M`
  and `PT1H` are one duration written two ways — so any comparison the backend
  chose would be a rule it invented.
- If an operand's JSON type is not one the subject's Rust type admits — an
  `enumValues` operand list mixing a string and a number against an `integer`
  subject, or a bound operand that is not a number for a numeric subject — then
  the backend SHALL raise a blocking
  `agent-ix.rust-backend.INVALID_OPERAND` naming the operand.
- Numeric equality for `enumValues` and `unique` SHALL be IEEE-754 equality
  extended so that `NaN` is equal to no value including itself and `-0.0` is
  equal to `0.0`, stated here because the two conventions differ and a generated
  check must pick one visibly.
- `minLength` and `maxLength` SHALL count Unicode scalar values, which is what
  the published schema's own `minLength` counts for a JSON string.
- If a constraint is not applicable to its resolved subject, then the backend
  SHALL raise a blocking `agent-ix.rust-backend.CONSTRAINT_NOT_APPLICABLE`
  rather than emit no check, because a constraint that is silently dropped is
  indistinguishable in the generated source from a type that never carried one.
- If a `format` operand names a format the generated registry does not carry,
  then the backend SHALL raise a blocking
  `agent-ix.rust-backend.UNKNOWN_FORMAT`.
- `ValidationError` SHALL name the constraint identity, the keyword, the failing
  member's path, and the operand, and SHALL truncate any echoed input at 120
  code points.

### Deciding a pattern

- `classifyPattern` SHALL parse the pattern as an ECMA-262 pattern in the
  dialect declared above and return:
  - `expressible` when every construct it uses lies in the declared supported
    subset — literal characters, the escapes `\n \r \t \f \v \0 \xHH \uHHHH`
    and identity escapes, character classes including negation and ranges, the
    class escapes `\d \D \w \W \s \S`, `.`, the anchors `^` and `$`, the groups
    `(…)` and `(?:…)`, alternation, and the quantifiers `?`, `*`, `+`, `{m}`,
    `{m,}`, `{m,n}` in greedy and lazy form;
  - `proved` when the pattern's exact text is a key of
    `proved-validators.json`;
  - `unsupported` otherwise, which includes every lookahead, lookbehind,
    backreference, named group, `\b`, `\B`, `\p{…}`, and `\u{…}`.
- Where the classification is `expressible`, the backend SHALL lower the
  pattern to a generated matcher program executed by the self-contained matcher
  in `support.rs`, and SHALL NOT depend on the `regex` crate or any other
  external engine.
- Where the classification is `proved`, the backend SHALL emit the registry's
  named hand-written validator.
- If the classification is `unsupported`, then the backend SHALL raise one
  blocking `agent-ix.rust-backend.UNSUPPORTED_PATTERN` diagnostic naming the
  constraint identity, the pattern, and the construct that could not be
  expressed, and SHALL emit no file. It SHALL NOT emit an unvalidated `String`,
  SHALL NOT weaken the pattern to one it can compile, and SHALL NOT omit the
  field.

### The proved-validator registry

- An entry SHALL carry the exact pattern text, the generated Rust validator's
  name, the reason no supported lowering exists, the equivalence argument, its
  probe alphabet, and the identifier of the differential harness that checks it.
- An entry's probe alphabet SHALL contain at least one character of every class
  the pattern's own constructs discriminate. For the locus-path entry that means
  all four ECMAScript line terminators — U+000A, U+000D, U+2028, U+2029 —
  because the pattern's guards turn on them and an alphabet carrying only U+000A
  admits a validator that treats U+000A as the only terminator and still agrees
  on every probed string.
- An entry SHALL be admitted only with a differential equivalence harness that
  compares the hand-written validator against an ECMA-262 engine over:
  - every string of length 0 to 6 over the entry's probe alphabet;
  - every `sourceLocus.path` value the conformance corpus and the published
    fixtures carry; and
  - at least 100000 pseudo-random strings from a declared, seeded generator over
    an extended pool that includes an astral character and the entry's alphabet.
- If the harness finds one input on which the validator and the ECMA-262 engine
  disagree, then the harness SHALL fail, naming the input.
- The registry SHALL have exactly one entry at this revision: the published
  `sourceLocus.path` pattern, whose four lookaheads no RE2-family engine can
  compile.

### The declared language of the published locus path pattern

- The generated `SourceLocusPath::try_new` SHALL accept exactly the strings the
  published pattern accepts under ECMA-262, which are the strings `s` such that
  all of the following hold, where the *head* of `s` is its prefix before the
  first of U+000A, U+000D, U+2028, U+2029, or the whole of `s` when it contains
  none:
  - `s` is non-empty and contains no U+0000;
  - `s` does not begin with `/`;
  - `s` does not begin with an ASCII letter followed by `:`;
  - the head of `s` contains no `\`;
  - there is no index `i` such that `s[i]` and `s[i+1]` both lie in the head and
    are both `.`, `i` is 0 or `s[i-1]` is `/`, and either `s[i+2]` is `/` or
    `i+2` is the end of `s`.
- The backend SHALL also expose `SourceLocusPath::is_traversal_free`, a
  separate, named predicate deciding the *intended* language — no `..` segment
  anywhere in `s`, no `\` anywhere in `s`, and no line terminator — and SHALL
  NOT substitute it for the published language.
- Where a value governed by this pattern is used to address the filesystem —
  `compiler-request.outputRoot` is the one such member — the backend SHALL
  require `is_traversal_free` in addition to the published language, and SHALL
  record that requirement as a stated, named decision rather than as an
  unremarked exception, because the published language admits
  `a<LF>../../etc/passwd`.
- The generated crate SHALL record the difference between the two predicates as
  a declared divergence in `docs/semantic-data-system/rust-backend.md`, naming
  GAP-002 and issue #56, which carries the line-terminator finding.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-057-CON-1 | The generated crate SHALL enforce patterns with code this repository generates, not with an external regex engine. | Portability | Inspection |
| FR-057-CON-2 | A pattern the backend cannot express exactly SHALL stop generation, never be rewritten, relaxed, or approximated. | Correctness | Test |
| FR-057-CON-3 | A proved validator SHALL be admitted only with a passing differential harness whose probe alphabet covers every class its pattern discriminates. | Correctness | Test |
| FR-057-CON-4 | The generated matcher SHALL terminate on every input within a declared step bound, returning a bound-exceeded error rather than backtracking without limit. | Safety | Test |
| FR-057-CON-5 | The two locus-path predicates SHALL both be exported and separately named. | Correctness | Analysis |
| FR-057-CON-6 | Where an ordering, an equality, or a length is not fixed by the contract, the backend SHALL state the convention it uses rather than inherit one from Rust or from serde. | Correctness | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-057-AC-1 | Each of the eleven keywords, on each subject its applicability row admits, rejects a violating value and accepts a conforming one through both `try_new` and `Deserialize`. | Test (TC-677) |
| FR-057-AC-2 | A constraint not applicable to its resolved subject raises `CONSTRAINT_NOT_APPLICABLE` and emits no file; a bound on a `duration` raises `UNORDERED_SUBJECT`; an operand whose JSON type the subject does not admit raises `INVALID_OPERAND`. | Test (TC-678) |
| FR-057-AC-3 | `classifyPattern` returns `unsupported` for lookahead, negative lookahead, lookbehind, negative lookbehind, backreference, named group, `\b`, `\p{…}`, and `\u{…}`, and `expressible` for each construct in the declared supported subset. | Test (TC-679) |
| FR-057-AC-4 | An IR document carrying a lookahead pattern that is not a registry key produces one `UNSUPPORTED_PATTERN` naming the constraint identity and the pattern, and writes no file. | Test (TC-680) |
| FR-057-AC-5 | Over a declared set of at least 40 patterns — the 14 distinct `pattern` values the published schemas carry, the corpus's own `pattern` operands, and a synthetic set covering every construct of the subset — the generated matcher agrees with an ECMA-262 engine on at least 100000 seeded subjects per pattern drawn from a pattern-aware generator, and at least 20 per cent of the subjects for each pattern are accepted by the engine, so the run measures agreement rather than mutual rejection. | Test (TC-681) |
| FR-057-AC-6 | `SourceLocusPath::try_new` and the published pattern under an ECMA-262 engine agree on every string of length 0 to 6 over the alphabet `{a, /, backslash, ., :, U+000A, U+000D, U+2028, U+2029, U+0000}`, on every locus path in the corpus and the published fixtures, and on 100000 seeded random strings from a pool including an astral character. | Test (TC-682) |
| FR-057-AC-7 | `SourceLocusPath::try_new` accepts a value that carries a line terminator followed by a parent-directory segment, `is_traversal_free` rejects it, an `outputRoot` carrying it is refused, and the divergence is recorded in the rendered documentation naming GAP-002 and issue #56. | Test (TC-683) |
| FR-057-AC-8 | The generated matcher returns a bound-exceeded error, and does not hang, on every pair of a catastrophic-backtracking catalogue of at least 12 entries, and on 4096 seeded random pattern-and-subject pairs. | Test (TC-684) |
| FR-057-AC-9 | `ValidationError` names the constraint identity, keyword, member path, and operand for every keyword, and truncates any echoed input at 120 code points. | Test (TC-685) |
| FR-057-AC-10 | An unregistered `format` name raises `UNKNOWN_FORMAT` and writes no file. | Test (TC-686) |
| FR-057-AC-11 | Removing the `sourceLocus.path` entry from the proved-validator registry makes generation of a document carrying that pattern fail with `UNSUPPORTED_PATTERN` rather than succeed. | Test (TC-687) |
| FR-057-AC-12 | The differential harness fails, naming the input, when the hand-written validator is perturbed to treat U+000A as the only line terminator, and when it is perturbed to drop the drive-letter rule. | Test (TC-688) |
| FR-057-AC-13 | The generated crate's dependency set contains no regex engine, and the matcher's subject basis is UTF-16 code units, demonstrated by a subject containing an astral character on which a code-point matcher and the published engine disagree. | Test (TC-689) |
| FR-057-AC-14 | Two `datetime` values with different UTC offsets are ordered by instant and not by their text, demonstrated by a `max` bound a lexicographic comparison would wrongly accept. | Test (TC-677) |

## Dependencies

- **Upstream**: [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), [FR-061](./FR-061-consume-the-generated-crate.md)
- **Constrained by**: [NFR-010](../non-functional/NFR-010-safe-schema-and-code-generation.md), [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
