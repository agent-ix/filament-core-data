---
id: NFR-010
title: "Safe schema and code generation"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "constrains"
---
# [NFR-010] Safe schema and code generation

## Statement

The compiler and every retained generator SHALL treat schemas, package metadata,
mappings, examples, and remote references as untrusted input and SHALL prevent
them from causing arbitrary code execution, undeclared network access, or writes
outside the selected output root.

## Scope

- Package acquisition, reference resolution, source normalization, backend invocation, generated filenames, templates, examples, and post-processing.
- Applies to qualified upstream tools and Agent IX custom AGPL code alike.

## Rationale

Code generators parse attacker-influenced names and may invoke complex upstream
toolchains. A portable schema package must not become a path traversal, dependency
injection, template execution, or supply-chain boundary.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Writes outside a fresh output root under hostile path/name fixtures | 0 | 0 | Sandboxed integration test |
| Undeclared network requests during locked generation | 0 | 0 | Network-isolated test |
| Executed schema/template/example payloads | 0 | 0 | Adverse security corpus |
| Unpinned executable generator dependencies | 0 | 0 | Lock and provenance audit |
| High or critical generator dependency findings without disposition | 0 | 0 | Security scan |
| Unbounded graph, recursion, collection, or diagnostic traversal paths | 0 | 0 | Adverse resource-limit test |

## Verification

Run hostile identifiers, traversal paths, symlink targets, remote references,
template expressions, oversized recursion, cyclic imports, excessive collections,
and generator-option payloads inside an isolated output sandbox; inspect
filesystem, process, network, resource-limit, and dependency evidence and require
bounded termination with source-located rejection.

## Dependencies

- **Upstream**: [FR-021](../functional/FR-021-define-package-graphs-exports-and-locks.md), [FR-024](../functional/FR-024-define-compilation-and-generated-target-contracts.md)
- **Downstream**: compiler implementation security review and publication gate
