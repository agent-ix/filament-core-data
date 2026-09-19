---
id: FR-133
title: "Resolve a minted name against the reserved namespace"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: "depends_on"
---
# FR-133: Resolve a minted name against the reserved namespace

## Description

This requirement answers
[filament-core-data#80](https://github.com/agent-ix/filament-core-data/issues/80) and the reserved-namespace half of
[#90](https://github.com/agent-ix/filament-core-data/issues/90), which is the same collision reached from the kernel side: a
package-local scalar named `UUID` against the backend's reserved `Uuid`.

Where a minted name and a reserved backend identifier derive the same Rust
identifier, the backend SHALL resolve the collision without relaxing its
collision check and without either side silently overwriting the other.

Two published rules meet here and neither is wrong. FR-083 mints a name for an
anonymous construct — `SourceLocus.path` becomes `SourceLocusPath` — and FR-055
reserves a set of identifiers the generated crate defines itself. Today the Rust
kernel crate cannot be generated at all: the two derive `SourceLocusPath` and
the backend refuses, correctly, because letting one definition overwrite the
other is the defect the check exists to prevent.

The resolution is therefore a decision about *which* rule yields, stated once,
rather than a weakening of the check. The same shape recurs whenever the two
namespaces meet, so the rule is stated generally and the specific pair is one
case of it.

## Inputs

- A semantic IR document carrying a construct whose minted name is reserved
- The backend's reserved identifier set

## Outputs

- A generated crate in which both the reserved identifier and the minted
  construct are reachable and distinct
- Or a blocking diagnostic naming both identities, where the rule does not
  resolve the pair

## Behavior

### The rule

- Where a type's derived Rust identifier equals a reserved crate identifier,
  the **reserved identifier SHALL keep it** and the document-derived identifier
  SHALL yield. The reserved set is the crate's own surface and a consumer
  already writes `crate::SourceLocusPath`; a resolution that moved the reserved
  side would silently change what that existing reference targets, which is the
  one outcome this requirement forbids.
- The yielding identifier SHALL be the reserved identifier prefixed by the
  `UpperCamelCase` rendering of the package segment of the construct's own
  semantic identity, so `ix://agent-ix/semantic-core/type/SourceLocusPath`
  renders `SemanticCoreSourceLocusPath` and a package-local `UUID` in
  `ix://agent-ix/config-service/UUID` renders `ConfigServiceUuid`.
- The prefix SHALL be derived from the identity the document already carries and
  from nothing else — not from a counter, a digest, a suffix, or the order the
  document was walked — so the resolved identifier is a total function of the
  contract and moves only when the identity moves.
- The rule SHALL apply to every reserved identifier and to every construct whose
  derived identifier reaches one; no pair is enumerated and no name is special.
- A kernel scalar the crate already renders as a support type SHALL be mapped
  onto that support type before this rule is reached, so `scalar: uuid` named
  `UUID` continues to resolve to `crate::support::Uuid` rather than to a second
  declaration of it (issue #90).
- Where the resolved identifier is itself taken — by a reserved identifier or by
  another construct in the same crate scope — the backend SHALL raise
  `NAME_COLLISION` naming both identities and SHALL write no file, because two
  constructs sharing one generated name is what the check exists to prevent.

### The obligations the rule carries

- The backend SHALL detect that a minted name and a reserved identifier derive
  one Rust identifier.
- The backend SHALL apply the stated resolution rule rather than refusing the
  document outright, where the rule covers the pair.
- The backend SHALL keep the reserved identifier's own meaning unchanged, so a
  consumer's existing reference to it does not silently change target.
- The backend SHALL keep `NAME_COLLISION` for every pair the rule does not
  cover, naming both identities.
- The backend SHALL NOT resolve a collision by relaxing the check, by dropping
  either definition, or by letting one overwrite the other.
- The mapping register SHALL carry a row for the resolution, bound to a case.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-133-CON-1 | The resolution SHALL change no identity in the semantic document; it renames a generated identifier only | Integrity | Test |
| FR-133-CON-2 | Two distinct constructs SHALL NOT resolve to one generated identifier under any path through the rule | Integrity | Property |
| FR-133-CON-3 | The rule SHALL be stated once and applied by derivation, not enumerated per known pair | Design | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-133-AC-1 | The Rust kernel crate generates from the kernel IR with zero blocking diagnostics | Test |
| FR-133-AC-2 | Both the reserved identifier and the minted construct are present in the generated crate and name different types | Test |
| FR-133-AC-3 | Every `typeRef` to the minted construct renders the resolved identifier, and none renders the reserved one | Test |
| FR-133-AC-4 | A pair the rule does not cover still raises `NAME_COLLISION` naming both identities and writes no file | Test |
| FR-133-AC-5 | The mapping register carries the resolution as a row bound to a case, and `register --check` passes after regeneration | Analysis |
| FR-133-AC-6 | Over generated identifiers for a document of arbitrary minted and reserved names, no two distinct constructs share one identifier | Property |
| FR-133-AC-7 | The semantic identity of every affected construct is byte-unchanged from before the resolution | Test |

## Dependencies

- **Upstream**: [FR-055](./FR-055-derive-stable-rust-identifiers.md) the identifier derivation and its reserved set; [FR-083](./FR-083-mint-names-for-anonymous-constructs.md) the minting rule
- **Downstream**: [FR-086](./FR-086-generate-the-kernel-rust-crate.md) the kernel Rust crate, which cannot be generated until this resolves
