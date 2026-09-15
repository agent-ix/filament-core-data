---
id: FR-122
title: "Emit snapshot and window selections"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-118"
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
membership digest selection, an observation-record document carrying its
`observationRecordIdentity`, the exact member-object identities that record
concerns, and its ordering position in the window that orders it, and a window
document carrying its `windowIdentity`, the exactly one population or snapshot it
selects from, its declared `clockFamily`, and exactly one of that family's
half-open coverage forms.

## Inputs

- The authored observation instant supplied with a snapshot selection, and the
  authored `epoch` supplied with a `fixed-sample` window selection, each read as
  a declaration authored outside this producer rather than read from a clock.

- The snapshot document's `snapshotIdentity`, its `populationIdentity`, its
  `observedAt` observation instant, and its immutable membership digest
  selection.
- Each observation-record document's `observationRecordIdentity`, the exact
  member-object identities that record concerns, and its `orderingPosition` in
  the window that orders it.
- The window document's `windowIdentity`, the one `populationIdentity` or
  `snapshotIdentity` it selects from, and its declared `clockFamily`.
- The declared coverage selection of that clock family: `event-position`
  integer positions, `fixed-sample` epoch, period, unit, and sample indexes, or
  `timestamp` RFC 3339 UTC instants.
- A `fixed-sample` `period` supplied as an exact rational carrying its
  `numerator` and its `denominator` as arbitrary-precision base-10 integers with
  a positive `denominator`.
- The ordered observation-record identities with their member-object identities,
  or the content digest of that ordered record set with its retrievable
  immutable set document.
- The declared temporal-or-choreography selection kind supplied with a
  selection, authored outside this producer and read as a declaration rather
  than derived from a clause, a protocol, or a clock.

## Outputs

- One snapshot document whose identity, cut population, observation instant, and
  immutable membership digest selection are each separately readable typed
  members.
- One observation-record document per observation record, whose
  `observationRecordIdentity`, member-object identities, and `orderingPosition`
  are each separately readable typed members.
- One window document whose identity, single selected population or snapshot,
  declared `clockFamily`, and single half-open coverage form are each separately
  readable typed members.
- A `fixed-sample` `period` emitted as an exact rational whose `numerator` and
  `denominator` are each an integer member of the canonical bytes
  [FR-118](./FR-118-validate-filament-canonical-json-1.md) defines.
- A blocking refusal naming the offending clock family, coverage form, selection
  source, absent window, inexact period, or colliding record identity when the
  selection cannot be emitted.

## Behavior

- The producer SHALL emit `snapshotIdentity` on every snapshot document.
- The producer SHALL emit, on every snapshot document, the identity of the one
  population that snapshot cuts.
- The producer SHALL emit `observedAt` as the snapshot document's observation
  instant, taken from the authored observation instant supplied with the snapshot
  selection.
- The producer SHALL read the authored observation instant as a declaration.
- The producer SHALL NOT derive `observedAt` from a wall clock, a host clock, a
  database timestamp, or an arrival time.
- If a snapshot selection supplies no authored observation instant, then the
  producer SHALL refuse that selection rather than substituting an instant.
- The producer SHALL emit an immutable membership digest selection on every
  snapshot document.
- The producer SHALL emit `observationRecordIdentity` on every
  observation-record document.
- The producer SHALL emit, on every observation-record document, the exact
  member-object identities that record concerns.
- The producer SHALL emit `orderingPosition` on every observation-record
  document as that record's position in the window that orders it.
- If two observation-record documents of one window carry one
  `observationRecordIdentity`, then the producer SHALL refuse that window
  document, naming the colliding record identity.
- If two observation-record documents of one window carry one
  `orderingPosition`, then the producer SHALL refuse that window document,
  naming the competing ordering position.
- The producer SHALL emit `windowIdentity` on every window document.
- The producer SHALL emit, on every window document, the identity of exactly one
  population or exactly one snapshot it selects from.
- The producer SHALL emit a declared `clockFamily` on every window document.
- The producer SHALL emit as a window document's `clockFamily` only a member of
  the closed clock-family vocabulary
  [FR-108](./FR-108-bind-populations-to-model-contracts.md) declares.
- The producer SHALL emit exactly one of the declared clock family's half-open
  coverage forms on a window document.
- The producer SHALL emit an `event-position` window's coverage as integer
  `startInclusive` and `endExclusive` positions in the producer's declared event
  sequence.
- The producer SHALL emit a `fixed-sample` window's coverage as an exact
  `epoch`, an exact rational `period`, a declared `unit`, and integer
  `startInclusive` and `endExclusive` sample indexes.
