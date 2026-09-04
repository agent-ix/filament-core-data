---
id: NFR-020
title: "Bounded and safe compilation of untrusted inputs"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "depends_on"
---
# [NFR-020] Bounded and safe compilation of untrusted inputs

## Statement

The compiler SHALL treat every manifest, mapping, profile, lock, source file,
name, and reference as untrusted data, terminating within declared finite limits
on any input, executing no code an input supplies, opening no network
connection, reading nothing outside its declared roots, and writing nothing
outside a caller-named path and that path's `.tmp` sibling. Each of those five
obligations is stated separately as its own acceptance criterion below.

## Scope

- Applies to: `src/compiler/frontend/**`, `src/compiler/packages/**`, `src/compiler/ir/**`, `src/compiler/compat/**`, `src/compiler/json-locus.mjs`, `src/compiler/host.mjs`, `src/compiler/pipeline.mjs`, `src/compiler/cli.mjs`.
- Permitted paths: as NFR-019.
- Prohibited paths: as NFR-019.

## Rationale

A semantic package is data supplied by whoever authored it, and the compiler is
the first thing in the chain to read it. The v1 contract already names the
hazards — code execution, undeclared network access, path and symlink escape,
writes outside a fresh output root, and unbounded graph depth, reference
expansion, collection size, input bytes, and diagnostic volume — and
`compiler-request.schema.json#/properties/limits` already declares the five
limits and their bounds.

The TypeSpec compiler itself loads JavaScript for decorator libraries, so the
boundary has to be mechanical rather than asserted. It is: `CompilerHost` is an
interface with `readFile`, `stat`, `realpath`, and `getJsImport`, and the
frontend compiles through an injected host that implements all four. The
repository's own decorator library reaches a package through the compiler's
`additionalImports` at an absolute path, so a package neither imports it nor
names a path outside its own root, and any other JavaScript module the program
requests is refused by the host rather than loaded and then complained about.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Network sockets opened during a compile | 0 | 0 | Instrumented run |
| Reads outside the package root, search directories, library root, and pinned toolchain | 0 | 0 | Instrumented host |
| Writes outside the caller-named paths and their `.tmp` siblings | 0 | 0 | Instrumented writer |
| JavaScript modules loaded from a package under compilation | 0 | 0 | Instrumented `getJsImport` |
| Inputs exceeding a declared limit that do not terminate with a diagnostic | 0 | 0 | Limit tests |
| Unbounded recursions in the reader, resolver, canonicaliser, and diff | 0 | 0 | Cyclic-input tests |
| Uncaught exceptions on a malformed input corpus | 0 | 0 | Fuzz run |

## Verification

Run the compiler against malformed, cyclic, deeply nested, and oversized inputs
and confirm each terminates with a diagnostic; run against a package whose
manifest points outside its root through `..` and through a symlink; run against
a package that ships a JavaScript file its sources import, and confirm the
injected `getJsImport` refuses it; instrument the injected host's `readFile`,
`stat`, `realpath`, and `getJsImport` and the CLI's writer and assert zero
out-of-bound operations; assert by module-graph analysis that no module in scope
imports `node:net`, `node:http`, `node:https`, `node:dgram`, `node:child_process`,
`node:worker_threads`, or `node:vm`, and additionally stub `globalThis.fetch`
during a fixture compile and assert it is never called; fuzz the manifest and IR
readers with mutated bytes.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-020-AC-1 | Each of the four size limits — `maxInputBytes`, `maxDepth`, `maxNodes`, `maxCollectionItems` — is enforced, and exceeding each produces a distinct blocking diagnostic naming the limit and its value. | Test |
| NFR-020-AC-2 | `DEFAULT_LIMITS` applies where the caller supplies none, its five values are those FR-049 declares, and the published registry document carries them. | Test |
| NFR-020-AC-3 | A manifest whose `sourceRoots` contains `..` and one that is a symlink out of the package root each yield `PATH_ESCAPE`, and the instrumented host records no read outside the declared roots. | Test |
| NFR-020-AC-4 | A package shipping a `.mjs` file that its sources import is refused by the injected `getJsImport`, which never delegates for it, and the compile raises `UNTRUSTED_MODULE`. | Test |
| NFR-020-AC-5 | No module in scope imports a network-capable or code-executing built-in, and a fixture compile with `globalThis.fetch` stubbed never calls it. | Test |
| NFR-020-AC-6 | The instrumented writer records only caller-named paths and their `.tmp` siblings over a full fixture compile. | Test |
| NFR-020-AC-7 | A cyclic alias chain, a cyclic composite relationship graph, a cyclic package import graph, a self-referential JSON pointer, and a `causes` chain nested past `maxDepth` each terminate with a diagnostic. | Test |
| NFR-020-AC-8 | A fuzz run of at least 512 mutations over the manifest and IR readers produces zero uncaught exceptions and no code outside the registry. | Fuzz |
| NFR-020-AC-9 | An input of exactly `maxInputBytes` parses and one byte more terminates with the limit diagnostic before parsing. | Test |
| NFR-020-AC-10 | Input string content reaching a diagnostic message is truncated to 120 characters, so an adversarial name cannot flood the output. | Test |
| NFR-020-AC-11 | Every read the pinned TypeSpec compiler performs during a fixture compile passes through the injected host, counted at run time. | Test |

## Dependencies

- **Upstream**: [NFR-010](./NFR-010-safe-schema-and-code-generation.md), [FR-024](../functional/FR-024-define-compilation-and-generated-target-contracts.md)
- **Downstream**: [FR-046](../functional/FR-046-lower-typespec-to-contract-ir.md), [FR-047](../functional/FR-047-resolve-the-package-graph.md), [FR-049](../functional/FR-049-emit-stable-source-located-diagnostics.md), [FR-050](../functional/FR-050-validate-and-normalize-the-emitted-ir.md)
