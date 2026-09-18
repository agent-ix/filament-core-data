---
id: FR-090
title: "Prove cross-language agreement and record the publication gate"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-089"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-090] Prove cross-language agreement and record the publication gate

## Description

This requirement answers
[filament-core-data#7](https://github.com/agent-ix/filament-core-data/issues/7), the gate whose passing releases
the Rust burn-down's first stages.

The four emitted kernel packages SHALL be shown to decide one shared golden
corpus of kernel instance documents the same way, over five named properties,
through the conformance corpus and oracle that already exist rather than through
a comparison invented here, and every one of the four SHALL remain unpublished
behind `agent-ix/quoin#290`.

`conformance/README.md` records cross-language generated-package serialization
parity as an unmet area under "What this corpus does not do", and
`conformance/corpus.json` carries it as `UA-serialization-parity` naming
`agent-ix/filament-core-data#21`, `#22`, `#23`, and `#11` as its owning issues.
Its recorded rationale is exact: "No generated Rust, TypeScript, or Python
package exists to serialize." That reason has now expired, because those three
packages exist. This requirement produces the evidence that closes the area. It
does not close the row itself: NFR-030 makes `conformance/**` a prohibited path
for issue #11 in its entirety, so the row is closed by its owner, issue #20, on
evidence this requirement reports and an issue this requirement files.

Generation and publication are separate acts. Issue #11 generates. Publication
of all four packages passes `agent-ix/quoin#290`, a human sign-off that has not
moved, and nothing in this requirement, this issue, or any target it invokes
performs a publication or contacts a registry.

## Inputs

- The generated kernel packages of [FR-085](./FR-085-generate-the-kernel-typescript-package.md)
  at `packages/semantic-kernel/typescript/`,
  [FR-086](./FR-086-generate-the-kernel-rust-crate.md) at
  `packages/semantic-kernel/rust/`,
  [FR-087](./FR-087-generate-the-kernel-python-package.md) at
  `packages/semantic-kernel/python/`, and the modular JSON Schema artifact of
  [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md)
- The per-language consumers of [FR-089](./FR-089-provide-independent-consumer-examples.md),
  which prove each package usable one language at a time; this requirement
  compares the languages against one another
- `conformance/oracle/index.mjs`, the corpus's one declared import surface —
  `loadCorpus`, `loadCase`, `loadBase`, `listCases`, `buildInput`,
  `oracleVerdict`, `compare`, `substantive` — which `conformance/README.md`
  names under "Consuming it" and whose loaders each return a deep copy and
  resolve paths relative to the module, so no particular working directory is
  needed
- `conformance/corpus.json` read, never written: `corpusVersion`, the
  twenty-two-row `constructRegister`, the `unmetAreas` register carrying
  `UA-serialization-parity`, the four bases, the one hundred and eleven cases,
  and `corpusDigest`
- The corpus comparison form `agent-ix-conformance-jcs-v1`: object members
  ordered by code point, no insignificant whitespace, array order preserved —
  which `conformance/README.md` states is **not** the contract's
  `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form, recorded as named
  but undefined in `conformance/contract-gaps.json` GAP-004
- `conformance/contract-gaps.json` and `conformance/divergences.json`, read as
  the record of what is already known to disagree and with whom
- The thirty JSON Schema 2020-12 documents under
  `packages/semantic-core/generated/json-schema/`, the declaration inventory
  `packages/semantic-core/inventory.json`, and
  `docs/semantic-data-system/contracts-v1.md`, from which the golden kernel
  instance documents are authored

## Outputs

- `packages/semantic-kernel/parity/`: the parity harness, which consumes the
  conformance corpus through `conformance/oracle/index.mjs` and writes nothing
  under `conformance/`
- `packages/semantic-kernel/parity/golden/`: the shared golden corpus of kernel
  **instance** documents — positive, negative, and boundary — that all four
  packages decide, each carrying the artifact, locator, and verbatim quote its
  expectation was read from
- One decision emitter per emitted kernel package under
  `packages/semantic-kernel/parity/`, each answering every golden document from
  its own package's decision path
- `packages/semantic-kernel/parity/agreement.json`: the agreement report naming,
  per document and per property, the decision each of the four packages returned
  and whether they agree
- `packages/semantic-kernel/parity/divergences.json`: the parity divergence
  register, this requirement's own file, each row naming the document, the
  property, each package's decision, which side is wrong, and the issue that
  adjudicates it
- `packages/semantic-kernel/parity/unmet-area-evidence.md`: the evidence offered
  to issue #20 for closing `UA-serialization-parity`, together with the
  identifier of the issue filed asking that owner to close the row
- `packages/semantic-kernel/parity/publication-gate.json`: the record naming
  `agent-ix/quoin#290` as the blocking issue for each of the four packages, and
  the recorded command list showing no publication command ran

## Behavior

### The shared golden corpus of kernel instances

- The golden corpus SHALL be authored under
  `packages/semantic-kernel/parity/golden/` rather than added to
  `conformance/`, for two reasons that both hold independently: the issue #20
  corpus judges the IR document layer and carries no kernel-instance cases, and
  NFR-030 makes `conformance/**` a prohibited path for issue #11.
- The corpus SHALL be one set of documents, and every emitted package SHALL
  decide every document in it. A document one package is excused from is not
  evidence of cross-language agreement.
- The corpus SHALL carry positive, negative, and boundary documents, reusing the
  `class` vocabulary the one hundred and eleven existing conformance cases use,
  so that agreement is measured on acceptance, on refusal, and at the edge where
  the two meet, rather than on acceptance alone.
- The corpus SHALL cover every kernel declaration named in
  `packages/semantic-core/inventory.json` — the twenty-one models, the
  `ConstraintDecl` union, the four enums, and the four scalars — because a
  declaration no document exercises is a declaration whose cross-language
  behaviour is unmeasured, and an unmeasured declaration must not be reported as
  agreeing.
- Every golden document SHALL carry `derivedFrom` naming the artifact, the
  locator, and the verbatim quote its expectation was read from, and the gate
  SHALL check that the quote still occurs in that artifact, as the conformance
  corpus already does for its own cases.
- Every golden document SHALL carry `provenance.blessedFromRun: false`. No
  expectation SHALL be copied out of any package's output: an expectation taken
  from an implementation is that implementation agreeing with itself.
- The corpus SHALL be authored from the thirty published documents under
  `packages/semantic-core/generated/json-schema/` and from
  `docs/semantic-data-system/contracts-v1.md`, and from no package's emitted
  output.

### The five properties that must agree

For every golden document, the four packages SHALL agree on all five of the
following, and a disagreement on any one is a disagreement:

- **Serialized member names.** The name each declared member is written under on
  the wire SHALL be identical across the four. A package that renders a member
  in its host language's casing convention rather than the declared name has
  broken the contract for every other language, and this is the property most
  likely to differ silently, because each language's idiomatic emitter has its
  own default.
- **Presence versus null.** An absent member and a member present with a null
  value SHALL be distinguished identically across the four, both on
  deserialization and on re-serialization. Contract `2.0.0` authors `presence`
  independently of `multiplicity.lower` (FR-106-CON-1; fcd#179 deleted the
  `1.1.0` derivation this property used to cite), so a package that maps
  `presence: "optional"` onto a written null has changed a document's meaning
  rather than its formatting.
- **Defaults.** Whether a default is materialized into the serialized document
  or left absent SHALL be identical across the four, per default kind, over the
  `DefaultKind` enum the kernel declares.
- **Unknown-member states.** For each of `preserve`, `reject`, and `surface`,
  the four SHALL agree on whether an undeclared member is kept, refused, or
  reported, and a `preserve` document SHALL survive a deserialize–serialize
  round trip canonically equal under `agent-ix-conformance-jcs-v1` in all four.
- **Relation semantics.** `RelationDecl` — its `EdgeCategory`, its
  `multiplicity` including `ordered` and `unique`, and its target identity —
  SHALL be read and written identically across the four.

- Comparison SHALL be under `agent-ix-conformance-jcs-v1` and SHALL NOT claim to
  be under `RFC8785-JCS-with-identity-sorted-sets-v1`, which
  `conformance/contract-gaps.json` GAP-004 records as named but undefined. A
  comparison naming an undefined form proves nothing.
- Byte identity SHALL be asserted only where a package retained the source
  bytes, following the retained-bytes rule
  [FR-061](./FR-061-consume-the-generated-crate.md) states; everywhere else the
  obligation is canonical equality, because a value whose bytes were not
  retained has no byte to compare.

### The comparison runs through the existing corpus and oracle

- The parity harness SHALL reach the conformance corpus only through
  `conformance/oracle/index.mjs`, which `conformance/README.md` declares the
  import surface, and SHALL import no other module under `conformance/`.
- The harness SHALL take the canonical form, the comparison, and the substantive
  test from that surface — `compare` and `substantive` — rather than
  reimplementing them. This requirement SHALL NOT introduce a second comparison
  engine, canonicalizer, or verdict function; two canonicalizers is how two
  implementations come to agree with each other and with nothing else.
- Each emitted kernel package SHALL answer from its own decision path and SHALL
  call neither `oracleVerdict` nor `compare`, as
  `conformance/adapters/registry.json` already records for the
  `typescript-backend` slot. A package that consulted the oracle would be
  reporting the oracle's opinion under its own name.
- The harness SHALL read corpus artifacts and write none. It SHALL create,
  modify, or delete no file under `conformance/` — including
  `conformance/corpus.json`, `conformance/coverage.json`,
  `conformance/divergences.json`, `conformance/adapters/registry.json`, and
  `conformance/thresholds.json` — because NFR-030 makes the whole directory a
  prohibited path for issue #11.
- This requirement SHALL NOT add an adapter slot to
  `conformance/adapters/registry.json` and SHALL NOT supply a command for an
  existing slot. The four declared slots and their owning issues — `#19`, `#21`,
  `#22`, `#23` — stay as they are; a parity harness is not an adapter.
- An undecided or unavailable answer SHALL be counted unmet and never as a pass,
  which is the rule `conformance/README.md` states for the four hundred and
  forty-four unmet rows its coverage account already carries.

### Closing the unmet area is the corpus owner's act

- This requirement SHALL write the measured evidence — every golden document,
  every package's decision, and the per-property agreement — to
  `packages/semantic-kernel/parity/unmet-area-evidence.md`.
- This requirement SHALL file an issue against
  `agent-ix/filament-core-data#20`, the corpus owner, asking it to close the
  `UA-serialization-parity` row of `conformance/corpus.json` on that evidence,
  and SHALL record that issue's identifier in the evidence document.
- This requirement SHALL NOT edit the `UA-serialization-parity` row, its
  `rationale`, its `owningIssues`, the `unmetAreas` register, `corpusVersion`,
  `corpusDigest`, or the "What this corpus does not do" section of
  `conformance/README.md`. Editing the record of an unmet area is not the same
  act as meeting it, and a repository where the second can be performed by
  writing the first has no unmet areas it can trust.
- The evidence SHALL state plainly which of the corpus's own owning issues
  (`#21`, `#22`, `#23`, `#11`) it discharges and which remain, so the corpus
  owner is deciding on a stated scope rather than on an implied one.

### A disagreement is a recorded divergence

- If two packages decide one golden document differently on any of the five
  properties, then the run SHALL record a divergence in
  `packages/semantic-kernel/parity/divergences.json` naming the document, the
  property, each package's decision, which side is wrong, and the issue that
  adjudicates it.
- A divergence row SHALL name an adjudicating owner. A row without one is a
  suppression wearing a record's clothes, and the gate SHALL reject it.
- A divergence row the run does not reproduce SHALL fail the run — the rule
  `conformance/divergences.json` already states for the corpus's own register —
  so a fixed defect cannot stay suppressed and a row cannot outlive the
  disagreement it records.
- A disagreement SHALL NOT be closed by editing a golden document, its
  expectation, a base, a module under `conformance/oracle/`,
  `conformance/divergences.json`, or
  `packages/semantic-kernel/parity/divergences.json` to make the run green. Each
  of those edits turns a measured disagreement between two implementations into
  a silent agreement with whatever was edited last, which is the single failure
  the corpus exists to prevent.
- A disagreement with the published contract rather than between two packages
  SHALL be reported to the owner of `conformance/contract-gaps.json` alongside
  GAP-002 through GAP-011, by filing an issue naming the owning issue that
  register would assign — not by adding a row to that file, which NFR-030
  forbids. No published schema under `schema/semantic/v1/` and no artifact under
  `docs/semantic-data-system/` is edited by this requirement.
- `conformance/thresholds.json` SHALL NOT be edited. Its rows are `proposed` by
  issue #20 and accepted only by the issue each names; accepting one's own
  threshold is not an acceptance.

### The publication gate

- Publication of all four kernel packages — the Rust crate, the TypeScript
  package, the Python package, and the modular JSON Schema artifact — SHALL be
  blocked on `agent-ix/quoin#290`, and that issue SHALL be named, by its
  identifier, in `packages/semantic-kernel/parity/publication-gate.json` and in
  each package's own documentation.
- No step of this requirement, and no `make` target it invokes, SHALL run
  `cargo publish`, `npm publish`, a PyPI upload, or a tag push, and SHALL pass
  no `--registry`, no `--index`, and no publish `--dry-run` — a dry-run publish
  still contacts an index, which is why
  [FR-061](./FR-061-consume-the-generated-crate.md) forbids it too.
- Every generated manifest SHALL carry the non-publishable marker its backend
  already emits: `publish = false` in the Rust crate's `Cargo.toml`, and no
  registry entry for the others.
- Nothing under `packages/semantic-kernel/` or `packages/semantic-core/generated/`
  SHALL be added to the npm package's `files` or `exports`, to the Python
  distribution's `packages` or `include`, or to any publication workflow — the
  same rule [FR-079](./FR-079-emit-the-python-package-layout.md) states for
  `python_backend/generated/`, and the rule `conformance/README.md` states for
  `conformance/oracle/index.mjs`, whose addition to `exports` or `files` it
  assigns to the issue #11 publication gate and which this requirement therefore
  leaves unadded.
- The blocked publication step SHALL be recorded as blocked, naming
  `agent-ix/quoin#290`, and SHALL NOT be recorded as complete, skipped, not
  applicable, or out of scope. A gate that is not named in the record is a gate
  nobody can see has not been passed.
- Cross-language agreement SHALL NOT be reported as satisfying the publication
  gate. Agreement is evidence offered to `agent-ix/quoin#290`; the sign-off is a
  human decision and no measurement in this repository substitutes for it.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-090-CON-1 | Every one of the four kernel packages SHALL decide every golden document. The harness SHALL count a package excused from a document as unmet, never as passed, following the rule `conformance/README.md` states for the four hundred and forty-four unmet rows. | Correctness | Test |
| FR-090-CON-2 | The parity harness SHALL create, modify, or delete no file under `conformance/`, which NFR-030 makes a prohibited path for issue #11 in its entirety — `conformance/corpus.json`, `conformance/coverage.json`, `conformance/divergences.json`, `conformance/adapters/registry.json`, and `conformance/thresholds.json` included. | Non-disruption | Manifest comparison |
| FR-090-CON-3 | The harness SHALL consume the corpus only through `conformance/oracle/index.mjs`, importing no other module under `conformance/`, and define no second comparison engine, canonicalizer, or verdict function of its own. | Integrity | Static analysis |
| FR-090-CON-4 | No package decision emitter SHALL import `conformance/oracle/index.mjs` or call `oracleVerdict` or `compare`; each answers from its own package's decision path, as `conformance/adapters/registry.json` records for the `typescript-backend` slot. | Integrity | Static analysis |
| FR-090-CON-5 | This requirement SHALL NOT close, edit, or reword the `UA-serialization-parity` row of `conformance/corpus.json` or the "What this corpus does not do" section of `conformance/README.md`. It reports the evidence and files an issue asking the corpus owner, `agent-ix/filament-core-data#20`, to close the row. Editing the record of an unmet area is not the same act as meeting it. | Integrity | Inspection |
| FR-090-CON-6 | A disagreement SHALL NOT be closed by editing a golden document, its expectation, a base, a module under `conformance/oracle/`, `conformance/divergences.json`, or `packages/semantic-kernel/parity/divergences.json`. Every divergence row names an adjudicating owner and which side is wrong; a row without an owner is rejected by the gate, and a row the run does not reproduce fails the run. | Integrity | Inspection and test |
| FR-090-CON-7 | No published schema under `schema/semantic/v1/` and no artifact under `docs/semantic-data-system/` SHALL be edited. A disagreement with the published contract is reported by filing an issue naming the owner `conformance/contract-gaps.json` would assign, not by adding a row to that file. | Non-disruption | Manifest comparison |
| FR-090-CON-8 | No `cargo publish`, `npm publish`, PyPI upload, tag push, `--registry`, `--index`, or publish `--dry-run` SHALL be invoked by any step or `make` target of this requirement, checked against the recorded command list rather than by reading the targets by eye. | Safety | Inspection |
| FR-090-CON-9 | Every generated kernel manifest SHALL carry its non-publishable marker — `publish = false` for the Rust crate, no registry entry for the others — and removing one SHALL fail the gate naming the manifest. | Safety | Analysis |
| FR-090-CON-10 | This requirement SHALL add nothing under `packages/semantic-kernel/`, `packages/semantic-core/generated/`, or `conformance/` to the npm package's `files` or `exports`, the Python distribution's `packages` or `include`, or any publication workflow. | Non-disruption | Manifest comparison |
| FR-090-CON-11 | No step SHALL open a network connection, which `conformance/README.md` already states of everything in that directory, and no decision emitter or harness module SHALL read a clock or an environment variable; `make conformance-audit` remains the only entry point in this repository that reads a clock. | Determinism | Static analysis |
| FR-090-CON-12 | This requirement SHALL bless no golden document's expectation from a run; every document carries `provenance.blessedFromRun: false` and a `derivedFrom` quote that still occurs in the artifact it names. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-090-AC-1 | The golden corpus under `packages/semantic-kernel/parity/golden/` carries positive, negative, and boundary kernel instance documents, and every declaration in `packages/semantic-core/inventory.json` — the twenty-one models, the `ConstraintDecl` union, the four enums, and the four scalars — is exercised by at least one document; a declaration with no document fails the gate naming it. | Test |
| FR-090-AC-2 | Every golden document carries `derivedFrom` with an artifact, a locator, and a verbatim quote that still occurs in that artifact, and `provenance.blessedFromRun: false`; a document whose quote no longer occurs fails the gate. | Test |
| FR-090-AC-3 | All four kernel packages return a decision for every golden document, and the decided count equals the document count for each of the four; an undecided document is reported unmet and counted as no pass. | Integration |
| FR-090-AC-4 | For every golden document, the serialized member name of every declared member is identical across the four packages; renaming one member in one package's emitted output makes the run fail naming the document, the member, and the two packages that differ. | Test |
| FR-090-AC-5 | For every golden document, an absent member and a present-but-null member are distinguished identically across the four on deserialization and on re-serialization, and a package that writes a null for an absent optional member fails the run. | Test |
| FR-090-AC-6 | For every `DefaultKind`, whether a default is materialized into the serialized document is identical across the four. | Test |
| FR-090-AC-7 | For each of `preserve`, `reject`, and `surface`, the four agree on the fate of an undeclared member, and a `preserve` document round-trips canonically equal under `agent-ix-conformance-jcs-v1` in all four, byte-identical only where the package retained the source bytes. | Test |
| FR-090-AC-8 | For every `RelationDecl` document, the `EdgeCategory`, the `multiplicity` including `ordered` and `unique`, and the target identity are read and written identically across the four. | Test |
| FR-090-AC-9 | The comparison is performed by `compare` and `substantive` imported from `conformance/oracle/index.mjs`; no module under `packages/semantic-kernel/parity/` defines its own verdict, canonicalization, or comparison function, no module there imports any other path under `conformance/`, and no decision emitter imports `conformance/` at all. | Analysis |
| FR-090-AC-10 | A full parity run leaves every file under `conformance/` byte-unchanged, including `conformance/corpus.json`, `conformance/coverage.json`, `conformance/divergences.json`, `conformance/adapters/registry.json`, and `conformance/thresholds.json`, compared before and after. | Test |
| FR-090-AC-11 | `conformance/adapters/registry.json` still declares exactly the four slots `compiler-frontend`, `rust-backend`, `typescript-backend`, and `python-backend` with their original `owningIssue` values, and this requirement supplies no command for any of them. | Analysis |
| FR-090-AC-12 | An injected disagreement — one package's emitted member name changed by one character — produces a row in `packages/semantic-kernel/parity/divergences.json` naming the document, the property, both decisions, the wrong side, and an adjudicating issue, and the run fails rather than passing with the row present. | Test |
| FR-090-AC-13 | A divergence row without an adjudicating owner is rejected by the gate, and a row the run does not reproduce fails the run, exercised by leaving a row in place after the injected disagreement is reverted. | Test |
| FR-090-AC-14 | `packages/semantic-kernel/parity/unmet-area-evidence.md` states the measured agreement, names which of `UA-serialization-parity`'s owning issues it discharges and which remain, and records the identifier of the issue filed against `agent-ix/filament-core-data#20` asking that owner to close the row. | Inspection |
| FR-090-AC-15 | The `UA-serialization-parity` row of `conformance/corpus.json` and the "What this corpus does not do" section of `conformance/README.md` are byte-unchanged by this requirement, and no branch of this issue closes or rewords either. | Inspection |
| FR-090-AC-16 | No file under `schema/semantic/v1/` or `docs/semantic-data-system/` differs before and after this requirement's run. | Test |
| FR-090-AC-17 | The recorded command list for this requirement contains no `cargo publish`, no `npm publish`, no PyPI upload, no tag push, no `--registry`, no `--index`, and no publish `--dry-run`. | Inspection |
| FR-090-AC-18 | Every generated kernel manifest carries its non-publishable marker; removing `publish = false` from the Rust crate's `Cargo.toml`, or adding a registry entry to any other manifest, fails the gate naming the manifest. | Analysis |
| FR-090-AC-19 | `packages/semantic-kernel/parity/publication-gate.json` names `agent-ix/quoin#290` for each of the four packages, states the step as blocked, and states it nowhere as complete, skipped, not applicable, or out of scope; a record missing that identifier for any one package fails the gate. | Inspection |
| FR-090-AC-20 | Nothing under `packages/semantic-kernel/`, `packages/semantic-core/generated/`, or `conformance/` appears in the npm package's `files` or `exports`, in the Python distribution's `packages` or `include`, or in any publication workflow, compared against those manifests before and after. | Analysis |
| FR-090-AC-21 | The full parity run opens no network connection, verified by running with the network denied, and no harness module or decision emitter matches a clock or environment read. | Test |
| FR-090-AC-22 | Two consecutive full runs produce a byte-identical `packages/semantic-kernel/parity/agreement.json`, and `git status --porcelain` after a run names no path under `conformance/`. | Test |

## Dependencies

- **Upstream**: [FR-085](./FR-085-generate-the-kernel-typescript-package.md), [FR-086](./FR-086-generate-the-kernel-rust-crate.md), [FR-087](./FR-087-generate-the-kernel-python-package.md), [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md), [FR-089](./FR-089-provide-independent-consumer-examples.md)
- **Consumed read-only**: `conformance/oracle/index.mjs`, the one declared import surface of the issue #20 corpus, together with `conformance/corpus.json`, `conformance/contract-gaps.json`, `conformance/divergences.json`, `conformance/thresholds.json`, and `conformance/adapters/registry.json`, all owned by `agent-ix/filament-core-data#20` and all prohibited paths for issue #11 under NFR-030
- **Downstream**: `agent-ix/quoin#290`, the publication sign-off every one of the four packages is blocked on; `agent-ix/filament-core-data#20`, which owns closing the `UA-serialization-parity` row on the evidence this requirement reports; `agent-ix/filament-core-data#7`
- **Constrained by**: [NFR-028](../non-functional/NFR-028-deterministic-kernel-generation.md), [NFR-029](../non-functional/NFR-029-portable-semantic-kernel-packages.md), [NFR-030](../non-functional/NFR-030-non-disruptive-kernel-packaging.md)
- **Open contract questions this requirement records rather than decides**: `conformance/contract-gaps.json` GAP-004, the named but undefined `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form, which is why the comparison names `agent-ix-conformance-jcs-v1` instead; and GAP-002, the four-lookahead `sourceLocus` path pattern that cannot compile under RE2 and that the Rust package must hand-write. `fcd#179` deletes GAP-009 (presence and multiplicity unreconciled by the schema): contract `2.0.0` is the only contract, and `FR-106` makes presence and multiplicity independent, so no reconciliation gap remains to record
