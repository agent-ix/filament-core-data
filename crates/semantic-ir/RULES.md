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


## The schema layer (Task-088)

`crates/semantic-ir/src/schema.rs` decides
`conformance/schema/input-bundle.schema.json` and the published v1 schemas it
composes, by walking the instance rather than by interpreting the schema
documents at run time. Two published clauses shape it.

| Rule | Derived from |
|---|---|
| A violation is reported once, at the deepest failing instance location, with any location that is a strict prefix of another dropped. | `spec/functional/FR-036`: "one diagnostic per distinct failing instance location, discarding any location that is a strict prefix of another reported location, so that one violation inside a `oneOf` or `allOf` cascade yields one diagnostic at the deepest failing node." |
| When the schema layer produces any diagnostic, it is the only layer that speaks. | Same requirement: "return only the schema layer's diagnostics when that layer produced any, so that a schema-decided case is decided once." |
| A schema discriminated by a member is walked by that member: `origin` by `source`/`generated`, `constraint` by `keyword`, `typeDefinition` by `kind`. | `schema/semantic/v1/semantic-ir.schema.json` `$defs.origin` (a two-branch `oneOf`), `$defs.constraint` (a six-branch `oneOf` whose branches are disjoint on `keyword`), and `$defs.typeDefinition`'s `allOf` of `if`/`then` on `kind`. Walking the discriminator is what makes the reported location the deepest failing node rather than every branch's. |
| A keyword outside the closed constraint set is reported at the constraint object, not at `/keyword`. | It matches no `oneOf` branch, so the failing location is the object; `conformance/cases/constraint/CONS-005.json` is the corpus's own statement of the same reading. |
| A `sourceLocus` `path` is decided structurally — not absolute, no drive letter, no backslash, no parent segment, no NUL. | `common.schema.json#/$defs/sourceLocus` states exactly those four assertions as ECMAScript lookaheads; `conformance/contract-gaps.json` GAP-002 records that they cannot compile under RE2, and `conformance/adapters/registry.json` records that "a Rust reader is expected to locate by its own scheme". Deciding the assertions rather than the regex is that scheme. |

### `owner` and `locus`

| Rule | Derived from |
|---|---|
| `owner` is the identity of the nearest declaration enclosing the addressed node, the addressed node itself included. | `spec/functional/FR-036`: "`owner` set to the identity of the nearest owning declaration". |
| A declaration is a node carrying an `identity` that matches `common.schema.json#/$defs/semanticIdentity`. `package.identity` is a `packageIdentity` and therefore owns nothing. | `common.schema.json#/$defs/diagnostic` requires `owner` to be a `semanticIdentity`; `#/$defs/packageIdentity` is a different shape. |
| When no declaration owns the node, `owner` is `ix://agent-ix/filament-core-data/conformance/oracle`. | The `diagnostic` schema makes `owner` required, so there is no absent owner; the corpus's own expectations (`ENV-002`, `PKG-002`, `PKG-005`, `PKG-006`) name this identity for exactly those nodes. |
| `locus` is the addressed node's `origin.source`, or absent that, its nearest ancestor's. | `spec/functional/FR-036`, verbatim. |
| A candidate that is not a valid `sourceLocus` is not a locus, so a diagnostic *about* a malformed locus carries none. | `common.schema.json#/$defs/sourceLocus`: a `startLine` below 1 is not a locus, and a diagnostic cannot carry as its location a value the schema rejects. |
| A `locus` reaches the wire in the member order the document carried it in. | `spec/functional/FR-036`: "taken **verbatim** from the addressed node's `origin.source`". |

### Ordering and result state

| Rule | Derived from |
|---|---|
| Diagnostics are ordered by `pointer` under a code-point comparison, then `code`, then `message`, then the canonical form. No comparison is locale-sensitive. | `spec/functional/FR-036`, two clauses, verbatim. |
| `success` with no diagnostic, `invalid` with at least one `error`, `lossy` with at least one and no `error`. `unsupported`, `unavailable` and `partial` are adapter states, not verdicts. | `spec/functional/FR-036`, two clauses, verbatim. |
| `normalized` is produced for every case, including one the schema layer has already decided invalid. | `spec/functional/FR-059`: "because the harness compares the string unconditionally." |

