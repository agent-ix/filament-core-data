---
id: FR-072
title: "Pin the Python generation toolchain and enforce its security floor"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: "depends_on"
---
# [FR-072] Pin the Python generation toolchain and enforce its security floor

## Description

The repository SHALL record one exact version for every tool that participates
in Python generation, SHALL refuse any `datamodel-code-generator` version
affected by GHSA-386q-5hp3-95m9 or GHSA-5578-w22f-pfx9, and SHALL fail the gate
rather than skip it when a pinned tool is absent.

## Inputs

- The pinned constants `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` that [FR-043](./FR-043-govern-the-python-generation-adapter.md) exports from `src/compiler/backends/python-pins.mjs`
- The resolved Python dependency set in `poetry.lock`
- The two published advisories and their first-patched versions

## Outputs

- `python_backend/toolchain.json`: the recorded generator, interpreter, Pydantic, msgspec, formatter, type-checker, and adapter versions, each with the command that reports it
- `python_backend/advisories.json`: the declared advisory floor — advisory id, affected range, first patched version, and the pinned version's disposition
- The pinned `datamodel-code-generator`, `pydantic`, `msgspec`, `mypy`, `black`, and `isort` entries in the `python-backend` dependency group

## Behavior

- `toolchain.json` SHALL record the generator version `0.76.0` and the Pydantic version `2.12.5`, the two values `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` already carry.
- `advisories.json` SHALL carry both advisory ids, and for each the affected range and the first patched version exactly as the advisory publishes them: `>= 0.17.0, <= 0.60.1` first patched `0.60.2` for GHSA-386q-5hp3-95m9, and `>= 0.11.6, <= 0.63.0` first patched `0.64.0` for GHSA-5578-w22f-pfx9.
- The advisory gate SHALL compare the installed version against the declared floor — the greatest of the recorded first-patched versions — by ordered version comparison rather than by string equality, so that a future bump is checked rather than merely different.
- If the installed `datamodel-code-generator` version falls inside either affected range, then the gate SHALL fail naming the advisory, the installed version, and the range.
- The gate SHALL read the installed version from the installed distribution's own metadata, not from `toolchain.json`, so that a stale record is detected rather than believed.
- If the generator distribution is not installed, then the advisory gate SHALL fail with a provisioning message naming the dependency group to install, rather than skip.
- The `datamodel-code-generator[http]` extra SHALL NOT appear in the resolved dependency set, so remote reference fetching has no transport.
- The advisory gate SHALL assert that the installed distribution declares the MIT licence and carries its licence text.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-072-CON-1 | The maintainer SHALL NOT lower the declared floor or record a first-patched version other than the one the advisory publishes. | Security | Gate and branch diff |
| FR-072-CON-2 | A version bump SHALL update `toolchain.json`, re-run the qualification of [FR-077](./FR-077-qualify-each-python-output-family.md), and restate every per-family verdict; a bump that changes only the pin is incomplete. | Maintainability | Upgrade procedure inspection |
| FR-072-CON-3 | The pinned upstream stays an attributed MIT dependency; its source SHALL NOT be vendored, forked, or re-licensed into this AGPL repository. | Compliance | Inspection |
| FR-072-CON-4 | The gate SHALL NOT be satisfied by a skip, a warning, or a `pytest.skip`; an absent tool is a failure with a provisioning message. | Reliability | Falsification test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-072-AC-1 | The installed `datamodel-code-generator` distribution reports version `0.76.0` and its metadata declares the MIT licence. | Test |
| FR-072-AC-2 | `advisories.json` carries both advisory ids with their published affected ranges and first-patched versions, and the derived floor is `0.64.0`. | Test |
| FR-072-AC-3 | A synthetic installed version inside either affected range fails the gate with a message naming the advisory, the version, and the range. | Test |
| FR-072-AC-4 | A synthetic installed version below the derived floor but outside both published ranges still fails, because the floor is compared by version order. | Test |
| FR-072-AC-5 | With the generator distribution absent, the gate fails with a provisioning message naming the dependency group; it does not skip and does not pass. | Test |
| FR-072-AC-6 | Every version in `toolchain.json` equals the version its recorded command reports on the running host, so a stale record fails. | Test |
| FR-072-AC-7 | The resolved dependency set contains no HTTP transport for the generator: neither the `http` nor the `httpx2` extra is present. | Test |
| FR-072-AC-8 | `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` agree with `toolchain.json` and with the resolved lock, so the Node and Python halves cannot drift apart. | Test |

## Dependencies

- **Upstream**: [FR-043](./FR-043-govern-the-python-generation-adapter.md)
- **Downstream**: [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
