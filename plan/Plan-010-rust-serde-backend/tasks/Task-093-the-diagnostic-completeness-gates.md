---
id: Task-093
title: "The diagnostic completeness gates and the rendered documentation"
type: Task
status: done
track: D
priority: P1
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-092"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-692"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-693"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-694"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-695"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-696"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-697"
    type: verifies
---
# Task-093: The diagnostic completeness gates and the rendered documentation

## Scope

Close FR-058's completeness criteria, which quantify over every module the slice has by now landed.

## Subtasks

- [x] Assert every registry code is raised by a constructed input and every code is reachable from a live path.
- [x] Assert the three-defect single run, the declared/undeclared loss split, and the locale- and traversal-independent ordering.
- [x] Run the degradation scan against `mapping-table.json` over every base, and prove it fails under an injected substitution.
- [x] Render `docs/semantic-data-system/rust-backend.md` and `rust-backend-diagnostics.md` from the table and the registry, with `--check`.
- [x] Assert every code named anywhere in the bundle — prose, ERR row, EC row — is a member of one of the two declared sets.
- [x] Record GAP-002's answer, GAP-011's dependency, the unspent divergence budget, and the union and locus-path divergences in the rendered document.
- [x] Run the falsification: revert the `UNSUPPORTED_PATTERN` refusal branch and confirm a test fails.

## Deliverables

- `scripts/build-rust-backend-docs.mjs`
- `docs/semantic-data-system/rust-backend.md`
- `docs/semantic-data-system/rust-backend-diagnostics.md`
