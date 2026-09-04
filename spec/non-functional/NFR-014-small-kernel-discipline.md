---
id: NFR-014
title: "Small kernel discipline and non-disruption for semantic-core"
type: NFR
quality_attribute: maintainability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: "depends_on"
---
# [NFR-014] Small kernel discipline and non-disruption for semantic-core

## Statement

The semantic-core package SHALL contain exactly the FR-031 declaration
inventory, with ARCH-005's other kernel concepts (temporal, provenance,
availability, result shapes) deferred to their own tickets and domain
vocabulary kept in modules.

The semantic-core introduction SHALL change no spike, backend, generated
language package, catalog pin, or corpus repository.

## Scope

- Permitted: `packages/semantic-core/**`, `fixtures/semantic-core/**`, `docs/semantic-data-system/metamodel.md` and `docs/semantic-data-system/adr/0002-generated-package-ownership.md` (one paragraph each), `spec/**`, `test/**`, `tests/**`, `fixtures/semantic/v1/compatibility/cases.json` (kernel-scalar families), `Makefile` (build targets only), `plan/**`, `reviews/**`, `spec/reviews/**`.
- Prohibited: `spikes/**`, `src/**`, `schema/avro/**`, `package.json`, `pnpm-lock.yaml`, generated language packages, catalog pins, a `pnpm-workspace.yaml`, and any file in config-service or another corpus repository.

## Rationale

ARCH-005 says the kernel is intentionally small. The declaration grammar is the
one addition Wave 4 needs; without a written inventory, each module ticket would
be tempted to push its own vocabulary into the kernel, and the kernel would
become the generic entity class ARCH-005 forbids.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Compiled declarations outside `inventory.json` | 0 | 0 | Compiled-program inventory test |
| `spike:typespec:check` output diff and `spikes/` path diff | empty | empty | Byte comparison and changed-path gate |
| Corpus repository files changed | 0 | 0 | Changed-path gate |
| ARCH-005 and ADR-0002 amendment length | 1 paragraph each | ≤ 1 paragraph each | Inspection |
| Custom emitters in the semantic-core build | 0 | 0 | `tspconfig.yaml` and dependency inspection |

## Verification

Compare the compiled program's declarations with `inventory.json`, diff the
branch against its base for prohibited paths, run the spike check, inspect
`tspconfig.yaml`, and read the two amendments.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-014-AC-1 | The compiled program's declaration set equals `inventory.json`. | Test |
| NFR-014-AC-2 | ARCH-005 (`metamodel.md`) and ADR-0002 each gain exactly one paragraph stating that "small" includes the declaration grammar and that domain vocabulary stays in modules. | Inspection |
| NFR-014-AC-3 | The issue branch changes no file under `spikes/`, `src/`, `pnpm-lock.yaml`, or a corpus repository. | Analysis |
| NFR-014-AC-4 | `tspconfig.yaml` lists only official `@typespec/*` emitters and no custom emitter dependency exists. | Analysis |
| NFR-014-AC-5 | `spike:typespec:check` output is byte-identical before and after the change. | Test |

## Dependencies

- **Upstream**: [NFR-013](./NFR-013-additive-semantic-ir-revision.md), ARCH-005, ADR-0002
- **Downstream**: every Wave 4 module ticket, issue #11 publication
