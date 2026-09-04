---
id: Task-064
title: "Spike rewiring, lockfile seeding, and the declared evidence delta"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-062"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-044"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-370"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-371"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-372"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-373"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-374"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-375"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-376"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-377"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-378"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-380"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-381"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-382"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-387"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-397"
    type: verifies
---
# Task-064: Spike rewiring, lockfile seeding, and the declared evidence delta

## Scope

Point the frozen spike at the promoted compiler, remove the `file:` dependency, and change exactly one retained byte range.

## Subtasks

- [ ] Rewrite `spikes/typespec-feasibility/scripts/run-experiment.mjs` to import the promoted backends and shell `src/compiler/cli.mjs`, stamping `@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0` so the retained IR stays byte-identical.
- [ ] Delete `spikes/typespec-feasibility/emitter/`; drop the dependency from both `package.json` files; regenerate `pnpm-lock.yaml` and confirm no `file:`/`link:` specifier survives.
- [ ] Seed the committed `Cargo.lock` into each generated Rust package before `cargo check --offline --locked`; make `--check` mode fail rather than generate when the committed lockfile is absent.
- [ ] Apply the declared delta: the `command` field of `evidence/custom.json`. Nothing else under `generated/`, `evidence/`, or `report.md` changes.
- [ ] Add the `## Retained evidence` note to `docs/semantic-data-system/typespec-feasibility.md` and the one-paragraph NFR-006 amendment (TC-381, TC-397).
- [ ] Prove zero publications and mutations with a changed-path check over `git diff origin/main...HEAD`, not by reading `validation.json`'s literals (TC-380).

## Deliverables

- A spike that replays through owned code and a one-field evidence delta.

## Notes

- TC-370 and TC-382 stay blocked on issue #42: the retained evidence records the minting host's node, rustc and Python versions, and the generated Python models need Python >= 3.11. Neither is repaired here, because repairing them means rewriting retained evidence on a host that cannot run the pipeline.
- The lockfile seeding is a strengthening fix and changes no committed byte.
