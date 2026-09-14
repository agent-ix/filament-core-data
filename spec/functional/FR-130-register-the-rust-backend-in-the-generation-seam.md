---
id: FR-130
title: "Register the Rust backend in the generation seam"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-019"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
---
# FR-130: Register the Rust backend in the generation seam

## Description

The generation seam SHALL route a `rust` target request to the Rust/Serde
backend and return its generated files, rather than refusing the target as
unimplemented.

[FR-063](./FR-063-declare-the-generation-backend-seam.md) already
states the mechanism: a target with no implementation is registered rather than
absent, and "a later ticket registers its own backend by replacing its entry
here". This requirement is that replacement for `rust`, and it states the two
properties that make the replacement a route rather than a second
implementation — the bytes agree with the backend's own command, and the request
names the backend that will answer it.

## Inputs

- A `compiler-request.schema.json` document carrying a semantic IR document
- The selected target name
- The caller's injected host, through which repository artifacts are read

## Outputs

- An `output-manifest.schema.json` document naming the Rust backend's identity
- The generated crate's files, each path relative to the request's output root
- `src/compiler/backends/rust-serde/backend.mjs`, the backend's contract with
  the seam, carrying no file-system import

## Behavior

- The generation seam SHALL select the Rust backend when the caller names the
  `rust` target.
- The Rust backend SHALL expose the identity, version, supported contract
  versions, supported features and generate members the seam requires.
- The Rust backend SHALL return every generated file with a path relative to the
  request's declared output root.
- The Rust backend SHALL read the repository artifacts its generated crate
  carries through the host the caller injects.
- The Rust backend SHALL NOT reach the file system directly when generating
  through the seam.
- The command-line entry point SHALL build the request's backend descriptor from
  the target the caller selected.
- The generation seam SHALL continue to refuse each target that has no
  implementation, naming the ticket that owns it.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-130-CON-1 | The files generated through the seam SHALL be byte-identical to the files the Rust backend's own command generates from the same document | Integrity | Test |
| FR-130-CON-2 | The module the seam imports SHALL import no file-system module, so registering a backend leaves the seam pure for every target | Design | Inspection |
| FR-130-CON-3 | The Rust backend SHALL accept contract version 1.1.0 only through the seam, so the frozen prototype document that also calls itself 1.0.0 stays unreachable by the contract path | Interface | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-130-AC-1 | A `rust` target request over an accepted IR document returns state `success` with a non-empty file set and zero blocking diagnostics | Test (TC-1388) |
| FR-130-AC-2 | The returned manifest names the Rust backend's own identity, not the TypeScript backend's | Test (TC-1389) |
| FR-130-AC-3 | Generating one document through the seam and through the backend's own command yields byte-identical files at every path | Test (TC-1390) |
| FR-130-AC-4 | The generated crate's rendered generator identity names the Rust backend when the caller selected the `rust` target | Test (TC-1391) |
| FR-130-AC-5 | A target with no implementation still returns state `unavailable` carrying `BACKEND_NOT_IMPLEMENTED` and the owning ticket | Test (TC-1392) |
| FR-130-AC-6 | A `rust` request whose IR declares contract version 1.0.0 returns state `unsupported` naming the versions the backend declares | Test (TC-1393) |
| FR-130-AC-7 | A `rust` request generated with no injected host returns a diagnostic rather than reading the repository, and writes no file | Test (TC-1394) |
| FR-130-AC-8 | The module the seam imports for the Rust backend names no file-system module | Test (TC-1395) |

## Dependencies

- **Upstream**: [US-019](../usecase/US-019-reach-every-generated-target-through-one-seam.md) reaching every target through one seam; [FR-063](./FR-063-declare-the-generation-backend-seam.md) the seam and its registry
- **Downstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md) the crate the backend emits, unchanged by this requirement
