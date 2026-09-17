---
id: FR-058
title: "Refuse unsupported and lossy constructs with stable diagnostics"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
---
# FR-058: Refuse unsupported and lossy constructs with stable diagnostics

## Description

The Rust backend SHALL emit every unsupported or lossy construct as a
diagnostic from a closed, registered code set and SHALL write no file when any
such diagnostic is blocking, so that a construct the backend cannot carry is
visible in the run rather than invisible in the generated source.

## Inputs

- The mapping model and the declared refusals of
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md),
  [FR-055](./FR-055-derive-stable-rust-identifiers.md) and
  [FR-057](./FR-057-enforce-constraints-in-generated-rust.md)
- The profile's `roundTrip` and `allowedOmissions`, which say what loss the
  package author has already declared
- The published `rust` target contract, whose `unsupportedFeaturePolicy` is
  `fail`
- The diagnostic construction, ordering, and limit rules of
  [FR-049](./FR-049-emit-stable-source-located-diagnostics.md) and the five
  limits [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
  owns
- `conformance/diagnostic-codes.json`, the published `agent-ix.semantic-ir.*`
  set the Rust reader of FR-059 reproduces

## Outputs

- `src/compiler/backends/rust-serde/diagnostics.mjs`: the closed
  `agent-ix.rust-backend.*` generator registry, one entry per code carrying its
  severity, blocking flag, owner, and the rule it enforces
- `docs/semantic-data-system/rust-backend-diagnostics.md`: the published code
  table, rendered from the registry by `scripts/build-rust-backend-docs.mjs` and
  checked in `--check` mode
- `src/compiler/backends/rust-serde/degradation.mjs`: the degradation scan
  behind FR-058-AC-5, which reads the expected Rust type from
  `mapping-table.json` and the observed one from the mapped model, so its
  expectation never comes from the emitter under test
- Diagnostics on the emitted output manifest, ordered and limited by FR-049

## Behavior

### Two namespaces, two closed sets

- The *generator* — everything under `src/compiler/backends/rust-serde/` — SHALL
  emit only codes in the `agent-ix.rust-backend` namespace, from the registry
  this requirement publishes.
- Where the *generator* finds a defect in the **shape of an IR document** rather
  than in its own mapping, it SHALL emit the published `agent-ix.semantic-ir.*`
  spelling that `conformance/diagnostic-codes.json` already fixes, and SHALL NOT
  mint a second `agent-ix.rust-backend.*` spelling for the same defect. That is
  the two-namespaces-for-one-defect problem SR-066 FND-500 raised against the
  compiler, which FR-049 fixed by registering both sets explicitly; this
  requirement takes the same resolution.
- The *Rust reader* of
  [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md) SHALL emit only
  codes in the `agent-ix.semantic-ir` namespace, from that same published set,
  because those are the codes the independent oracle decides and the adapter is
  compared on.
- The two leaf-name sets SHALL be disjoint: one defect, one code, one namespace.
  The closure claims below quantify over each namespace separately.

### The closed generator code set

- Every diagnostic the generator emits SHALL come from the registry, addressed
  by its registry entry; the generator SHALL NOT construct a diagnostic from a
  string literal code, and constructing one from an unregistered entry SHALL
  throw.
- The registry SHALL be exactly this set. The first sixteen are in the
  `agent-ix.rust-backend` namespace and name a defect in this backend's mapping;
  the last six carry the published `agent-ix.semantic-ir` spelling and name a
  defect in the document:

| Code | Severity | Blocking | Raised when |
|---|---|---|---|
| `UNSUPPORTED_CONSTRUCT` | error | yes | a construct selects no mapping row and no named refusal |
| `UNSUPPORTED_PATTERN` | error | yes | an ECMA-262 pattern is neither expressible nor proved |
| `UNSUPPORTED_SCALAR` | error | yes | a `kind: "scalar"` names a value outside the nine kernel scalars |
| `UNDECLARED_WIRE_FORM` | error | yes | a construct's wire form is declared by no published artifact — `bytes` at this revision |
| `UNSUPPORTED_MULTIPLICITY` | error | yes | a field's `multiplicity.upper` is `0` |
| `PAYLOAD_ON_ENUM_VARIANT` | error | yes | a `kind: "enum"` variant carries a `payloadType` |
| `agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE` | error | yes | a constraint keyword does not apply to its resolved subject |
| `UNORDERED_SUBJECT` | error | yes | a bound keyword names a subject the contract does not order |
| `agent-ix.semantic-ir.INVALID_OPERAND` | error | yes | an operand's JSON type is not one the subject's Rust type admits |
| `INVALID_DEFAULT_VALUE` | error | yes | a `defaultValue` is not a value the field's mapped Rust type admits |
| `UNKNOWN_FORMAT` | error | yes | a `format` operand names an unregistered format |
| `UNRENDERABLE_NAME` | error | yes | a name derives no legal Rust identifier |
| `NAME_COLLISION` | error | yes | two identities derive one identifier in one declared scope |
| `agent-ix.semantic-ir.V1_1_NODE_IN_V1_0` | error | yes | a `1.0.0` document carries a `1.1.0` node |
| `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF` | error | yes | a `typeRef`, `appliesTo`, `items`, `values`, `payloadType`, or `target` resolves to nothing |
| `UNSAFE_OUTPUT_ROOT` | error | yes | the request's `outputRoot` is not traversal-free under the FR-057 intended-language predicate |
| `agent-ix.semantic-ir.UNDECLARED_LOSS` | error | yes | the backend would drop a construct the profile does not list in `allowedOmissions` |
| `agent-ix.semantic-ir.UNKNOWN_REQUIRED_EXTENSION` | error | yes | a required extension whose identity the generated crate does not declare, or which names a capability it does not admit; the admitted set is empty because GAP-007 records that no published artifact lets a consumer declare one |
| `LIMIT_EXCEEDED` | error | yes | an input exceeds one of the five NFR-020 limits; the message names which |
| `DECLARED_LOSS` | warning | no | the backend drops a construct the profile lists in `allowedOmissions` |
| `UNKNOWN_MEMBER_SURFACED` | warning | no | a `surface` record retained an unknown member at runtime |
| `DIAGNOSTIC_LIMIT_REACHED` | warning | no | the diagnostic count reached the request limit |

- Every `agent-ix.rust-backend.*` code SHALL name its owner as
  `ix://agent-ix/filament-core-data/rust-backend`; every
  `agent-ix.semantic-ir.*` code SHALL keep the owner the published set gives
  it, because renaming an owner is renaming a code.

### Refusal

- If any diagnostic is blocking, then the backend SHALL set the result state to
  `invalid` when the input is ill-formed against the published schema or the
  cross-field rules, and `unsupported` when the input is well-formed but outside
  the backend's declared support, SHALL emit zero files, and SHALL emit at least
  one diagnostic.
- The backend SHALL collect every blocking diagnostic it can find before
  returning, rather than stopping at the first, so one run names every construct
  that must change.
- The backend SHALL NOT substitute `String`, `SemanticValue`,
  `BTreeMap<String, SemanticValue>`, `Vec<u8>`, or an omitted member for a
  construct it cannot map.

### Declared loss

- Where the profile's `allowedOmissions` names a semantic identity, dropping
  that identity SHALL raise `DECLARED_LOSS` and SHALL NOT block.
- If the backend would drop an identity the profile does not name, then it SHALL
  raise `UNDECLARED_LOSS` and block.

### Ordering and limits

- Diagnostics SHALL be ordered by the FR-049 key — located before unlocated,
  then by `locus.path`, `startLine`, `startColumn`, `code`, `message`, all by
  code point — so the order does not depend on the host locale or on document
  traversal order.
- The diagnostic count SHALL be limited by the request's `maxDiagnostics` after
  ordering, so which diagnostics survive truncation does not depend on the order
  in which they were found.
- The backend SHALL honour `maxInputBytes`, `maxDepth`, `maxNodes`, and
  `maxCollectionItems`, raising `LIMIT_EXCEEDED` naming the limit and emitting
  no file rather than recursing without bound.

### Carried, not enforced

- A construct whose document data the crate carries in full, and whose meaning
  over instances no Rust type states, SHALL be listed here. It raises no
  diagnostic, because nothing the document carries is dropped:

| Construct | Carried as | Not stated by the type |
|---|---|---|
| `entity` | the record struct and `IDENTITY_FIELDS` | that instances are told apart by the identity fields and persist across changes to the other fields; the derived `PartialEq` compares every member |

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-058-CON-1 | The generator registry SHALL be closed and deeply frozen over the `agent-ix.rust-backend` namespace; every code the generator can emit is in it, and every code in it is reachable from a live generator path. | Correctness | Analysis |
| FR-058-CON-2 | The backend SHALL NOT catch a diagnostic and continue with a substituted type. | Correctness | Analysis |
| FR-058-CON-3 | Diagnostic messages SHALL truncate input-derived text at 120 code points. | Safety | Test |
| FR-058-CON-4 | No diagnostic SHALL be downgraded, suppressed, or converted to a skip in order to make a suite pass. | Correctness | Inspection |
| FR-058-CON-5 | Every code the requirements of this bundle name in prose, in an error-path row, or in an edge-case row SHALL be a member of one of the two declared sets. | Correctness | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-058-AC-1 | Every code in the generator registry is raised by a constructed input, and the raised code equals the registry entry's code exactly. | Test (TC-690) |
| FR-058-AC-2 | Constructing a diagnostic from an unregistered entry throws, and no live generator path constructs one from a string literal, checked by scanning the backend's module graph. | Analysis (TC-691) |
| FR-058-AC-3 | For each blocking code, a document raising it produces zero emitted files, the result state the rule states, and at least one diagnostic. | Test (TC-692) |
| FR-058-AC-4 | A document carrying three distinct blocking defects reports all three in one run, not one. | Test (TC-693) |
| FR-058-AC-5 | A scan over generated output finds `String`, `SemanticValue`, `BTreeMap<String, SemanticValue>`, and `Vec<u8>` only at positions `mapping-table.json` declares; the scan is driven by the published table rather than by the generated output, and it fails when the emitter is perturbed to substitute `String` for a constrained scalar. | Analysis (TC-694) |
| FR-058-AC-6 | Dropping an identity the profile lists raises `DECLARED_LOSS` and generation succeeds; dropping one it does not list raises `UNDECLARED_LOSS` and generation writes no file. | Test (TC-695) |
| FR-058-AC-7 | Diagnostic order is identical under `LANG=C`, `LANG=tr_TR.UTF-8`, and a reversed document traversal. | Test (TC-696) |
| FR-058-AC-8 | A document producing more diagnostics than `maxDiagnostics` yields exactly `maxDiagnostics` diagnostics plus `DIAGNOSTIC_LIMIT_REACHED`, and the retained set is the same under two traversal orders. | Test (TC-696) |
| FR-058-AC-9 | A message echoing a 10000-character input member is truncated at 120 code points. | Test (TC-696) |
| FR-058-AC-10 | The published code table and the registry agree exactly in both directions, and every code named in an FR's prose, an error-path row, or an edge-case row of `spec/tests.md` is a member of the generator registry or of `conformance/diagnostic-codes.json`, enforced by a `--check` mode that `make lint` runs through a Make target rather than a `package.json` script. | Analysis (TC-697) |
| FR-058-AC-11 | Reverting the refusal branch for `UNSUPPORTED_PATTERN` makes at least one test fail, demonstrated by a falsification run. | Test (TC-697) |
| FR-058-AC-12 | Each of the four size limits raises `LIMIT_EXCEEDED` naming the limit and emits no file. | Test (TC-692) |
| FR-058-AC-13 | Generating a `1.2.0` `entity` raises no diagnostic and emits `IDENTITY_FIELDS`, the carried-not-enforced row this requirement declares. | Test (TC-1762) |

## Dependencies

- **Upstream**: [FR-049](./FR-049-emit-stable-source-located-diagnostics.md)
- **Downstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-055](./FR-055-derive-stable-rust-identifiers.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), [FR-062](./FR-062-cover-every-mapping-branch.md)
- **Constrained by**: [NFR-010](../non-functional/NFR-010-safe-schema-and-code-generation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md), [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
