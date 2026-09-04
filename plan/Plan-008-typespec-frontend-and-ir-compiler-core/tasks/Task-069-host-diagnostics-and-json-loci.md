---
id: Task-069
title: "Injected host, diagnostic registry, and JSON source loci"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-492"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-493"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-494"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-495"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-496"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-497"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-498"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-499"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-500"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-501"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-502"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-503"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-504"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-505"
    type: verifies
---
# Task-069: Injected host, diagnostic registry, and JSON source loci

## Scope

The three primitives every later task depends on: the one host through which every read and module load passes, the closed diagnostic registry, and the exact JSON pointer locator.

## Subtasks

- [ ] `src/compiler/host.mjs`: `createHost({ roots, enumerationOrder })` implementing `readFile`, `stat`, `realpath`, `readDir`, `getJsImport`, and `writeFile`, each recording what it did so a test can count it. Every read resolves to a real path and is refused outside `roots`.
- [ ] `src/compiler/diagnostics.mjs`: `DIAGNOSTIC_CODES` frozen over both namespaces, `DEFAULT_LIMITS`, `diagnostic()` with 120-character truncation, `sortDiagnostics()` code-point ordering with no-locus last, `applyDiagnosticLimit()` sorting before truncating.
- [ ] The `agent-ix.semantic-ir.*` half of the registry is transcribed from `fixtures/semantic/v1/negative/reader-cases.json` plus the four codes the #34 reader emits that the cases do not exercise; a test asserts set equality in both directions (TC-503).
- [ ] Every blocking code carries severity `error`; `DIAGNOSTIC_LIMIT_REACHED` is a non-blocking warning; the four size limits are blocking (TC-505).
- [ ] `src/compiler/json-locus.mjs`: `indexJsonPointers`, `locateJsonPointer` with nearest-ancestor fallback, `offsetToPosition`. Tab-indented documents, array elements, and absent pointers are all covered.
- [ ] Author the code-name-as-member-access rule and the static extractor that proves the emitted set equals the registry set; the extractor runs in Task-079 when every module exists.

## Deliverables

- `host.mjs`, `diagnostics.mjs`, `json-locus.mjs`, and their tests.

## Notes

- This is the task SR-066 FND-501, SR-069 FND-561, and SR-069 FND-562 asked for: the injected host is the mechanism that turns three asserted safety properties into observed ones.
