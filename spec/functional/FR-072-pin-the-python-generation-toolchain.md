---
id: FR-072
title: "Pin the Python generation toolchain and enforce its security floor"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: "depends_on"
---
# [FR-072] Pin the Python generation toolchain and enforce its security floor

## Description

This requirement opens the bundle answering
[filament-core-data#23](https://github.com/agent-ix/filament-core-data/issues/23), the qualified Python and
Pydantic generation route.

The repository SHALL record one declared version for every tool that
participates in Python generation, and the advisory gate SHALL refuse any
`datamodel-code-generator` version affected by GHSA-386q-5hp3-95m9 or
GHSA-5578-w22f-pfx9, failing rather than skipping when a declared tool is
absent.

## Inputs

- The pinned constants `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` that [FR-043](./FR-043-govern-the-python-generation-adapter.md) exports from `src/compiler/backends/python-pins.mjs`
- The resolved Python dependency set in `poetry.lock`
- The two published advisories and their first-patched versions

## Outputs

- `python_backend/toolchain.json`: the **declared** pins — generator, Pydantic, msgspec, type checker, and the Python **minor** version — each with the command that reports it
- `python_backend/advisories.json`: the declared advisory floor — advisory id, affected range, first patched version, the vector keys the advisory names, and the forbidden extras
- The pinned `datamodel-code-generator`, `pydantic`, `msgspec`, and `mypy` entries in the `python-backend` Poetry dependency group

## Behavior

- `toolchain.json` SHALL record the generator version `0.76.0` and the Pydantic version `2.12.5`, the two values `python-pins.mjs` already carries, which stays the single authority for both.
- `toolchain.json` SHALL record the Python version as the minor series `3.13` with no patch component and no formatter entry at all, because a patch-level interpreter or formatter reading inside a byte-compared artefact reproduces the issue #42 host coupling that already blocks TC-370 and TC-382.
- The declared profiles SHALL use the generator's dependency-free `builtin` formatter, so that no external formatter version participates in generation at all and there is none to pin, drift, or fingerprint.
- `advisories.json` SHALL carry both advisory ids, and for each the affected range and the first patched version exactly as the advisory publishes them: `>= 0.17.0, <= 0.60.1` first patched `0.60.2` for GHSA-386q-5hp3-95m9, and `>= 0.11.6, <= 0.63.0` first patched `0.64.0` for GHSA-5578-w22f-pfx9.
- The advisory gate SHALL compare the installed version against the declared floor — the greatest of the recorded first-patched versions — by ordered version comparison rather than by string equality, so that a future bump is checked rather than merely different.
- If the installed `datamodel-code-generator` version falls inside either affected range, then the advisory gate SHALL fail naming the advisory, the installed version, and the range.
- The advisory gate SHALL read the installed version from the installed distribution's own metadata rather than from `toolchain.json`, so that a stale record is detected rather than believed.
- If a declared distribution is not installed, then the advisory gate SHALL fail with a provisioning message naming the Poetry group to install, rather than skip.
- The resolved dependency set SHALL contain neither the `http` nor the `httpx2` generator extra, so remote reference fetching has no transport.
- The advisory gate SHALL assert that the installed generator distribution declares the MIT licence and carries its licence text.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-072-CON-1 | The maintainer SHALL NOT lower the declared floor or record a first-patched version other than the one the advisory publishes. | Security | Test |
| FR-072-CON-2 | A version bump SHALL update `toolchain.json`, re-run the qualification of [FR-077](./FR-077-qualify-each-python-output-family.md), and restate every per-family verdict; a bump that changes only the pin is incomplete. This is a human procedure and is verified by review, not by a gate. | Maintainability | Manual |
| FR-072-CON-3 | The pinned upstream stays an attributed MIT dependency whose source is neither vendored, forked, nor re-licensed into this AGPL repository. | Compliance | Test |
| FR-072-CON-4 | No gate in this requirement SHALL be satisfied by a skip, a warning, or a `pytest.skip`; an absent tool is a failure with a provisioning message. | Reliability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-072-AC-1 | The installed `datamodel-code-generator` distribution reports version `0.76.0` and its metadata declares the MIT licence. | Test |
| FR-072-AC-2 | `advisories.json` carries both advisory ids with their published affected ranges and first-patched versions, and the derived floor is `0.64.0`. | Test |
| FR-072-AC-3 | A synthetic installed version inside either affected range fails the gate with a message naming the advisory, the version, and the range. | Test |
| FR-072-AC-4 | A synthetic installed version below the derived floor but outside both published ranges still fails, because the floor is compared by version order. | Test |
| FR-072-AC-5 | With the generator distribution absent, the gate fails with a provisioning message naming the Poetry group; it does not skip and does not pass. | Test |
| FR-072-AC-6 | Every declared version in `toolchain.json` matches the installed distribution it names, comparing the Python entry against the running interpreter's minor series only. | Test |
| FR-072-AC-7 | The resolved dependency set contains no HTTP transport for the generator: neither the `http` nor the `httpx2` extra is present. | Test |
| FR-072-AC-8 | `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` equal the corresponding `toolchain.json` entries and the versions `poetry.lock` resolves, so the merged pin, the record, and the lock cannot drift apart. | Test |
| FR-072-AC-9 | `toolchain.json` carries no patch-level interpreter version and no formatter entry, and no declared profile names an external formatter. | Test |
| FR-072-AC-10 | The vector keys each advisory names are all present in the refusal register of [FR-075](./FR-075-reject-dangerous-generation-inputs.md). | Test |

## Dependencies

- **Upstream**: [FR-043](./FR-043-govern-the-python-generation-adapter.md), [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md)
- **Downstream**: [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-075](./FR-075-reject-dangerous-generation-inputs.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
