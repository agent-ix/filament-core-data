---
id: FR-079
title: "Emit the Python package layout, provenance, and examples"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [FR-079] Emit the Python package layout, provenance, and examples

## Description

The repository SHALL place the generated modules of every demonstrated profile
into a declared package layout carrying provenance, a content fingerprint,
resolved forward references, documentation, and an ordinary import-and-validate
example, and SHALL publish none of it.

## Inputs

- The generated file map and toolchain fingerprint from [FR-076](./FR-076-run-python-generation-sandboxed.md)
- The inspection report of [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md) in `enforce` mode
- The verdicts of [FR-077](./FR-077-qualify-each-python-output-family.md), which decide which profiles are demonstrated
- The generated-target contract of [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md)

## Outputs

- `python_backend/generated/<profile-id>/`: the package tree for each demonstrated profile
- `python_backend/generated/<profile-id>/PROVENANCE.json`: the source identity and digest, the profile id and digest, the toolchain fingerprint, the content fingerprint, the generator version, the upstream MIT attribution, and this repository's licence
- `python_backend/generated/<profile-id>/README.md`: the family, the verdict, the conditions, and what the package does not carry
- `python_backend/examples/<profile-id>.py`: an ordinary consumer that imports the package, constructs a conforming value, serializes it, and rejects a non-conforming one

## Behavior

- The emitter SHALL run the inspection in `enforce` mode before it writes anything under `python_backend/generated/`, so no package that degrades a constraint is ever written and then imported.
- The layout SHALL be one package directory per demonstrated profile, with one module per input document and an `__init__.py`.
- Each `__init__.py` SHALL export a stable, sorted `__all__`, so an added type is a visible diff rather than a re-ordering.
- If two input documents declare the same type name, then the emitter SHALL raise naming both documents and the name, rather than let one shadow the other in `__all__`.
- Each emitted package SHALL import with every forward reference resolved — for the Pydantic families through the generator's own `model_rebuild` — leaving no `PydanticUndefinedAnnotation` and no unresolved `ForwardRef` on any model, where "imports cleanly" means the import completes with no exception and no warning under the declared interpreter.
- `PROVENANCE.json` SHALL record the upstream generator as MIT with its attribution text and the generated source as AGPL-3.0-only, carrying no clock reading and no host-observed version.
- `PROVENANCE.json` SHALL carry the content fingerprint as a required member: the SHA-256 over the package's file map in canonical order, excluding `PROVENANCE.json` itself.
- Each example SHALL run under the repository's own test suite, importing only from the generated package, the standard library, and the family's runtime, and asserting both the accepting and the rejecting path.
- Where a family's verdict is `not-qualified`, the emitter SHALL record the reason under `python_backend/generated/` and write no package for it, so the absence is declared rather than silent.
- The maintainer SHALL add nothing under `python_backend/generated/` to the npm package's `files` or `exports`, to the Python distribution's `packages` or `include`, or to any publication workflow.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-079-CON-1 | No PyPI publication and no backend consumer migration happen here; the safety gate of issue #23 governs both. | Compliance | Analysis |
| FR-079-CON-2 | The maintainer SHALL commit the generated tree as a regenerable, `--check`-verified artefact rather than hand-edit it, because a fingerprint over an uncommitted tree proves nothing on a fresh checkout. | Integrity | Test |
| FR-079-CON-3 | `PROVENANCE.json` SHALL preserve the upstream MIT attribution verbatim rather than replace it with the AGPL header. | Compliance | Test |
| FR-079-CON-4 | The declared layout SHALL be consistent with the merged generated-target contract of FR-024 and FR-005; where it adds a member those requirements do not name, the addition is this change's and issue #11 inherits it as such. | Compatibility | Manual |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-079-AC-1 | Each demonstrated profile has a package directory with one module per input document and an `__init__.py` whose `__all__` is sorted and complete. | Test |
| FR-079-AC-2 | Each generated package imports under the declared interpreter with no exception and no warning, and no model retains an unresolved forward reference. | Integration |
| FR-079-AC-3 | `PROVENANCE.json` carries the source digest, the profile digest, the toolchain fingerprint, the content fingerprint, the MIT attribution, and `AGPL-3.0-only`, and carries no clock reading or host-observed version. | Test |
| FR-079-AC-4 | Regenerating an unchanged input reproduces the committed tree byte-for-byte, and `--check` fails on a mutated committed file. | Snapshot |
| FR-079-AC-5 | Each example runs, constructs a conforming value, round-trips it through serialization, and raises on a non-conforming value. | Integration |
| FR-079-AC-6 | A family whose verdict is `not-qualified` has no emitted package and a recorded reason naming the verdict. | Test |
| FR-079-AC-7 | The npm `files` and `exports`, `pyproject.toml`'s `packages` and `include`, and every file under `.github/` are byte-identical to `origin/main`. | Analysis |
| FR-079-AC-8 | No path under `python_backend/` is reachable from any published package manifest, checked against the packed file list rather than the manifest text alone. | Test |
| FR-079-AC-9 | The content fingerprint changes when any generated byte changes and is identical otherwise. | Property |
| FR-079-AC-10 | An input set with a duplicate type name across two documents raises naming both documents and the name. | Test |
| FR-079-AC-11 | A generated tree carrying a degraded annotation is refused before any file is written under `python_backend/generated/`. | Test |

## Dependencies

- **Upstream**: [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), [NFR-027](../non-functional/NFR-027-reproducible-non-disruptive-python-generation.md)
- **Downstream**: [FR-080](./FR-080-type-check-and-validate-generated-python.md), issue #11
