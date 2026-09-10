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
SHALL carry `windowIdentity`, `populationIdentity`, inclusive `start` and
exclusive `end` instants, and `memberObjectIdentities[]` or a content digest of
that ordered set. A member belongs to a snapshot or window only when its exact
`objectIdentity` is listed or covered by the declared digest. An unavailable
observation remains `incomplete`; it is not omitted or interpreted as a false
property result.

### Configuration and closure inputs

A configuration document SHALL carry `configurationIdentity`,
`baselineVersion`, `digest`, `modelAuthority`, `profileIdentities`,
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
  "digest": "sha256:<content-digest>"
}
```

## Standard-facing binding and digest semantics

This is the interface from the producer-owned semantic baseline to the native
Quire standard. It supplies typed model and observation inputs to a Quire
profile; it does not add a second clause language, reinterpret a clause, or
make an OCL, FRETish, SysML, or TL document authoritative.

### Model and configuration binding

Before a clause is type-checked or evaluated, the binding SHALL provide the
following immutable tuple:

| Member | Required meaning |
| --- | --- |
| `modelIdentity` / `modelDigest` | One versioned model whose exported type, field, relationship, operation, and scalar identities form the available vocabulary. |
| `profileIdentity` / `profileDigest` | The selected native Quire profile and its admissible semantic operators. |
| `configurationIdentity` / `configurationDigest` | The explicit adapter, mapping-target, loss-policy, resource-limit, and trusted-reference selection. |
| `populationIdentity` / `populationDigest` | The finite observation universe supplied to evaluation, or an explicit absent population where the profile permits none. |
| `snapshotIdentity` / `snapshotDigest` | The immutable observation cut when evaluation reads a snapshot. |
| `windowIdentity` / `windowDigest` | The declared finite selection when evaluation is temporal or choreography-aware. |

The standard SHALL refuse a clause binding when a required member is missing,
when a referenced identity and digest do not name the same immutable object, or
when the model fails to export a type or relationship identity used by the
clause. It SHALL report `incomplete`, not a satisfied or violated result, when
the declared population or window reports unavailable observation data.

### Window mapping

`windowIdentity` selects a finite, ordered observation subset of exactly one
population or snapshot. Its `start` is inclusive, its `end` is exclusive, and
both are RFC 3339 UTC instants. The producer supplies either the complete
ordered `memberObjectIdentities[]` or `memberSetDigest` plus a retrievable
immutable member-set document. The standard maps a window only to that ordered
set and its declared relationship instances; it SHALL NOT infer membership
from wall-clock time, database state, event arrival order, or a query default.

For a non-temporal state profile, the binding may omit `windowIdentity` only
when it names one snapshot directly. A temporal or choreography profile SHALL
refuse a missing window rather than constructing one. This gives every
evaluation result a stable model/population/window/configuration provenance
tuple.

### Canonical digests

Every `*Digest` uses `sha256:<lowercase-hex>` over the UTF-8 canonical JSON
bytes of its object. Canonical JSON sorts object keys by Unicode code point,
uses the normalized JSON number spelling, emits no insignificant whitespace,
and represents identity references by their complete identity and digest.
An object's own digest member is excluded from the bytes it digests. Arrays
whose order is semantic — notably `memberObjectIdentities[]`, relationship
instances, and temporal observations — retain producer-declared order; arrays
that are sets are sorted by the canonical bytes of their members before
digesting. A digest mismatch is a blocking configuration/input refusal, never
a cache miss, warning, or invitation to refetch a different version.

## Compatibility

Baseline 1.2 is additive: v1.1 bytes retain their v1.1 meaning. A v1.2 to v1.1
projection is permitted only when authored presence equals the v1.1 derived
value and no other 1.2-only contract member is lost. Otherwise it refuses with
an identity-preserving loss record. No adapter silently rewrites a model or a
population to make that projection pass.
