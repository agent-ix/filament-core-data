---
id: FR-035
title: "Define the semantic conformance corpus, its versioning, and its provenance"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
---
# [FR-035] Define the semantic conformance corpus, its versioning, and its provenance

## Description

The repository SHALL publish a versioned semantic conformance corpus under
`conformance/` in which every case is a declarative, minimized input bundle
built from a shared base plus an ordered patch, and whose expected result cites
the contract clause it was derived from.

## Inputs

- The published v1 contract: `schema/semantic/v1/*.json` and `docs/semantic-data-system/contracts-v1.md`
- The frozen cross-field negatives of `fixtures/semantic/v1/negative/reader-cases.json`, which already name sixteen `agent-ix.semantic-ir.*` diagnostic codes
- The semantic-core declaration grammar and lowering table (FR-031..FR-034)
- The acceptance criteria of issue #19, issue #21, issue #22, and issue #23

## Outputs

- `conformance/corpus.json`: the corpus manifest — `corpusVersion`, targeted `contractVersions`, the construct register, the base index with a digest per base, the case index with a digest per case, and `corpusDigest`
- `conformance/schema/input-bundle.schema.json`, `corpus-case.schema.json`, `corpus-manifest.schema.json`, `adapter-result.schema.json`
- `conformance/bases/<base-id>.json`: the shared, contract-valid input bundles
- `conformance/cases/<family>/<case-id>.json`: one file per case
- `conformance/README.md`: the versioning, minimization, canonical-form, and provenance rules in prose

## Behavior

