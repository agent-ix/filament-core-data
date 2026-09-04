---
id: FR-079
title: "Emit the Python package layout, provenance, and examples"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
---
# [FR-079] Emit the Python package layout, provenance, and examples

## Description

The repository SHALL place the generated modules into a declared package layout
carrying provenance, a content fingerprint, resolved forward references,
documentation, and an ordinary import-and-validate example per demonstrated
family — and SHALL NOT publish any of it.

## Inputs

- The generated file map and fingerprint from [FR-076](./FR-076-run-python-generation-sandboxed.md)
- The inspection report from [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md)
- The generated-target contract of [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md)

## Outputs

- `python_backend/generated/<profile-id>/`: the package tree for each demonstrated profile
- `python_backend/generated/<profile-id>/PROVENANCE.json`: the source schema identity and digest, the profile id and digest, the toolchain fingerprint, the generator version, the upstream licence attribution, and this repository's licence
- `python_backend/generated/<profile-id>/README.md`: what the package is, which family it is, what its verdict is, and what it does not carry
- `python_backend/examples/<profile-id>.py`: an ordinary consumer that imports the package, constructs a conforming value, serializes it, and rejects a non-conforming one

## Behavior

- The layout SHALL be one package directory per profile, with one module per input schema document and an `__init__.py` that re-exports every public symbol.
- Each `__init__.py` SHALL export a stable, sorted `__all__`, so an added type is a visible diff rather than a re-ordering.
- Each emitted package SHALL import with every forward reference resolved — for Pydantic families through the generator's own `model_rebuild` — leaving no `PydanticUndefinedAnnotation` and no unresolved `ForwardRef` on any model.
- `PROVENANCE.json` SHALL record the upstream generator as MIT with its attribution text and the generated source as AGPL-3.0-only, carrying no clock reading other than the source schema's own declared provenance.
- The content fingerprint SHALL be the SHA-256 over the package's file map in canonical order, reproduced exactly when an unchanged input is regenerated.
- Each example SHALL run under the repository's own test suite, importing only from the generated package, the standard library, and the family's runtime, and asserting both the accepting and the rejecting path.
- Where a family's verdict is `not-qualified`, the emitter SHALL record the reason and write no package for it, so the absence is declared rather than silent.
- The maintainer SHALL add nothing under `python_backend/generated/` to the npm package's `files` or `exports`, to the Python distribution's `packages` or `include`, or to any publication workflow.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-079-CON-1 | No PyPI publication and no backend consumer migration happen here; the safety gate of issue #23 governs both. | Compliance | Branch diff and packaging test |
| FR-079-CON-2 | The maintainer SHALL commit the generated tree as a regenerable, `--check`-verified artefact rather than hand-edit it, because a fingerprint over an uncommitted tree proves nothing on a fresh checkout. | Integrity | `--check` gate |
| FR-079-CON-3 | `PROVENANCE.json` SHALL preserve the upstream MIT attribution verbatim rather than replace it with the AGPL header. | Compliance | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-079-AC-1 | Each demonstrated profile has a package directory with one module per input document and an `__init__.py` whose `__all__` is sorted and complete. | Test |
| FR-079-AC-2 | Each generated package imports cleanly under the pinned interpreter, with no unresolved forward reference on any model. | Test |
| FR-079-AC-3 | `PROVENANCE.json` carries the source digest, the profile digest, the toolchain fingerprint, the MIT attribution for the generator, and `AGPL-3.0-only` for the generated source. | Test |
| FR-079-AC-4 | Regenerating an unchanged input reproduces the committed tree byte-for-byte, and `--check` fails on a mutated committed file. | Snapshot |
| FR-079-AC-5 | Each example runs, constructs a conforming value, round-trips it through serialization, and raises on a non-conforming value. | Integration |
| FR-079-AC-6 | A profile whose verdict is `not-qualified` has no emitted package and a recorded reason. | Test |
| FR-079-AC-7 | The npm `files` and `exports` lists, `pyproject.toml`'s `packages` and `include`, and every publication workflow are unchanged from `origin/main`. | Analysis |
| FR-079-AC-8 | No path under `python_backend/generated/` is reachable from any published package manifest. | Test |
| FR-079-AC-9 | The content fingerprint changes when any generated byte changes and is stable otherwise. | Property |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md)
- **Downstream**: [FR-080](./FR-080-type-check-and-validate-generated-python.md), issue #11
