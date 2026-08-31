---
id: NFR-011
title: "Portable and explicitly extensible contracts"
type: NFR
quality_attribute: portability
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-026"
    type: "constrains"
---
# [NFR-011] Portable and explicitly extensible contracts

## Statement

The v1 semantic contract SHALL remain implementable by independent tools from
published schemas and normative rules. The v1 extension contract SHALL require
namespaced identity, version, capability declaration, and explicit preservation
or rejection behavior.

## Scope

- Semantic IR, package manifest, lock, mapping, profile, diagnostic, compatibility-report, and output-manifest contracts.
- Dynamic and statically generated consumers on supported Rust, TypeScript, and Python toolchains.

## Rationale

The metamodel is a public interoperability boundary, not an undocumented data
structure coupled to one compiler process. Extension escape hatches must not let
core semantics vary by backend.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Public contract documents without a versioned schema and examples | 0 | 0 | Artifact inventory |
| Core conformance fixtures requiring private compiler state | 0 | 0 | Independent-reader test |
| Unnamespaced extension keys | 0 | 0 | Schema validation |
| Unknown required capabilities accepted as success | 0 | 0 | Negative test |
| Preservable extension payloads changed by a no-op round trip | 0 | 0 | Property test |

## Verification

Implement a minimal independent reader against only the published contract and
fixtures, then exercise known, unknown-optional, and unknown-required extension
capabilities through dynamic and generated paths.

## Dependencies

- **Upstream**: [FR-020](../functional/FR-020-define-semantic-type-system-and-identity.md), [FR-026](../functional/FR-026-preserve-dynamic-and-legacy-boundaries.md)
- **Downstream**: Quoin module contract and third-party module tooling
