---
id: FR-122
title: "Emit snapshot and window selections"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-120"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-121"
    type: "depends_on"
---
# FR-122: Emit snapshot and window selections

## Description

The producer SHALL emit a snapshot document carrying its `snapshotIdentity`, the
one population it cuts, its `observedAt` observation instant, and its immutable
membership digest selection, together with a window document carrying its
`windowIdentity`, the exactly one population or snapshot it selects from, its
declared `clockFamily`, and exactly one of that family's half-open coverage
forms.

## Inputs

- The snapshot document's `snapshotIdentity`, its `populationIdentity`, its
  `observedAt` observation instant, and its immutable membership digest
  selection.
- The window document's `windowIdentity`, the one `populationIdentity` or
  `snapshotIdentity` it selects from, and its declared `clockFamily`.
- The declared coverage selection of that clock family: `event-position`
  integer positions, `fixed-sample` epoch, period, unit, and sample indexes, or
  `timestamp` RFC 3339 UTC instants.
- The ordered observation-record identities with their member-object identities,
  or the content digest of that ordered record set with its retrievable
  immutable set document.
- The selected claim's declaration of whether it is temporal or
  choreography-aware.

## Outputs

- One snapshot document whose identity, cut population, observation instant, and
  immutable membership digest selection are each separately readable typed
  members.
- One window document whose identity, single selected population or snapshot,
  declared `clockFamily`, and single half-open coverage form are each separately
  readable typed members.
- A blocking refusal naming the offending clock family, coverage form, selection
  source, absent window, or inexact period when the selection cannot be emitted.

## Behavior

- The producer SHALL emit `snapshotIdentity` on every snapshot document.
- The producer SHALL emit, on every snapshot document, the identity of the one
  population that snapshot cuts.
- The producer SHALL emit `observedAt` as the snapshot document's observation
  instant.
- The producer SHALL emit an immutable membership digest selection on every
  snapshot document.
- The producer SHALL emit `windowIdentity` on every window document.
- The producer SHALL emit, on every window document, the identity of exactly one
  population or exactly one snapshot it selects from.
- The producer SHALL emit a declared `clockFamily` on every window document.
- The producer SHALL treat `event-position`, `fixed-sample`, and `timestamp` as
  the complete closed clock-family vocabulary of this interface.
- The producer SHALL emit exactly one of the declared clock family's half-open
  coverage forms on a window document.
- The producer SHALL emit an `event-position` window's coverage as integer
  `startInclusive` and `endExclusive` positions in the producer's declared event
  sequence.
- The producer SHALL emit a `fixed-sample` window's coverage as an exact
  `epoch`, a positive rational `period`, a declared `unit`, and integer
  `startInclusive` and `endExclusive` sample indexes.
- The producer SHALL emit a `fixed-sample` window's `period` as an exact
  rational value.
- The producer SHALL NOT emit a `fixed-sample` window's `period` as a binary
  floating-point value.
- The producer SHALL emit a `timestamp` window's coverage as RFC 3339 UTC
  `startInclusive` and `endExclusive` instants.
- The producer SHALL emit either the complete ordered observation-record
  identities with their member-object identities or the content digest of that
  ordered record set with its retrievable immutable set document.
- The producer SHALL treat a member as belonging to a snapshot or a window only
  when that member's exact `objectIdentity` is listed or covered by the declared
  membership digest.
- The producer SHALL keep object membership and observation coverage distinct
  facts.
- The producer SHALL NOT claim an observation record's coverage from a member's
  membership alone.
- The producer SHALL infer membership from no wall clock, no database state, no
  event arrival order, and no query default.
- The producer SHALL infer elapsed time from no wall clock, no database state, no
  event arrival order, and no query default.
- If a window document declares a coverage form belonging to a clock family
  other than its declared `clockFamily`, then the producer SHALL refuse that
  window document, naming the incompatible coverage form.
- If a window document selects from two populations, or from a population and a
  snapshot at once, then the producer SHALL refuse that window document, naming
  the competing selection sources.
- If a temporal or choreography selection carries no window document, then the
  producer SHALL refuse that selection, naming the absent window.
