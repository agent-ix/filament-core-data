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

## Compatibility

Baseline 1.2 is additive: v1.1 bytes retain their v1.1 meaning. A v1.2 to v1.1
projection is permitted only when authored presence equals the v1.1 derived
value and no other 1.2-only contract member is lost. Otherwise it refuses with
an identity-preserving loss record. No adapter silently rewrites a model or a
population to make that projection pass.
