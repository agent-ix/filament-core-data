---
id: FR-049
title: "Emit stable, source-located compiler diagnostics"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-049] Emit stable, source-located compiler diagnostics

## Description

The compiler SHALL report every input defect as a diagnostic drawn from one
registered, closed code set, located at the exact position that declared the
defect, so that a caller can key automation on the code and a human can navigate
to the line without searching.

## Inputs

- Defects reported by the frontend (FR-046, FR-053), the resolver (FR-047), the lock (FR-048), the IR reader (FR-050), and the compatibility diff (FR-051)
- The limits record: an object valid against `schema/semantic/v1/compiler-request.schema.json#/properties/limits`

## Outputs

- `src/compiler/diagnostics.mjs` exporting `DIAGNOSTIC_CODES`, `DEFAULT_LIMITS`, `diagnostic(code, options)`, `sortDiagnostics(list)`, and `applyDiagnosticLimit(list, max)`
- Diagnostic objects valid against the `diagnostic` definition of `schema/semantic/v1/common.schema.json`
- `docs/semantic-data-system/compiler-diagnostics.md`, the published registry and limit defaults

## Behavior

### The registry

- `DIAGNOSTIC_CODES` SHALL be a frozen record mapping each code to its `severity`, `blocking` disposition, and `owner` identity.
- Every `blocking` code SHALL carry severity `error`, so a caller cannot meet a blocking `info` diagnostic.
- The registry SHALL span exactly two namespaces: `agent-ix.compiler.*` for defects in a package's manifests, locks, sources, or the caller's invocation, and `agent-ix.semantic-ir.*` for defects in the shape of an IR document, whose spellings are those the issue #34 readers already emit.
- Every emitted code SHALL match `^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$`.
- Every module SHALL name a code only as a member access on `DIAGNOSTIC_CODES`, never as a string literal, so the emitted set can be extracted statically.
- If a module asks for a code the registry does not contain, then `diagnostic` SHALL throw, because that is a defect in the compiler rather than in an input.
- A `constraint.diagnosticCode` value inside an emitted IR document is a datum for a consumer, not a compiler diagnostic, and SHALL NOT appear in the registry.

### Shape

- Every diagnostic SHALL carry `code`, `severity`, `message`, `owner`, `blocking`, `causes`, and `related`.
- Where the defect has a position in an input file, the diagnostic SHALL also carry `locus`.
- A diagnostic's `locus.path` SHALL be relative to the package root that owns the file, `/`-separated, and free of `..`, and its `sourceIdentity` SHALL name that file's source.
- Where a defect is located by a JSON pointer into an IR document rather than by a file position, the compiler SHALL take the locus from that node's own `origin.source`, or, where the compiler read the document from a file, from `locateJsonPointer` over that file's text.
- A diagnostic message SHALL NOT contain an absolute path, a timestamp, a hostname, or a duration.
- Where one defect is caused by another, the compiler SHALL nest the cause in `causes` rather than emitting two unrelated diagnostics.
- Where a defect has more than one position, the compiler SHALL record the first in `locus` and the remainder in `related`.

### Ordering, limits, and blocking

