# Semantic baseline 1.2 — draft contracts

Status: draft baseline for `filament-core-data#95`. This document selects the
source-of-truth approach for field presence and defines the model,
relationship, population, and ecosystem-configuration seams that subsequent
IR, extraction, runtime, and mapping work consume. It does not change a wire
schema or implement a producer.

## Field contract

A baseline field has four independent semantic axes:

| Axis | Values | Meaning |
| --- | --- | --- |
| `presence` | `required`, `optional` | Whether the field member must be authored in a value. |
| `multiplicity` | `{lower, upper?, ordered?, unique?}` | The permitted number and collection characteristics of values when the member is present. |
| `nullable` | `true`, `false` | Whether a present value may explicitly be null. |
| `default` | `none`, `semantic`, `representation`, `migration` | The declared source of a value when an omitted member is interpreted. |

`presence` is authored in the shared domain-model definition. It is never
derived from `multiplicity.lower`. A required `0..*` member is present and may
be empty; an optional `1..*` member may be absent and must be nonempty when
present. Explicit null, absence, invalid input, and an unavailable observation
remain different outcomes.

A baseline producer SHALL carry `presence` explicitly and label it `authored`.
A legacy v1.1 adapter may emit only its v1.1 projection, whose presence is
derived; it cannot claim a baseline 1.2 field. A requested 1.2 projection from
such an input refuses with a named source-information loss rather than guessing.

## Relationship contract

A relationship is a first-class declaration, never an inferred interpretation
of a field. It carries stable identity, source and target endpoint identities,
endpoint roles, category, containment/composition semantics, multiplicity at
each endpoint, direction, origin, and declared lifecycle/ownership semantics.
Relationship-to-field mappings are representation mappings with an explicit
loss/refusal record. They cannot manufacture a field presence, foreign-key
lookup, object identity, or runtime population membership.

## Population contract

A population is a versioned observation bound to exactly one semantic model
reference and profile. It declares whether its world is closed, the finite
object universe, object identities and types, field-member states (absent,
present-null, present-value), relationship instances, observation instant, and
any resource/coverage incompleteness. The population reader refuses a dangling
reference, a value incompatible with the model's field contract, or an object
outside a closed declared universe. It reports an unavailable observation or
resource exhaustion as incomplete, never as a false property result.

## Ecosystem configuration contract

An ecosystem configuration is a versioned, content-digested contract selecting
the model authority, profile definitions, source adapters, supported mapping
targets, loss/refusal policy, resource limits, and trusted configuration
references for one compilation/evaluation. It is an explicit input, not a set
of environment variables, current working-directory defaults, or implicit
network lookups. A changed configuration is a different semantic input even
when the model and source bytes are unchanged.

## Producer interface 1.2.0

The producer-owned interchange surface is a versioned input bundle, not an
inferred convention. A producer SHALL set `baselineVersion` to `1.2.0`, retain
the exact `modelIdentity`, `populationIdentity`, and `configurationIdentity`
on every result, and content-digest each referenced document. Consumers SHALL
refuse an unknown version, a missing required identity, or a digest mismatch.

### Relationship declarations

Each relationship declaration SHALL carry its producer-selected stable
`relationshipIdentity`, a declared `relationshipName`, `source` and `target`
endpoint objects, and a `semantics` object. An endpoint object carries
`typeIdentity`, `role`, and `multiplicity`; `semantics` carries `category`,
`direction`, `composite`, and lifecycle/ownership values. Identity is never
reconstructed from a foreign key or from a relationship instance.

For the order domain, the producer declares distinct identities such as
`relationship/Order-shipment`, `relationship/Order-payment-attempt`, and
`relationship/Order-refund`; each supplies the relevant endpoint role and
type identity. The spelling is illustrative: a consumer relies on the emitted
identity, not an assumed English vocabulary.

### Population, snapshot, and window membership

A population document SHALL carry `populationIdentity`, `modelIdentity`,
`profileIdentity`, `closedWorld`, and a finite `members[]` set. Each member
has a stable `objectIdentity`, a `typeIdentity`, its field-member states, and
relationship-instance endpoint identities. A snapshot adds `snapshotIdentity`,
`populationIdentity`, `observedAt`, and an immutable membership digest.

A window is a declared observation selection, not an implicit clock query. It
SHALL carry `windowIdentity`, `populationIdentity`, a `clockFamily`, that
family's inclusive-start/exclusive-end coverage selection, and ordered
observation-record identities with their member-object identities (or the
content digest of that ordered record set). A member belongs to a snapshot or
window only when its exact `objectIdentity` is listed or covered by the
declared digest. An unavailable observation remains an explicit availability
fact; the selected evaluator, not membership omission, determines whether it
prevents a truth result.

