---
id: FR-131
title: "Wire the spec-bundle frontend to its producer"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: "depends_on"
---
# FR-131: Wire the spec-bundle frontend to its producer

## Description

The `spec-bundle` frontend SHALL produce a semantic IR document by calling the
extraction producer its caller injects, rather than refusing the dialect as
unimplemented.

The extraction is already built, as a Rust workspace member. What was missing is
the wire, and the wire crosses a boundary two published properties defend:
`dialects.mjs` states that no module under `frontend/` may touch `node:fs`, and
[NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md) forbids
every module in that scope from importing a code-executing built-in. Neither is
weakened here. The effect lives in one module outside that scope and the
capability is passed in, which is the answer
[FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) already
made normative for the generation half.

## Inputs

- A `FrontendRequest` naming the `spec-bundle` dialect and a bundle root
- The injected extraction producer, supplied by the caller
- The module roots the bundle's declarations resolve against

## Outputs

- A `FrontendResult` carrying the semantic IR document and its diagnostics
- `src/compiler/extraction.mjs`, the injected producer and the only module in
  the extraction path that starts a child process

## Behavior

- The `spec-bundle` frontend SHALL call the injected producer once per request.
- The `spec-bundle` frontend SHALL return the producer's diagnostics unchanged
  when the producer refuses and names a reason.
- The `spec-bundle` frontend SHALL report a producer that exits non-zero without
  naming a reason as a frontend contract violation.
- The `spec-bundle` frontend SHALL report a producer that exits zero without a
  readable document as a frontend contract violation.
- The `spec-bundle` frontend SHALL NOT report a producer failure under a code
  that names a defect in the bundle.
- The frontend seam SHALL refuse a dialect registered as unimplemented, naming
  the ticket that owns it.
- The frontend seam SHALL accept a substitute registry, so the unimplemented
  refusal is exercisable over a registration of its own.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-131-CON-1 | No module under `src/compiler/frontend/` SHALL import a file-system, process, network or code-executing built-in | Design | Test |
| FR-131-CON-2 | The module that starts the producer SHALL be unreachable by import from the frontend seam | Design | Test |
| FR-131-CON-3 | The producer SHALL NOT inherit the caller's environment, so no ambient variable reaches an emitted document | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-131-AC-1 | The `spec-bundle` dialect is registered as implemented, and the seam routes a request for it to the frontend | Test (TC-1404) |
| FR-131-AC-2 | A request whose producer returns a document yields that document and its diagnostics | Test (TC-1405) |
| FR-131-AC-3 | A request naming no bundle root is refused with `INVALID_REQUEST` and no producer call | Test (TC-1406) |
| FR-131-AC-4 | A producer exiting non-zero with no diagnostic yields exactly `FRONTEND_CONTRACT_VIOLATION`, carrying the producer's error output | Test (TC-1403) |
| FR-131-AC-5 | A producer exiting zero with no readable document yields exactly `FRONTEND_CONTRACT_VIOLATION`, and a producer that refuses with a reason has its own diagnostics forwarded unchanged | Test (TC-1403) |
| FR-131-AC-6 | A dialect registered as unimplemented is refused with `FRONTEND_NOT_IMPLEMENTED` naming its owner, exercised over a synthetic registration rather than over whichever dialect is unbuilt today | Test (TC-1407) |
| FR-131-AC-7 | No module under `src/compiler/frontend/` imports a process-starting built-in, and `extraction.mjs` is unreachable from the frontend seam | Test (TC-1408) |
| FR-131-AC-8 | A request supplying no producer raises rather than returning a diagnostic, because an absent capability is a defect in the calling program | Test (TC-1409) |
| FR-131-AC-9 | One markdown bundle lifted by the producer reaches generated files in every declared target, and every target reports the same IR fingerprint from that single lift | Test (TC-1586) |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md) the seam and its dialect registry; [US-015](../usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md) lifting a spec bundle
- **Downstream**: [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md) cross-frontend parity, whose two halves become reachable from one seam