## The cross-field rules — one row per emitted code (Task-088)

Every row's **rule** column is the `rule` text `conformance/diagnostic-codes.json`
publishes for that code; the **citation** column is that row's own `citation`
into the source it names, and the **reading** column is what this crate does
with it.

| Code | Citation it carries | Reading |
|---|---|---|
| `SCHEMA_VIOLATION` | `contracts-v1.md` "All identifiers below are rooted at" | A value the published v1 schema for its bundle member rejects, at the deepest failing instance location. |
| `INVALID_DOCUMENT` | `contracts-v1.md` "A consumer can" | A value that is not an object carrying `ir`, reported once at pointer `""`. |
| `INVALID_MULTIPLICITY` | `contracts-v1.md` "`multiplicity { lower, upper?, ordered?, unique? }` (absent `upper` is" | A present `upper` below `lower` fails at `.../multiplicity/upper`. |
| `FLAGS_ON_NON_COLLECTION` | same clause | `ordered` or `unique` with a present `upper` of 0 or 1 fails at `.../multiplicity`; an absent `upper` is unbounded, so it is a collection and the flags stand. |
| `UNIT_ON_NON_SCALAR` | `contracts-v1.md` "may carry a UCUM `unit` when" | `unit` where `typeRef` does not resolve, through aliases, to a `scalar`, fails at `.../unit`. |
| `UNRESOLVED_TYPE_REF` | `contracts-v1.md` "Recursive references retain graph identity." | An alias target, a reference target, a field `typeRef` or an operation return type naming no declared type. Reported for the node whose own reference does not resolve, never cascaded up a chain. |
| `UNRESOLVED_ELEMENT_TYPE` | `contracts-v1.md` "The closed structural vocabulary is scalar, record, enum, discriminated union," | `sequence.items` or `map.values` naming no declared type. |
| `UNRESOLVED_VARIANT_PAYLOAD` | same clause | A variant `payloadType` naming no declared type. |
| `UNRESOLVED_OCCURRENCE_DEFINITION` | `contracts-v1.md` "Definitions and occurrences remain separate." | An occurrence `definition` naming no declared type. |
| `ALIAS_CYCLE` | `contracts-v1.md` "Recursive references retain graph identity." | An alias chain that revisits a type it has already reached. Each alias is walked from itself, so a mutually recursive pair is rejected at both ends. Reference chains are *not* cycle-checked: a record reaching itself through a `reference` is preserved recursion, which the same clause requires. |
| `DEPTH_LIMIT_EXCEEDED` | `contracts-v1.md` "have declared finite limits and terminate with source-located diagnostics." | An acyclic alias chain longer than the 256 links `conformance/corpus.json` declares as `depthLimit`, reported at the node that exceeds it. A cycle is detected first, so a cyclic chain is never reported as a deep one. |
| `DUPLICATE_IDENTITY` | `contracts-v1.md` "identities are explicit" | A semantic identity declared twice across types, constraints, fields, variants, relationships, operations, operation parameters, clauses and occurrences, reported at the second declaration in document order. |
| `DUPLICATE_FIELD_NAME` | `contracts-v1.md` "Package, type, field, variant, constraint, occurrence, mapping, and profile" | Two fields of one record sharing a `name`, at the second one's `/name`. |
| `DUPLICATE_PARAM` | `contracts-v1.md` "bound by `clauseId`), and any type definition carries `clauses[]`" | Two parameters of one operation sharing a `name`, at the second one's `/name`. |
| `DUPLICATE_CLAUSE_ID` | `contracts-v1.md` "`clauseId` unique per type" | A `clauseId` declared twice on one type, at the second one's `/clauseId`. |
| `DANGLING_CLAUSE_REF` | `contracts-v1.md` "bound by `clauseId`), and any type definition carries `clauses[]`" | A `pre` or `post` entry, or a `2.0.0` transition `guard`, naming a `clauseId` its own type does not declare. |
| `MISSING_SOURCE_SPAN` | `contracts-v1.md` "`sourceSpan` when source-originated" | A clause whose `origin` carries `source` and which carries no `sourceSpan`, reported at the absent member. |
| `CONSTRAINT_NOT_APPLICABLE` | `contracts-v1.md` "over the resolved kind." | The applicability table below, over the kind `appliesTo` resolves to through aliases; reported at the constraint object. |
| `INVALID_OPERAND` | `contracts-v1.md` "with typed operands per keyword and an applicability table" | `min`, `max`, `exclusiveMin` or `exclusiveMax` on a resolved `integer` or `number` scalar takes a number operand; the published schema admits a string there because the same keywords carry a `date`, `datetime` or `duration` bound, which is exactly the part a schema cannot express. |
| `INVALID_PATTERN` | same clause | A `pattern` operand that does not parse as an ECMA-262 `Pattern`, decided by `regex262.rs`. |
| `UNRESOLVED_RELATIONSHIP_TARGET` | `contracts-v1.md` "Relationship targets resolve to a document type or a lock" | A relationship `target` that is neither a declared type nor a manifest export `typeIdentity`. |
| `COMPOSITE_CYCLE` | `contracts-v1.md` "export; composite relationship graphs are acyclic." | A depth-first walk over `composite: true` edges in document order, reported at the back edge that closes the cycle. |
| `UNRESOLVED_IMPORT` | `contracts-v1.md` "Locks resolve the complete dependency graph to exact versions, content digests," | A manifest import naming a `packageIdentity` the lock's `packages` do not carry. Decided only when the bundle supplies both members. |
| `PACKAGE_CYCLE` | `contracts-v1.md` "Package cycles are rejected with every" | A depth-first walk over the lock's `dependencies`, reported at the `dependencies` that closes the cycle. |
| `STALE_LOCK` | `contracts-v1.md` "It includes\nschema bytes, manifest, mappings, profiles, resolved packages, and compiler" | `ir.package.manifestDigest` differing from the bundle's own `manifestDigest`, at `/ir/package/manifestDigest`. The bundle states the manifest's digest (`input-bundle.schema.json` `manifestDigest`), so the comparison is against a stated digest and not a recomputed one. |
| `UNKNOWN_MAPPING_TARGET` | `contracts-v1.md` "Exports refer to stable semantic identities; profiles select" | A mapping `sourceType`, `targetType` or correspondence `sourceIdentity` naming an identity no declaration in the document owns. |
| `UNDECLARED_LOSS` | `contracts-v1.md` "every omitted identity; undeclared loss fails." | A type carrying a role whose local name is `entity` that the manifest does not export and the profile does not list in `allowedOmissions`, at that type's `/identity`. |
| `UNKNOWN_REQUIRED_EXTENSION` | `contracts-v1.md` "unknown modules and extensions are preserved, rejected, or surfaced." | A `required: true` extension whose identity the consumer policy's `exports` do not list, while that policy's `unknownExtensions` is `reject`. |
| `UNRESOLVED_CONSTRUCT_REF` | `contracts-v1.md` "A broken construct reference raises `UNRESOLVED_CONSTRUCT_REF`" | `2.0.0` only (`constructs.rs`): a `supertypes`, `owner`, `members`, `persists`, `interfaceType`, `declaredType`, `sourceElement`, `targetElement`, connection end `type`, step or transition `emits`/`consumes` entry naming no declared type; an `identityFields` or `occurrenceField` entry naming no field of the type or a supertype; a `featureOrder` entry naming no single field or operation the type declares itself; a transition `from`/`to` naming no state or `trigger` naming no operation of its state machine. |
| `CONSTRUCT_TARGET_KIND` | `contracts-v1.md` "`CONSTRUCT_TARGET_KIND`; a wrong occurrence field raises" | `2.0.0` only: a reference member entry naming a type that carries none of the roles its construct declaration admits under `references`; a supertype of another kind; under `members_not_namespace`, a member whose construct declaration has shape `namespace`. |
| `INVALID_OCCURRENCE_FIELD` | `contracts-v1.md` "`INVALID_OCCURRENCE_FIELD`; a guard naming no clause raises" | `2.0.0` only: an `occurrenceField` whose `typeRef` does not resolve, through aliases, to scalar `datetime`. |
| `SUPERTYPE_CYCLE` | `contracts-v1.md` "The types this type specializes, of the same kind; the graph is acyclic" | `2.0.0` only: a type whose `supertypes` walk reaches its own identity, at `.../supertypes`. |
| `UNRESOLVED_FEATURE_REF` | `contracts-v1.md` "Supertype fields whose values include this field's values" | `2.0.0` only: a `subsets` or `redefines` entry naming no field of a transitive supertype. |
| `INVALID_REDEFINITION` | `contracts-v1.md` "its multiplicity lies within the redefined bounds" | `2.0.0` only: a redefining field whose `lower` is below, or whose `upper` is above, the redefined field's bounds (absent bounds read as `1` and unbounded). |
| `UNRESOLVED_FRAME_PATH` | `contracts-v1.md` "each starting at a field or parameter" | `2.0.0` only: a `frame` path whose first segment names neither a field of the owning type or a supertype nor a parameter of the operation. |
| `MULTIPLE_DOMAIN_MEMBERSHIP` | `contracts-v1.md` "a type named by two exclusive memberships raises" | `2.0.0` only: a type named by the `members` of a second type whose construct declaration selects `exclusive_membership`, at that entry. |
| `INCOMPLETE_FEATURE_ORDER` | `contracts-v1.md` "a field or operation it omits raises" | `2.0.0` only (`constructs.rs`): a `featureOrder` that does not name a field or operation the type declares itself, once per omitted feature. |

