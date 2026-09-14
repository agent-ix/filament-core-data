---
id: Task-144
title: "FR-112 versioned digest selections and FR-113 namespaced revisions"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-143"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1600"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1601"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1602"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1603"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1604"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1605"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1606"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1607"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1608"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1609"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1610"
    type: verifies
---
# Task-144: FR-112 versioned digest selections and FR-113 namespaced revisions

## Scope

Replace `DigestTriple` with
`DigestSelection { algorithm, domain, version, value }` — the rename plus the new
**authored** `version` member — and replace every bare revision string with
`Revision { namespace, value }`. Both map 1:1 onto the pinned consumer
`SelectedDigest { domain, version, algorithm, value }` and
`Revision { namespace, value }`. Add the closed vocabularies, the
configuration-declared selections, and the `ERR-29x` refusal codes.

The two carve-outs are not negotiable and are the reason FND-1700/FND-1704/
FND-1714/FND-1715 exist: the consumer-owned `ArtifactRef.digest` is **one
raw-byte digest string** and the consumer-owned `NativeSource.revision` is **an
editable native authority label**. Neither is a producer-authored selection and
neither refuses (FR-112-CON-4, FR-113-CON-4).

## Subtasks

- [x] **Red: digest shape.** `tests/digest.rs`: `tc_1600_` (a canonical-object
  digest and a native raw-byte digest each emitted as the four-member selection
  whose members map member-for-member onto the pinned consumer `SelectedDigest`,
  with `version` a separate authored member that the domain spelling never
  supplies), `tc_1605_` (property: one producer object serialized for
  transmission under two different wire member orders yields one identical digest
  `value`, because the digest input is the FR-118 canonical byte string of
  Task-143 and never the producer's own serializer).
- [x] **Red: digest refusals.** `tc_1601_` (a canonical-object digest offered
  under `quire-native-bytes-1` refuses and a native raw-byte digest offered under
  `filament-canonical-json-1` refuses — neither is revalidated in the other
  domain nor read as a cache miss), `tc_1602_` (a recomputed value differing from
  the declared value refuses blocking, not as a warning, a cache miss, or a
  refetch invitation), `tc_1603_` (absent `version`; a domain or version outside
  the closed admissible vocabulary; an in-vocabulary pair the configuration
  document does not select; and a bare hash string offered in place of a
  selection — each refuses and binds nothing), `tc_1604_` (a source-provenance
  locus carrying `ArtifactRef.digest` as one raw-byte string and
  `NativeSource.revision` as an authority label is admitted, and neither refuses
  as a malformed digest selection).
- [x] **Red: revisions.** `tests/revision.rs`: `tc_1606_` (producer model,
  component, endpoint and relationship revisions under
  `filament-core-data/producer-object-revision-1`, native artifact and definition
  revisions under `quire-native/definition-revision-1`, both members mapping onto
  the pinned consumer `Revision`, and no third namespace emitted anywhere),
  `tc_1607_` (a native definition revision under the producer-object namespace
  refuses; a producer-object revision under the native definition namespace
  refuses), `tc_1608_` (a bare revision string offered in place of a two-member
  revision the producer authors refuses and binds nothing), `tc_1609_` (a
  namespace outside the closed vocabulary refuses; one inside it that the
  configuration document does not declare as a selection refuses — two separate
  refusals, per FND-1723), `tc_1610_` (two revisions sharing one `value` spelling
  under the two declared namespaces stay two distinct revisions and never merge;
  a locus carrying the consumer-owned `NativeSource.revision` label and
  `ArtifactRef.digest` string is admitted).
- [x] **Green: types and constants.** `DigestSelection` with
  `CANONICAL_JSON_DOMAIN = "filament-canonical-json-1"`,
  `NATIVE_BYTES_DOMAIN = "quire-native-bytes-1"`,
  `DIGEST_DOMAIN_VERSION = "1"`, and
  `validate_domain(domain, version)` refusing substitution, absent or unknown
  version, and a `value` not matching `sha256:<64 lowercase hex>`. `Revision`
  with `PRODUCER_REVISION_NAMESPACE = "filament-core-data/producer-object-revision-1"`
  and `NATIVE_REVISION_NAMESPACE = "quire-native/definition-revision-1"`.
- [x] **Green: configuration selections.** The configuration document declares
  `digestSelections` (domain/version pairs) and `revisionNamespaces`; an
  in-vocabulary but undeclared pair or namespace refuses under its own code,
  distinct from the outside-vocabulary code.
- [x] **Green: refusal codes.** Add the digest and revision codes of the
  `ERR-29x` set: `DIGEST_VERSION_ABSENT`, `DIGEST_VERSION_UNKNOWN`,
  `DIGEST_DOMAIN_SUBSTITUTED`, `DIGEST_VALUE_MALFORMED`, `DIGEST_MISMATCH`,
  `REVISION_NAMESPACE_ABSENT`, `REVISION_NAMESPACE_UNDECLARED`,
  `REVISION_NAMESPACE_SUBSTITUTED`, each blocking, each naming the offending
  selection.
- [x] **Green: migrate Plan-016.** Rewrite `ProducerObjectReference.revision`
  and `NativeArtifactReference.revision` to `Revision`, and every
  `DigestTriple` occurrence in `src/` and in
  `fixtures/baseline-1-2/relationship-population-a.json` to `DigestSelection`.
  `DigestTriple` is removed, not aliased: a deprecated-shape fallback is exactly
  what FR-112 forbids.
- [x] **Falsify.** Derive `version` from the domain spelling in a scratch copy
  and prove `tc_1600_` fails (FR-112-CON-3). Default an absent namespace in a
  scratch copy and prove `tc_1608_` fails.

## Exit conditions

- Every producer-authored digest is four members and every producer-authored
  revision is two members; no bare string and no three-member triple survives in
  `src/` or in any fixture.
- TC-1600..TC-1610 are traced executable controls, with the two carve-outs
  admitted rather than refused.
- Plan-016's TC-1373..TC-1381 controls still pass over the new shapes, and
  `fixtures/baseline-1-2/relationship-population-a.json` still loads.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from
  the two pre-existing reds.

## Deliverables

- `crates/baseline-producer/src/digest.rs`, `src/revision.rs`, `src/refusal.rs`
- `crates/baseline-producer/tests/digest.rs`, `tests/revision.rs`
- Migrated `src/lib.rs`, `tests/producer_contract.rs`,
  `fixtures/baseline-1-2/relationship-population-a.json`,
  `schema/baseline/v1/producer-bundle.schema.json`

## Notes

- The canonical-object digest input is FR-118's canonicalizer output, never the
  crate's own serializer (FR-112-CON-2, FND-1722): call Task-143's canonicalizer,
  do not restate the self-digest exclusion here.
- This is the breaking half of the API change. The crate is `publish = false`
  with no registry consumer, so no migration shim is owed and none is written.
- Unblocks: Task-145 (a component record carries one digest selection and three
  namespaced revisions).