### Configuration and closure inputs

A configuration document SHALL carry `configurationIdentity`,
`baselineVersion`, a complete digest triple, `modelAuthority`, `profileIdentities`,
`adapterIdentities`, `mappingTargets`, `lossPolicy`, `resourceLimits`, and
`trustedReferences`. `closure` is explicit and declares the selected model,
population or snapshot, window when used, configuration, and every digest that
must be held fixed for evaluation. Consumers SHALL use no environment,
working-directory, current-time, or network default to complete a closure.

The minimum interchange shape is:

```json
{
  "baselineVersion": "1.2.0",
  "modelIdentity": "ix://agent-ix/commerce/model/order-1-2",
  "relationshipIdentity": "ix://agent-ix/commerce/relationship/Order-shipment",
  "populationIdentity": "ix://agent-ix/commerce/population/orders-2026-09-10",
  "snapshotIdentity": "ix://agent-ix/commerce/snapshot/orders-2026-09-10T00-00-00Z",
  "windowIdentity": "ix://agent-ix/commerce/window/orders-2026-09-10T00-00-00Z-PT1H",
  "configurationIdentity": "ix://agent-ix/commerce/config/evaluation-default",
  "digest": {
    "algorithm": "sha256",
    "domain": "filament-canonical-json-1",
    "value": "sha256:<lowercase-hex>"
  }
}
```

## Standard-facing binding and digest semantics

This is the interface from the producer-owned semantic baseline to the native
Quire standard. It supplies typed model and observation inputs to a Quire
profile; it does not add a second clause language, reinterpret a clause, or
make an OCL, FRETish, SysML, or TL document authoritative.

### Model and configuration binding

The producer supplies two different immutable input classes.  **Static linking**
supplies the model, profile, configuration *meaning*, and their correspondence;
it is sufficient for recognition, resolution and type/profile admission.  It
MUST NOT require an as-yet-unobserved population, snapshot, window, progress
record, or runtime instance.  **Assessment binding** supplies the concrete
population/snapshot/window and observation authority only when the selected
claim consumes them.  A runtime selection cannot replace a static selection;
doing so requires a newly linked subject.

The binding tuple is therefore partitioned as follows:

| Member | Required meaning |
| --- | --- |
| `modelIdentity` / `modelDigest` | **Static.** One versioned model whose exported type, field, relationship, operation, and scalar identities form the available vocabulary. |
| `profileIdentity` / `profileDigest` | **Static.** The selected native Quire profile and its admissible semantic operators. |
| `configurationIdentity` / `configurationDigest` | **Static selection; runtime contents when consumed.** The explicit adapter, mapping-target, loss-policy, resource-limit, and trusted-reference selection. |
| `populationIdentity` / `populationDigest` | **Assessment.** The finite observation universe supplied to a claim, or explicit absence where that selected profile permits none. |
| `snapshotIdentity` / `snapshotDigest` | **Assessment.** The immutable observation cut when the claim reads a snapshot. |
| `windowIdentity` / `windowDigest` | **Assessment.** The declared finite selection when the claim is temporal or choreography-aware. |

The standard SHALL refuse linking when a required static member is missing,
when a referenced identity and digest do not name the same immutable object, or
when the model fails to export a type or relationship identity used by the
clause.  It SHALL refuse an assessment binding lacking a concrete input the
selected claim requires.  Availability and completeness are retained as their
own result dimensions: unavailable relevant support yields that evaluator's
unavailable/incomplete disposition, but unrelated unavailable observations
SHALL NOT erase a satisfied or violated result that the selected evaluator has
already decisively established from its exact admitted support.  Removing that
support (for example, an eventuality witness) makes that claim unavailable;
overall conformance/adequacy remains incomplete whenever its own rule requires
the missing scope.

### Window mapping

`windowIdentity` selects a finite, ordered observation subset of exactly one
population or snapshot.  Its selection has a declared `clockFamily` and exactly
one of these half-open coverage forms:

| `clockFamily` | Required coverage selection | Native correspondence |
| --- | --- | --- |
| `event-position` | Integer `startInclusive` and `endExclusive` positions in the producer's declared event sequence. | Native positions in `[startInclusive, endExclusive)`; no timestamp is invented. |
| `fixed-sample` | Exact `epoch`, positive rational `period`, declared `unit`, and integer `startInclusive`/`endExclusive` sample indexes. | Native sample `epoch + index × period` for each selected index; rational values are exact, not binary floating point. |
| `timestamp` | RFC 3339 UTC `startInclusive` and `endExclusive` instants. | Producer membership remains half-open; a native temporal interval whose deadline is inclusive is covered only when the selected timestamp coverage explicitly contains that deadline. |

