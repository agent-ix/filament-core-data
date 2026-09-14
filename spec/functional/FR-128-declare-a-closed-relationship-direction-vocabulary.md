---
id: FR-128
title: "Declare a closed relationship direction vocabulary"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-107"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-115"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "depends_on"
---
# FR-128: Declare a closed relationship direction vocabulary

## Description

The producer SHALL declare a relationship's direction as a member of a closed
vocabulary of exactly four admitted values — `source-to-target`,
`target-to-source`, `bidirectional`, and `undirected` — and SHALL state
normatively, for each of the four, which traversals it admits and which
declaration member supplies each argument, so that a consumer interprets a
direction without matching, parsing, or casing a producer-defined string. The
producer SHALL NOT permute the `source` and `target` members under any direction:
the `source` member is the first argument and the `target` member is the second
argument in all four values, and direction states which traversals the
relationship admits rather than which operand is which. The producer SHALL keep
`bidirectional` and `undirected` distinct authored states, neither being the
other's default nor a consequence of an absent direction, and SHALL make a value
outside the four unrepresentable in the typed interface rather than representable
and refused.

This requirement changes the `direction` member of `RelationshipSemantics` from a
producer-defined string to a closed typed vocabulary. That is a breaking change to
both the Rust type and the wire document: a previously admitted bundle whose
direction spelled anything other than the four values ceases to be admissible, and
a consumer matching the member as a string ceases to compile. The change is made
rather than deferred because the interface is pre-1.0 and an interpretable
direction is the whole point of the member; it is recorded here and in the
delivery log rather than being carried silently by an "otherwise unchanged"
clause.

Two refusals here are less specific than the rest of this interface, and the
limitation is recorded rather than hidden: an out-of-vocabulary direction and an
absent direction both refuse at the wire seam under `INVALID_PRODUCER_DOCUMENT`,
which carries the offered spelling or the absent member name but does **not**
name the offending relationship identity. Every other relationship member whose
absence or foreignness refuses does name its record. Closing the gap needs a
pre-parse pass over `relationships[].semantics.direction`; the closed type
already prevents an uninterpretable direction from ever reaching an admitted
bundle, so the gap is in the diagnostic, not in the guarantee.

## Inputs

- The relationship declarations of the bundle, each carrying explicit semantics
- The authored `source` and `target` endpoint records of each relationship
- The configuration document that selects the admissible vocabularies

## Outputs

- An admitted bundle whose every relationship carries one of exactly four
  admitted direction values
- The stated mapping of each admitted direction to its admitted traversals and to
  the declaration member supplying each argument
- A wire document carrying a direction outside the four, refused at the admission
  seam

## Behavior

- The producer SHALL admit exactly four direction values: `source-to-target`,
  `target-to-source`, `bidirectional`, and `undirected`.
- The producer SHALL supply the `source` member as the first argument and the
  `target` member as the second argument under every admitted direction.
- The producer SHALL NOT permute, swap, or reorder the `source` and `target`
  members as a consequence of any direction value.
- Where the direction is `source-to-target`, the producer SHALL admit traversal
  from the `source` member to the `target` member and no other traversal.
- Where the direction is `target-to-source`, the producer SHALL admit traversal
  from the `target` member to the `source` member and no other traversal, while
  the `source` member remains the first argument.
- Where the direction is `bidirectional`, the producer SHALL admit both traversals
  of the one relationship as separately oriented, so each traversal carries its
  own direction rather than the pair being symmetric.
- Where the direction is `undirected`, the producer SHALL admit the relationship
  as holding symmetrically between the `source` and `target` members, so a
  consumer may traverse it in either direction while treating neither as the
  oriented one.
- Where the direction is `undirected`, the producer SHALL NOT supply an
  orientation the declaration does not carry, and SHALL NOT be read as admitting
  no traversal at all.
- The producer SHALL keep `bidirectional` and `undirected` distinct authored
  states, and SHALL NOT treat either as the other's default.
- The producer SHALL NOT treat `source-to-target` and `target-to-source` as two
  spellings of one relationship, because both retain the same first argument and
  differ only in admitted traversal.
- The producer SHALL make a direction outside the four unrepresentable in the
  typed interface, so no admitted value spells a direction the consumer cannot
  interpret.
- If a wire document offers a direction outside the four, then the producer SHALL
  refuse it at the admission seam under `INVALID_PRODUCER_DOCUMENT`, carrying the
  offered spelling.
- If a relationship record carries no direction member at all, then
  the producer SHALL refuse it at the admission seam under
  `INVALID_PRODUCER_DOCUMENT`, naming the absent member.
- The producer SHALL NOT admit a bundle carrying either, so the closed vocabulary
  is enforced rather than advisory.
- The producer SHALL NOT default an absent direction to any of the four.
- The producer SHALL NOT derive a direction from the relationship's category,
  lifecycle, ownership, or composite membership.
- The producer SHALL NOT derive a direction from the roles or multiplicities of
  the `source` and `target` endpoint records.
