---
id: FR-059
title: "Answer the conformance corpus from Rust and agree with the independent oracle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-059: Answer the conformance corpus from Rust and agree with the independent oracle

## Description

The Rust backend SHALL supply the `rust-backend` adapter the conformance
registry declares — a process that answers every corpus case with an
adapter-result document — and its answers SHALL agree with the independent
oracle on every case except those a registered divergence covers, so that the
backend is judged by a yardstick it did not author.

## Inputs

- `conformance/corpus.json`, `conformance/bases/`, `conformance/cases/`, read
  through the FR-039 import API and never modified
- `conformance/schema/adapter-result.schema.json`, which fixes the answer shape
- `conformance/adapters/registry.json`, whose `rust-backend` slot this
  requirement fills, and `conformance/thresholds.json`, whose `rust-backend`
  row proposes a pass rate of 1.0 and one permitted divergence
- `schema/semantic/v1/*.json` and
  `docs/semantic-data-system/contracts-v1.md`, which are the *only* sources the
  Rust reader's rules are derived from

## Outputs

- `crates/semantic-ir/`: a Rust crate reading a semantic IR document, deciding
  the published schema layer and the cross-field rules, normalizing to the
  corpus comparison form, and classifying a compatibility pair
- `crates/conformance-adapter/`: a binary that reads the corpus from its working
  directory and writes one adapter-result document per case to stdout as a JSON
  array
- A `command` and `status` on the registry's `rust-backend` slot, and nothing
  else under `conformance/`
- `conformance/divergences.json` entries only where a divergence is genuinely
  required and registered with its owner, verdict, and review date

## Behavior

### The adapter

- The adapter SHALL answer every case in the manifest, echoing the case's
  `caseDigest` verbatim, and SHALL emit exactly one result per case.
- For a case it supports, the adapter SHALL emit `support: "supported"` with a
  `resultState`, the diagnostics it decided, and the `normalized` string.
- For a case whose `unsupportedBy` names `rust-backend`, the adapter SHALL emit
  `support: "unsupported"`, which the harness records as an unmet row and never
  as a pass.
- The adapter SHALL exit 0 and SHALL write nothing but the JSON array to stdout.
- The adapter SHALL NOT read the oracle, and the `rust-backend` slot SHALL be
  started as a process, never imported.

### The Rust reader

- The reader SHALL decide the published schema layer of the input bundle and the
  22 cross-field rules the IR reader enforces, emitting the same
  `agent-ix.semantic-ir.*` codes for the same defects.
- The reader SHALL produce the corpus comparison form `normalized`: for a
  `1.1.0` document, materialize `multiplicity`, `presence`, and `nullable` on
  every field and operation parameter; then serialize with object members sorted
  by code point, array order preserved, and no insignificant whitespace.
- The reader SHALL classify a compatibility pair into `patch`, `additive`,
  `conditional`, `breaking`, `unknown`, or `invalid`.
- The reader SHALL terminate on a cyclic alias chain, a cyclic composite
  relationship graph, and an oversized document, returning a diagnostic rather
  than recursing without bound.
- The reader SHALL return a diagnostic for every malformed input and SHALL NOT
  panic, and its public surface SHALL contain no `unwrap`, `expect`, or
  `panic!` on an input-derived path.

### Divergence and dependency

- Where the adapter's answer differs from the oracle's, the difference SHALL be
  registered in `conformance/divergences.json` with its owner, its verdict, and
  its review date, or the case SHALL be reported as a failure. An unregistered
  difference SHALL NOT be made to disappear by changing a case, a base, an
  expected verdict, or the oracle.
- The adapter's reading of a `reference`-kind `target` that no type declares, no
  import names, and no lock export carries is the oracle's reading. That reading
  is *not* settled by the contract; it is GAP-011, owned by issue #9. This
  requirement SHALL record the dependency and SHALL NOT decide it: if issue #9
  settles it the other way, the adapter's rule and the corpus's cases move
  together.
- The `sourceLocus.path` divergence recorded as GAP-002 SHALL be answered by the
  proved validator of
  [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), not by a
  registered divergence, because the validator decides the published language
  exactly.

### Generation over the corpus

