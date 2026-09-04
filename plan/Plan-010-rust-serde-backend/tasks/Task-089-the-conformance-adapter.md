---
id: Task-089
title: "The compatibility classifier, the adapter binary, and the registry slot"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-088"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-698"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-699"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-702"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-703"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-709"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-710"
    type: verifies
---
# Task-089: The compatibility classifier, the adapter binary, and the registry slot

## Scope

Fill the `rust-backend` slot the corpus declares, and run the differential harness against it.

## Subtasks

- [ ] Implement the compatibility classifier over the six dispositions.
- [ ] Write the adapter binary: read the corpus from the working directory, answer every case once, echo the digest, buffer one write, install the panic hook, exit 0.
- [ ] Add the `command` and `status` to the `rust-backend` entry of `conformance/adapters/registry.json`, and change nothing else under `conformance/`.
- [ ] Record the first full corpus run before inspecting any oracle output.
- [ ] Run `make rust-conformance` and reconcile every mismatch by changing this backend, never a case, a base, an expected verdict, the thresholds or the oracle.
- [ ] Assert the negative controls: a removed command returns the slot to 111 unmet, an undeclared `unsupported` answer fails, a missing answer is `missing-answer`, a wrong digest is `case-digest`.

## Deliverables

- `crates/conformance-adapter/`
- the `rust-backend` entry of `conformance/adapters/registry.json`

## Notes

PROV-002's `unsupportedBy` licences an `unsupported` answer and does not require one; the adapter answers it `supported`, so the target is 111 of 111 and the one-divergence budget goes unspent.
