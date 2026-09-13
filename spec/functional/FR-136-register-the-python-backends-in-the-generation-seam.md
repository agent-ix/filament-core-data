---
id: FR-136
title: "Register the Python backends in the generation seam"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-019"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
---
# FR-136: Register the Python backends in the generation seam

## Description

The generation seam SHALL route a `python-pydantic-v2` or `python-dataclass`
target request to the Python backend and return its generated package, rather
than refusing either target as unimplemented.

[FR-063](./FR-063-declare-the-generation-backend-seam.md) states the mechanism a
registration replaces, and
[FR-130](./FR-130-register-the-rust-backend-in-the-generation-seam.md) is the
same replacement for `rust`. Python is the last declared target still reachable
only through a private command, which is what this requirement retires.

Two properties make this a route rather than a second implementation, and both
are stated because neither is obvious:

The generator is a Python program, so the path crosses a process boundary.
[ADR-0006](../../docs/semantic-data-system/adr/0006-frontend-host-boundary.md)
already settles that boundary: the effect is injected, one module outside the
pure set holds it, and the consumer never learns a process is involved. This
requirement adopts that decision rather than opening it again, which is why a
caller that injects no producer is refused instead of being served an empty
package.

The backend generates from JSON Schema, not from the IR. That is the shape of
the dependency and not a convenience — `datamodel-code-generator` reads JSON
Schema, so the IR reaches Python through the `json-schema` target's own
emission. The consequence is the point: there is no second lowering that could
drift from the one a `json-schema` consumer receives.

## Inputs

- A `compiler-request.schema.json` document carrying a semantic IR document
- The selected target name, one of `python-pydantic-v2` or `python-dataclass`
- The caller's injected host, through which repository artifacts are read
- The caller's injected producer, which runs the Python generator

## Outputs

- An `output-manifest.schema.json` document naming the Python backend's identity
- The generated package's files, each path relative to the request's output root
- `src/compiler/backends/python-v1/index.mjs`, the backend's contract with the
  seam, carrying no file-system and no child-process import
- `src/compiler/backends/python-v1/produce.mjs`, the one module that starts the
  generator's process, imported by the command line and by no backend
- `python_backend/runner/seam.py`, the generator's side of that boundary

## Behavior

- The generation seam SHALL select the Python backend when the caller names
  either Python target.
- The Python backend SHALL run the generator under the immutable profile its
  target declares in `python_backend/profiles.json`, and SHALL NOT restate that
  profile's settings.
- The Python backend SHALL hand the generator the `json-schema` target's own
  emitted documents, under the names that emission gave them.
- The Python backend SHALL report a lowering refusal unchanged, rather than
  restating it in a second vocabulary.
- The Python backend SHALL refuse when no producer is injected, and SHALL NOT
  return an empty file set in its place.
- The Python backend SHALL report a producer that cannot run, exits non-zero, or
  answers with something other than a file map as a failed generation.
- The Python backend SHALL NOT start a child process directly when generating
  through the seam.
- The command-line entry point SHALL inject the repository's producer when the
  caller selects a Python target.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-136-CON-1 | The files generated through the seam SHALL be byte-identical to the package the runner's own entry point generates from the same schema documents | Integrity | Test |
| FR-136-CON-2 | The module the seam imports SHALL import no file-system and no child-process module, so registering a backend leaves the seam pure for every target | Design | Inspection |
| FR-136-CON-3 | The schema documents handed to the generator SHALL be the `json-schema` target's own bytes under its own names, so no rename can break a `$ref` that resolved before it | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-136-AC-1 | Both Python targets are registered as implemented and name this requirement's backend identity | Test (TC-1530) |
| FR-136-AC-2 | A `python-pydantic-v2` request over an accepted IR document returns state `success` with a non-empty file set and zero blocking diagnostics | Test (TC-1531) |
| FR-136-AC-3 | A `python-dataclass` request over the same document returns state `success` under its own profile | Test (TC-1532) |
| FR-136-AC-4 | A request with no injected producer returns state `unavailable` carrying `BACKEND_CONTRACT_VIOLATION`, and no files | Test (TC-1533) |
| FR-136-AC-5 | A producer that exits non-zero returns state `invalid` carrying `BACKEND_CONTRACT_VIOLATION` naming the profile, and no files | Test (TC-1534) |
| FR-136-AC-6 | The documents handed to the producer are the `json-schema` target's own documents under its own names, with its manifest excluded | Test (TC-1535) |
| FR-136-AC-7 | The module the seam imports for the Python backend names no file-system and no child-process module | Test (TC-1536) |

## Dependencies

- **Upstream**: [US-019](../usecase/US-019-reach-every-generated-target-through-one-seam.md) reaching every target through one seam; [FR-063](./FR-063-declare-the-generation-backend-seam.md) the seam and its registry
- **Downstream**: [FR-132](./FR-132-answer-the-conformance-corpus-from-python.md) the Python surface the corpus already exercises, unchanged by this requirement
