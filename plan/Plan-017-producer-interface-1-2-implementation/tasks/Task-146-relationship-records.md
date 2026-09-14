---
id: Task-146
title: "FR-115 complete relationship records with independent endpoints and ownership"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-145"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-115"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1617"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1618"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1619"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1620"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1621"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1622"
    type: verifies
---
# Task-146: FR-115 complete relationship records with independent endpoints and ownership

## Scope

Complete `RelationshipDeclaration`. Plan-016 landed the identity, the name, the
two endpoints and the semantics; this task adds `relationship_revision`, the
canonical `digest`, the declaring ownership triple
`RelationshipOwnership { model_identity, profile_identity,
configuration_identity }`, and `inventory_membership`, and makes each `source`
and `target` endpoint record join a **declared** FR-114 endpoint through its
`endpoint_identity` rather than through a coinciding type identity, role, or
display name.

The endpoint records stay independent members even when both name one type
identity. A requested endpoint projection that would collapse the two roles or
the two multiplicities into one value refuses and emits a **named loss record**
carrying the relationship identity; it never guesses.

## Subtasks

- [ ] **Red: record shape.** `tests/relationships.rs`: `tc_1617_` (one
  relationship record carries identity, namespaced revision, canonical digest,
  authored name, `semantics` with category, direction, composite flag, lifecycle
  and ownership, and the owning model, profile and configuration identities as
  separate members), `tc_1618_` (the `source` and `target` endpoint records each
  carry their own `endpointIdentity`, `typeIdentity`, `role` and `multiplicity`
  as independent members even when both name one type identity), `tc_1619_` (a
  self-relationship whose `source` and `target` name one type identity emits two
  independent endpoint records retaining their own endpoint identities, roles and
  multiplicities).
- [ ] **Red: refusals and loss.** `tc_1620_` (a relationship whose `source` omits
  its role refuses; one whose `target` omits its multiplicity refuses; a requested
  endpoint projection collapsing the two roles into one refuses with a named loss
  record carrying the relationship identity rather than a guessed value),
  `tc_1621_` (integration: each endpoint record joins a declared FR-114 endpoint
  through its `endpointIdentity` and never through a coinciding type identity,
  role, or display name, and a `source` `endpointIdentity` naming no declared
  endpoint refuses naming the relationship), `tc_1622_` (a relationship identity
  is authored rather than reconstructed from a foreign key, a field, or a
  relationship instance, and the emitted record carries no population member and
  no relationship instance).
- [ ] **Green: members.** Add `relationship_revision: Revision`,
  `digest: DigestSelection`, `ownership: RelationshipOwnership` and
  `inventory_membership: InventoryMembership` to `RelationshipDeclaration`;
  keep `source`/`target` as independent endpoint records.
- [ ] **Green: join.** Resolve each `endpoint_identity` against the bundle's
  declared endpoint records — the vocabulary FND-1809 (E8) names — and make the
  refusal say which vocabulary it resolved against.
- [ ] **Green: projection.** Implement the requested endpoint projection named in
  FR-115's Inputs and Outputs as a fallible operation that refuses with
  `RELATIONSHIP_OWNERSHIP_ABSENT` / the projection loss record rather than
  collapsing; the loss record carries the relationship identity.
- [ ] **Falsify.** Join an endpoint by coinciding type identity in a scratch copy
  and prove `tc_1621_` fails. Reconstruct the target role from the source role in
  a scratch copy and prove `tc_1620_` fails.

## Exit conditions

- Every relationship record is complete: revision, digest, name, two independent
  endpoint records, semantics, ownership triple and inventory membership.
- Every endpoint join goes through `endpoint_identity` against a declared FR-114
  endpoint, and an unknown identity refuses naming the relationship.
- No relationship record names a population member or a relationship instance.
- TC-1617..TC-1622 are traced executable controls.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from
  the two pre-existing reds.

## Deliverables

- `crates/baseline-producer/src/relationship.rs` (extracted and extended)
- `crates/baseline-producer/tests/relationships.rs`

## Notes

- FND-1726 (D7) is the reason the join is by `endpointIdentity`: the review found
  the endpoints joinable only by coincidence, and the fix was an explicit join
  with a refusal, not a heuristic.
- FR-115-CON-2 keeps the record free of population members and relationship
  instances; that is a static-half obligation and is measured here, not deferred
  to the bundle.
- Unblocks: Task-147 (each relationship record becomes one export mapping).