- The producer SHALL keep the direction independent of the containment and
  ownership members, which state what the relationship composes and who owns it
  rather than how it is traversed.
- The producer SHALL retain the `source` and `target` endpoint records as
  independent members under every direction, including where both name one type
  identity.
- The producer SHALL NOT alter the authored members of `RelationshipDeclaration`
  or `RelationshipEndpoint` in carrying this vocabulary.
- The producer SHALL NOT introduce a wire, reference, or tracing schema for the
  native side in carrying this vocabulary.
- The producer SHALL leave the `category`, `lifecycle`, and `ownership` members of
  the relationship semantics as producer-defined strings, which this requirement
  closes no vocabulary for.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-128-CON-1 | The producer SHALL admit exactly the four direction values `source-to-target`, `target-to-source`, `bidirectional`, and `undirected`, making every other value unrepresentable rather than representable and refused. | Interface | Compile |
| FR-128-CON-2 | The producer SHALL supply the `source` member as the first argument and the `target` member as the second under every direction, never permuting the two as a consequence of a direction value. | Correctness | Test |
| FR-128-CON-3 | The producer SHALL keep `bidirectional` and `undirected` distinct authored states, defaulting neither to the other and neither to an absent direction. | Correctness | Test |
| FR-128-CON-4 | The producer SHALL derive a direction from no relationship category, lifecycle, ownership, composite membership, role, or multiplicity. | Integrity | Test |
| FR-128-CON-5 | The producer SHALL close a vocabulary for the direction member alone, leaving `category`, `lifecycle`, and `ownership` producer-defined by decision rather than by omission. | Interface | Inspection |
| FR-128-CON-6 | The producer SHALL state the admitted traversals and argument order of all four directions in the interface itself, so a consumer reads them without matching a producer-defined string. | Traceability | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-128-AC-1 | An admitted bundle carries a relationship direction from exactly four values, and the interface states for each value its admitted traversals and which declaration member supplies each argument. | Inspection |
| FR-128-AC-2 | A relationship admitted under each of the four directions in turn retains the same `source` member as its first argument and the same `target` member as its second, with no permutation under any value. | Test |
| FR-128-AC-3 | A wire document offering a direction outside the four is refused at the admission seam under `INVALID_PRODUCER_DOCUMENT` carrying the offered spelling, and a record carrying no direction member is refused under the same code naming the absent member; neither yields an admitted bundle. | Test |
| FR-128-AC-4 | A relationship whose direction is `source-to-target` admits traversal from `source` to `target` only, and one whose direction is `target-to-source` admits traversal from `target` to `source` only, while both retain `source` as the first argument. | Test |
| FR-128-AC-5 | A relationship whose direction is `bidirectional` admits both traversals as separately oriented, while one whose direction is `undirected` holds symmetrically between its two members without either being the oriented one, and neither value is produced by defaulting the other. | Test |
| FR-128-AC-6 | A relationship whose category, lifecycle, ownership, composite membership, roles, and multiplicities are varied while its direction is held constant retains that direction unchanged. | Test |
| FR-128-AC-7 | A self-relationship whose `source` and `target` name one type identity retains both endpoint records as independent members under each of the four directions. | Test |
| FR-128-AC-8 | Apart from the `direction` member's declared breaking change, the authored members of `RelationshipDeclaration`, `RelationshipEndpoint`, `RelationshipSemantics`, and `Multiplicity` are unchanged, and no wire, reference, or tracing schema is introduced for the native side. | Compile |
| FR-128-AC-9 | The `direction` member's change from producer-defined string to closed vocabulary is recorded as a breaking change in the delivery log, and a bundle whose direction spelled a previously admitted free string is refused rather than migrated. | Inspection |

## Dependencies

- [FR-115](./FR-115-emit-complete-relationship-records.md) owns the relationship
  record, its independent `source` and `target` endpoint members, and the endpoint
  projection refusal that this requirement cites rather than restates; this
  requirement replaces only the direction member's shape.
- [FR-107](./FR-107-declare-first-class-relationship-contracts.md) declares the
  first-class relationship contract whose explicit semantics carry the direction
  this requirement closes.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) owns indivisible admission
  and the wire seam at which a direction outside the four is refused.
- [FR-127](./FR-127-resolve-endpoint-type-identities-to-native-type-exports.md) is
  authored in the same increment and is independent of this requirement: an
  endpoint's type resolution constrains no relationship's direction.
- [FR-129](./FR-129-admit-a-static-bundle-against-real-native-bytes.md) depends on
  this requirement rather than the reverse: it evidences one admitted direction
  against a relationship whose two ends resolve to real native types.
- `ix://agent-ix/quire-spec-language` at revision
  `5d76043b2af4308141817ce4a4055b03a0e5288f`, file
  `src/protocol_artifact/wire.rs`, declares the closed export and reference shapes
  this requirement's relationship record maps onto, and declares no direction or
  orientation vocabulary, so the four values here are minted by this requirement
  rather than cited from that contract. It is an assumed external contract this
  increment maps onto rather than owns; a change on the consumer side is not
  detected by this requirement.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract for relationship declarations.
