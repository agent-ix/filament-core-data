---
id: Task-078
title: "Determinism, safety, and non-disruption gates"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-567"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-568"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-569"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-570"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-571"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-572"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-573"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-574"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-575"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-576"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-577"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-578"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-579"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-580"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-581"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-582"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-583"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-584"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-585"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-586"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-587"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-588"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-589"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-590"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-591"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-592"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-593"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-594"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-595"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-596"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-597"
    type: verifies
---
# Task-078: Determinism, safety, and non-disruption gates

## Scope

The cross-cutting gates over the finished tree, and the two published documents.

## Subtasks

- [ ] Determinism: repeat runs, a changed working directory, `TZ`/`LANG`/`LC_ALL` variation, two search-path permutations, two injected enumeration orders, two `Intl.Collator` locales, a simulated `\` separator, and the ambient-token scan.
- [ ] Observation: count every read and module load the injected host did not see across a full fixture compile, and assert zero.
- [ ] Safety: the four size limits at and past their boundaries, `PATH_ESCAPE` through `..` and a symlink, `UNTRUSTED_MODULE` through `getJsImport`, the module-graph network check plus a stubbed `fetch`, the writer inventory, five cyclic shapes, a 512-mutation fuzz run, and message truncation.
- [ ] Non-disruption: `git diff --no-renames` against `origin/main` for the permitted and prohibited path sets, the `package.json` metadata comparison, the frozen prototype and issue #4 golden byte comparison, `conformance/` untouched, the scripted restore rehearsal, licence inspection, and the publication check.
- [ ] Publish `docs/semantic-data-system/compiler-diagnostics.md` (every code with its severity, blocking disposition, owner, and the five limit defaults) and `docs/semantic-data-system/ir-compatibility-policy.md` (the four evolution rules and the disposition rank), each with a test that fails when the document and the code disagree.

## Deliverables

- The gate tests and the two published documents.

## Notes

- SR-069 FND-560: two runs in one process is not evidence for a cross-host claim. Every input a second host would vary is varied here.
