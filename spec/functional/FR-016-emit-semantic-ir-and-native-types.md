---
id: FR-016
title: "Emit a semantic IR and ordinary native consumer types"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/typespec-feasibility.test.ts"
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/capabilities.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-014"
    type: "depends_on"
---
# [FR-016] Emit a semantic IR and ordinary native consumer types

## Description

The experiment SHALL traverse the compiled TypeSpec program into a deterministic,
versioned semantic IR and use that IR to emit ordinary Rust/Serde, TypeScript,
Python/Pydantic, JSON Schema, Protobuf-mapping, Arrow-schema, and Markdown-mapping
artifacts without placing authoring authority in a consumer language.

## Inputs

- Successfully compiled representative TypeSpec program
- Explicit package, export, identity, role, mapping, and projection metadata
- Target-specific mapping rules

## Outputs

- Canonical experimental semantic IR
- Generated native source and representation schemas/mappings
- Per-target preservation and loss dispositions

## Behavior

- The IR SHALL keep structural kind separate from semantic role.
- The IR SHALL retain source package, source locus, stable identity, version,
  optionality, nullability, constraints, discriminator, recursion, extension
  policy, and provenance.
- Rust, TypeScript, and Python consumers SHALL import generated native types and
  construct golden values without defining schemas through language decorators.
- Arrow SHALL remain an explicit analytical projection.
- The Arrow projection SHALL flatten or reject recursion with declared loss
  rather than misrepresent a recursive object graph.
- Markdown mappings SHALL describe frontmatter/body locations without rendering
  templates or moving generation responsibility into Quire.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-016-AC-1 | The semantic IR is versioned, deterministic, source-located, and preserves every required semantic dimension. | Test (TC-104..TC-105) |
| FR-016-AC-2 | Generated TypeScript, Python/Pydantic, and Rust/Serde packages compile and construct equivalent golden values as ordinary imports. | Test (TC-106..TC-108) |
| FR-016-AC-3 | JSON Schema and Protobuf mapping outputs agree with their official-emitter evidence or retain a named mismatch. | Test (TC-109..TC-110) |
| FR-016-AC-4 | Arrow and Markdown projection records state authority, round-trip level, allowed loss, and provenance. | Analysis (TC-111..TC-112) |

## Dependencies

- **Upstream**: [FR-014](./FR-014-pin-typespec-experiment.md)
- **Downstream**: [FR-017](./FR-017-prove-spike-compatibility.md), issue #9