- `sortDiagnostics` SHALL order by `locus.path`, then `locus.startLine`, then `locus.startColumn`, then `code`, then `message`, each under a locale-independent code-point comparison.
- `sortDiagnostics` SHALL place diagnostics with no locus after those with one.
- The compiler SHALL sort the accumulated diagnostics before applying `maxDiagnostics`, so which defects survive truncation does not depend on the order in which analysis found them.
- If the sorted list is longer than `maxDiagnostics`, then `applyDiagnosticLimit` SHALL truncate it to that many and append one `agent-ix.compiler.DIAGNOSTIC_LIMIT_REACHED` diagnostic naming the limit and the number dropped.
- `DIAGNOSTIC_LIMIT_REACHED` SHALL be a non-blocking `warning`, so a compile whose surviving diagnostics are all warnings still writes its document.
- The four size limits — `maxInputBytes`, `maxDepth`, `maxNodes`, and `maxCollectionItems` — SHALL each raise a distinct blocking diagnostic naming the limit and its value, and analysis SHALL stop when one is raised.
- `DEFAULT_LIMITS` SHALL be `{ maxInputBytes: 16777216, maxDepth: 128, maxNodes: 100000, maxCollectionItems: 10000, maxDiagnostics: 1000 }`, and the published registry document SHALL carry those values.
- A compile whose diagnostics include any `blocking` diagnostic SHALL write no IR file.
- A compile whose diagnostics include any `blocking` diagnostic SHALL exit non-zero.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-049-CON-1 | The registry is a compatibility surface: a code's spelling and its `blocking` disposition SHALL NOT change without a compatibility-report entry in the `generated-api` family. | Compatibility | Analysis |
| FR-049-CON-2 | The `diagnostic` constructor SHALL truncate every input-derived string to 120 characters before it enters a message; input data beyond identities, versions, digests, keywords, and positions never reaches it. | Security | Test |
| FR-049-CON-3 | The set of codes the registry declares and the set the compiler emits SHALL be equal, with every declared code reached by at least one test. | Completeness | Test |
| FR-049-CON-4 | The `agent-ix.semantic-ir.*` spellings SHALL be exactly those the issue #34 readers already emit, extracted from the byte-unchanged `fixtures/semantic/v1/negative/reader-cases.json` and `test/semantic-ir-v1-1-reader.ts`. | Consistency | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-049-AC-1 | Every entry of `DIAGNOSTIC_CODES` matches the code pattern and validates as a `diagnostic` against `common.schema.json` when instantiated. | Test |
| FR-049-AC-2 | The set of codes named under `src/compiler/` equals the registry set, extracted statically from `DIAGNOSTIC_CODES` member accesses, and no module names a code as a string literal. | Analysis |
| FR-049-AC-3 | Every registry code is emitted by at least one test case in the suite, asserted by a coverage set collected at run time. | Test |
| FR-049-AC-4 | `sortDiagnostics` produces the same order for a list and for its reverse, and for at least two `Intl.Collator` locales. | Property |
| FR-049-AC-5 | Two compiles of a three-defect fixture produce identical diagnostic bytes. | Snapshot |
| FR-049-AC-6 | No message emitted across a full fixture-corpus run contains an absolute path, a timestamp, a hostname, or a duration, asserted by a pattern scan over the collected diagnostics. | Test |
| FR-049-AC-7 | A defect caused by another is emitted once with the cause nested. | Test |
| FR-049-AC-8 | With `maxDiagnostics: 2`, a fixture producing five defects emits the two lowest in sort order plus `DIAGNOSTIC_LIMIT_REACHED`, and the survivors do not change when the analysis order is permuted. | Test |
| FR-049-AC-9 | A blocking diagnostic leaves a fresh `--out` path absent and exits non-zero, leaves a pre-existing `--out` byte-unchanged, and a warning-only compile writes the file and exits zero. | Test |
| FR-049-AC-10 | A 4000-character input string never appears in a message longer than 120 characters. | Test |
| FR-049-AC-11 | The published registry document lists every code with its severity, blocking disposition, and owner, and the five limit defaults, and a test fails when the document and `DIAGNOSTIC_CODES`/`DEFAULT_LIMITS` disagree. | Test |
| FR-049-AC-12 | Every code `reader-cases.json` names appears in the registry, and every `agent-ix.semantic-ir.*` code in the registry is one the issue #34 TypeScript reader can emit, both sets extracted from those files rather than restated. | Test |
| FR-049-AC-13 | A diagnostic located by a JSON pointer into an IR node carries that node's `origin.source` as its locus. | Test |
| FR-049-AC-14 | `DIAGNOSTIC_LIMIT_REACHED` is non-blocking, the four size limits are blocking, and every blocking code carries severity `error`, asserted against the registry. | Test |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
