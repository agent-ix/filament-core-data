---
id: FR-061
title: "Consume the generated crate from compile-time and runtime consumers"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-059"
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
- The canonical form and the retained-bytes rule of
  [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md) and
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md)
- The corpus bases and the published positive fixtures, as the values exchanged
- The offline dependency supply: a cargo cache or vendor directory that already
  holds `serde` and `serde_json` at the pinned exact versions, together with
  `serde`'s own transitive crates

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

### The dependency set

- The consumer crates SHALL depend on the generated crate and on `serde_json`
  at a pinned exact version declared as a `[dev-dependencies]` entry, and on
  nothing else. `serde_json` is the JSON front door the runtime consumer feeds
  the generated crate through; it is a test-time dependency of the consumers
  and never a runtime dependency of the generated crate.
- `crates/semantic-ir` and `crates/conformance-adapter` SHALL declare no
  dependency at all, so the independent reader stays independent of the
  serialization stack it is compared against.
- Every crate manifest this requirement adds SHALL carry `publish = false`, as
  [FR-056](./FR-056-emit-the-generated-rust-crate.md) states for the manifest
  set as a whole.
- `serde` and `serde_json` are the two third-party crates this work uses; both
  are attributed in `THIRD-PARTY-NOTICES.md` under
  [FR-056](./FR-056-emit-the-generated-rust-crate.md).

### The offline supply

- The cargo cache or vendor directory named in the Inputs SHALL already hold
  `serde` and `serde_json` at the pinned exact versions, and `serde`'s
  transitive crates, before any step of this requirement runs. No step
  populates it by reaching a registry.
- `Cargo.lock` SHALL be committed, so the first resolve on a clean checkout is
  reproducible and a resolve that would change it is a visible diff rather than
  a silent network fetch.

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
  values it carries, re-serialize, and compare the result to the input under the
  canonical form
  [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md) declares.
- The round-trip obligation SHALL be canonical equality under that form. Byte
  identity SHALL be asserted only for a value whose source bytes the crate
  retained — a `NumberLexeme`'s source text and a `SemanticValue::Object`'s
  member order and repeated names, as
  [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md) states.
  The consumer SHALL NOT assert a byte-identical round trip of arbitrary JSON,
  because a value the crate did not retain the bytes of has no byte to compare.
- The runtime consumer SHALL assert a rejection, with the expected error, for
  each of: a missing required member, an unknown member on a `reject` type, an
  out-of-range constrained value, a pattern violation, a duplicate item on a
  `unique` collection, a collection below `multiplicity.lower`, an unknown
  closed enum variant, and a required extension the crate does not admit.
- The runtime consumer SHALL show that an unknown member on a `preserve` type
  survives a deserialize–serialize round trip: canonically equal under the
  declared form, and byte-identical in the retained members the crate holds
  source bytes for.

### Install from artifact

- The packaging step SHALL be exactly `cargo package --offline --no-verify`,
  and the consumers SHALL build against the unpacked artifact with no `path`
  dependency reaching outside the scratch directory.
- The packaging step SHALL NOT invoke `cargo publish`, and SHALL pass no
  `--registry`, no `--index`, and no publish `--dry-run`, because this issue's
  safety gate forbids crate publication until the cross-language compatibility
  and release-readiness gates pass, and a dry-run publish still contacts an
  index.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-061-CON-1 | No step of this requirement SHALL contact a package registry, either to publish or to resolve; builds SHALL run offline against the vendored or cached dependency set. | Safety | Inspection and test |
| FR-061-CON-2 | The consumers SHALL depend on the unpacked artifact, not on the generator's output directory, so a build that only works in place is a failure. | Correctness | Inspection |
| FR-061-CON-3 | The exhaustive `match` SHALL carry no wildcard arm, and a test SHALL prove that adding a variant breaks the build. | Correctness | Test |
| FR-061-CON-4 | The consumers SHALL be built with `-D warnings`. | Quality | Test |
| FR-061-CON-5 | The consumer crates SHALL declare the generated crate and `serde_json` at a pinned exact version and no other dependency, and `crates/semantic-ir` and `crates/conformance-adapter` no dependency at all. | Portability | Analysis |
| FR-061-CON-6 | The packaging step SHALL be `cargo package --offline --no-verify` and no other packaging command. | Safety | Inspection |
| FR-061-CON-7 | Every crate manifest this requirement adds SHALL carry `publish = false`. | Safety | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-061-AC-1 | `make rust-install-from-artifact` packages the crate, unpacks it into a scratch directory, and builds both consumers offline with `-D warnings`, all with `git status --porcelain` empty afterwards. | Test (TC-719) |
| FR-061-AC-2 | The compile-time consumer's exhaustive `match` fails to compile when a type is added to the source document, demonstrated by a scripted rehearsal that regenerates from a modified document and asserts the build error. | Test (TC-720) |
| FR-061-AC-3 | The compile-time `const` assertion over `TYPES.len()` fails when the generated type count changes and the assertion is not updated. | Test (TC-720) |
| FR-061-AC-4 | Every positive fixture deserializes, re-serializes, and compares canonically equal to its input under the FR-059 canonical form, and is byte-identical in every value whose source bytes the crate retained. | Test (TC-721) |
| FR-061-AC-5 | Each of the eight named invalid classes is rejected with the expected error type and message content. | Test (TC-722) |
| FR-061-AC-6 | An unknown member on a `preserve` type survives a round trip canonically equal and byte-identical in its retained members, and is absent from a `reject` type's accepted input space. | Test (TC-723) |
| FR-061-AC-7 | No build step in this requirement reaches the network, verified by running with the network denied and the cargo offline flag set. | Test (TC-724) |
| FR-061-AC-8 | No registry publication occurs, verified by inspection of every invoked command and by the emitted `publish = false`. | Inspection (TC-724) |
| FR-061-AC-9 | The consumers' `Cargo.toml` files contain no `path` dependency resolving outside the scratch directory. | Analysis (TC-724) |
| FR-061-AC-10 | The consumer crates declare the generated crate plus `serde_json` at a pinned exact version as a dev-dependency and no other dependency, and `crates/semantic-ir` and `crates/conformance-adapter` declare none. | Analysis (TC-724) |
| FR-061-AC-11 | The list of commands this requirement invokes contains `cargo package --offline --no-verify` and contains no `cargo publish`, no `--registry`, no `--index`, and no publish `--dry-run`, checked against the recorded command list rather than by reading the target by eye. | Inspection (TC-724) |
| FR-061-AC-12 | Every crate manifest this requirement adds carries `publish = false`, and removing it from one fails the gate naming the manifest. | Analysis (TC-719) |
| FR-061-AC-13 | The offline supply holds `serde` and `serde_json` at the pinned exact versions before the run; `Cargo.lock` is committed and a resolve on a clean checkout leaves it byte-unchanged; and removing a cached crate makes the build fail rather than fetch it. | Test (TC-719) |

## Dependencies

- **Upstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md)
- **Downstream**: issue #11, issue #7
- **Constrained by**: [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
