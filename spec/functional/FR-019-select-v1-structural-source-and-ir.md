---
id: FR-019
title: "Select the v1 structural source and semantic IR envelope"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-018"
    type: "depends_on"
---
# [FR-019] Select the v1 structural source and semantic IR envelope

## Description

When the issue #4 evidence is accepted, the v1 contract SHALL use modular JSON
Schema 2020-12 as the authoritative structural source. The v1 contract SHALL
define a source-independent, versioned semantic IR for compiler and emitter exchange.

## Inputs

- Modular JSON Schema documents with absolute stable `$id` values and resolved package-local references
- Versioned package, mapping, profile, compatibility, and lock metadata
- Exact source bytes, source loci, package identity, and compiler contract version

## Outputs

- A `semantic-ir-v1` document with a declared schema version
- Normalized package, type, field, relationship, mapping, profile, and transformation nodes
- Source and configuration digests plus source-located diagnostics

## Behavior

- The contract SHALL keep the structural source, package metadata, mappings, and build profile as distinct versioned inputs.
- The IR SHALL retain every source definition's stable semantic identity and source locus.
- The IR SHALL distinguish absent, explicitly null, defaulted, unknown, unavailable, unsupported, invalid, and lossy states where the source contract distinguishes them.
- The IR SHALL carry its own version and the exact versions and digests of every input used to construct it.
- TypeSpec SHALL remain a non-authoritative import or future authoring option until a superseding decision passes its own compatibility gate.
- Current Avro SHALL remain a compatibility representation.
- Current Avro SHALL NOT become the v1 semantic source by implication.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-019-CON-1 | A source adapter SHALL NOT inject a semantic claim that is absent from the source and package metadata. | Integrity | Golden comparison |
| FR-019-CON-2 | An unknown structural-source or semantic-IR version SHALL fail before target emission. | Compatibility | Negative test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-019-AC-1 | The specification identifies modular JSON Schema 2020-12 as the v1 structural source and records the exact human promotion gate. | Inspection |
| FR-019-AC-2 | Structural source, semantic IR, package metadata, mappings, profiles, and locks have separate identities and versions. | Analysis |
| FR-019-AC-3 | Every IR node links to a stable semantic identity and at least one source locus or generated-origin record. | Test |
| FR-019-AC-4 | Unsupported contract versions produce a non-empty machine-readable diagnostic and zero target artifacts. | Test |
| FR-019-AC-5 | The v1 decision neither changes current Avro authority nor requires TypeSpec inputs. | Inspection |

## Dependencies

- **Upstream**: [FR-018](./FR-018-resolve-structural-schema-source.md), issue #4 feasibility evidence
- **Downstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), compiler issue #5, Quoin issue #293
