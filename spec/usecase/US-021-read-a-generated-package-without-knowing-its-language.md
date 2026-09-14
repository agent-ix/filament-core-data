---
id: US-021
title: "Read a generated package without knowing its language"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "depends_on"
---
# [US-021] Read a generated package without knowing its language

## Story

**As a** consumer holding generated packages for more than one language
**I want** the same concept to carry the same name in every one of them
**So that** I can find a package's provenance, or the semantic identity of a
type it declares, without first working out which language I am holding and
which of two opposite meanings that language assigns to the word.

## Context

Three backends generate packages from one semantic contract, and two of them
were written independently. Both reached for the words `identity` and
`metadata`, and both assigned them — oppositely.

In the generated TypeScript package, `identity.ts` carries the semantic identity
of every type and field, and `metadata.ts` carries the provenance of the
document the package was generated from. In the generated Rust crate,
`src/identity.rs` carries provenance — source digest, lock digest, generator
identity — and `src/metadata.rs` carries the semantic identity, roles,
relationships and clauses. TypeScript's `identity` is Rust's `metadata`, and
TypeScript's `metadata` is Rust's `identity`.

This is not the same kind of difference as the rest of the emitted set.
[ADR-0007](../../docs/semantic-data-system/adr/0007-emitted-set-contract.md)
records that per-language variation in *how* a concept is realised is a property
of the languages: a TypeScript package must emit runtime validators because its
types erase, a Rust crate need not because its constructors are fallible, and a
Python package delegates to Pydantic. Every one of those differences has a
reason a reader can reconstruct. Nothing about Rust or TypeScript explains why
one calls provenance `identity`.

The word is all a consumer has. A consumer who learns the TypeScript package
first and then opens the Rust crate does not encounter a different arrangement
of the same information; they encounter the same word meaning the opposite
thing, with no signal that it has changed. The failure is silent by
construction — both files exist, both parse, both carry real data, and reading
the wrong one returns a plausible answer to a different question.

Two targets already spell this correctly and are the evidence that the two
spellings are not both defensible. The JSON Schema emission carries semantic
identity inline as `x-agent-ix-semantic-id` and its provenance in the index
document; the Python package carries provenance as `PROVENANCE.json`. Neither
uses `metadata` for either concept, and neither is confusing.

## Acceptance Examples (Illustrative)

### US-021-EX-1: Provenance is found by one name in every package

- **Given** a generated package for any implemented target
- **When** the consumer looks for the source digest, the package version and the
  fingerprint of the document generated from
- **Then** they are found in an artifact this repository names *provenance*, in
  every target, and never in one named `identity` or `metadata`

### US-021-EX-2: Semantic identity is found by one name in every package

- **Given** a generated package for any implemented target
- **When** the consumer looks for the semantic identity, kind, roles,
  relationships and extensions of a declared type
- **Then** they are found in an artifact this repository names *identity*, in
  every target, and never in one named `metadata`

### US-021-EX-3: Reading the wrong file is no longer possible by name

- **Given** a consumer who learned one generated language first
- **When** they open the generated package of a second language and read the
  artifact whose name matched what they were looking for
- **Then** they find the concept that name denotes, rather than the other one

### US-021-EX-4: The repair does not change what is carried

- **Given** the set of contract data a generated package carried before this
  change
- **When** the same document is generated after it
- **Then** every datum is still present and still reachable, because the defect
  is in the naming and not in the content

## Options (Exploratory)

Approaches considered while scoping, none implying commitment: declaring one
language's spelling correct and changing the other; keeping both spellings and
publishing a translation table; or minting names that neither backend currently
uses. The second leaves the trap in place and documents it, which is the outcome
this story exists to avoid — a consumer who has to consult a table has already
had to know they were holding two conventions. The third would churn the target
that is already right along with the one that is wrong.

## Constraints (Contextual)

The five conceptual outputs are already settled and are not renegotiated here;
this story is about their spelling, not their membership. A generated artifact's
*contents* are not open either — a rename that also dropped or reshaped a datum
would be a compatibility change of a different kind wearing this one's clothes.
Renaming a generated file is itself a compatibility change for a consumer that
imports it by path, and is sequenced as one.

## Dependencies (Contextual)

Relationships observed while scoping. Upstream: the emitted-set decision that
declares the five concepts and names this swap a defect, and the backend
specifications that state where each concept lands. Downstream: any consumer
importing a generated module by path, the committed golden packages that assert
the emitted bytes, and the cross-language agreement gate, which compares targets
by concept and not by file name. These are potential relationships, not formal
traceability.

## Priority and Risk (Informative)

Business value is high and urgency is moderate: no consumer is blocked today,
but every additional consumer and every additional target raises the cost of the
repair and the number of readers who learn the wrong convention first. The risk
if unmet is a silent misread — the one failure mode in the emitted set that
produces a confident wrong answer rather than an error.

## Notes (Informative)

Open questions captured for later analysis, introducing no requirement: whether
the two backends' feature vocabularies, which name the same concepts with
different spellings, are the same defect at a smaller scale; and whether a
generated artifact should carry a machine-readable statement of which concept it
realises, so that the correspondence is asserted by the package rather than by
its file name.

## Traceability (Informative)

Potential trace relationships established during refinement: this story may
trace to the durable semantic-data governance stakeholder requirement and to a
candidate functional requirement for spelling semantic identity and provenance
identically across every generated package. Links may be updated as
understanding evolves.
