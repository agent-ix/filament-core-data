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

## Compatibility

Baseline 1.2 is additive: v1.1 bytes retain their v1.1 meaning. A v1.2 to v1.1
projection is permitted only when authored presence equals the v1.1 derived
value and no other 1.2-only contract member is lost. Otherwise it refuses with
an identity-preserving loss record. No adapter silently rewrites a model or a
population to make that projection pass.