- The producer SHALL NOT construct a window for a temporal or choreography
  selection that carries none.
- If a `fixed-sample` window's `period` is expressed as a binary floating-point
  value, then the producer SHALL refuse that window document, naming that
  period.
- The producer SHALL emit each snapshot and window refusal as a blocking input
  refusal.
- The producer SHALL NOT emit a snapshot or window refusal as a warning, a cache
  miss, or an invitation to refetch a different version.
- The producer SHALL NOT present emission of a snapshot or window document as
  campaign acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-122-CON-1 | The producer SHALL pair each emitted `clockFamily`, drawn from exactly `event-position`, `fixed-sample`, and `timestamp`, with only that family's own coverage form. | Integrity | Test |
| FR-122-CON-2 | The producer SHALL emit every coverage form as half-open, with an inclusive start and an exclusive end, in all three clock families. | Correctness | Test |
| FR-122-CON-3 | The producer SHALL emit a `fixed-sample` `period` as an exact rational value, rounding it to no binary64 value and substituting no binary64 value for it. | Integrity | Test |
| FR-122-CON-4 | The producer SHALL keep `windowIdentity`, `populationIdentity`, `snapshotIdentity`, member-object identity, and observation-record identity separate members whose equal spelling merges none of them. | Traceability | Test |
| FR-122-CON-5 | The producer SHALL determine snapshot and window membership from the listed exact object identities or the declared membership digest alone, reaching no wall clock, database state, event arrival order, or query default. | Portability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-122-AC-1 | A snapshot document carrying its `snapshotIdentity`, the one population it cuts, its `observedAt` instant, and its immutable membership digest selection is emitted, and each member is read directly as a typed member. | Test |
| FR-122-AC-2 | One window document per clock family is emitted and accepted: `event-position` with integer `startInclusive`/`endExclusive` positions, `fixed-sample` with an exact `epoch`, a positive rational `period`, a declared `unit`, and integer sample indexes, and `timestamp` with RFC 3339 UTC half-open instants, each selecting from exactly one population or snapshot. | Test |
| FR-122-AC-3 | A window document declaring a coverage form belonging to another clock family refuses with a blocking refusal naming the incompatible coverage form. | Test |
| FR-122-AC-4 | A window document selecting from two populations refuses, and one selecting from a population and a snapshot at once refuses, each naming the competing selection sources. | Test |
| FR-122-AC-5 | A temporal or choreography selection carrying no window document refuses, and no window is constructed for it. | Test |
| FR-122-AC-6 | A `fixed-sample` window whose `period` is expressed as a binary floating-point value refuses with a blocking refusal naming that period. | Test |
| FR-122-AC-7 | A member is resolved into a snapshot or window only when its exact `objectIdentity` is listed or covered by the declared membership digest, and a near-matching identity resolves into neither. | Test |
| FR-122-AC-8 | Two observation records for one member object remain two records, and the member's membership alone claims neither record's coverage. | Test |
| FR-122-AC-9 | A snapshot and window emission run with an altered wall clock, altered database state, reversed event arrival order, and no query default produces the identical documents and identical membership. | Test |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines the
  population and observation semantics, including the half-open coverage of the
  three clock families and the separation of membership from coverage, that this
  requirement emits documents for rather than redefines.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  identity, revision, and digest selections every assessment document carries,
  including the snapshot membership digest selection this requirement emits.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md)
  binds these snapshot and window documents to one admitted static bundle.
- [FR-121](./FR-121-emit-finite-population-membership-records.md) emits the
  finite population membership whose exact object identities a snapshot cut and
  a window coverage select over.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract, and its window mapping selects the three
  clock families and their half-open coverage forms that this requirement emits.
- The consumer contract this requirement maps onto is an assumed external
  contract that this increment does not own:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which carries
  the `BindingRequirement` record with its `BindingKind` members `snapshot`,
  `population`, `clock`, and `observation`, and the `ArtifactKind` members
  `snapshot` and `observation`.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: a non-temporal state profile omits a window only when it names one
  snapshot directly, a temporal or choreography profile refuses a missing or
  clock-family-incompatible window rather than constructing one, and the
  consumer maps only the declared coverage.
