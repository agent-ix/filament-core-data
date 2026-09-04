---
id: Task-049
title: "Base bundles, the patch dialect, the manifest, and digests"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-048"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-280"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-281"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-282"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-283"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-284"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-285"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-286"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-287"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-288"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-289"
    type: verifies
---
# Task-049: Base bundles, the patch dialect, the manifest, and digests

## Scope

Land the shared base bundles, the RFC 6902 patch dialect with the `x-repeat` extension and the `test`-op rule, the corpus manifest with raw-byte digests, and the corpus loader every later task reads through.

## Subtasks

- [x] Author the base bundles under `conformance/bases/` and prove each validates and yields zero oracle diagnostics.
- [x] Implement `applyPatch` with `add`, `remove`, `replace`, `copy`, `move`, `test`, and `x-repeat`, failing loudly on an unresolvable path or a failed `test`.
- [x] Implement the corpus manifest builder: per-case and per-base raw-byte digests, `corpusDigest`, and the case index in a fixed order.
- [x] Implement the corpus gates: minimization budget, `test`-op rule, blessing ban, provenance quote check, id pattern, family directory, defect-case deletion, and the SemVer bump rule.
- [x] Prove a flipped byte in one case file fails and names that file.

## Deliverables

- `conformance/bases/*.json`
- `conformance/oracle/json.mjs`
- `conformance/corpus.json`
- `conformance/corpus.mjs` loader and gates

## Notes

- Digests are over raw file bytes, not canonical bytes, so a one-byte edit is detectable (SR-050 FND-258).
- The `test`-op rule stops a base edit silently re-aiming a positional patch (SR-050 FND-257).