- The producer SHALL emit a `fixed-sample` window's `period` as an exact
  rational carrying a `numerator` member and a `denominator` member.
- The producer SHALL emit that `numerator` and that `denominator` as
  arbitrary-precision base-10 integers, each digested as an integer member under
  the canonical numeric rules FR-118 defines.
- The producer SHALL emit a `fixed-sample` `period` whose `denominator` is
  greater than zero.
- The producer SHALL NOT emit a decimal expansion of a `fixed-sample` `period`
  in place of that period's `numerator` and `denominator`.
- The producer SHALL NOT digest a decimal expansion of a `fixed-sample` `period`
  in place of that period's `numerator` and `denominator`.
- If a `fixed-sample` window's `period` carries a `denominator` of zero or a
  negative `denominator`, then the producer SHALL refuse that window document,
  naming that denominator.
- The producer SHALL emit a `timestamp` window's coverage as RFC 3339 UTC
  `startInclusive` and `endExclusive` instants.
- The producer SHALL emit either the complete ordered observation-record
  identities with their member-object identities or the content digest of that
  ordered record set with its retrievable immutable set document.
- The producer SHALL treat a member as belonging to a snapshot or a window only
  when that member's exact `objectIdentity` is listed or covered by the declared
  membership digest.
- The producer SHALL infer snapshot and window membership from no wall clock, no
  database state, no event arrival order, and no query default.
- The producer SHALL infer elapsed time from no wall clock, no database state, no
  event arrival order, and no query default.
- The producer SHALL interpret no clause, no protocol, and no clock in order to
  decide whether a selection is temporal or choreography-aware.
- If a window document declares a coverage form belonging to a clock family
  other than its declared `clockFamily`, then the producer SHALL refuse that
  window document, naming the incompatible coverage form.
- If a window document selects from two populations, or from a population and a
  snapshot at once, then the producer SHALL refuse that window document, naming
  the competing selection sources.
- If a selection whose supplied declaration states that it is temporal or
  choreography-aware carries no window document, then the producer SHALL refuse
  that selection, naming the absent window.
- The producer SHALL NOT construct a window for a selection whose supplied
  declaration states that it is temporal or choreography-aware and that carries
  none.
- If a `fixed-sample` window's `period` is expressed as a binary floating-point
  value, then the producer SHALL refuse that window document, naming that
  period.
- The producer SHALL emit each snapshot, observation-record, and window refusal
  as a blocking input refusal.
- The producer SHALL NOT emit a snapshot, observation-record, or window refusal
  as a warning, a cache miss, or an invitation to refetch a different version.
- The producer SHALL NOT present emission of a snapshot, observation-record, or
  window document as campaign acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-122-CON-1 | The producer SHALL pair each emitted `clockFamily`, drawn from the closed clock-family vocabulary FR-108 declares, with only that family's own coverage form. | Integrity | Test |
