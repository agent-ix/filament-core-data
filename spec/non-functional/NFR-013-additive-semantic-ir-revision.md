---
id: NFR-013
title: "Additive semantic IR revision"
type: NFR
quality_attribute: compatibility
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: "depends_on"
---
# [NFR-013] Additive semantic IR revision

## Statement

Issue #34 SHALL revise the semantic IR from v1 to v1.1 additively, keeping
every v1 fixture valid, the frozen TypeSpec spike byte-identical, and every
backend, generated package, and corpus repository unchanged.

## Scope

- Permitted: `contracts-v1.md`, `schema/semantic/v1/*.schema.json`, `fixtures/semantic/v1/`, FR-020 and its sibling requirements, tests, reviews, and plans owned by issue #34.
- Prohibited: `spikes/` content, compiler backends, generated packages, catalog pins, and any file in config-service or another corpus repository.

## Rationale

IR v1.1 is the shared dependency for the semantic-core grammar, the module
contract, and the formal-clause frontends. If the revision were not additive,
every v1 consumer and the frozen feasibility evidence would have to be
re-qualified before Wave 4 could start.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| v1 positive fixtures that fail under the v1.1 schema | 0 | 0 | Existing-fixture suite |
| `spike:typespec:check` output diff | empty | empty | Byte comparison before and after |
| Compatibility classification of v1 → v1.1 recorded in `fixtures/semantic/v1/compatibility/cases.json` | `additive` | `additive` | Fixture inspection |
| Corpus repository files changed by issue #34 | 0 | 0 | Changed-path gate |
| New IR nodes without both a golden and a negative fixture | 0 | 0 | Fixture inventory |

## Verification

Run the existing contract suite unchanged against the v1.1 schemas, run
`spike:typespec:check` and compare its output to the pre-change output, inspect
the compatibility corpus entry for v1 → v1.1, and diff the issue branch against
its base for corpus and backend paths.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-013-AC-1 | Every v1 positive fixture validates under the v1.1 schema without edit. | Test |
| NFR-013-AC-2 | `spike:typespec:check` produces byte-identical output before and after the revision. | Test |
| NFR-013-AC-3 | The compatibility corpus records v1 → v1.1 as `additive` with the added node list. | Inspection |
| NFR-013-AC-4 | The issue branch changes no file under `spikes/`, no backend, and no corpus repository. | Inspection |

## Dependencies

- **Upstream**: [NFR-012](./NFR-012-non-disruptive-contract-specification.md), [FR-025](../functional/FR-025-classify-semantic-and-target-compatibility.md)
- **Downstream**: issue #35 semantic-core, issue #36 extraction frontend