- An input bundle SHALL carry `ir`, a semantic IR document.
- An input bundle SHALL admit the optional members `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, each validated against its published v1 schema, so that a case can state a package, lock, mapping, or consumer-policy fact that no IR document carries.
- `conformance/schema/input-bundle.schema.json` SHALL compose the published schemas by reference.
- `conformance/schema/input-bundle.schema.json` SHALL redefine no field a published schema already defines.
- A case file SHALL carry `id`, `title`, `family`, `class` (`positive`, `negative`, `boundary`, or `evolution`), `kind` (`document` or `compatibility`), `contractVersion`, `base`, `ops`, `covers`, `decidedBy` (`schema`, `cross-field`, or `compatibility`), `derivedFrom`, `provenance`, and `expected`.
- A case file SHALL admit the optional member `unsupportedBy`.
- `covers` SHALL name the construct-register rows the case exercises.
- `unsupportedBy` SHALL name each adapter permitted to answer `unsupported` for the case, with that permission's owning issue.
- The corpus SHALL construct a case's input bundle by applying `ops` to the named base bundle.
- The corpus SHALL apply no transformation to a case's input bundle other than that patch.
- `ops` SHALL be an RFC 6902 patch extended with one declared operation, `x-repeat`, which appends `count` copies of a template with the copy index substituted, so that a case sitting on a depth or size limit stays inside the minimization budget.
- An `ops` entry whose `op` is `replace` or `remove` and whose `path` addresses an array member by index SHALL be preceded by an RFC 6902 `test` operation pinning that member, so that an edit to a base cannot silently re-aim the case.
- A case whose `kind` is `compatibility` SHALL additionally carry `beforeBase` and `beforeOps`, which construct the prior bundle the same way.
- A case whose `kind` is `compatibility` SHALL carry a `classification` in its `expected` block.
- `derivedFrom` SHALL carry at least one entry naming an `artifact` that exists in the repository, a `locator` (a JSON pointer or a heading), and the `quote` the expectation was read from.
- `provenance` SHALL carry `authoredFor` (the issue that authored the case), `blessedFromRun` (a boolean), and, when the case reproduces a discovered defect, `reproduces` naming that defect's register entry.
- A case whose `provenance.blessedFromRun` is `true` SHALL additionally carry a `blessing` block naming the implementation, its version, the run command, and the reviewer who checked the derivation by hand.
- If a case sets `provenance.blessedFromRun` to `true` without a `blessing` block, then the corpus gate SHALL fail and name that case.
- A `positive` case SHALL declare `expected.resultState` as `success` and an empty expected diagnostic list.
- A case SHALL declare `expected.diagnostics` as an ordered list whose entries each carry `pointer` (an RFC 6901 pointer into the input bundle) and `diagnostic` (a `common.schema.json#/$defs/diagnostic` document), so that the judged diagnostic is the contract's diagnostic and the pointer is corpus metadata beside it.
- The corpus manifest SHALL record `corpusVersion` as SemVer, where adding a case, a base, or a construct-register row is a minor change, changing or removing an existing case's `expected` or an existing base is a major change, and editing a title, `derivedFrom`, or prose is a patch change.
- The corpus manifest SHALL record the SHA-256 digest of the raw file bytes of every case and every base, so that a one-byte edit anywhere is detected.
- The corpus manifest SHALL record `corpusDigest` as the SHA-256 over those digests joined in base-id then case-id order.
- If a case or base file's recomputed digest differs from its manifest row, then the corpus gate SHALL fail and name the file.
- If `corpusVersion` does not change as the manifest's own rules require for the change that was made, then the versioning gate SHALL fail and name the required bump.
- The corpus SHALL keep every case at or below a declared minimization budget of 64 JSON nodes in `ops`, counting each scalar, array, and object once.
- The corpus SHALL NOT delete a case that reproduces a discovered defect after that defect is fixed.
- If a case that a `defect` register row names is absent, then the corpus gate SHALL fail and name that row.
- `conformance/README.md` SHALL name the corpus canonical form `agent-ix-conformance-jcs-v1`: object keys ordered by code point, no insignificant whitespace, array order preserved.
- `conformance/README.md` SHALL record that `agent-ix-conformance-jcs-v1` is a corpus comparison form and not the contract's `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-035-CON-1 | Every base bundle SHALL validate against `input-bundle.schema.json`, the published schemas it composes, and the oracle, returning zero diagnostics before any patch is applied. | Integrity | Test |
| FR-035-CON-2 | Every case id SHALL be unique across the corpus, beginning with its family's declared prefix and matching the pattern the corpus manifest declares. | Integrity | Test |
| FR-035-CON-3 | Every case file SHALL live under the directory named by its `family`, so that the file tree and the register agree. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-035-AC-1 | Every case file validates against `corpus-case.schema.json`, every base against `input-bundle.schema.json`, and `corpus.json` against `corpus-manifest.schema.json`. | Test |
| FR-035-AC-2 | Every base bundle validates against the published schemas it composes and yields zero oracle diagnostics. | Test |
| FR-035-AC-3 | Every case carries at least one `derivedFrom` entry whose `artifact` path exists and whose `quote` occurs verbatim in that artifact; a quote that no longer occurs fails the gate. | Test |
| FR-035-AC-4 | Recomputing every case and base digest and `corpusDigest` reproduces `corpus.json` byte-for-byte; flipping one byte of one case file fails the gate and names that file. | Test |
| FR-035-AC-5 | No case sets `provenance.blessedFromRun` to `true`; a case that sets it without a `blessing` block fails the gate. | Test |
| FR-035-AC-6 | No case's `ops` exceeds the 64-node minimization budget, and a `boundary` case that would exceed it uses `x-repeat` and stays inside it. | Test |
| FR-035-AC-7 | An indexed `replace` or `remove` op with no preceding `test` op fails the gate, and a `test` op that no longer matches its base fails the run. | Test |
| FR-035-AC-8 | Deleting a case that a `defect` register row names fails the gate, and changing an existing `expected` block without a major `corpusVersion` bump fails the versioning gate. | Test |
| FR-035-AC-9 | Every expected diagnostic validates against `common.schema.json#/$defs/diagnostic`, and its `pointer` resolves in the case's built input bundle. | Test |
| FR-035-AC-10 | Every case id matches the declared pattern, is unique, and sits in the directory its `family` names. | Test |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-036](./FR-036-implement-the-independent-semantic-oracle.md), [FR-037](./FR-037-run-the-differential-conformance-harness.md), issue #19, issues #21..#23