### The applicability table

`contracts-v1.md` names "an applicability table over the resolved kind" without
tabulating it. This crate reads the closed keyword set against the kinds each
keyword can mean anything about:

| Keyword | Admitted resolved kind |
|---|---|
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `scalar` of `integer`, `number`, `date`, `datetime`, `duration` |
| `minLength`, `maxLength` | `scalar` of `string`, `bytes` |
| `pattern`, `format` | `scalar` of `string` |
| `enumValues` | `scalar` or `enum` |
| `nonEmpty` | `scalar` of `string` or `bytes`, or `sequence` or `map` |
| `unique` | `sequence` or `map` |

## The compatibility classifier (Task-089)

`contracts-v1.md` fixes the vocabulary and the tie-break — "Reports classify
patch, additive, conditional, breaking, unknown, and invalid changes", and
"Cross-target disagreement produces the most restrictive result" —
and `spec/functional/FR-036` states the corpus's declared restrictiveness order,
most restrictive first: `invalid`, `breaking`, `unknown`, `conditional`,
`additive`, `patch`.

| Change | Disposition | Derived from |
|---|---|---|
| Either document invalid | `invalid` | "a pair is classified only when both documents are valid". |
| Any removal — a type, a field, a variant, a relationship, an operation, an extension | `breaking` | `contracts-v1.md`: "Required additions, removals, incompatible meaning/type changes, stable identity changes, and unknown-policy tightening are breaking." A stable identity change is a removal and an addition, which is why it reaches `breaking` without a rule of its own. |
| A required field addition | `breaking` | Same clause. |
| An optional field addition | `additive` under a consumer policy that preserves or surfaces unknowns, `conditional` otherwise or with no policy | `contracts-v1.md`: "Optional additions are additive only when every target and known consumer preserves, ignores, or surfaces them as declared", and `spec/functional/FR-036`'s clause naming the consumer policy explicitly. |
| A structural-kind, scalar, resolved-target, resolved-element, resolved-payload, nullability, name or `unit` change | `breaking` | "incompatible meaning/type changes"; and `spec/functional/FR-027`: "a `unit`, `ordered`, or `unique` change as breaking". |
| A multiplicity narrowing | `breaking`; a widening | `additive` | `spec/functional/FR-027`, verbatim. |
| An unknown-policy tightening (`preserve` → `surface` → `reject`) | `breaking`; a loosening | `additive` | "unknown-policy tightening [is] breaking". |
| A constraint tightening, or an added constraint | `conditional`; a relaxation or a removed constraint | `additive` | `spec/functional/FR-036`: "a constraint relaxation as additive; a constraint tightening ... as conditional". |
| An added enum or union variant | `conditional` | Same clause, and `contracts-v1.md`: "Open/closed enum behavior is consumer policy, not a language default." |
| A default change, an added relationship, an added operation, a `pre`/`post` change | `conditional` | "Authority, edit direction, preservation, loss, provenance, and lifetime changes may break an unchanged structural schema" — a change that depends on the consumer is conditional, not silently a patch. |
| A contract-version move | `conditional` | `NFR-044-AC-2`: "The compatibility classifier reports a contract-version move, such as `1.1.0` to `2.0.0`, as `conditional`, never a version-literal-specific `additive` special case" (TC-1757). |
| Any clause change: added, removed, reworded, relanguaged | `unknown` | `contracts-v1.md`: "The IR never parses clause text." A change inside text the IR does not read is a change no rule models, and `spec/functional/FR-036` requires "an unclassifiable change as `unknown`". |
| An origin move, a display name, a role, an added type nothing references | `patch` | `contracts-v1.md`: "Display names, generated identifiers, source paths, documentation, timestamps, and database revisions never substitute for stable semantic identity." |

