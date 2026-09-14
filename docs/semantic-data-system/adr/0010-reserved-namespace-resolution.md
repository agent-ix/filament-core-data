---
id: ADR-0010
title: "Resolve a document-derived name against the reserved namespace"
type: ADR
status: accepted
---
# ADR-0010: Resolve a document-derived name against the reserved namespace

## Context

Two published rules meet on one identifier and neither is wrong.

FR-083 mints a name for an anonymous JSON Schema construct from its owner and
its property alone: `SourceLocus.path` mints `SourceLocusPath`. The rule is
positional and content-blind precisely so that a construct's exported name never
moves when its content does.

FR-055 reserves eighteen identifiers the generated Rust crate defines itself —
`Date`, `Nullable`, `SemanticValue`, `SourceLocusPath` and the rest — and seeds
them into the crate's type scope, so a document that derives one of them is
refused with `NAME_COLLISION` rather than emitted as a crate where one
definition silently overwrites the other.

Generating the Rust target from `packages/semantic-kernel/semantic-ir.json`
therefore refuses outright:

```
NAME_COLLISION: `SourceLocusPath` is derived by both
  ix://agent-ix/filament-core-data/rust-backend/reserved/SourceLocusPath
  and ix://agent-ix/semantic-core/type/SourceLocusPath
in the crate's re-export namespace
```

The Rust kernel crate (FR-086) cannot be generated at all, and with it FR-090's
parity harness and [#7](https://github.com/agent-ix/filament-core-data/issues/7)
— the cross-language agreement gate — are blocked. The collision is filed as
[#80](https://github.com/agent-ix/filament-core-data/issues/80); the same shape
reached from the kernel-scalar side is
[#90](https://github.com/agent-ix/filament-core-data/issues/90), a package-local
`UUID` against the reserved `Uuid`.

The two namespaces are not disjoint and nothing makes them so. This is a
decision about which rule yields, not a defect in either.

## Options

### Option A — the mint yields by special case

Rename `SourceLocusPath` in FR-083's minting rule.

The cost is the rule itself. FR-083's value is that a minted name is a total
function of owner and property; a name that is that function *except for one
construct* is a name derived from something other than the rule, and the next
collision reopens the question. Issue #80 states this directly: a change to
FR-083 must be a rule, not an exception.

### Option B — relax the collision check

Let the later definition win, or emit both and let `rustc` decide.

This is worse than the collision. The check is the reason the defect was caught
at this gate rather than shipped in a crate whose `SourceLocusPath` silently
means something other than the document's. Issue #80's safety gate forbids it.

### Option C — the reserved identifier yields

Rename the crate's own `SourceLocusPath` to make room.

The reserved set is a published surface: a consumer already writes
`crate::SourceLocusPath` and `crate::support::Nullable`. Moving the reserved
side changes what an existing reference targets without any consumer's contract
having changed — the one silent-retarget outcome FR-133 forbids.

### Option D — the document-derived identifier yields, by package qualification

Where a document-derived identifier lands on a reserved one, the reserved
identifier keeps it and the derived identifier takes the `UpperCamelCase`
package segment of its own semantic identity as a prefix:
`ix://agent-ix/semantic-core/type/SourceLocusPath` renders
`SemanticCoreSourceLocusPath`.

The prefix is read from the identity the document already carries. It is not a
counter, a digest, or a positional suffix, so the resolved identifier is a total
function of the contract and moves only when the identity moves.

## Decision

**Option D.** The reserved identifier keeps its meaning; the document-derived
identifier yields and is qualified by the package its own semantic identity
names. The rule is stated once in FR-133 and applied by derivation to every
reserved identifier and every construct that reaches one. Where the resolved
identifier is itself taken, `NAME_COLLISION` still refuses, naming both
identities.

## Rationale

**Only one side has consumers who cannot see the change.** A reserved identifier
is the crate's own published surface, referenced by code this repository does not
own. A document-derived identifier is generated from an identity the document
carries, and every reference to it is generated in the same pass — so moving it
retargets nothing a consumer wrote by hand. Asymmetric exposure is what decides
which side yields.

**Neither published rule changes.** FR-083 mints exactly what it minted;
`SourceLocusPath` is still the minted name and
`ix://agent-ix/semantic-core/type/SourceLocusPath` is still the identity, byte
for byte. FR-055's reserved set and its refusal are untouched. What the
resolution moves is a generated Rust identifier, which is neither rule's subject.

**It is a derivation, not a table.** The prefix comes from the identity, so a
nineteenth reserved name or a second colliding mint resolves without anyone
editing a list of known pairs. That is FR-133-CON-3, and it is why the rule is
stated over the namespaces rather than over `SourceLocusPath`.

**Qualification says what happened.** `SemanticCoreSourceLocusPath` names the
package the construct came from, so a reader of the generated crate can see that
it is `semantic-core`'s locus path and not the crate's own. A numeric suffix —
`SourceLocusPath2`, which is what FR-083 uses *within* the mint namespace —
would carry no such information at the point where two namespaces meet.

**The kernel-scalar case stays where it was settled.** A `scalar: uuid`
definition named `UUID` maps onto `crate::support::Uuid` before this rule is
reached, which is issue #90's resolution and is unchanged. FR-133 covers what
that mechanism cannot: a definition whose kernel scalar is not the support type
it collides with.

**Injectivity is preserved by refusal, not by cleverness.** Where the qualified
identifier is itself taken, the scope check raises `NAME_COLLISION` naming both
identities and writes no file. Two constructs sharing one generated name is the
outcome the check exists to prevent, and the resolution does not create an
exception to it.

## Consequences

- `packages/semantic-kernel/semantic-ir.json` generates a Rust crate with zero
  blocking diagnostics. FR-086 unblocks, and FR-090 and #7 follow.
- The generated kernel crate exports `SemanticCoreSourceLocusPath` for the
  minted construct and keeps `crate::support::SourceLocusPath` for the crate's
  own locus path. They are different types and both are reachable.
- `mapping-table.json` carries the row `name:reserved-resolution`, bound to a
  case in `test/rust-backend.test.ts`, so the branch register counts it.
- No semantic identity changes and no schema changes. Nothing is re-emitted for
  a contract revision.
- A document whose derived identifier collides with a reserved one is now
  emitted rather than refused. The refusal remains for the residual case, so the
  check's strength is unchanged where it still applies.
- The two namespaces are still not disjoint, and are no longer required to be.
  Issue #80's proposed disjointness assertion is superseded: the gate is that
  the kernel IR generates clean, which is measured rather than asserted about
  two lists.

## Status

**Accepted.** Normative for the Rust/Serde backend under FR-133, implemented in
`src/compiler/backends/rust-serde/mapping.mjs` (`resolveReserved`) and
`names.mjs` (`packageQualifier`), and gated by TC-1418..TC-1421.
