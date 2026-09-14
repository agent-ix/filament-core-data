---
id: Task-145
title: "FR-114 provenance locus, component, endpoint and inventory declarations"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-144"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1611"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1612"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1613"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1614"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1615"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1616"
    type: verifies
---
# Task-145: FR-114 provenance locus, component, endpoint and inventory declarations

## Scope

Add the four types the crate has no representation for at all:
`SourceLocus { source_identity, source_revision, path, formal_document,
formal_revision, span }` mirroring the consumer's `ForeignLocus` / `ArtifactRef`
/ `Formal` / `Span` member for member at the pinned revision;
`ComponentDeclaration`; `EndpointDeclaration`; and
`InventoryDeclaration` / `InventoryMembership`.

Every one of the six members of a component record — identity, namespaced
revision, canonical digest selection, locus, ownership, inventory membership — is
a separate authored member that equal spelling never merges, and an endpoint adds
its owning component identity, its type identity, its authored role and its
multiplicity on top.

Inventory **closure** and the explicitly-incomplete `unknown` disposition belong
to FR-110, not here (FR-114-CON-6, FND-1762, FND-1830). This task carries
membership and raises the closed-inventory refusal; it declares no closure of its
own and mints no second `unknown`.

## Subtasks

- [ ] **Red: record shape.** `tests/declarations.rs`: `tc_1611_` (one component
  record carries identity, namespaced revision, canonical digest selection, locus,
  ownership and inventory membership as six separate members), `tc_1612_` (one
  endpoint record carries the same six and additionally names its owning component
  identity, its type identity, its role and its multiplicity, none reconstructed
  from another), `tc_1613_` (a repository, a component, a role and an endpoint
  sharing one display name stay four distinct identities, and no component
  identity is reconstructed from a path, a package name, or a deployment name).
- [ ] **Red: locus refusals.** `tc_1614_` (a component whose locus is absent
  refuses; an endpoint whose locus names no formal document revision refuses; each
  blocking, each naming the offending record, and neither substituting a native
  source label for the formal revision — FR-114-CON-4), `tc_1616_` (a full locus
  carrying `source` with `refVersion`, a closed-vocabulary `kind`, `authority`,
  `identity`, a namespaced `revision`, one raw-byte `digest` **string** and `wire`
  with its `identity` and `version`, plus `formal` with `document` and a namespaced
  `revision`, plus `span` with `start` and `end`, is admitted with its raw-byte
  digest string rather than refused as a non-canonical selection; and a component
  whose locus no declaration source document supplies refuses with **no
  synthesized locus emitted for it** — FR-114-CON-5, FND-1765).
- [ ] **Red: inventory.** `tc_1615_` (integration: a component outside a closed
  declared inventory refuses admission, while the same component under an
  explicitly incomplete inventory is admitted carrying the completeness member
  with the retained `unknown` disposition FR-110 owns).
- [ ] **Green: locus.** `SourceLocus` with `Span { start: u32, end: u32 }`; the
  artifact `kind` drawn from the consumer's closed artifact-kind vocabulary at the
  pinned revision, cited by reference rather than transcribed into prose; the
  `source` `digest` typed as a raw-byte digest **string** and explicitly not a
  `DigestSelection`.
- [ ] **Green: declarations.** `ComponentDeclaration { component_identity,
  component_revision, digest, repository_identity, repository_revision,
  role_identities, owning_type_identity, source_locus, inventory_membership }`;
  `EndpointDeclaration { endpoint_identity, endpoint_revision, digest,
  component_identity, type_identity, role, multiplicity, source_locus,
  inventory_membership }`.
- [ ] **Green: inventory.** `InventoryMembership { inventory_identity, complete }`
  and `InventoryDeclaration { inventory_identity, complete, component_identities,
  endpoint_identities, relationship_identities }`.
- [ ] **Green: refusal codes.** `COMPONENT_PROVENANCE_ABSENT`,
  `ENDPOINT_PROVENANCE_ABSENT`, `ENDPOINT_ROLE_ABSENT`,
  `ENDPOINT_MULTIPLICITY_ABSENT`, `INVENTORY_MEMBER_UNLISTED`,
  `INVENTORY_INCOMPLETE_UNKNOWN`, `IDENTITY_ABSENT` — each blocking, each naming
  the offending record.
- [ ] **Falsify.** Synthesize a locus from an unlocated declaration in a scratch
  copy and prove `tc_1616_` fails. Reconstruct a component identity from its
  path in a scratch copy and prove `tc_1613_` fails.

## Exit conditions

- A component and an endpoint are first-class records with their own identity,
  revision, digest, locus, ownership and inventory membership; nothing is derived
  from a path, a package name, a deployment name, or another member.
- TC-1611..TC-1616 are traced executable controls, including the closed-versus-
  incomplete inventory pair.
- No `unknown` disposition and no inventory closure is minted here; both are read
  from the FR-110 declaration.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from
  the two pre-existing reds.

## Deliverables

- `crates/baseline-producer/src/locus.rs`, `src/component.rs`, `src/endpoint.rs`,
  `src/inventory.rs`
- `crates/baseline-producer/tests/declarations.rs`

## Notes

- FND-1705 / FND-1753 (D2) are why the locus enumerates **all seven**
  `ArtifactRef` members and the cited closed artifact-kind vocabulary; a
  five-member locus is a wrong answer, not a simplification.
- FR-114's four-distinct-identities rule (CON-1) is measured with a display-name
  collision, not asserted in a doc comment.
- Unblocks: Task-146 (a relationship endpoint joins a declared endpoint through
  its `endpoint_identity`).
