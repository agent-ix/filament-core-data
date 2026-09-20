---
id: FR-059
title: "Answer the conformance corpus from Rust and agree with the independent oracle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-039"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-059: Answer the conformance corpus from Rust and agree with the independent oracle

## Description

The Rust backend SHALL supply the `rust-backend` adapter the conformance
registry declares — a process that answers every corpus case with an
adapter-result document — and its answers SHALL agree with the independent
oracle on every case, so that the backend is judged by a yardstick it did not
author.

## Inputs

- `conformance/corpus.json`, `conformance/bases/`, `conformance/cases/`, read
  through the FR-039 import API and never modified
- `conformance/schema/adapter-result.schema.json`, which fixes the answer shape
- `conformance/adapters/registry.json`, whose `rust-backend` slot this
  requirement fills, and `conformance/thresholds.json`, whose `rust-backend`
  row proposes a pass rate of 1.0 and one permitted divergence
- `schema/semantic/v1/*.json`,
  `docs/semantic-data-system/contracts-v1.md`, and
  `conformance/diagnostic-codes.json`, which are the *only* sources the Rust
  reader's rules are derived from

## Outputs

- `crates/semantic-ir/`: a dependency-free Rust crate carrying a JSON reader and
  writer, an ECMAScript-compatible number formatter, the published schema layer,
  the cross-field rules, the corpus comparison form, and a compatibility
  classifier
- `crates/semantic-ir/RULES.md`: the derivation ledger — one row per emitted
  code, citing the schema locator or the `contracts-v1.md` quote it was derived
  from
- `crates/conformance-adapter/`: a binary that reads the corpus from its working
  directory and writes one adapter-result document per case to stdout as a JSON
  array
- `Cargo.toml` (a workspace), `Cargo.lock`, `rust-toolchain.toml`,
  `rustfmt.toml`, and `.cargo/config.toml` at the repository root
- A `command` and `status` on the registry's `rust-backend` slot
- The regenerated `conformance/coverage.json`, whose `rust-backend` row and
  `unmetCases` total move from 115 unmet to 115 matched. That file is not a
  yardstick: `conformance/README.md` declares it generated on every run and
  never hand-edited, and FR-039 makes it a report *about* the adapters. Filling
  the slot the corpus declares is what moves it, so leaving it stale would
  contradict the corpus's own regeneration gate and leave the account saying the
  slot is unavailable while the registry says it is available. No other path
  under `conformance/` changes.
- The GAP-002 closure and the GAP-011 dependency recorded in
  `docs/semantic-data-system/rust-backend.md`

## Behavior

### The adapter

- The adapter SHALL answer every case in the manifest, echoing the case's
  `caseDigest` verbatim, and SHALL emit exactly one result per case.
- The adapter SHALL emit `support: "supported"` with a `resultState`, the
  diagnostics it decided, and the `normalized` string, for every case, including
  `PROV-002`. `PROV-002` carries an `unsupportedBy` entry naming
  `rust-backend`, whose rationale is that a Rust reader cannot compile the locus
  pattern; [FR-057](./FR-057-enforce-constraints-in-generated-rust.md) answers
  that pattern exactly, so the licence is not exercised and the adapter's
  matched count is 115 of 115.
- The adapter SHALL exit 0 and SHALL write nothing but the JSON array to
  stdout. It SHALL write every diagnostic of its own to stderr.
- If the adapter cannot decide a case, then it SHALL emit
  `support: "unsupported"` for that case only where the case's `unsupportedBy`
  names it, and SHALL otherwise fail the run rather than answer.
- The adapter SHALL install a panic hook that writes the panic to stderr and
  exits non-zero, so a panic is an adapter failure the harness reports and never
  a truncated JSON array the harness mis-parses.
- The adapter SHALL buffer the whole array and write it in one call, so a
  partial write cannot present as a shorter corpus.
- The adapter SHALL resolve the corpus relative to its own working directory,
  which the harness sets to `conformance/`, and SHALL read no other path.
- The adapter SHALL NOT read the oracle, and the `rust-backend` slot SHALL be
  started as a process, never imported.

### The Rust reader

- The reader SHALL decide the published schema layer of the input bundle and
  the cross-field rules, emitting the codes `conformance/diagnostic-codes.json`
  publishes for the defects it finds.
- The reader SHALL produce the corpus comparison form `normalized` for **every**
  case, including one the schema layer has already decided invalid, because the
  harness compares the string unconditionally.
