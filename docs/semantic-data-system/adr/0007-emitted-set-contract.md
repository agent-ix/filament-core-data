---
id: ADR-0007
title: "Specify the emitted set as concepts, realised per language"
type: ADR
status: normative
---
# ADR-0007: Specify the emitted set as concepts, realised per language

## Context

Three backends generate packages from one semantic contract, and the file names
they emit look like a shared convention. The table and the readings below are
the measurement of 2026-09-12, **before** the repair this decision authorises;
[FR-137](../../../spec/functional/FR-137-spell-semantic-identity-and-provenance-alike-in-every-package.md)
has since landed it, and the Status section records what the names are now:

| | TypeScript | Rust | Python |
|---|---|---|---|
| types | `types.ts` | `src/types.rs` + `src/types/*.rs` | generated module |
| validation | `validators.ts` | in the type, via `try_new` and serde | Pydantic |
| refusals | `errors.ts` | in the crate's diagnostic vocabulary | — |
| identity | `identity.ts` | `src/identity.rs` | — |
| metadata | `metadata.ts` | `src/metadata.rs` | `PROVENANCE.json` |

The resemblance is a coincidence across the three and a convention inside one.
`FR-065` fixes an eight-file set for the ESM package only. The generation seam
constrains exactly five member names on a backend object and requires emitted
paths to stay inside the output root; it names no file, no module and no
concept.

Worse than absent: **two of those names mean opposite things in the two
backends that were written independently.** Read from the generated sources
themselves:

- TypeScript `identity.ts` — "the semantic identity of everything this package
  renders, and the contract data a TypeScript type cannot carry: roles, unknown
  policies, units, relationship descriptors, and extensions".
- Rust `src/identity.rs` — "provenance constants, each taken verbatim from the
  compiler request": source identity, source digest, package identity, manifest
  digest, lock digest.
- TypeScript `metadata.ts` — "the provenance of the semantic document this
  package was generated from".
- Rust `src/metadata.rs` — "contract metadata, emitted beside the types it
  belongs to": roles, origin, relationships, operations, clauses, occurrences,
  extensions.

TypeScript's `identity` is Rust's `metadata`, and TypeScript's `metadata` is
Rust's `identity`. A consumer reading two generated packages has to know which
language it is holding before it can know what `identity` means.

Python is a third shape again: no identity module, provenance as a
`PROVENANCE.json` sidecar rather than emitted code, and the types produced by a
pinned third-party generator rather than by a backend of this repository's.

There are two ways to read this. One is that the file set is a contract and
Python violates it. The other is that the file set was never a contract, and the
two backends that appear to agree are the ones with the real defect. The second
is correct: nothing anywhere declares the set, and the two independent
implementations disagree about the meaning of half of it.

## Decision

**The emitted set is specified as a conceptual contract, realised idiomatically
per language. It is not a filename contract.**

Every target SHALL emit each of the following, and every backend's own
specification SHALL name where each one lands in that target:

1. **Types** — the declared semantic types in the target's native form.
2. **Validation** — how a value is checked.
3. **Diagnostics** — the refusal vocabulary a consumer can match on, closed and
   coded.
4. **Semantic identity** — identity, kind, roles, extensions and relationships,
   per type and per field.
5. **Provenance** — source identity and digest, package identity and version,
   contract version, generator identity, and fingerprint.

Nothing above requires a particular file, module or directory. A target that
carries a concept in its type system rather than in a separate artifact
satisfies it by saying so.

**`identity` and `provenance` are distinct concepts and SHALL be spelled
distinctly in every backend.** The current swap is a defect and is repaired:
whatever a backend names its provenance artifact, it is not `identity`, and
whatever it names its semantic-identity artifact, it is not `metadata` in one
language and `identity` in another. A consumer must not need to know the
language to know what a name means.

Not required of every target: builders, serialization implementations where the
language does not need them, per-file banners. Where a backend emits more than
the five, it declares what it emits.

## Rationale

**Per-language variation in validation is a property of the languages, not a
gap.** TypeScript types erase at runtime, so a TypeScript package that did not
emit validators would offer no runtime check at all — `validators.ts` existing
only there is the correct answer, not an inconsistency. Rust carries
`deny_unknown_fields`, fallible constructors and a `validate()`, so a separate
validator module would duplicate what the type already enforces. Python
delegates to Pydantic, which is a property of the chosen library and a
legitimate answer. A filename contract would have forced two of the three to
emit something pointless to satisfy a symmetry nobody consumes.

**A filename contract also cannot survive a fourth target.** The programme
already has JSON Schema, where "a types module" and "a validators module" are
the same document, and SysML is proposed. Writing the contract at the level of
files would require amending it for each target; writing it at the level of
concepts does not.

**The naming swap is different in kind and is therefore fixed rather than
tolerated.** Every other variation above is explained by a language difference.
Nothing about Rust or TypeScript explains why one calls provenance `identity`
and the other calls semantic identity `identity`. Two independent
implementations reached for the same two words and assigned them oppositely,
which is what happens when no contract states them — and it is the one
difference a consumer cannot reason around, because the name is all they have.

**Python's status is recorded, not resolved here.** `python_backend/` is a
qualified wrapper around a pinned third-party generator, not a first-class
backend of this repository's. Under this decision that is a stated realisation —
provenance as a sidecar is a legitimate way to carry concept 5 — and it remains
true that the wrapper is a different kind of thing from the other backends. This
ADR does not make it one.

## Consequences

- Each backend's requirement gains a statement of where the five concepts land
  in that target. The statement is part of the backend's specification, not of a
  shared file list.
- The `identity` / `provenance` repair changes generated file names in at least
  the TypeScript and Rust packages, which is a compatibility change under
  FR-051 and is sequenced as one.
- `python_backend/`'s `PROVENANCE.json` stops reading as an inconsistency and
  starts reading as a declared realisation of concept 5.
- A gate can be written that asserts each backend's specification names all five
  concepts, which no gate can do against a file list that does not exist.
- The two backends' feature vocabularies — `kind:scalar` against `scalar` for
  the same concept — are the same class of defect and are named here as in
  scope for the repair, though they are not part of the emitted set.

## Status

Normative. It records the owner ruling of 2026-09-12 on
[#100](https://github.com/agent-ix/filament-core-data/issues/100). It changes no
generated byte on its own; the repairs it authorises are separately specified.

**The naming repair has landed.** `FR-137` specifies it and `TC-1537`..`TC-1544`
gate it. The rule applied: the concept *semantic identity* is spelled `identity`
in every backend, the concept *provenance* is spelled `provenance` in every
backend, and `metadata` is retired as a name for either. As emitted today:

| | TypeScript | Rust | JSON Schema | Python |
|---|---|---|---|---|
| semantic identity | `identity.ts` | `src/identity.rs` | `x-agent-ix-semantic-id`, inline | not carried; declared as a gap in FR-136 |
| provenance | `provenance.ts`, exporting `PROVENANCE` | `src/provenance.rs` | `index.json` | `PROVENANCE.json` |

JSON Schema and Python already spelled both concepts distinctly and were
declared rather than changed. The feature-vocabulary defect this decision also
names (`kind:scalar` against `scalar`) is not part of the emitted set and is not
repaired by FR-137.