The producer supplies either the complete ordered observation-record identities
and their member-object identities, or a digest of that ordered record set plus
a retrievable immutable set document.  Object membership and observation
coverage are distinct: two observations of one object remain two records.  The
standard maps only that declared coverage and its declared relationship
instances; it SHALL NOT infer membership or elapsed time from wall-clock time,
database state, event arrival order, or a query default.

For a non-temporal state profile, the binding may omit `windowIdentity` only
when it names one snapshot directly. A temporal or choreography profile SHALL
refuse a missing or clock-family-incompatible window rather than constructing
one. This gives every evaluation result a stable
model/population/window/configuration provenance tuple without making UTC a
requirement for timestamp-free profiles.

### Canonical digests

Every producer-object `*Digest` is the triple `{ algorithm: "sha256",
domain: "filament-canonical-json-1", value: "sha256:<lowercase-hex>" }` over
the UTF-8 bytes of **Filament Canonical JSON 1**. An object's own digest member
is excluded from the bytes it digests. A bare hash spelling carries no digest
domain and is insufficient for a binding.

Filament Canonical JSON 1 emits no insignificant whitespace; sorts object keys
by Unicode scalar-value order; and emits strings as their Unicode scalar values
without normalization, escaping `"`, `\\`, and U+0000 through U+001F as
lowercase `\\u00xx` escapes. Invalid Unicode refuses. Its numeric domain is
versioned exact decimal: parse a JSON number into an arbitrary-precision signed
base-10 coefficient and exponent, reject non-JSON values and binary floating
point coercion, remove trailing coefficient zeroes, and serialize zero as `0`
and every nonzero value as the shortest ordinary decimal expansion with no
exponent, no leading plus, no leading zero, and no trailing fractional zero.
Thus `1`, `1.0`, and `1e0` have the same canonical bytes (`1`), while
`9007199254740992` and `9007199254740993` have different exact canonical bytes.
An implementation resource limit may refuse a number before canonicalization;
it MUST NOT round or silently substitute a binary64 value.

Arrays whose order is semantic — notably ordered observation records,
relationship instances, and temporal observations — retain producer-declared
order; arrays that are sets are sorted by the canonical bytes of their members
before digesting. A digest mismatch, an unknown domain, or a domain substituted
for another is a blocking configuration/input refusal, never a cache miss,
warning, or invitation to refetch a different version.

### Producer/native correspondence

For every native clause role that consumes a producer model or profile, the
producer SHALL provide one immutable correspondence record. It contains: (1)
the producer object kind, identity, revision, and complete producer digest
triple; (2) the native artifact or definition identity, revision, raw-byte
`sha256` digest, and raw-byte digest domain `quire-native-bytes-1`; (3) the
exact required native definition-closure identities and raw-byte digest
triples; and (4) the producer-declared binding relation identity and its
configuration provenance. The record declares a relation; equal-looking values
or matching hash text are not evidence of semantic equivalence.

The consumer SHALL validate each digest only in its named domain and then
validate the relation, kinds, exports, and closure under the selected producer
interface. Replacing a producer canonical digest with a native raw-byte digest,
or the reverse, changing either selection while retaining the old relation, or
cross-binding a foreign export SHALL refuse the affected binding. A
presentation-only re-encoding can preserve the producer canonical object while
changing native raw bytes; it therefore requires an explicit new native
selection and correspondence record, never digest substitution.

### Distinguishing cases

1. A package with no population compiles and type-checks against its selected
   model/profile/configuration correspondence; an eventuality assessment then
   refuses or is unavailable only if that claim requires an absent window.
2. A time-29 witness establishes an eventuality on an open, partly observed
   scope. Its result remains satisfied with an explicit incomplete surrounding
   coverage dimension; removing the witness makes that claim unavailable.
3. `1`, `1.0`, and `1e0` digest as the same producer decimal value, whereas
   the adjacent integers `9007199254740992` and `9007199254740993` do not.
4. An event-position window `[4, 7)` maps positions 4, 5, and 6 without a
   timestamp; a fixed-sample window maps exact `epoch + i × period` with its
   declared unit; and a timestamp window ending at `T` does not imply coverage at a native inclusive
   deadline `T` unless that coverage is explicitly selected.
5. A producer canonical-object digest and a native raw-definition-byte digest
   may both be valid yet are not interchangeable; substituting either in the
   other domain refuses the correspondence.

## Compatibility

Baseline 1.2 is additive: v1.1 bytes retain their v1.1 meaning. A v1.2 to v1.1
projection is permitted only when authored presence equals the v1.1 derived
value and no other 1.2-only contract member is lost. Otherwise it refuses with
an identity-preserving loss record. No adapter silently rewrites a model or a
population to make that projection pass.