- `normalized` SHALL be: serialize the document with object members sorted by
  code point, array order preserved, no insignificant whitespace, and every
  JSON number rendered by the ECMAScript `Number::toString` algorithm.
  `nullable` is materialized as a literal boolean on every field and operation
  parameter, unconditionally on `contractVersion`. `nullable` materializes
  `true` only where the authored member is the JSON literal `true`; every
  other value or its absence — `null`, `false`, a number, a string, an array,
  or an object, or no member at all — materializes `false` (fcd#187).
  `multiplicity` and `presence` are schema-required and independently
  authored under contract `2.0.0` (FR-106-CON-1, FR-069), so normalization
  never materializes either from the other.
- The crate SHALL carry an ECMAScript-compatible number formatter as a named,
  separately tested unit, because Rust's own `f64` display differs from
  ECMAScript at the exponent thresholds, on trailing zeros, and on negative
  zero, and the corpus's canonical form is produced by `JSON.stringify`.
- The reader SHALL classify a compatibility pair into `patch`, `additive`,
  `conditional`, `breaking`, `unknown`, or `invalid`.
- The reader SHALL terminate on a cyclic alias chain, a cyclic composite
  relationship graph, and an oversized document, returning a diagnostic rather
  than recursing without bound.
- The reader SHALL return a diagnostic for every malformed input and SHALL NOT
  panic, and its public surface SHALL contain no `unwrap`, `expect`, or
  `panic!` on an input-derived path.

### Generation over the corpus

- For every corpus case whose oracle verdict is `success`, the backend SHALL
  generate a crate from the case's IR, and the generated source SHALL be
  emitted; a declared subset of those cases, chosen to cover every row of the
  mapping-branch register of
  [FR-062](./FR-062-cover-every-mapping-branch.md) and named in a committed
  list, SHALL additionally be compiled.
- For every case in that compiled subset, every value the case carries SHALL
  serialize and deserialize back to canonical equality with itself.
- For every corpus case whose oracle verdict is `invalid`, the generated crate,
  or generation itself, SHALL reject the case, naming a code one of the two
  declared registries carries.
- The published `fixtures/semantic/v1/target-verdicts.json` cases SHALL be
  decided by the generated crate exactly as the fixture's `rust` column states.

### Divergence and dependency

- This requirement SHALL register no divergence. `conformance/divergences.json`
  is a prohibited path, and the one divergence
  `conformance/thresholds.json` anticipates is the GAP-002 locus pattern, which
  FR-057 answers exactly rather than diverging from. The unspent budget is
  recorded in `docs/semantic-data-system/rust-backend.md`, not consumed, and the
  stale rationale on that threshold row is filed as issue #59.
- If the adapter's answer differs from the oracle's, then the run SHALL fail.
  The difference SHALL NOT be made to disappear by changing a case, a base, an
  expected verdict, the thresholds, or the oracle.
- The adapter's reading of a `reference`-kind `target` that no type declares, no
  import names, and no lock export carries is the oracle's reading. That reading
  is *not* settled by the contract; it is GAP-011, whose register row names
  issue #9, which is closed; issue #59 carries the reassignment. This requirement SHALL record that the adopted
  reading stands until a live contract ticket reopens it, and SHALL NOT decide
  it. The adopted reading is confined to the reader: FR-054's `reference` row
  emits a newtype over the validated identity whichever way the question
  settles, so a later resolution moves the reader's rule and the corpus's cases
  and reaches no generated type.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-059-CON-1 | The Rust reader SHALL be an independent implementation derived from `schema/semantic/v1/`, `contracts-v1.md`, and `conformance/diagnostic-codes.json`. It SHALL NOT read or link `conformance/oracle/` or `src/compiler/ir/`. Each emitted code SHALL cite its derivation source in `crates/semantic-ir/RULES.md`, and the reader's first full corpus run SHALL be recorded before any oracle output is inspected, because a module-graph scan detects linking and not reading. | Correctness | Analysis |
| FR-059-CON-2 | This requirement SHALL change exactly two paths under `conformance/`: the `rust-backend` entry of `adapters/registry.json`, and the generated `coverage.json`, whose diff SHALL be confined to that adapter's row and the `unmetCases` total. Every other path under `conformance/` SHALL be byte-unchanged, and no case, base, expected verdict, threshold, divergence, gap register or oracle rule SHALL move. | Non-disruption | Analysis |
| FR-059-CON-3 | An unmet row SHALL be reported as unmet. The adapter SHALL NOT answer a case it cannot decide with a fabricated agreeing verdict, and SHALL NOT omit a case. | Honesty | Test |
| FR-059-CON-4 | The adapter SHALL be hermetic: no network, no clock, no environment read, and no filesystem read outside its working directory. | Determinism | Analysis |
| FR-059-CON-5 | `crates/semantic-ir/` SHALL contain no `unsafe` block and SHALL declare no dependency. | Safety | Analysis |
| FR-059-CON-6 | Every crate this requirement adds SHALL declare `publish = false`. | Safety | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-059-AC-1 | `make rust-conformance` runs the `rust-backend` adapter as a process against the committed registry and reports 115 matched, 0 unmet, 0 failed, with the harness exit code 0. | Test (TC-698) |
| FR-059-AC-2 | The adapter emits exactly one schema-valid adapter-result per manifest case, with the manifest's `caseDigest` echoed verbatim; omitting one case is reported as `missing-answer`, and answering one twice as `duplicate-answer`. | Test (TC-699) |
| FR-059-AC-3 | The adapter's `normalized` string is byte-identical to the oracle's for every case, including the ones the schema layer decides invalid. | Test (TC-700) |
| FR-059-AC-4 | The adapter's diagnostic codes and severities equal the oracle's, in order, for every negative and boundary case. | Test (TC-701) |
| FR-059-AC-5 | The adapter's `classification` equals the oracle's for every compatibility case. | Test (TC-702) |
| FR-059-AC-6 | `PROV-002` is answered `supported` and matched, its `unsupportedBy` licence unused; and a constructed answer of `unsupported` for a case whose `unsupportedBy` does not name this adapter is reported as a failure, so the unmet path is proven reachable and proven not taken. | Test (TC-703) |
| FR-059-AC-7 | The Rust reader's module graph and dependency set contain no path under `conformance/oracle/` or `src/compiler/ir/`; `crates/semantic-ir/RULES.md` cites a derivation source for every code the reader emits; and every cited locator resolves. | Analysis (TC-704) |
| FR-059-AC-8 | Every corpus case whose oracle verdict is `success` generates emitted source; every case in the committed compiled subset compiles offline; and each such case's own values round-trip to canonical equality. | Test (TC-705) |
| FR-059-AC-9 | Every corpus case whose oracle verdict is `invalid` is rejected by generation or by the generated crate, naming a code one of the two declared registries carries. | Test (TC-706) |
| FR-059-AC-10 | Each of the five `target-verdicts.json` cases is decided by the generated crate exactly as its `rust` verdict states, including `unknown-preservable-extension` accepted and `unknown-required-capability` rejected, and each for the defect the case names rather than for an incidental one. The comparison is on the verdict alone: the fixture's `diagnosticCode` values are in an `agent-ix.conformance` namespace no registry closes, and the backend reports that rather than minting a code to match it (issue #69). | Test (TC-707) |
| FR-059-AC-11 | The reader returns a diagnostic and does not panic over at least 4096 mutated documents, run under a panic hook that fails the test; a truncated stdout, a non-UTF-8 byte, and an induced panic each surface as an adapter failure and never as a short corpus. | Test (TC-708) |
| FR-059-AC-12 | The changed-path set under `conformance/` for this branch is exactly `adapters/registry.json` and `coverage.json`; the coverage diff touches only the `rust-backend` adapter row and the `unmetCases` total, leaving `unmetAreas` and every other adapter's row byte-identical; and every other file under `conformance/` is byte-identical to the pre-change baseline. | Analysis (TC-709) |
| FR-059-AC-13 | Removing the adapter command from the registry returns the slot to 115 unmet rows and zero passes, so a missing adapter can never read as agreement. | Test (TC-710) |
| FR-059-AC-14 | `docs/semantic-data-system/rust-backend.md` records the GAP-011 dependency with the closed owner named and the adopted reading stated, records GAP-002 as answered by FR-057 with its register closure filed as issue #59, and records the unspent divergence budget; and `conformance/divergences.json` is byte-unchanged. | Inspection (TC-710) |
| FR-059-AC-15 | The ECMAScript number formatter agrees with Node's `JSON.stringify` on a declared set of at least 512 values covering the exponent thresholds, negative zero, trailing zeros, integral floats, and the extremes of `f64`. | Test (TC-700) |
| FR-059-AC-16 | The reader's `normalized` materializes `nullable: true` for the input `true`, and `nullable: false` for each of `1`, `"true"`, `null`, `{}`, and an absent `nullable` member. | Test (TC-1802) |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-039](./FR-039-account-for-corpus-coverage-and-import.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-062](./FR-062-cover-every-mapping-branch.md), issue #7
- **Constrained by**: [NFR-009](../non-functional/NFR-009-cross-language-semantic-parity.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