| FR-122-CON-2 | The producer SHALL emit every coverage form as half-open, with an inclusive start and an exclusive end, in every clock family FR-108 declares. | Correctness | Test |
| FR-122-CON-3 | The producer SHALL expose a `fixed-sample` `period` type carrying a `numerator` member and a positive `denominator` member as arbitrary-precision base-10 integers, exposing no decimal-expansion member and no binary floating-point member for that period, and taking the prohibition on binary floating point itself from FR-118 rather than restating it. | Integrity | Compile |
| FR-122-CON-4 | The producer SHALL keep `windowIdentity`, `populationIdentity`, `snapshotIdentity`, member-object identity, and `observationRecordIdentity` separate members whose equal spelling merges none of them. | Traceability | Test |
| FR-122-CON-5 | The producer SHALL determine snapshot and window membership from the listed exact object identities or the declared membership digest alone, reaching no wall clock, database state, event arrival order, or query default. | Portability | Test |
| FR-122-CON-6 | The producer SHALL take the temporal-or-choreography property of a selection from that selection's supplied declaration alone, exposing no operation that derives that property from a clause, a protocol, or a clock. | Interface | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-122-AC-1 | A snapshot document carrying its `snapshotIdentity`, the one population it cuts, its `observedAt` instant, and its immutable membership digest selection is emitted, and each member is read directly as a typed member. | Test |
| FR-122-AC-2 | One window document per clock family FR-108 declares is emitted and accepted: `event-position` with integer `startInclusive`/`endExclusive` positions, `fixed-sample` with an exact `epoch`, an exact rational `period`, a declared `unit`, and integer sample indexes, and `timestamp` with RFC 3339 UTC half-open instants, each selecting from exactly one population or snapshot. | Test |
| FR-122-AC-3 | A window document declaring a coverage form belonging to another clock family refuses with a blocking refusal naming the incompatible coverage form. | Test |
| FR-122-AC-4 | A window document selecting from two populations refuses, and one selecting from a population and a snapshot at once refuses, each naming the competing selection sources. | Test |
| FR-122-AC-5 | A selection whose supplied declaration states that it is temporal or choreography-aware and that carries no window document refuses, no window is constructed for it, and a selection carrying no such declaration is emitted without the producer deriving that property from a clause, a protocol, or a clock. | Test |
| FR-122-AC-6 | A `fixed-sample` window whose `period` is expressed as a binary floating-point value refuses with a blocking refusal naming that period. | Test |
| FR-122-AC-7 | A member is resolved into a snapshot or window only when its exact `objectIdentity` is listed or covered by the declared membership digest, and a near-matching identity resolves into neither. | Test |
| FR-122-AC-8 | Two observation records for one member object are emitted as two observation-record documents carrying two distinct `observationRecordIdentity` members and two distinct `orderingPosition` members, and a window carrying two records under one record identity or one ordering position refuses, naming the collision. | Test |
| FR-122-AC-9 | A snapshot, observation-record, and window emission run with an altered wall clock, altered database state, reversed event arrival order, and no query default produces the identical documents and identical membership. | Test |
| FR-122-AC-10 | A `fixed-sample` `period` of one third is emitted and digested as a `numerator` of `1` and a `denominator` of `3`, each read back as the same arbitrary-precision base-10 integer, with no decimal expansion of that period emitted or digested and no digit rounded. | Property |
| FR-122-AC-11 | A `fixed-sample` window whose `period` carries a `denominator` of zero refuses, and one carrying a negative `denominator` refuses, each naming that denominator. | Test |

## Dependencies

- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines the
  population and observation semantics, including the closed clock-family
  vocabulary, the half-open coverage of each clock family, and the separation of
  object membership from observation coverage, that this requirement emits
  documents for rather than redefines; the membership-versus-coverage
  distinction is FR-108's alone and is cited here rather than restated.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the
  four-member digest selection that the immutable membership digest selection of
  a snapshot document and the content digest of an ordered record set are
  emitted as.
- [FR-118](./FR-118-validate-filament-canonical-json-1.md) defines the canonical
  bytes and the exact numeric domain under which a `period`'s `numerator` and
  `denominator` are each digested as an integer member, and owns the prohibition
  on representing a canonical number as a binary floating-point value, which
  this requirement cites rather than re-owns.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  identity, revision, and digest selections every assessment document carries,
  including the snapshot membership digest selection this requirement emits.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md)
  binds these snapshot, observation-record, and window documents to one admitted
  static bundle.
- [FR-121](./FR-121-emit-finite-population-membership-records.md) emits the
  finite population membership whose exact object identities a snapshot cut and
  a window coverage select over.
- Vocabulary, stated once for this requirement: `membership` here is snapshot
  and window membership of member objects only, never the inventory membership
  of FR-114 or the population membership of FR-121; `selection` here is a
  snapshot cut or a window's single population-or-snapshot source, never a
  digest, revision, or configuration selection; this requirement names no
  closure of any kind.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract, and its window mapping selects the clock
  families and their half-open coverage forms that this requirement emits.
- The consumer contract this requirement maps onto is an assumed external
  contract that this increment does not own:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `BindingRequirement` record carries the binding-kind members this half
  supplies later inputs against, whose closed artifact-kind vocabulary carries
  the members a snapshot document and an observation-record document are
  referenced under, and whose `Representation` vocabulary carries a rational
  alternative bounded by integer numerator minima and maxima and a maximum
  denominator, which is the same exact-rational form this requirement emits a
  `period` in. Member lists are cited from that revision and are not copied
  here.
- Open cross-repository item, recorded and not a producer obligation: no
  vocabulary at that pinned revision carries a `window` member, so a window is
  supplied only through the clock binding requirement until
  `ix://agent-ix/quire-spec-language` adds one.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the profile that classifies a selection as temporal or
  choreography-aware is the consumer's, and its declaration reaches this
  producer as an input; a non-temporal state profile omits a window only when it
  names one snapshot directly, a temporal or choreography profile refuses a
  missing or clock-family-incompatible window on its own side rather than
  constructing one, and the consumer maps only the declared coverage. This
  requirement refuses only on the declaration it is given.