An added extension is `breaking` when it is `required: true` and `additive`
otherwise, from the same "Required additions ... are breaking" clause.

## The first full corpus run

FR-059-CON-1 requires this run to be recorded before any oracle output is
inspected. It is the adapter's own output, measured against the corpus's
authored `expected` blocks — the case files, not the oracle.

Command, from `conformance/`:

```
../target/debug/agent-ix-conformance-adapter
```

Result, recorded before `conformance/runner/differential.mjs` was run for the
first time and before any file under `conformance/oracle/` was opened:

- exit code **0**; one adapter-result document for each of the **111** manifest
  cases, written as one JSON array in a single buffered write, with nothing else
  on stdout;
- every case answered `support: "supported"`, `PROV-002` included — its
  `unsupportedBy` licence is not exercised;
- **111 of 111** result states and ordered diagnostic lists equal to the case's
  authored `expected` block, compared on `code`, `severity`, `owner`,
  `blocking`, `pointer` and `locus`;
- **25 of 25** compatibility classifications equal to the case's authored
  `expected.classification`;
- a `normalized` string for all 111 cases, cross-checked byte for byte against
  an independent JavaScript reading of the same published clauses
  (FR-036's `normalized` clause, FR-027's derivation, and
  `conformance/README.md`'s canonical form): **111 of 111** identical.

`cargo test --offline --workspace --locked` at that point: 23 tests, 0 failures.
`cargo fmt --all -- --check` clean, `cargo build` warning-free.

## The differential harness

`make rust-conformance` — `cargo build --offline --locked -p
agent-ix-conformance-adapter` followed by `node
conformance/runner/differential.mjs` — reports, on the committed corpus,
registry and divergence register:

| adapter | status | matched | unmet | failed |
|---|---|---|---|---|
| `rust-backend` | `available` | **111** | **0** | **0** |

with `problems: []`, `divergences: []` and harness `exitCode: 0`. The one
divergence `conformance/thresholds.json` permits for GAP-002 goes unspent.

`PROV-002` is answered `supported` and matched: its `unsupportedBy` entry
licenses an `unsupported` answer and does not require one, and the case is about
a `startLine` of 0, which the schema layer decides structurally.

### Negative controls

Each was run by editing only the `rust-backend` registry entry, and the entry was
restored afterwards; no other file under `conformance/` was written.

| Control | Reported |
|---|---|
| The `command` removed and `status` returned to `unavailable` | `matched: 0`, `unmet: 111` — a missing adapter never reads as agreement |
| `support: "unsupported"` on `ALIAS-001`, which no `unsupportedBy` licenses | problem `unsupported`, "the case does not declare this adapter in unsupportedBy", harness exit 1 |
| The answer for `ENV-001` omitted | problem `missing-answer`, harness exit 1 |
| The `caseDigest` for `SCAL-001` replaced | problem `case-digest`, "the answer names a case digest the manifest does not carry", harness exit 1 |

### A note for the NFR-023 gate

`node conformance/runner/differential.mjs` rewrites
`conformance/coverage.json` on every run — `conformance/README.md` records it as
"Generated on every run; never hand-edited". Running the harness with the
`rust-backend` slot filled therefore leaves that file modified in the working
tree. This change does not commit it: the only path under `conformance/` in this
change's set is `adapters/registry.json`.

## Open questions

None outstanding. No question arose during this work that could only have been
answered by reading `conformance/oracle/` or `src/compiler/ir/`; every rule
above resolves to a clause in `contracts-v1.md`, a locator in
`schema/semantic/v1/`, a row of `conformance/diagnostic-codes.json`, or a
requirement under `spec/`.
