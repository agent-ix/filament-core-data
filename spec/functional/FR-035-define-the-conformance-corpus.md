---
id: FR-035
title: "Define the semantic conformance corpus, its versioning, and its provenance"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
---
# [FR-035] Define the semantic conformance corpus, its versioning, and its provenance

## Description

The repository SHALL publish a versioned semantic conformance corpus under
`conformance/` in which every case is a declarative, minimized document whose
input is a base document plus an ordered JSON Patch, and whose expected result
cites the contract clause it was derived from.

## Inputs

- The published v1 contract: `schema/semantic/v1/*.json` and `docs/semantic-data-system/contracts-v1.md`
- The semantic-core declaration grammar and lowering table (FR-031..FR-034)
- The acceptance criteria of issue #19, issue #21, issue #22, and issue #23

## Outputs

- `conformance/corpus.json`: the corpus manifest — `corpusVersion`, targeted `contractVersions`, the construct register, the case index with a per-case digest, and `corpusDigest`
- `conformance/schema/corpus-case.schema.json`, `conformance/schema/corpus-manifest.schema.json`, `conformance/schema/adapter-result.schema.json`
- `conformance/bases/<base-id>.json`: the shared, contract-valid base documents
- `conformance/cases/<family>/<case-id>.json`: one file per case
- `conformance/README.md`: the versioning, minimization, and provenance rules in prose

## Behavior

- A case file SHALL carry `id`, `title`, `family`, `class` (`positive`, `negative`, `boundary`, or `evolution`), `kind` (`document` or `compatibility`), `contractVersion`, `base`, `ops` (an RFC 6902 JSON Patch, possibly empty), `covers`, `derivedFrom`, `provenance`, and `expected`.
- The corpus SHALL construct a case's input document by applying `ops` to the named base document.
- The corpus SHALL apply no transformation to a case's input document other than that patch.
- A case whose `kind` is `compatibility` SHALL additionally carry `beforeBase` and `beforeOps`, which construct the prior document the same way.
- A case whose `kind` is `compatibility` SHALL carry a `classification` in its `expected` block.
- `derivedFrom` SHALL carry at least one entry naming an `artifact` under `schema/semantic/v1/` or `docs/semantic-data-system/`, a `locator` (a JSON pointer or a heading), and the `quote` the expectation was read from.
- `provenance` SHALL carry `authoredFor` (the issue that authored the case), `blessedFromRun` (a boolean), and, when the case reproduces a discovered defect, `reproduces` naming that defect's register entry.
- A case whose `provenance.blessedFromRun` is `true` SHALL additionally carry a `blessing` block naming the implementation, its version, the run command, and the reviewer who checked the derivation by hand.
- If a case sets `provenance.blessedFromRun` to `true` without a `blessing` block, then the corpus gate SHALL fail and name that case.
- A `negative` case SHALL declare exactly one intended violation.
- If the oracle returns other than exactly one diagnostic for a `negative` case, then the corpus gate SHALL fail and name that case.
- A `positive` case SHALL declare `expected.resultState: "success"` and an empty expected diagnostic list.
- A case SHALL declare `expected.diagnostics` as an ordered list whose entries carry `code`, `pointer` (an RFC 6901 pointer into the input document), and, when the addressed node or its nearest ancestor carries an `origin.source`, the exact `locus`.
- If an expected diagnostic addresses a node under an `origin.source` and omits `locus`, then the corpus gate SHALL fail and name that diagnostic.
- The corpus manifest SHALL record `corpusVersion` as SemVer, where adding a case or a construct-register row is a minor change, changing or removing an existing case's `expected` is a major change, and editing a title, `derivedFrom`, or prose is a patch change.
- The corpus manifest SHALL record, per case, the SHA-256 digest of that case's canonical bytes, and `corpusDigest` as the SHA-256 over the identity-sorted case digests.
- If a case file's recomputed digest differs from its manifest row, then the corpus gate SHALL fail and name the case.
- The corpus SHALL keep every case at or below a declared node budget of 64 JSON nodes in `ops`, so that each case reads as one deliberate difference from its base.
- The corpus SHALL NOT delete a case that reproduces a discovered defect after that defect is fixed.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-035-CON-1 | Every base document under `conformance/bases/` SHALL validate against `semantic-ir.schema.json` and return zero oracle diagnostics before any patch is applied. | Integrity | Test |
| FR-035-CON-2 | Every case id SHALL be unique across the corpus and match `^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-[0-9]{2}$`. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-035-AC-1 | Every case file validates against `corpus-case.schema.json`, and `corpus.json` validates against `corpus-manifest.schema.json`. | Test |
| FR-035-AC-2 | Every base document validates against `semantic-ir.schema.json` and yields zero oracle diagnostics. | Test |
| FR-035-AC-3 | Every case carries at least one `derivedFrom` entry whose `artifact` path exists in the repository and whose `quote` occurs verbatim in that artifact. | Test |
| FR-035-AC-4 | Every `negative` case yields exactly one oracle diagnostic; a case seeded with a second violation fails the gate. | Test |
| FR-035-AC-5 | Every expected diagnostic that addresses a node carrying an `origin.source` declares a `locus` equal to that origin's `sourceLocus`; removing the `locus` fails the gate. | Test |
| FR-035-AC-6 | Recomputing every case digest and `corpusDigest` reproduces `corpus.json` byte-for-byte; mutating one case byte fails the gate and names that case. | Test |
| FR-035-AC-7 | No case sets `provenance.blessedFromRun` to `true`; a case that sets it without a `blessing` block fails the gate. | Test |
| FR-035-AC-8 | No case's `ops` exceeds 64 JSON nodes. | Test |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-036](./FR-036-implement-the-independent-semantic-oracle.md), [FR-037](./FR-037-run-the-differential-conformance-harness.md), issue #19, issues #21..#23
