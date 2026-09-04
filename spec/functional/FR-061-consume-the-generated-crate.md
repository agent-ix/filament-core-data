---
id: FR-061
title: "Consume the generated crate from compile-time and runtime consumers"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-060"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-061: Consume the generated crate from compile-time and runtime consumers

## Description

The generated crate SHALL be proven consumable by a compile-time consumer that
depends on its static export surface and by a runtime consumer that exchanges
values through it, both built from the packaged artifact rather than from the
generator's working directory, so that "it generates" and "it is usable" are two
separate pieces of evidence.

## Inputs

- A generated crate and its output manifest from
  [FR-056](./FR-056-emit-the-generated-rust-crate.md)
- The corpus bases and the published positive fixtures, as the values exchanged

## Outputs

- `crates/consumer-compile-time/`: a crate that uses the static export surface —
  `SemanticType`, `TYPES`, `FIELDS`, and the identity constants — including at
  least one exhaustive `match` and one `const` assertion over the export count
- `crates/consumer-runtime/`: a crate that deserializes, validates, mutates, and
  re-serializes values, and that asserts rejection for each invalid class
- A `make rust-install-from-artifact` target that packages the generated crate,
  unpacks it into a scratch directory, and builds both consumers against the
  unpacked copy with no path dependency on the generator's tree

## Behavior

### Compile-time consumption

- The compile-time consumer SHALL `match` exhaustively over `SemanticType` with
  no wildcard arm, so a type added to the contract becomes a compile error in
  the consumer rather than a silently unhandled case.
- The consumer SHALL assert at compile time that `TYPES.len()` equals the number
  of generated types, so the export surface is finite and known.
- The consumer SHALL read at least one identity constant, one role, one
  relationship, one operation, and one clause from the generated metadata.

### Runtime consumption

- The runtime consumer SHALL deserialize each positive fixture, assert the
  values it carries, re-serialize, and compare canonically to the input.
- The runtime consumer SHALL assert a rejection, with the expected error, for
  each of: a missing required member, an unknown member on a `reject` type, an
  out-of-range constrained value, a pattern violation, a duplicate item on a
  `unique` collection, a collection below `multiplicity.lower`, an unknown
  closed enum variant, and a required extension the crate does not admit.
- The runtime consumer SHALL show that an unknown member on a `preserve` type
  survives a deserialize–serialize round trip unchanged.

### Install from artifact

- The packaging step SHALL produce the crate artifact from the emitted files
  alone, and the consumers SHALL build against the unpacked artifact with no
  `path` dependency reaching outside the scratch directory.
- The packaging step SHALL NOT publish to any registry, and SHALL run with
  publication disabled, because this issue's safety gate forbids crate
  publication until the cross-language compatibility and release-readiness gates
  pass.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-061-CON-1 | No step of this requirement SHALL contact a package registry, either to publish or to resolve; builds SHALL run offline against the vendored or cached dependency set. | Safety | Inspection and test |
| FR-061-CON-2 | The consumers SHALL depend on the unpacked artifact, not on the generator's output directory, so a build that only works in place is a failure. | Correctness | Inspection |
| FR-061-CON-3 | The exhaustive `match` SHALL carry no wildcard arm, and a test SHALL prove that adding a variant breaks the build. | Correctness | Test |
| FR-061-CON-4 | The consumers SHALL be built with `-D warnings`. | Quality | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-061-AC-1 | `make rust-install-from-artifact` packages the crate, unpacks it into a scratch directory, and builds both consumers offline with `-D warnings`, all with `git status --porcelain` empty afterwards. | Integration |
| FR-061-AC-2 | The compile-time consumer's exhaustive `match` fails to compile when a type is added to the source document, demonstrated by a scripted rehearsal that regenerates from a modified document and asserts the build error. | Test |
| FR-061-AC-3 | The compile-time `const` assertion over `TYPES.len()` fails when the generated type count changes and the assertion is not updated. | Test |
| FR-061-AC-4 | Every positive fixture deserializes, re-serializes, and compares canonically equal to its input. | Test |
| FR-061-AC-5 | Each of the eight named invalid classes is rejected with the expected error type and message content. | Test |
| FR-061-AC-6 | An unknown member on a `preserve` type is byte-identical after a round trip, and is absent from a `reject` type's accepted input space. | Test |
| FR-061-AC-7 | No build step in this requirement reaches the network, verified by running with the network denied and the cargo offline flag set. | Test |
| FR-061-AC-8 | No registry publication occurs, verified by inspection of every invoked command and by the emitted `publish = false`. | Inspection |
| FR-061-AC-9 | The consumers' `Cargo.toml` files contain no `path` dependency resolving outside the scratch directory. | Analysis |

## Dependencies

- **Upstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md)
- **Downstream**: issue #11, issue #7
- **Constrained by**: [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
