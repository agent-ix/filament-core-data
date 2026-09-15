---
id: US-017
title: "Assess against a bound static selection"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "depends_on"
---
# [US-017] Assess against a bound static selection

## Story

**As a** native Quire consumer that has already linked a static producer selection and now evaluates a claim that reads observations
**I want** every population, snapshot, window, observation record and availability fact to name the exact static bundle it was observed against and to arrive under the same identity, revision and digest discipline the static half already uses
**So that** an assessment result carries a provenance I can audit, and no assessment input can quietly widen, re-admit or replace the static selection the result claims to be about.

## Context

The static half of the producer interface is specified and reviewed: digest
selections carry an authored version, revisions carry an explicit namespace,
components and endpoints are first-class with source provenance, relationships
carry independent endpoints and their ownership, and one admitted static bundle
is reachable only through an indivisible admission.

Its review found the cost of stopping there. Three separately reported defects
turned out to be one: an assessment-kind export that no requirement refused, two
colliding dispositions for one incomplete inventory, and a single word, closure,
meaning two different things on the two sides of the boundary. Each was a symptom
of an interface edge specified from one side only. The composite index carries
that as its remaining condition.

This story is the other side. It does not relax the split the static half
protects — a static link must still be sufficient for recognition, resolution
and type and profile admission with no observation in existence. It asks instead
that when a claim does consume an observation, the document carrying it is as
explicitly identified, as firmly bound, and as honestly bounded as the static
bundle it is about.

Two distinctions matter to the reader here and are easy to lose. An unavailable
observation is a fact the producer declares, not a truth the producer decides;
which claims it prevents belongs to the selected evaluator. And a version is
four different things at this boundary — the producer interface's own version,
the model revision, the digest domain's normalization version, and the wire
schema identity — none of which may stand in for another.

## Acceptance Examples (Illustrative)

These examples clarify the consumer's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-017-EX-1: An assessment names what it was observed against

- **Given** a population document naming one admitted static bundle by identity
  and canonical digest
- **When** the consumer reads it
- **Then** the binding resolves against exactly that bundle, and a document
  naming a bundle whose digest has since changed is refused as stale rather than
  rebound to the current one

### US-017-EX-2: A static link still needs no observation

- **Given** the same static bundle and no population, snapshot or window at all
- **When** the consumer links it
- **Then** the link is admitted, and nothing in the assessment half has made an
  observation a prerequisite of static admission

### US-017-EX-3: An unavailable observation stays a fact

- **Given** an observation the producer could not obtain
- **When** the consumer evaluates a claim whose admitted support does not contain
  that observation
- **Then** the producer has reported the gap as its own availability fact, the
  result the evaluator already established decisively stands, and the producer
  has asserted no truth disposition of its own

### US-017-EX-4: An unknown interface version is refused, not approximated

- **Given** a document declaring a producer interface version the consumer does
  not implement
- **When** the consumer reads it
- **Then** the document is refused, rather than read on a best-effort basis or
  treated as the nearest version the consumer does know

## Options (Exploratory)

Approaches weighed while scoping, none of which implies commitment: carrying the
assessment documents in the same wire document as the static bundle; carrying
them as separately identified documents that name the static bundle they assess;
or leaving the binding implicit in whatever order a consumer happens to load
them. The third is named only because it is the failure mode the story exists to
prevent, and because the first version of this interface came close to it.

## Constraints (Contextual)

The static half's discipline is settled and is inherited here rather than
renegotiated. The consumer's wire shapes remain owned by the consumer's
repository at its pinned revision. Emitting an assessment document remains a
producer act and is never, by itself, an assessment result or campaign
acceptance of a claim.

## Dependencies (Contextual)

Relationships observed while scoping. Upstream: the static producer boundary and
the baseline model, population, window and configuration contracts. Downstream:
the native consumer's assessment boundary, and the resumed IR v1.2 presence
work. These are potential relationships, not formal traceability.

## Priority and Risk (Informative)

Business value is high: an assessment result without auditable provenance cannot
be relied on, and a silently rebound static selection makes a result describe a
subject nobody chose. Urgency follows the static half directly, because
implementing one half against an unspecified other half is what produced the
condition this story closes. The risk if unmet is an assessment that looks bound
and is not.

## Notes (Informative)

Open question captured for later analysis, introducing no requirement: whether a
document set spanning several assessment documents should itself carry one
identity and digest, so a consumer can name the set it evaluated rather than
enumerating its members.

## Traceability (Informative)

Potential trace relationships established during refinement: this story may
trace to the durable semantic-data governance stakeholder requirement and to
candidate functional requirements for assessment document selections, the
static-bundle binding, population membership, snapshot and window selections,
availability facts, assessment correspondence, the v1.1 projection, the producer
interface version, and bounded assessment documents. Links may be updated as
understanding evolves.
