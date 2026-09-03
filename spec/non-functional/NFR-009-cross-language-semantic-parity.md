---
id: NFR-009
title: "Cross-language semantic parity"
type: NFR
quality_attribute: compatibility
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "constrains"
---
# [NFR-009] Cross-language semantic parity

## Statement

Rust, TypeScript, Python, and JSON Schema target surfaces SHALL agree on every
accepted and rejected conformance value, stable identity, presence/null/default
state, discriminator, constraint, and unknown-value outcome selected by a profile.

## Scope

- Positive, negative, boundary, recursive, extension, evolution, and legacy-bridge fixtures.
- Static APIs and runtime validation/serialization behavior.

## Rationale

A source compiling in every language is insufficient when languages accept
different values or silently replace unknown data. The shared contract exists
to make those disagreements observable before consumers adopt it.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Cross-target fixture verdict agreement | 100% | 100% | Conformance matrix |
| Accepted round trips with unequal canonical semantic value | 0 | 0 | Property test |
| Unsupported IR features silently widened | 0 | 0 | Adverse fixture suite |
| Target API elements lacking semantic identity metadata | 0 | 0 | Generated API inspection |

## Verification

Execute the same versioned fixture corpus through each runtime validator,
serializer, and native consumer, normalize their semantic values and diagnostics,
and require exact per-fixture agreement or an explicitly declared unsupported target.

## Dependencies

- **Upstream**: [FR-020](../functional/FR-020-define-semantic-type-system-and-identity.md), [FR-024](../functional/FR-024-define-compilation-and-generated-target-contracts.md)
- **Downstream**: compatibility issue #7 and generated packages issue #11
