---
id: US-018
title: "Admit a producer bundle against real native artifact bytes"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "depends_on"
---
# [US-018] Admit a producer bundle against real native artifact bytes

## Story

**As a** native Quire consumer that admits a native model before it will link a producer bundle to it
**I want** the producer's own admitted fixture to name the exact export table of a real native artifact, rather than a placeholder digest over bytes nobody emitted
**So that** I can resolve every endpoint's model type and both ends of a relationship against the native artifact I actually hold, and discover a resolution defect in the producer's fixture rather than in my own integration.

## Context

[US-016](./US-016-link-a-static-producer-boundary.md) established that the
producer declares every identity, revision, digest, provenance locus, ownership
and export explicitly, so the consumer never infers one. That story is about the
*shape* of what the producer declares. This story is about whether the producer's
own evidence that the shape works is real.

The static fixtures admitted to date carry synthetic native digests — repeated
hexadecimal fill such as `sha256:5555…5555` for the native raw-byte digest and
`sha256:6666…6666` for its definition closure. Those values are well-formed and
they are admitted, because admission checks that a digest is a four-member
selection in the declared domain, not that any artifact ever hashed to it. A
fixture built that way proves the producer's members are *present*. It cannot
prove that they *resolve*, because there is no artifact on the other side of them
to resolve against.

That gap is invisible while every export mapping is also synthetic. It stops
being invisible the moment the producer claims an endpoint's model type resolves
to an exact native type export: a claim about a real export table cannot be
evidenced by a fixture that has no real export table behind it. The consumer
would be asked to accept, on the producer's word, a correspondence whose native
side is a number chosen for its readability.

A real native model also carries export kinds the producer's vocabulary
deliberately does not admit. The assessment-side `population` kind is partitioned
away from the static half, and it appears in genuine native output. A fixture
whose native side is synthetic never encounters it, so the partition is asserted
rather than exercised. Only real bytes put an inadmissible kind in front of the
producer and show what it does with one.

The two digest domains are the other thing only real bytes can test. The producer
keeps `filament-canonical-json-1` for its own canonical-JSON objects and
`quire-native-bytes-1` for raw native bytes, and the native side is a plain
SHA-256 over the artifact's exact bytes with no canonicalization first. A
placeholder digest is in neither domain in any checkable sense; it merely spells
one. A digest recomputed from bytes on disk either matches or it does not.

## Acceptance Examples (Illustrative)

### US-018-EX-1: A relationship resolves to two distinct native types

- **Given** an admitted bundle whose relationship declares a source endpoint and
  a target endpoint naming two different model type identities
- **When** the consumer resolves each endpoint's model type through the
  correspondence's export mappings
- **Then** each resolves to a different native type export, each carrying its own
  export kind and ordered path, and neither is recovered by reading the other or
  by parsing a path segment

### US-018-EX-2: The native digest is recomputed, not trusted

- **Given** a correspondence whose native raw-byte digest names a native
  rule-model artifact held by the consumer
- **When** the consumer hashes the exact bytes it holds
- **Then** the recomputed SHA-256 equals the declared digest, and a fixture whose
  declared digest matches no artifact fails this check rather than passing it
  unexamined

### US-018-EX-3: An inadmissible native export kind is not silently dropped

- **Given** a real native artifact whose export table contains an assessment-side
  `population` export alongside its type exports
- **When** the producer builds its export mappings from that table
- **Then** the `population` export is absent from the producer's static bundle
  because the static vocabulary cannot spell it, and its absence is a stated
  partition rather than an unexplained omission

### US-018-EX-4: A synthetic fixture no longer evidences resolution

- **Given** a fixture whose native raw-byte digest is placeholder fill
- **When** it is offered as evidence that endpoint model types resolve
- **Then** it is not accepted as that evidence, because no export table exists
  behind the digest for a type to resolve against

## Options (Exploratory)

Approaches considered while scoping, none implying commitment: hand-authoring a
plausible native export table into the fixture; vendoring a copy of a native
artifact into this repository; or generating the artifact from the native
producer that owns it and recording only its digest and export table here. The
first repeats the defect this story exists to remove, in a form that is harder to
notice because it looks specific. The second creates a second copy of an artifact
this repository has no authority over and no way to keep current.

## Constraints (Contextual)

The native artifact's format, its reader and its export vocabulary are owned
elsewhere and are not open for renegotiation here; this repository selects
against them and never mints them. Nothing in this story introduces a wire,
reference or tracing schema for the native side — the existing correspondence
record is the whole transport. Admitting a bundle against real bytes is still not
an assessment result, so nothing here is evidence that any claim has been
evaluated.

## Dependencies (Contextual)

Relationships observed while scoping. Upstream: the static producer boundary and
its correspondence record, and the native rule-model artifact and its reader
owned by the native language repository. Downstream: consumer integration against
the producer's admitted output. These are potential relationships, not formal
traceability.

## Priority and Risk (Informative)

Business value is high and urgency is high, because the consumer integration that
depends on type resolution cannot proceed on evidence that does not resolve. The
risk if unmet is a producer interface that passes its own suite and fails at the
first real artifact, with the defect surfacing inside the consumer's integration
rather than inside the producer's tests — the most expensive place to find it.

## Notes (Informative)

Open question captured for later analysis, introducing no requirement: whether
the producer should pin the exact native artifact revision its fixture was built
from, so that a regenerated artifact with a changed export table fails loudly
rather than drifting.

## Traceability (Informative)

Potential trace relationships established during refinement: this story may trace
to the durable semantic-data governance stakeholder requirement and to candidate
functional requirements for endpoint type-export resolution, the closed
relationship direction vocabulary, and admission against real native artifact
bytes. Links may be updated as understanding evolves.
