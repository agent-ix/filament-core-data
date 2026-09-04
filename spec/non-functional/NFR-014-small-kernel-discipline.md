---
id: NFR-014
title: "Small kernel discipline and non-disruption for semantic-core"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: "depends_on"
---
# [NFR-014] Small kernel discipline and non-disruption for semantic-core

## Statement

The semantic-core package SHALL stay a small, representation-independent kernel
whose scope is the ARCH-005 list plus the declaration grammar, and its
introduction SHALL change no spike, backend, generated package, catalog pin, or
corpus repository.

## Scope

- Permitted: `packages/semantic-core/**`, `docs/semantic-data-system/metamodel.md` (one-paragraph amendment), `docs/semantic-data-system/adr/0002-*.md` (one-paragraph amendment), `fixtures/semantic/v1/**`, `spec/**`, `test/**`, `tests/**`, `package.json`/`pnpm-lock.yaml` only for the `packages/semantic-core` workspace entry and its pinned TypeSpec dependencies, `reviews/**`, `plan/**`.
- Prohibited: `spikes/**`, `src/**`, `schema/avro/**`, generated language packages, catalog pins, and any file in config-service or another corpus repository.

## Rationale

ARCH-005 says the kernel is intentionally small. The declaration grammar is the
one addition Wave 4 needs; without a written scope rule, each module ticket
would be tempted to push its own vocabulary into the kernel, and the kernel
would become the generic entity class ARCH-005 forbids.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Kernel models outside the ARCH-005 list plus the nine grammar models and four support types | 0 | 0 | Compiled-program inventory |
| `spike:typespec:check` diff | empty | empty | Byte comparison |
| Corpus repository files changed | 0 | 0 | Changed-path gate |
| ARCH-005 and ADR-0002 amendment length | 1 paragraph each | ≤ 1 paragraph each | Inspection |
| Custom emitters introduced | 0 | 0 | Dependency and script inspection |

## Verification

Inventory the compiled program's declarations against the allowed list, diff
the branch against its base for prohibited paths, run the spike check, and read
the two amendments.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-014-AC-1 | The compiled program declares no model outside the allowed inventory. | Test |
| NFR-014-AC-2 | ARCH-005 (`metamodel.md`) and ADR-0002 each gain exactly one paragraph stating that "small" includes the declaration grammar and that domain vocabulary stays in modules. | Analysis |
| NFR-014-AC-3 | The issue branch changes no file under `spikes/`, `src/`, or a corpus repository. | Analysis |
| NFR-014-AC-4 | Only official TypeSpec emitters appear in the semantic-core build. | Analysis |

## Dependencies

- **Upstream**: [NFR-013](./NFR-013-additive-semantic-ir-revision.md), ARCH-005, ADR-0002
- **Downstream**: every Wave 4 module ticket, issue #11 publication