- For every corpus case whose oracle verdict is `success`, the backend SHALL
  generate a crate from the case's IR, the crate SHALL compile, and every value
  the case carries SHALL serialize and deserialize back to itself.
- For every corpus case whose oracle verdict is `invalid`, the generated crate,
  or generation itself, SHALL reject the case, and the rejection SHALL name a
  code the registry declares.
- The published `fixtures/semantic/v1/target-verdicts.json` cases SHALL be
  decided by the generated crate exactly as the fixture's `rust` column states.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-059-CON-1 | The Rust reader SHALL be an independent implementation derived from `schema/semantic/v1/` and `contracts-v1.md`. It SHALL NOT be a transliteration of `conformance/oracle/`, SHALL NOT read or link any file under `conformance/oracle/`, and SHALL NOT read `src/compiler/ir/`. Its agreement with the oracle is evidence only while that holds. | Correctness | Static analysis and inspection |
| FR-059-CON-2 | This requirement SHALL change exactly one file under `conformance/`: the `rust-backend` entry of `adapters/registry.json`, plus `divergences.json` only where a divergence is genuinely registered. Every other path under `conformance/` SHALL be byte-unchanged. | Non-disruption | Change-set diff |
| FR-059-CON-3 | An unmet row SHALL be reported as unmet. The adapter SHALL NOT answer a case it cannot decide with a fabricated agreeing verdict, and SHALL NOT omit a case. | Honesty | Test |
| FR-059-CON-4 | The adapter SHALL be hermetic: no network, no clock, no environment read beyond its working directory. | Determinism | Static analysis |
| FR-059-CON-5 | The Rust reader SHALL contain no `unsafe` block. | Safety | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-059-AC-1 | `make conformance` runs the `rust-backend` adapter as a process and reports `matched` for every case that is not covered by a registered divergence or an `unsupportedBy` entry, with zero failures. | Integration |
| FR-059-AC-2 | The adapter emits exactly one schema-valid adapter-result per manifest case, with the manifest's `caseDigest` echoed verbatim; omitting one case is reported as `missing-answer`. | Test |
| FR-059-AC-3 | The adapter's `normalized` string is byte-identical to the oracle's for every case whose verdict is not `invalid`. | Test |
| FR-059-AC-4 | The adapter's diagnostic codes and severities equal the oracle's, in order, for every negative and boundary case. | Test |
| FR-059-AC-5 | The adapter's `classification` equals the oracle's for every compatibility case. | Test |
| FR-059-AC-6 | The case `PROV-002`, whose `unsupportedBy` names `rust-backend`, is answered `unsupported` and appears in the coverage account as an unmet row, not a pass. | Test |
| FR-059-AC-7 | The Rust reader's module graph contains no path under `conformance/oracle/` or `src/compiler/ir/`, and the crate's dependency set names no crate generated from either. | Static analysis |
| FR-059-AC-8 | Every corpus case whose oracle verdict is `success` generates a crate that compiles offline, and the case's own IR document round-trips through it byte-for-byte after canonicalization. | Integration |
| FR-059-AC-9 | Every corpus case whose oracle verdict is `invalid` is rejected by generation or by the generated crate, naming a registered code. | Integration |
| FR-059-AC-10 | Each of the five `target-verdicts.json` cases is decided by the generated crate exactly as its `rust` verdict states, including `unknown-preservable-extension` accepted and `unknown-required-capability` rejected. | Test |
| FR-059-AC-11 | The reader returns a diagnostic and does not panic over at least 4096 mutated documents, run under a panic hook that fails the test. | Fuzz |
| FR-059-AC-12 | The changed-path set under `conformance/` for this branch is exactly `adapters/registry.json`, and every other file under `conformance/` is byte-identical to the pre-change baseline. | Analysis |
| FR-059-AC-13 | Removing the adapter command from the registry returns the slot to 111 unmet rows and zero passes, so a missing adapter can never read as agreement. | Test |
| FR-059-AC-14 | The GAP-011 dependency is recorded in the divergence or gap register with issue #9 named as its owner, and the cases `REF-001..004` are answered by the oracle's reading with that dependency cited. | Inspection |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-062](./FR-062-cover-every-mapping-branch.md), issue #7
- **Constrained by**: [NFR-009](../non-functional/NFR-009-cross-language-semantic-parity.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
