---
id: FR-058
title: "Refuse unsupported and lossy constructs with stable diagnostics"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
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

- The mapping model and the mapping table's declared support of
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md)
- The profile's `roundTrip` and `allowedOmissions`, which say what loss the
  package author has already declared
- The published `rust` target contract, whose `unsupportedFeaturePolicy` is
  `fail`
- The diagnostic construction, ordering, and limit rules of
  [FR-049](./FR-049-emit-stable-source-located-diagnostics.md)

## Outputs

- `src/compiler/backends/rust-serde/diagnostics.mjs`: the closed
  `agent-ix.rust-backend.*` code registry with one entry per code, each carrying
  its severity, blocking flag, owner, and the rule it enforces
- `docs/semantic-data-system/rust-backend-diagnostics.md`: the published code
  table, generated from the registry and checked in `--check` mode
- Diagnostics on the emitted output manifest, ordered and limited by FR-049

## Behavior

### The closed code set

- Every diagnostic the backend emits SHALL come from the registry, addressed by
  its registry entry; the backend SHALL NOT construct a diagnostic from a string
  literal code, and constructing one from an unregistered entry SHALL throw.
- The registry SHALL carry at least these codes, all in the
  `agent-ix.rust-backend` namespace:

| Code | Severity | Blocking | Raised when |
|---|---|---|---|
| `UNSUPPORTED_CONSTRUCT` | error | yes | a construct has no mapping row |
| `UNSUPPORTED_PATTERN` | error | yes | an ECMA-262 pattern is neither expressible nor proved |
| `UNSUPPORTED_SCALAR` | error | yes | a `kind: "scalar"` names a value outside the nine kernel scalars |
| `UNKNOWN_FORMAT` | error | yes | a `format` operand names an unregistered format |
| `UNRENDERABLE_NAME` | error | yes | a name derives no legal Rust identifier |
| `NAME_COLLISION` | error | yes | two identities derive one identifier in one scope |
| `V1_1_NODE_IN_V1_0` | error | yes | a `1.0.0` document carries a `1.1.0` node |
| `UNRESOLVED_TYPE_REF` | error | yes | a `typeRef`, `appliesTo`, `items`, `values`, or `target` resolves to nothing |
| `UNDECLARED_LOSS` | error | yes | the backend would drop a construct the profile does not list in `allowedOmissions` |
| `DECLARED_LOSS` | warning | no | the backend drops a construct the profile lists in `allowedOmissions` |
| `UNKNOWN_MEMBER_SURFACED` | warning | no | a `surface` type retained an unknown member at runtime |
| `DIAGNOSTIC_LIMIT_REACHED` | warning | no | the diagnostic count reached the request limit |

- Every code SHALL name its owner as `ix://agent-ix/filament-core-data/rust-backend`.

### Refusal

- If any diagnostic is blocking, then the backend SHALL set the result state to
  `invalid` when the input is ill-formed and `unsupported` when the input is
  well-formed but outside the backend's declared support, SHALL emit zero files,
  and SHALL emit at least one diagnostic.
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

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-058-CON-1 | The registry SHALL be closed and deeply frozen; every code the backend can emit SHALL be in it, and every code in it SHALL be reachable from a live code path. | Correctness | Static analysis and test |
| FR-058-CON-2 | The backend SHALL NOT catch a diagnostic and continue with a substituted type. Emitting a fallback where a diagnostic was raised SHALL fail the build. | Correctness | Static analysis |
| FR-058-CON-3 | Diagnostic messages SHALL truncate input-derived text at 120 code points, so an untrusted document cannot enlarge the output without bound. | Safety | Test |
| FR-058-CON-4 | No diagnostic SHALL be downgraded, suppressed, or converted to a skip in order to make a suite pass. | Correctness | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-058-AC-1 | Every code in the registry is raised by a constructed input, and the raised code equals the registry entry's code exactly. | Test |
| FR-058-AC-2 | Constructing a diagnostic from an unregistered entry throws, and no live path constructs one from a string literal, checked by scanning the backend's module graph. | Static analysis |
| FR-058-AC-3 | For each blocking code, a document raising it produces zero emitted files, a result state of `invalid` or `unsupported` as the rule states, and at least one diagnostic. | Test |
| FR-058-AC-4 | A document carrying three distinct blocking defects reports all three in one run, not one. | Test |
| FR-058-AC-5 | A scan over generated output for `String`, `SemanticValue`, `BTreeMap<String, SemanticValue>`, and `Vec<u8>` finds each only at positions the mapping table declares, over every corpus base. | Static analysis |
| FR-058-AC-6 | Dropping an identity the profile lists raises `DECLARED_LOSS` and generation succeeds; dropping one it does not list raises `UNDECLARED_LOSS` and generation writes no file. | Test |
| FR-058-AC-7 | Diagnostic order is identical under `LANG=C`, `LANG=tr_TR.UTF-8`, and a reversed document traversal. | Test |
| FR-058-AC-8 | A document producing more diagnostics than `maxDiagnostics` yields exactly `maxDiagnostics` diagnostics plus `DIAGNOSTIC_LIMIT_REACHED`, and the retained set is the same under two traversal orders. | Test |
| FR-058-AC-9 | A message echoing a 10000-character input member is truncated at 120 code points. | Test |
| FR-058-AC-10 | The published code table and the registry agree exactly in both directions, enforced by a `--check` mode that `make lint` runs. | Analysis |
| FR-058-AC-11 | Reverting the refusal branch for `UNSUPPORTED_PATTERN` makes at least one test fail, demonstrated by a falsification run. | Test |

## Dependencies

- **Upstream**: [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md)
- **Downstream**: [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), [FR-062](./FR-062-cover-every-mapping-branch.md)
- **Constrained by**: [NFR-010](../non-functional/NFR-010-safe-schema-and-code-generation.md), [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
