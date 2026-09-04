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
  applicability table the IR reader shares
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
  generated Rust validator plus its differential equivalence harness
- A generated `src/support.rs` carrying the pattern matcher, the validated
  scalar newtypes, and `ValidationError`

## Behavior

### Constraint enforcement

- Every generated type carrying a constraint SHALL expose a fallible
  constructor `try_new` returning `Result<Self, ValidationError>`, and its
  `Deserialize` SHALL route through that constructor, so a value that violates a
  constraint cannot be produced by deserialization.
- The backend SHALL lower each of the eleven keywords as follows, and SHALL
  lower no keyword outside the applicability table for its resolved subject:

| Keyword | Generated check |
|---|---|
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | numeric comparison for `integer` and `number`; lexicographic comparison of the validated ISO 8601 form for `date`, `datetime`, `duration` |
| `minLength`, `maxLength` | Unicode scalar-value count for `string`; byte count for `bytes` |
| `pattern` | the generated matcher of the section below |
| `enumValues` | membership in a generated sorted constant slice |
| `nonEmpty` | non-zero length for `string` and `bytes`, non-zero item count for `sequence` and `map` |
| `unique` | pairwise inequality over a `sequence` |
| `format` | a named check from the generated format registry; an unregistered format name raises `agent-ix.rust-backend.UNKNOWN_FORMAT` and refuses generation |

- If a constraint is not applicable to its resolved subject, then the backend
  SHALL raise a blocking diagnostic rather than emit no check, because a
  constraint that is silently dropped is indistinguishable in the generated
  source from a type that never carried one.
- `ValidationError` SHALL name the constraint identity, the keyword, the failing
  member's path, and the operand, and SHALL NOT include the offending value's
  full text beyond 120 code points.

### Deciding a pattern

- `classifyPattern` SHALL parse the pattern as an ECMA-262 pattern and return:
  - `expressible` when every construct it uses lies in the declared supported
    subset — literal characters, escape sequences, character classes including
    negation and ranges, `.`, the anchors `^` and `$`, the groups `(…)` and
    `(?:…)`, alternation, and the quantifiers `?`, `*`, `+`, `{m}`, `{m,}`,
    `{m,n}` in greedy and lazy form;
  - `proved` when the pattern's exact text is a key of
    `proved-validators.json`;
  - `unsupported` otherwise, which includes every lookahead, lookbehind, and
    backreference.
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
  name, the reason no supported lowering exists, the equivalence argument, and
  the identifier of the differential harness that checks it.
- An entry SHALL be admitted only with a differential equivalence harness that
  compares the hand-written validator against an ECMA-262 engine over:
  - every string of length 0 to 6 over the declared probe alphabet for that
    entry;
  - every `sourceLocus.path` value the conformance corpus and the published
    fixtures carry; and
  - at least 100000 pseudo-random strings drawn from a declared, seeded
    generator over that alphabet.
- If the harness finds one input on which the validator and the ECMA-262 engine
  disagree, then the harness SHALL fail, naming the input.
- The registry SHALL have exactly one entry at this revision: the published
  `sourceLocus.path` pattern
  `^(?!/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|/)\.\.(?:/|$))[^\u0000]+$`, whose four
  lookaheads no RE2-family engine can compile.

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
  - there is no index `i` in the head such that `s[i..i+2]` is `..`, `i` is 0 or
    `s[i-1]` is `/`, and either `s[i+2]` is `/` or `i+2` is the end of `s`.
- The backend SHALL also expose `SourceLocusPath::is_traversal_free`, a
  separate, named predicate deciding the *intended* language — no `..` segment
  anywhere in `s`, no `\` anywhere in `s`, and no line terminator — and SHALL
  NOT substitute it for the published language.
- The generated crate SHALL record the difference between the two predicates as
  a declared divergence in its own documentation, naming GAP-002 and the
  follow-up issue that carries the line-terminator finding, rather than
  silently enforcing whichever is convenient.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-057-CON-1 | The generated crate SHALL enforce patterns with code this repository generates, not with an external regex engine, so that the published `serde`-only runtime dependency holds. | Portability | Manifest inspection |
| FR-057-CON-2 | A pattern the backend cannot express exactly SHALL stop generation. The backend SHALL NOT rewrite, relax, or approximate a pattern to make it compile. | Correctness | Test and static analysis |
| FR-057-CON-3 | A proved validator SHALL be admitted only with a passing differential harness against an ECMA-262 engine; the harness SHALL run in the normal suite and SHALL fail, never skip, when it cannot run. | Correctness | Test |
| FR-057-CON-4 | The generated matcher SHALL terminate on every input within a declared step bound, and SHALL return a bound-exceeded error rather than backtrack without limit. | Safety | Fuzz |
| FR-057-CON-5 | The two locus-path predicates SHALL both be exported and separately named; neither SHALL be reachable from the other's call site by default. | Correctness | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-057-AC-1 | Each of the eleven keywords, on each subject its applicability row admits, rejects a violating value and accepts a conforming one through both `try_new` and `Deserialize`. | Test |
| FR-057-AC-2 | A constraint that is not applicable to its resolved subject raises a blocking diagnostic and emits no file. | Test |
| FR-057-AC-3 | `classifyPattern` returns `unsupported` for every one of lookahead, negative lookahead, lookbehind, negative lookbehind, and backreference, and `expressible` for each construct in the declared supported subset. | Test |
| FR-057-AC-4 | An IR document carrying a lookahead pattern that is not a registry key produces one `UNSUPPORTED_PATTERN` naming the constraint identity and the pattern, and writes no file. | Test |
| FR-057-AC-5 | The generated matcher agrees with an ECMA-262 engine on every pattern in the supported subset over at least 100000 seeded random subject strings per pattern, for a declared set of at least 40 patterns. | Property |
| FR-057-AC-6 | `SourceLocusPath::try_new` and the published pattern under an ECMA-262 engine agree on every string of length 0 to 6 over the alphabet `{a, /, backslash, ., :, U+000A, U+0000}`, on every locus path in the corpus and the published fixtures, and on 100000 seeded random strings. | Property |
| FR-057-AC-7 | `SourceLocusPath::try_new` accepts `a<LF>../../etc/passwd` and `is_traversal_free` rejects it, and the divergence is recorded in the generated documentation naming GAP-002 and the follow-up issue. | Test |
| FR-057-AC-8 | The generated matcher returns a bound-exceeded error, and does not hang, on a pathological pattern and subject pair drawn from a catastrophic-backtracking catalogue of at least 12 entries. | Fuzz |
| FR-057-AC-9 | `ValidationError` names the constraint identity, keyword, member path, and operand for every keyword, and truncates any echoed input at 120 code points. | Test |
| FR-057-AC-10 | An unregistered `format` name raises `UNKNOWN_FORMAT` and writes no file. | Test |
| FR-057-AC-11 | Removing the `sourceLocus.path` entry from the proved-validator registry makes generation of a document carrying that pattern fail with `UNSUPPORTED_PATTERN` rather than succeed. | Test |
| FR-057-AC-12 | The differential harness fails, naming the input, when the hand-written validator is perturbed to drop the line-terminator rule. | Test |
| FR-057-AC-13 | The generated crate's dependency set contains no regex engine. | Analysis |

## Dependencies

- **Upstream**: [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md)
- **Downstream**: [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md)
- **Constrained by**: [NFR-010](../non-functional/NFR-010-safe-schema-and-code-generation.md), [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
