---
id: Task-139
title: "Shared identity rule implementation and evidence"
type: Task
status: done
track: A
priority: P0
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-034", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-053", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-093", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-094", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-095", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-096", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-098", type: references }
  - { target: "ix://agent-ix/filament-core-data/TC-1223", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1241", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1251", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1252", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1271", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1290", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1291", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1347", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1351", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1352", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1353", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1354", type: verifies }
---
# Task-139: Shared identity rule implementation and evidence

## Scope

Implement the shared, case-preserving identity contract in the extraction frontend; preserve the TypeSpec source while evaluating it through a common table; add duplicate-identity refusal, live parity, and regenerated evidence.

## Subtasks

- [x] Align extraction identity, alias, parameter, and diagnostic-code minting with the contract.
- [x] Detect duplicate admitted semantic identities with both loci.
- [x] Add the shared identity table and Node harness verb; test both implementations from the same rows.
- [x] Make the shared two-dialect parity rows live and regenerate goldens and diagnostics registry evidence.

## Deliverables

- `identity.rs`, `lower.rs`, diagnostics registry, negative duplicate fixture and goldens.
- `identity-cases.json`, the harness verb, Rust table test and live parity tests.

## Notes

- The #92 historical changed-path gates are intentionally not modified by this task.
