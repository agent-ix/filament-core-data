---
id: Task-071
title: "Package graph resolution and the fixture package corpus"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-456"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-457"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-458"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-459"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-460"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-461"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-462"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-463"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-464"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-465"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-466"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-467"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-468"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-469"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-470"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-471"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-472"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-473"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-474"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-475"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-476"
    type: verifies
---
# Task-071: Package graph resolution and the fixture package corpus

## Scope

Resolve a root manifest and its transitive imports into one ordered graph, reporting every defect at the position that declared it, and build the package corpus the rest of the plan runs on.

## Subtasks

- [ ] `src/compiler/packages/manifest.mjs`: read and schema-validate a manifest, mapping, or profile through the injected host, returning its text, digest, and pointer index.
- [ ] `src/compiler/packages/resolve.mjs`: candidate discovery over the declared search directories, exact and caret constraint satisfaction, highest-satisfying selection with the declared-order tie-break, digest conflict, export and capability checks, depth-first cycle detection by back edge from the least identity, duplicate exports, profile/mapping/target selection, and the strict-posture loss check.
- [ ] Every diagnostic carries a locus from `json-locus`, with `sourceIdentity` and a `..`-free relative path, including for a document inside an imported package.
- [ ] `fixtures/compiler/packages/**`: the `assurance` package exercising every structural-kind row, plus one concrete tree per case of `fixtures/semantic/v1/package-graph-cases.json` and one per named diagnostic. That file stays byte-unchanged and is read only as the case index.
- [ ] Bound the resolution by `maxNodes`, `maxInputBytes`, and `maxDepth`.

## Deliverables

- `manifest.mjs`, `resolve.mjs`, the fixture package corpus, and their tests.

## Notes

- SR-066 FND-506, SR-068 FND-542, and SR-072 FND-621: the published case file is a description; the executable trees are this task's output and live where this ticket is allowed to write.
