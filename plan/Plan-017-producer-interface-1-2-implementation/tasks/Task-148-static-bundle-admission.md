---
id: Task-148
title: "FR-117 the static bundle and its one indivisible admission operation"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-147"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1631"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1632"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1633"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1634"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1635"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1636"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1638"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1639"
    type: verifies
---
# Task-148: FR-117 the static bundle and its one indivisible admission operation

## Scope

Add `StaticProducerBundle` and `AdmittedStaticBundle`, and retire the
construct-then-validate bypass.

The bundle carries **four header members** — bundle identity, the bundle's
namespaced revision, the bundle's canonical digest selection, and the producer
interface version FR-126 declares (`1.2.0`) — and **exactly nine content member
classes**: the selected model, the selected profile, the component declarations,
the endpoint declarations, the relationship records, the inventory declaration,
the configuration document, the configuration's static prerequisite closure, and
the correspondence records. The type is closed over the nine content classes and
over the exclusion of every assessment member class, and over **no header member**
(FR-117-CON-1, FND-1800, FND-1820, E1).

`AdmittedStaticBundle` is reachable only from `StaticProducerBundle::admit()` and
`admit_json(bytes)`: a private field wrapper with read-only accessors, no public
constructor, no public member, `Serialize` only and never `Deserialize`. A refused
admission yields **no value of the type at all**. This replaces
`ProducerBundle::from_json` plus the separate `pub fn validate`, which is exactly
the bypass FR-117 forbids.

The bundle requires, contains and mints **no** population, snapshot, window,
workflow instance, relationship instance, observation record, progress record, or
observation closure. Plan-016's assessment types move under an `assessment`
module unchanged and are not reachable from the static bundle.

## Subtasks

- [x] **Red: admitted shape.** `tests/static_bundle.rs`: `tc_1631_` (a complete
  static selection is admitted as one immutable typed bundle whose four header
  members and nine content member classes are each read directly as typed members,
  and which carries no population, snapshot, window, instance, observation,
  progress record or observation closure), `tc_1632_` (`Compile`: the bundle type
  is closed over exactly the declared content member classes and that exclusion and
  over no header member — a `compile_fail` doctest on an added assessment member
  and on a match that omits a content class).
- [x] **Red: unconstructibility.** `tc_1635_` (`Compile`: three `compile_fail`
  doctests — a struct literal of the admitted type, a read of a would-be public
  member, and `serde_json::from_slice::<AdmittedStaticBundle>` — plus a runtime
  assertion that a refused admission returns `Err` and yields no value).
- [x] **Red: missing members and assessment offers.** `tc_1633_` (a bundle omitting
  any required member — a header member, an identity, a namespaced revision, a
  digest selection, a provenance locus, an ownership member, an inventory
  membership, or the static prerequisite closure — refuses naming the absent
  member; one case per member class), `tc_1634_` (an assessment member offered
  inside the static bundle refuses naming that member; an assessment document
  offered in place of a static admission refuses naming that document; a
  correspondence export of the assessment kind FR-120 partitions to the assessment
  side refuses naming that export; none is silently retained).
- [x] **Red: closure sources and ambient inputs.** `tc_1638_` (integration: a static
  admission completes from the static members of the FR-109 configuration document
  and the FR-110 inventory declaration alone, reaching no FR-108 population
  obligation, with the configuration's static prerequisite closure and the FR-116
  native definition closure kept distinct members carrying **distinct** refusals —
  FR-117-CON-5, FND-1727), `tc_1636_` (integration: an admission run with altered
  environment variables, an altered working directory, an altered wall clock and no
  network reachability produces the identical admitted bundle).
- [x] **Red: the admitted-bundle key.** `tc_1639_` (two bundles carrying one bundle
  identity and one namespaced revision with different canonical digest selections
  refuse as an identity collision **naming both** selections; re-admitting one
  bundle identity over different bytes yields a different admitted-bundle key and a
  binding naming the earlier admitted bundle refuses as stale naming both
  selections rather than resolving forward; and the bundle header identity, revision
  and digest stay distinct from the model's and the profile's even when their
  spellings coincide — FR-117-CON-6, CON-7, FND-1823, E9).
- [x] **Green: types.** `StaticProducerBundle` with the four header members and the
  nine content classes; `StaticClosure` for the configuration's static prerequisite
  closure, distinct from `native_definition_closure`; `AdmittedStaticBundle` as the
  sealed wrapper with read-only accessors and the `AdmittedBundleKey { identity,
  revision, digest }`.
- [x] **Green: one admission operation.** `admit()` and `admit_json(bytes)` construct
  and validate indivisibly: `admit_json` deserializes into a **private**
  intermediate and never exposes it. Delete `ProducerBundle::from_json` and the
  public `validate`; `ProducerBundle` itself is removed rather than deprecated.
- [x] **Green: assessment module split.** Move `PopulationDocument`,
  `PopulationMember`, `RelationshipInstance`, `ObservationRecord`, `WindowDocument`,
  `WindowCoverage`, `AvailabilityFact`, `AvailabilityAssessment` and their
  dispositions into `src/assessment.rs` unchanged, keeping Plan-016's
  TC-1373..TC-1381 controls green. Nothing in the static path references that
  module.
- [x] **Green: refusal codes.** `ASSESSMENT_INPUT_IN_STATIC_BUNDLE`,
  `IDENTITY_ABSENT` for a header member, the identity-collision refusal and the
  stale-binding refusal — each blocking, each naming what FR-117's Outputs say it
  names.
- [x] **Falsify.** Add a `Deserialize` derive to `AdmittedStaticBundle` in a scratch
  copy and prove `tc_1635_` fails to fail — i.e. the `compile_fail` doctest now
  compiles and the control reports the breach. Read `std::env::var` during admission
  in a scratch copy and prove `tc_1636_` fails.

## Exit conditions

- One indivisible admission operation is the only way to obtain an
  `AdmittedStaticBundle`; the three `compile_fail` controls of TC-1635 all fail to
  compile, and a refused admission yields no value of the type.
- The admitted bundle carries four header members and nine content member classes,
  no assessment member class, and no ambient input reaches admission.
- The admitted-bundle key is identity plus revision plus digest together; a
  collision refuses naming both digest selections and a prior binding refuses as
  stale rather than resolving forward.
- `ProducerBundle`, `from_json` and the public `validate` no longer exist.
- TC-1631..TC-1636, TC-1638 and TC-1639 are traced executable controls, and
  Plan-016's TC-1373..TC-1381 still pass from the `assessment` module.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from
  the two pre-existing reds.

## Deliverables

- `crates/baseline-producer/src/static_bundle.rs`, `src/assessment.rs`
- `crates/baseline-producer/tests/static_bundle.rs`
- `crates/baseline-producer/src/lib.rs` reduced to module declarations and re-exports

## Notes

- The producer interface version is authored here as the header member `1.2.0`
  because FR-117 obliges it, **but FR-126 is not implemented by this plan**: the
  `wireSchema` member on every emitted document, the four separately named
  versions, the one-version-per-document-set rule and the v1.1 projection document
  set are out of scope and FR-126's matrix rows stay `🚧`.
- FR-117-AC-6 and AC-9 (TC-1637) are the presentation claim — static admission
  only, never campaign acceptance — and are recorded by Task-151, not here.
- `Compile` is the repository's own spelling for a typecheck-time method
  (FND-1745); the unconstructibility and member-set-closure obligations are
  verified that way and not restated as runtime assertions.
- Unblocks: Task-149 (there is now an admitted bundle whose bytes can be golden).
