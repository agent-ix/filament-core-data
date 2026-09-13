---
id: ADR-0009
title: "Resolve a reference target by declaring where it lives"
type: ADR
status: accepted
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
oracle's reading so the disagreement stays visible instead of drifting. The gap
was authored under [#9](https://github.com/agent-ix/filament-core-data/issues/9),
which closed on 2026-09-03; the register it belongs to is maintained by
[#59](https://github.com/agent-ix/filament-core-data/issues/59), which is this
ruling's owner.

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

### Option D — one resolution rule for both kinds, over declarations plus declared imports

A target — a relationship's or a reference's — resolves to a type declared in
the document, a lock export, or an export named by a declared manifest import. A
target that resolves to none of those is refused.

This is not a new mechanism. `package-manifest.schema.json` already carries
`imports[]`, and each entry already names a `packageIdentity`, a
`versionConstraint`, and the exact `exports[]` the document is permitted to
name. The manifest can already say "this document references `Actor` from
`agent-ix/core` at version X". Nothing in the fixture says it:
`test/fixtures/compiler/packages/assurance/package-manifest.json` declares
`"imports": []` while `main.tsp` names a type from another package.

It is also the shape every comparable system converged on. Protocol Buffers
requires `import "other.proto"` before a message may name a type from it and
fails compilation otherwise. XML Schema requires `xs:import namespace=` before a
`ref=` may cross a namespace. OWL requires `owl:imports`. TypeSpec — the dialect
`source.dialect` names for this very document — requires an `import` statement
and treats an unresolved type reference as a compile error. JSON Schema 2020-12
resolves a `$ref` against the base URI over an explicit retrieval set. In none
of them may a document name a foreign symbol it did not declare a dependency on,
and in none of them is an unresolvable reference valid.

## Decision

**Option D.** A target — a relationship's or a reference's — resolves to a type
declared in the document, a lock export, or an export named by a declared
manifest import. A target that resolves to none of those is refused. The rule is
the same sentence for both kinds.

This supersedes the earlier proposal of Option C, which was written before the
manifest's existing `imports[]` member was weighed. Option C proposed a new
per-reference member to carry a declaration the package manifest already
carries.

## Rationale

**The mechanism already exists and is unused.** `package-manifest.schema.json`
carries `imports[]`, and each entry names a `packageIdentity`, a
`versionConstraint`, and the exact `exports[]` the document may name. The
manifest can already state that this document depends on `Actor` from
`agent-ix/core`. The `assurance` fixture declares `"imports": []` and then names
a type from another package anyway. The contract did not lack a way to express
an external target; one document failed to use it.

**It settles the disagreement without either implementation being wrong.** The
issue #20 oracle is right that the target must resolve. The issue #19 compiler
is right that a reference may name something the document does not itself
declare. `imports[]` is what makes both true at once: the target resolves,
through a declared dependency, to a named export of another package.

**A typo stays distinguishable from an intention.** That is the property Option
C was chosen for, and Option D keeps it. `ix://agent-ix/core/type/Actor` is
valid when `agent-ix/core` is imported and names `Actor` among its exports;
`ix://agent-ix/core/type/Atcor` is refused under the same import, because
`Atcor` is not in that export list. Under B neither is detectable; under A
neither is expressible.

**It is the shape every comparable system converged on.** Protocol Buffers, XML
Schema, OWL, and TypeSpec — the dialect `source.dialect` names for this very
document — all require a declared import before a document may name a foreign
symbol, and all treat an unresolvable reference as an error. JSON Schema 2020-12
resolves `$ref` against a base URI over an explicit retrieval set. A closed
vocabulary that disagreed with all of them would be carrying a cost it could not
name a benefit for.

**It costs no schema change.** Option C's price was a new member on the
reference definition, a contract change under FR-051, a re-emission of every
document carrying a reference, and a default that would have to be `internal`.
Option D reaches the same guarantee with `imports[]`, which is already published,
already schema'd, and already required to be exact.

**Option A and Option B remain wrong for the reasons stated above**, and Option
C is not wrong — it is redundant. It proposes per-reference what the manifest
already declares per-package, and two places to say one thing is how two
implementations come to disagree.

## Consequences

- `contracts-v1.md` extends the relationship sentence rather than replacing it:
  the same rule governs a `reference`-kind definition's `target`, and for both
  kinds a declared manifest import is a third resolving source. The existing
  sentence stays verbatim, so the corpus cases and diagnostic codes that quote
  it keep citing text that still occurs in the artifact. The changed-path gates
  on `conformance/cases/**` forbid this ruling from editing those citations,
  and extending rather than rewriting is how the rule lands without touching
  them.
- No schema change. `imports[]`, `exports[]`, and the `semanticIdentity` pattern
  are unchanged, and no published document is re-emitted for a contract
  revision.
- `test/fixtures/compiler/packages/assurance/package-manifest.json` declares its
  `agent-ix/core` import naming `Actor`, and `agent-ix/core` must therefore
  exist as a resolvable package for that fixture. Whether that means adding the
  package or dropping `ActorRef` is a question about the fixture, owned by
  [#52](https://github.com/agent-ix/filament-core-data/issues/52).
- REF-001..004 move with a `corpus-defect` verdict and a major `corpusVersion`
  bump, which the corpus disposition already anticipates. The oracle's rule is
  upheld; what changes is that an unresolvable target now has a stated remedy
  rather than only a refusal.
- #52 unblocks: the `compiler-frontend` adapter can be wired against a rule both
  implementations can be measured for. #7 follows.
- No backend gains an obligation to emit something for a target it knows nothing
  about, because no such target is admissible.

## Status

**Accepted.** The rule is normative for `contracts-v1.md` and for the issue #20
oracle. GAP-011's register row moves to `ruled` under
[#59](https://github.com/agent-ix/filament-core-data/issues/59), and the fixture
repair and corpus move are carried by
[#52](https://github.com/agent-ix/filament-core-data/issues/52).
