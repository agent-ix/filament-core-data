---
id: NFR-020
title: "Bounded and safe compilation of untrusted inputs"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "depends_on"
---
# [NFR-020] Bounded and safe compilation of untrusted inputs

## Statement

The compiler SHALL treat every manifest, mapping, profile, lock, source file,
name, and reference as untrusted data, SHALL terminate within declared finite
limits on any input, and SHALL neither execute input, reach the network, escape
the declared roots, nor write outside a caller-named output path.

## Scope

- Applies to: `src/compiler/frontend/**`, `src/compiler/packages/**`, `src/compiler/ir/**`, `src/compiler/compat/**`, `src/compiler/json-locus.mjs`, `src/compiler/cli.mjs`.
- Permitted paths: as NFR-019.
- Prohibited paths: as NFR-019.

## Rationale

A semantic package is data supplied by whoever authored it, and the compiler is
the first thing in the chain to read it. The v1 contract already names the
hazards — code execution, undeclared network access, path and symlink escape,
writes outside a fresh output root, and unbounded graph depth, reference
expansion, collection size, input bytes, and diagnostic volume — and
`compiler-request.schema.json` already declares the five limits. The TypeSpec
compiler itself executes JavaScript for decorator libraries, so the boundary
between "the pinned toolchain and the repository's own decorator library" and
"anything a package supplies" has to be drawn explicitly rather than assumed.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Network sockets opened during a compile | 0 | 0 | Instrumented run |
| Reads outside the package root and declared search directories | 0 | 0 | Instrumented reader |
| Writes outside the caller-named output paths | 0 | 0 | Instrumented writer |
| JavaScript modules loaded from a package under compilation | 0 | 0 | Instrumented loader |
| Inputs exceeding a declared limit that do not terminate with a diagnostic | 0 | 0 | Limit tests |
| Unbounded recursions in the reader, resolver, and canonicaliser | 0 | 0 | Cyclic-input tests |
| Uncaught exceptions on a malformed input corpus | 0 | 0 | Fuzz run |

## Verification

Run the compiler against malformed, cyclic, deeply nested, and oversized inputs
and confirm each terminates with a diagnostic; run against a package whose
manifest points outside its root through `..` and through a symlink; run against
a package that ships a JavaScript file and confirm it is never loaded; instrument
the injected reader, writer, and network layer and assert zero out-of-bound
operations; fuzz the manifest and IR readers with mutated bytes.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-020-AC-1 | Each of the five `compiler-request` limits — `maxInputBytes`, `maxDepth`, `maxNodes`, `maxCollectionItems`, `maxDiagnostics` — is enforced, and exceeding each produces a distinct blocking diagnostic naming the limit and its value. | Test |
| NFR-020-AC-2 | The compiler applies a declared default for every limit when the caller supplies none, and the defaults are published in the diagnostics registry document. | Test |
| NFR-020-AC-3 | A manifest whose `sourceRoots` contains `..` and one that is a symlink out of the package root each yield `PATH_ESCAPE` and no read outside the root. | Test |
| NFR-020-AC-4 | A package shipping a `.js` or `.mjs` file that is not the repository's own decorator library is never loaded, verified by an instrumented loader. | Test |
| NFR-020-AC-5 | A compile opens no network socket, verified by an instrumented run. | Test |
| NFR-020-AC-6 | The compiler writes only the paths the caller named, verified by an instrumented writer over a full fixture compile. | Test |
| NFR-020-AC-7 | A cyclic alias chain, a cyclic composite relationship graph, a cyclic package import graph, and a self-referential JSON pointer each terminate with a diagnostic rather than recursing without bound. | Test |
| NFR-020-AC-8 | A fuzz run of at least 512 mutations over the manifest and IR readers produces zero uncaught exceptions and zero non-registry diagnostic codes. | Fuzz |
| NFR-020-AC-9 | A 10 MiB manifest with `maxInputBytes` set below it terminates with the limit diagnostic and does not parse the document. | Test |
| NFR-020-AC-10 | Input string content reaching a diagnostic message is truncated to 120 characters, so an adversarial name cannot flood the output. | Test |

## Dependencies

- **Upstream**: [NFR-010](./NFR-010-safe-schema-and-code-generation.md), [FR-024](../functional/FR-024-define-compilation-and-generated-target-contracts.md)
- **Downstream**: [FR-047](../functional/FR-047-resolve-the-package-graph.md), [FR-049](../functional/FR-049-emit-stable-source-located-diagnostics.md), [FR-050](../functional/FR-050-validate-and-normalize-the-emitted-ir.md)
