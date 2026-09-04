---
id: FR-049
title: "Emit stable, source-located compiler diagnostics"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
---
# [FR-049] Emit stable, source-located compiler diagnostics

## Description

The compiler SHALL report every input defect as a diagnostic drawn from one
registered, closed code set, located at the exact position that declared the
defect, so that a caller can key automation on the code and a human can navigate
to the line without searching.

## Inputs

- Defects reported by the frontend (FR-046), the resolver (FR-047), the lock (FR-048), the IR reader (FR-050), and the compatibility diff (FR-051)
- The `maxDiagnostics` limit of `schema/semantic/v1/compiler-request.schema.json`

## Outputs

- `src/compiler/diagnostics.mjs` exporting `DIAGNOSTIC_CODES`, `diagnostic(code, options)`, `sortDiagnostics(list)`, and `applyDiagnosticLimit(list, max)`
- Diagnostic objects valid against the `diagnostic` definition of `schema/semantic/v1/common.schema.json`
- `docs/semantic-data-system/compiler-diagnostics.md`, the published registry

## Behavior

- `DIAGNOSTIC_CODES` SHALL be a frozen record mapping each code to its `severity`, `blocking` disposition, and `owner` identity.
- Every emitted code SHALL match `^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$`.
- If a module asks for a code the registry does not contain, then `diagnostic` SHALL raise a programming error rather than emitting it.
- Every diagnostic SHALL carry `code`, `severity`, `message`, `owner`, `blocking`, `causes`, and `related`.
- Where the defect has a position in an input file, the diagnostic SHALL also carry `locus`.
- A diagnostic's `locus.path` SHALL be relative to the package root, `/`-separated, and free of `..`.
- `sortDiagnostics` SHALL order by `locus.path`, then `locus.startLine`, then `locus.startColumn`, then `code`, then `message`, each under a locale-independent code-point comparison.
- `sortDiagnostics` SHALL place diagnostics with no locus after those with one.
- A diagnostic message SHALL NOT contain an absolute path, a timestamp, a hostname, or a duration.
- Where one defect is caused by another, the compiler SHALL nest the cause in `causes` rather than emitting two unrelated diagnostics.
- Where a defect has more than one position, the compiler SHALL record the first in `locus` and the remainder in `related`.
- If the number of diagnostics reaches `maxDiagnostics`, then the compiler SHALL truncate the list to that many and append one `agent-ix.compiler.DIAGNOSTIC_LIMIT_REACHED` diagnostic naming the limit.
- The compiler SHALL stop analysing once that limit is reached.
- A compile whose diagnostics include any `blocking` diagnostic SHALL write no IR file.
- A compile whose diagnostics include any `blocking` diagnostic SHALL exit non-zero.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-049-CON-1 | The registry is a compatibility surface: a code's spelling and its `blocking` disposition SHALL NOT change without a compatibility-report entry in the `generated-api` family. | Compatibility | Analysis |
| FR-049-CON-2 | The `diagnostic` constructor SHALL truncate every input-derived string to 120 characters before it enters a message; input data beyond identities, versions, digests, keywords, and positions never reaches it. | Security | Test |
| FR-049-CON-3 | The set of codes the registry declares and the set the compiler emits SHALL be equal, with every declared code reached by at least one test. | Completeness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-049-AC-1 | Every entry of `DIAGNOSTIC_CODES` matches the code pattern and validates as a `diagnostic` against `common.schema.json` when instantiated. | Test |
| FR-049-AC-2 | The set of codes emitted anywhere under `src/compiler/` equals the set the registry declares, computed by static analysis rather than by a hand-maintained list. | Analysis |
| FR-049-AC-3 | Every registry code is exercised by at least one test case, proven by a coverage assertion over the code set. | Test |
| FR-049-AC-4 | `sortDiagnostics` produces the same order for a list and for its reverse, and for at least two `Intl.Collator` locales. | Test |
| FR-049-AC-5 | Compiling a fixture with three defects twice produces byte-identical diagnostic output. | Test |
| FR-049-AC-6 | No emitted message contains an absolute path, a timestamp, a hostname, or a duration, asserted by a pattern scan over every diagnostic a fixture run produces. | Test |
| FR-049-AC-7 | A defect caused by another is emitted once with the cause nested, not twice at the top level. | Test |
| FR-049-AC-8 | With `maxDiagnostics: 2`, a fixture producing five defects emits exactly two diagnostics plus `DIAGNOSTIC_LIMIT_REACHED`. | Test |
| FR-049-AC-9 | A blocking diagnostic leaves the named `--out` path absent and exits non-zero; a non-blocking diagnostic writes the file and exits zero. | Test |
| FR-049-AC-10 | A 4000-character string read from an input appears in no message longer than 120 characters. | Test |
| FR-049-AC-11 | The published registry document lists every code with its severity, blocking disposition, and owner, and a test fails when the document and `DIAGNOSTIC_CODES` disagree. | Test |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-047](./FR-047-resolve-the-package-graph.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
