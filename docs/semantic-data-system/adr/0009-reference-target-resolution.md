---
id: ADR-0009
title: "Resolve a reference target by declaring where it lives"
type: ADR
status: proposed
---
# ADR-0009: Resolve a reference target by declaring where it lives

## Context

`contracts-v1.md` states one resolution rule, and it is about relationships:

> Relationship targets resolve to a document type or a lock export; composite
> relationship graphs are acyclic.

It states none for the `target` of a `reference`-kind definition. `semantic
reference` is in the closed structural vocabulary alongside scalar, record,
enum, discriminated union, alias/newtype, sequence and map, and the schema
requires a `target` — but constrains it only to the `semanticIdentity` pattern.
Nothing says what that identity must resolve to, or whether it must resolve at
all.

The ambiguity is not theoretical. Compiled read-only over its own
`test/fixtures/compiler/packages/assurance` fixture, the issue #19 compiler emits
`ix://agent-ix/assurance/type/ActorRef` as a `reference` whose target is
`ix://agent-ix/core/type/Actor`. No type in the document declares that identity,
the manifest declares no imports, and no lock export names it.

Issue #19's own reader accepts the document — `inspect` exits 0 and reports 18
types. The issue #20 oracle rejects it with one `UNRESOLVED_TYPE_REF` at
`/ir/types/0/target`. **Both readings are defensible against the contract as
written**, which is the whole of GAP-011: two conforming implementations
disagree about whether a document is valid, and a backend must decide whether to
emit a type for a reference it cannot resolve.

The corpus records this rather than resolving it. Cases REF-001..004 pin the
oracle's reading so the disagreement stays visible instead of drifting, and the
gap is owned by [#9](https://github.com/agent-ix/filament-core-data/issues/9).

It blocks [#52](https://github.com/agent-ix/filament-core-data/issues/52): wiring
the `compiler-frontend` adapter before the rule is settled produces a divergence
with no assignable verdict — the corpus would report a disagreement that neither
side is wrong about. That in turn holds [#7](https://github.com/agent-ix/filament-core-data/issues/7),
since cross-language agreement cannot be claimed while an adapter slot reports
nothing.

## Options

### Option A — a reference target resolves, as a relationship target does

Apply the existing sentence to references. The oracle becomes correct as
written, the corpus needs no change, and one rule covers both.

The cost is that it arguably collapses `reference` into `alias`. The
distinguishing use of a semantic reference is naming something the document does
not itself contain; a reference constrained to resolve inside the document or
its lock is an alias with a longer spelling. The vocabulary would carry two
kinds for one meaning, and the closed vocabulary is closed precisely so that
does not happen.

### Option B — a reference target need not resolve

Preserve the kind's purpose and make the #19 reader correct.

The cost lands on every backend and every reader. "Unresolvable" becomes
indistinguishable from "misspelled": a reference to
`ix://agent-ix/core/type/Actor` and one to `ix://agent-ix/core/type/Atcor` are
equally valid documents, and no gate can tell them apart. A generated package
must then emit something for a target it knows nothing about, and what it emits
is a decision each backend makes alone — which is how three backends come to
disagree about one document without any of them being wrong.

### Option C — the document declares which it is

A reference states whether its target is internal or external. An internal
target resolves to a document type or a lock export, exactly as a relationship
target does. An external target does not resolve, and says so. A reference whose
target does not resolve **and** did not declare itself external is refused.

## Decision

**Proposed: Option C.** It is not chosen here — the ruling is
[#9](https://github.com/agent-ix/filament-core-data/issues/9)'s, and it changes a
published schema.

## Rationale

**It is the only option under which a typo is distinguishable from an intention.**
That is the property the other two give up. Under A a legitimate external
reference cannot be expressed; under B a misspelling cannot be detected. Under C
both are expressible and only one of them validates, which is the whole
difference between a contract and a convention.

**It is this repository's existing pattern, not a new one.** Presence is
authored, never derived — a field's optionality is a thing the document says
rather than a thing a reader infers from multiplicity. The producer boundary
refuses rather than defaulting, and an unrepresentable state is made
unconstructible rather than validated away. "The document declares whether this
target is local" is the same move applied to one more member, and the argument
for it here is the argument already accepted there.

**The cost is real and is a schema change.** A new member on a reference
definition is a contract change under FR-051, and every existing document that
carries a reference must be re-emitted or defaulted. A default would have to be
`internal`, which makes the `assurance` fixture invalid and is the honest
outcome: that document does today assert a target nothing provides, and the
disagreement it triggered is the evidence.

**Options A and B are cheaper and buy a worse contract.** A needs no schema
change and B needs no gate, and both settle the disagreement — which is the
thing that makes them tempting at the moment a blocked ticket needs unblocking.
Neither leaves the vocabulary saying something it could not say before.

## Consequences

- `contracts-v1.md` gains a resolution sentence for references beside the one it
  has for relationships, and the schema gains the member that carries the
  declaration.
- REF-001..004 move with a `corpus-defect` verdict and a major `corpusVersion`
  bump, which the corpus disposition already anticipates for whichever way this
  is settled.
- The `assurance` fixture is re-emitted, declaring `ActorRef`'s target external
  or providing the type it names. Which of those is correct is a question about
  that fixture rather than about this rule.
- #52 unblocks: the `compiler-frontend` adapter can be wired against a rule both
  implementations can be measured for.
- Each backend gains a stated obligation for an external reference, rather than
  each inventing one.

## Status

**Proposed, not normative.** It records the analysis so
[#9](https://github.com/agent-ix/filament-core-data/issues/9) can rule against
options rather than against a blank page. Nothing implements it until that
ruling exists, and the corpus continues to record the disagreement until then.
