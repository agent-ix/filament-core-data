---
id: FR-080
title: "Type-check and runtime-validate every generated Python surface"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: "depends_on"
---
# [FR-080] Type-check and runtime-validate every generated Python surface

## Description

The gate SHALL type-check every generated Python surface statically and
exercise every surface declared to validate at run time, against conforming and
non-conforming values drawn from the contract, so that a surface which
type-checks but accepts invalid data is caught.

## Inputs

- The emitted packages of [FR-079](./FR-079-emit-the-python-package-layout.md)
- The qualification verdicts of [FR-077](./FR-077-qualify-each-python-output-family.md)
- The representative payload fixtures the repository already carries

## Outputs

- A pinned `mypy` configuration scoped to the generated tree and the examples
- `python_backend/qualification/validation.json`: per profile and per generated type, the conforming and non-conforming values exercised and the outcome

## Behavior

- Static type checking SHALL run over every generated module and every example, under `strict` settings, with no per-file ignore and no `type: ignore` comment in generated or example source.
- The gate SHALL run the type checker at the exact version `toolchain.json` records, failing rather than skipping when it is absent.
- The gate SHALL exercise every generated type in a validating family with at least one conforming value and at least one non-conforming value per constraint the qualification records that family as retaining.
- The gate SHALL fail, naming the type, the field, and the constraint, when the family's own runtime — Pydantic validation for the two Pydantic families, `msgspec` decoding for `msgspec.Struct` — accepts a value the contract forbids.
- `validation.json` SHALL record a family the qualification finds non-validating — stdlib dataclass and `TypedDict` — as non-validating and covered by static checking only, never as runtime-covered.
- The gate SHALL assert, for every constraint a family is recorded as losing, that the generated surface really does accept the value the contract forbids, so the recorded verdict is falsifiable rather than asserted.
- The coverage account SHALL state, per profile, the number of generated types, the number exercised, and the number of constraints exercised, failing when any generated type in a validating family is unexercised.
- Every test in this requirement SHALL run rather than skip, reporting an absent tool as a failure with a provisioning message.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-080-CON-1 | The maintainer SHALL NOT add a `type: ignore`, an `Any` cast, or a mypy per-module override to reach green; a type the checker rejects is a qualification finding. | Integrity | Branch diff and gate |
| FR-080-CON-2 | The coverage account SHALL NOT count a skipped test, because the suite fails with a provisioning message instead of skipping. | Reliability | Falsification test |
| FR-080-CON-3 | The author SHALL derive the non-conforming values from the contract's constraints rather than from what the generated code happens to reject. | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-080-AC-1 | The pinned type checker reports zero errors over every generated module and every example under strict settings. | Static |
| FR-080-AC-2 | No generated or example source contains a `type: ignore` comment or a per-module checker override. | Test |
| FR-080-AC-3 | Every generated type in a validating family is exercised with at least one conforming and one non-conforming value; an unexercised type fails the gate. | Test |
| FR-080-AC-4 | For each constraint a family retains, a non-conforming value is rejected by that family's runtime, naming the constraint. | Test |
| FR-080-AC-5 | For each constraint a family is recorded as losing, a test asserts the generated surface accepts the forbidden value, so the verdict is falsifiable. | Test |
| FR-080-AC-6 | `validation.json` records the non-validating families as non-validating, and the coverage account never counts them as runtime-covered. | Test |
| FR-080-AC-7 | With the type checker absent, the gate fails with a provisioning message naming the dependency group; it does not skip. | Test |
| FR-080-AC-8 | The suite contains zero skipped tests for this requirement, asserted from the run's own report rather than by inspection. | Test |
| FR-080-AC-9 | A deliberately weakened generated constraint — a pattern removed from one generated model — makes the runtime validation gate red. | Test |

## Dependencies

- **Upstream**: [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-079](./FR-079-emit-the-python-package-layout.md)
- **Downstream**: issue #11
