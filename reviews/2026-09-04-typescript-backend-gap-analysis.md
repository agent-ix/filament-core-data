---
id: SR-095
title: "Gap analysis — Plan-011 TypeScript backend"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-011-typescript-backend/, src/compiler/backends/typescript-v1/, conformance/adapters/typescript-backend/, test/fixtures/backends/typescript/, test/typescript-backend.test.ts"
review_set: subset
relationships:
  - { target: "ix://agent-ix/filament-core-data/Plan-011", type: reviews }
---

# Gap analysis — Plan-011 TypeScript backend

## Verdict

**FAIL — final lifecycle not ready.** The generated backend and its focused
runtime evidence are substantial, but the three gaps below are direct
requirements of open P0 tasks. A passing fixture suite cannot substitute for
the missing persisted second-decider artefacts, loss audit, or merge rehearsal.

## Findings

| ID | Severity | Finding | Required remediation |
| --- | --- | --- | --- |
| FND-1200 | resolved | Each corpus now has an authored JSON Schema 2020-12 sidecar (`constraints.schema.json`, `domain.schema.json`, `presence.schema.json`, and `unknown.schema.json`). The differential loads each document directly into Ajv and resolves the case type through its `$defs`; the old test-local IR-to-schema renderer is removed. | None. |
| FND-1201 | resolved | `auditRenderedNodes` walks every identity-bearing resolved-model node after package rendering and rejects any absent from emitted text unless explicitly declared as a loss. Constraint and variant identity descriptors close the nodes the previous surface omitted; the focused test seeds an unrendered type and proves the audit names it. | None. |
| FND-1202 | high | Task-115 remains entirely pending: no history-pinned changed-set gate, packed-artifact comparison, or branch/post-merge/sibling verification evidence exists in `test/typescript-backend.test.ts`. | Implement and rehearse every NFR-024/NFR-025 gate before final review. |

## Evidence observed

- `test/typescript-backend.test.ts` executes all 94 authored cases and performs
  an Ajv comparison for every non-exempt case; exemptions are required to carry
  an explicit reason.
- The committed expected package carries identity, provenance, extension,
  occurrence, relationship and metadata surfaces, and the focused suite asserts
  their fixture preservation and metadata-only import isolation.
- Task-107 is now done. Task-108 is `in_progress`; Task-109, Task-110,
  Task-111, Task-114, Task-115 and Task-116 remain pending.

## Disposition

No finding is dispositioned as non-blocking. The next remediation order is
FND-1200, FND-1201, then FND-1202; Task-116 must rerun this analysis after all
three close.
