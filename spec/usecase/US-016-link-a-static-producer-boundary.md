---
id: US-016
title: "Link a static producer boundary without inference"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "depends_on"
---
# [US-016] Link a static producer boundary without inference

## Story

**As a** native Quire consumer that links one model, profile, and configuration selection before any observation exists
**I want** the producer to hand me every identity, revision, digest, provenance locus, ownership, and export as an explicitly authored typed member
**So that** I can admit or refuse a binding from the bundle alone, without reading prose, defaulting a digest version, guessing a revision namespace, or inventing a population.

## Context

Baseline 1.2 selected the producer-side model, relationship, population, and
configuration contracts, and the `1.2.0` producer interface committed to
versioned identities and content digests. Implementation then exposed a set of
interoperability points that the accepted contract left to the reader.

The consumer side carries a four-member digest selection with its own `version`
member, and an opaque revision that is only meaningful inside an explicitly
named namespace. The producer side, as first implemented, carried a
three-member digest triple with no version member and bare revision strings.
Neither side can close that gap by inference: a consumer that defaults the
missing digest version, or that reads a bare revision inside an assumed
namespace, has manufactured authority the producer never declared.

The consumer's export vocabulary also admits `component` and `endpoint` export
kinds that the producer does not yet declare as first-class records, so a
component or endpoint reaching the consumer arrives without its own identity,
revision, digest, source provenance, ownership, or inventory membership.

Finally, the first producer bundle required a population, ordered observation
records, and a window in order to exist at all. That makes static linking —
recognition, resolution, and type/profile admission — impossible to perform
without minting assessment inputs that no one has observed. This story is about
the static half of that split only.

## Acceptance Examples (Illustrative)

These examples clarify the consumer's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-016-EX-1: A static link succeeds with no observation

- **Given** a producer bundle naming one model, its components, endpoints,
  relationships, configuration, static closure, and correspondences
- **When** the consumer links it before any population or window exists
- **Then** the link is admitted and the consumer is never asked for an
  observation, snapshot, window, or progress record

### US-016-EX-2: A substituted digest domain is refused, not repaired

- **Given** a correspondence whose native raw-byte digest is presented in the
  producer canonical-JSON domain
- **When** the consumer validates it
- **Then** the binding is refused and named, rather than revalidated in the
  other domain or treated as a cache miss

### US-016-EX-3: A bare revision is not a revision

- **Given** a producer object whose revision arrives as a bare string with no
  namespace
- **When** the consumer reads it
- **Then** the consumer refuses rather than selecting a namespace on the
  producer's behalf

### US-016-EX-4: An endpoint keeps its role and multiplicity

- **Given** a relationship whose source and target endpoints declare different
  roles and different multiplicities
- **When** the consumer reads the relationship record
- **Then** both endpoints retain their own role, type identity, and
  multiplicity, and neither is reconstructed from the other

## Options (Exploratory)

Approaches discussed while the gap was found, none of which implies commitment:
extending the producer digest and revision shapes so they map member-for-member
onto the consumer's; publishing a separate adapter that re-shapes producer
output for the consumer; or leaving each consumer to complete the missing
members under its own local convention. The third was raised only to be named
as the failure mode this story exists to prevent.

## Constraints (Contextual)

The consumer's wire shapes are already selected and are not open for
renegotiation here. The producer is the side with a free choice about how it
declares the members the consumer requires. Producing a static bundle is also
not an assessment result, so nothing in this story is evidence that a claim has
been evaluated.

## Dependencies (Contextual)

Relationships observed while scoping. Upstream: the baseline 1.2 model,
relationship, and configuration selections, and the ecosystem inventory
boundary. Downstream: the native consumer boundary and the resumed IR v1.2
presence work. These are potential relationships, not formal traceability.

## Priority and Risk (Informative)

Business value is high: every later assessment claim rests on a binding that
was admitted or refused here. Urgency is high because a consumer that guesses a
digest version or a revision namespace produces bindings that look valid and
are not. The risk if unmet is silent cross-domain and cross-namespace
substitution, which no downstream evaluation can detect.

## Notes (Informative)

Open question captured for later analysis, introducing no requirement: whether
the assessment half of the producer interface should live in the same wire
document as the static half, or in a separately identified document that names
the static bundle it assesses.

## Traceability (Informative)

Potential trace relationships established during refinement: this story may
trace to the durable semantic-data governance stakeholder requirement and to
candidate functional requirements for digest selections, namespaced revisions,
component and endpoint declarations, relationship records, producer/native
correspondence, static bundle admission, and canonical-JSON exactness. Links may
be updated as understanding evolves.
