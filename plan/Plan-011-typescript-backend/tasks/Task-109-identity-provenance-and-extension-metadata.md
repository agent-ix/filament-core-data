---
id: Task-109
title: "Identity, provenance, roles, extensions, units, relationships, and occurrences"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-105"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-067"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-787"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-788"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-789"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-790"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-791"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-792"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-793"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-794"
    type: verifies
---
# Task-109: Identity, provenance, roles, extensions, units, relationships, and occurrences

## Scope

Land `metadata.mjs`: everything the IR carries that no other module renders, as ordinary exported readonly data, so nothing in the document is dropped without being declared.

## Subtasks

- [ ] Emit `identity.ts`: one readonly map from generated identifier to semantic identity and one from `<Type>.<field>` to the field's identity, both `as const`, sorted code point, typed so a missing entry fails `tsc`.
- [ ] Emit `metadata.ts`: the eleven provenance values — `contractVersion`, the four `source` members and the six `package` members — plus the IR fingerprint, as a single frozen `as const` object.
- [ ] Compute the fingerprint over the *normalized* document, so two documents differing only in set order carry the same fingerprint; the document cannot carry its own digest.
- [ ] Render the document-level, per-type and per-field `extensions[]` as readonly descriptors — this is where the issue's 'extension APIs' deliverable is discharged.
- [ ] Render every field `unit`, every type's `roles[]`, every type's `unknownPolicy`, the relationship descriptors, and the `occurrences[]`. `core-1-1.json` and `package-1-1.json` carry an occurrence, a document extension and a `unit: "ms"`, and a `fail` policy leaves no room to drop them silently.
- [ ] Own the relationship descriptor outright: `verb`, `category`, `composite`, the `target` identity and the multiplicity bounds, in one shape, in one module.
- [ ] Carry no timestamp, no hostname, no user, no working directory and no tool path — each is a determinism leak this repository has shipped before.
- [ ] Name the backend identity, the backend version and the IR fingerprint in every generated file's banner, and no clock value.
- [ ] Keep the metadata module importable without the validators, so a metadata-only consumer does not retain the validator code.
- [ ] Add the node-walk audit: every node the IR document carries is rendered somewhere or declared as a loss, and a seeded unrendered node fails it.

## Deliverables

- `src/compiler/backends/typescript-v1/metadata.mjs`, `metadata.d.mts`
- The generated `identity.ts` and `metadata.ts` modules

## Notes

- Identity strings are copied from the document verbatim, never minted, shortened or re-cased. An identity that moves with a rename is `conformance/defects.json` DEF-PROTO-008.
- The node-walk audit is the gate that stops the next construct from being dropped silently. It is not decoration.
