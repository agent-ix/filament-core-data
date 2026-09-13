---
id: US-020
title: "Migrate off the legacy contract without losing a reader"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "depends_on"
---
# [US-020] Migrate off the legacy contract without losing a reader

## Story

**As an** owner of a system that already reads and writes the legacy contract
**I want** the move to generated contracts to happen in a stated order, against a
census I can check, with a window in which both representations still work
**So that** I can migrate when my own schedule allows rather than when someone
else's removal forces me to, and so that no payload I have already persisted
becomes unreadable.

## Context

The generated contracts exist and the legacy Avro contract is still in use. Both
facts will remain true for a while, and the interesting question is not how to
end that period but how to end it *safely* — which is a different problem, with
a different failure mode.

The failure mode is specific and asymmetric. Almost every mistake in a migration
can be undone by redeploying: a consumer reading the wrong shape, a writer
emitting the old form, a package pinned to a stale version. One cannot. If the
last code that could read a persisted payload is removed while that payload
still exists, redeploying the removed code is the only recovery, and that is a
restore rather than a rollback. Everything this story asks for exists to keep
that one case from happening.

The scope is smaller than the risk suggests. No external consumer of the legacy
contract is known, and no Python consumer of the published package exists outside
this repository. The one an earlier census named, `filament-ide`'s `coredb` sync
path, was superseded on 2026-08-14 by `filament-ide-rs` and is out of scope by
owner amendment of 2026-09-13. That census is a finding rather than an
assumption: a census taken once and trusted afterwards is precisely how a reader
gets missed, so it is re-measured immediately before anything is removed rather
than cited from a document.

A freeze precedes the migration, and its real content is a decision rather than
a document set. The candidate schemas, locks, compatibility report and rollback
plan exist so the decision is taken against evidence; the exceptions exist so
that "we knew about it" stays distinguishable from "we decided about it". A
freeze with no stated exceptions is usually one whose exceptions were not looked
for.

## Acceptance Examples (Illustrative)

### US-020-EX-1: A boundary with a reader keeps its representation

- **Given** a boundary whose census shows one remaining reader
- **When** the retirement reaches that boundary in its stated order
- **Then** the legacy representation is retained and that reader's owner is
  named, rather than the boundary being retired on schedule

### US-020-EX-2: No persisted payload outlives its reader

- **Given** a persisted payload written in the legacy representation
- **When** the code that reads that representation is proposed for removal
- **Then** the removal does not proceed while the payload exists, because
  redeploying removed code is a restore and not a rollback

### US-020-EX-3: The census is re-measured, not cited

- **Given** a published census recorded before the migration began
- **When** a removal is about to proceed at one boundary
- **Then** the census is taken again and must agree, and a disagreement stops
  the removal rather than being reconciled afterwards

### US-020-EX-4: Silence is not approval

- **Given** a candidate first major with a published compatibility report and no
  objections raised
- **When** the freeze is recorded
- **Then** it names a human and the conditions they accepted, and an absence of
  objections is not recorded as a decision

### US-020-EX-5: One removal reverts alone

- **Given** several retired boundaries
- **When** one of them regresses
- **Then** that removal is reverted without reverting the others, because each
  was landed in isolation

## Options (Exploratory)

Approaches considered while scoping, none implying commitment: retiring every
boundary at once behind a single flag; retiring writers first and letting
readers catch up; or keeping both representations indefinitely. The first makes
every boundary share one blast radius and one revert. The second inverts the
only ordering that protects persisted data. The third is not a migration, and
the cost it avoids is smaller than the cost of two representations that must
agree forever.

## Constraints (Contextual)

The legacy contract's shape is not open for renegotiation — it is what existing
payloads are written in, and changing it would create a third representation
rather than remove one. Nothing here publishes to a public registry, and release
stays manual. A compatibility window is a commitment about time, so shortening
one after it is stated is a breaking change to the commitment even when no byte
changes.

## Dependencies (Contextual)

Relationships observed while scoping. Upstream: the generated packages and the
version matrix that says which combinations are supported. Downstream: whatever
the re-measured census names, which today is nothing outside this repository.
These are
potential relationships, not formal traceability. `filament-ide` is not among
them: it was superseded and is out of scope.

## Priority and Risk (Informative)

Business value is high and urgency is moderate: nothing is failing today, and
the cost of getting it wrong is concentrated in the one irreversible case. The
risk if unmet is not a broken build but an unreadable payload, discovered by
whoever next tries to read it.

## Notes (Informative)

Open question captured for later analysis, introducing no requirement: whether
the compatibility window should be stated in releases or in calendar time. A
window measured in releases can be exhausted in a week by an active period, and
one measured in time can expire while a consumer is mid-migration.

## Traceability (Informative)

Potential trace relationships established during refinement: this story may
trace to the durable semantic-data governance stakeholder requirement and to
candidate functional requirements for freezing the first contract major and for
retiring the legacy contract at boundaries with no readers. Links may be updated
as understanding evolves.
