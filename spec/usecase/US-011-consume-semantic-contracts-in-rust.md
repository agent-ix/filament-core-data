---
id: US-011
title: "Consume semantic contracts as native Rust types"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-060"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/FR-062"
    type: "traces_to"
---
# US-011: Consume semantic contracts as native Rust types

## Story

**As a** maintainer of a Rust consumer of Filament's semantic contracts
**I want** the compiler to hand me a Rust crate whose types are the contract
**So that** I can trust the compiler rather than re-reading the schema by hand, and
find out at compile time when the contract says something my code does not.

The story is about what the Rust consumer receives and can rely on. It does not
say how the compiler produces it.

## Context

Two Rust consumers already exist in the ecosystem — `filament-ide-rs` and
`quire-rs` — and both currently hand-write the structures they exchange with
Filament. Hand-written structures drift: a field gains a unit, a union gains a
variant, a relationship becomes composite, and nothing in the Rust code notices.
The whole point of the semantic IR is that "the contract changed" is a fact the
build can see.

The issue #4 prototype already emits Rust, and it is the counter-example this
story exists to displace. That emitter maps `utcDateTime` to `String`, every
enum member reference to `String`, every record-of-string map to
`BTreeMap<String, serde_json::Value>`, and every quoted literal type to `String`
— eleven separate places where the contract's meaning is thrown away, silently,
with no diagnostic and no record. A consumer reading the generated file cannot
tell a genuine string from a discarded constraint.

There is one construct that cannot be lifted honestly by machine alone: the
published `sourceLocus.path` pattern uses ECMAScript lookaheads, and RE2 — the
engine behind the Rust `regex` crate — has no lookahead. Recorded as GAP-002,
owned by this issue. Whatever a Rust consumer is handed for that field, it must
not be a bare `String` that quietly validates nothing.

The corpus and oracle from issue #20 already exist and already declare a
`rust-backend` slot, currently answering all 114 cases `unavailable`. This story
is about filling it with something whose agreement is worth reading.

## Acceptance Examples (Illustrative)

These examples describe what the Rust consumer expects to experience. They are
illustrative, not verification criteria.

### US-011-EX-1: A contract addition surfaces as a compile error

- **Given** a consumer that matches exhaustively on a generated union
- **When** the module owner adds a variant and the consumer regenerates
- **Then** the consumer's build fails at the `match`, naming the new variant

### US-011-EX-2: An out-of-range value is refused at the boundary

- **Given** a generated type whose field carries a `min` constraint
- **When** JSON carrying a value below the bound is deserialized
- **Then** deserialization fails with an error naming the field and the bound,
  rather than producing a value the contract forbids

### US-011-EX-3: An unrepresentable construct stops generation

- **Given** an IR document using something the Rust mapping cannot express
- **When** the consumer generates
- **Then** generation fails with a diagnostic naming the construct and the type,
  and no crate is written — rather than emitting a `String` and moving on

### US-011-EX-4: An unknown extension survives a round trip

- **Given** a document carrying an extension the generated crate does not know
- **When** the consumer deserializes it and serializes it again
- **Then** the extension is still there, in a surface the consumer can see and
  name, and it never became a default value of a known field

### US-011-EX-5: The same input yields the same bytes

- **Given** the same IR document, profile, and generator version
- **When** the consumer generates twice, on two machines
- **Then** the two crates are byte-identical, so a diff of generated output is
  evidence about the contract and not about the machine

## Options (Exploratory)

Approaches raised in discovery, none of them commitments: deriving the crate from
the published JSON Schema instead of the IR (rejected in discussion because the
schema is a projection, not the exchange boundary); depending on a third-party
validation crate such as `validator` or `garde` (raised against the published
`rust` target contract, which lists `serde` as the only runtime dependency);
depending on the `regex` crate for pattern constraints (raised and noted as not
answering GAP-002, since RE2 is exactly the engine that cannot compile the
pattern in question); emitting `serde_json::Value` for open surfaces (raised and
noted as the degradation this story exists to prevent).

## Constraints (Contextual)

Consumers noted that generated code they cannot read is generated code they will
not trust, so the output should look like Rust a person would write. The
published `rust` target contract in
[fixtures/semantic/v1/positive/target-contracts.json](../../fixtures/semantic/v1/positive/target-contracts.json)
already records `serde` as the sole runtime dependency, `fail` as the
unsupported-feature policy, and issue #21 as the qualification evidence. These
are context for analysis, not yet binding text.

## Dependencies (Contextual)

Relationships observed during discovery. Upstream: the versioned semantic IR and
its reader ([US-010](./US-010-compile-a-semantic-package.md)); the conformance
corpus and its independent oracle
([US-008](./US-008-judge-a-compiler-against-an-independent-corpus.md)).
Downstream: the package publication work (issue #11), which this story
deliberately does not reach, and the cross-language compatibility gate (issue
#7). Sibling: the TypeScript (issue #22) and Python (issue #23) backends, which
face the same mapping questions in their own languages.

## Priority and Risk (Informative)

Business value is high: the Rust consumers are the ones closest to the editor and
the parser, and they are the ones currently carrying hand-written copies. Urgency
is medium — nothing is published until the issue #7 and quoin#290 gates pass. The
risk if unmet is that the "generated" story stays a claim: an emitter that
degrades quietly is worse than no emitter, because it looks like evidence.

## Notes (Informative)

Open question raised in discovery and left open here: when a `reference`-kind
type names a target nothing declares, should a backend emit a type for it? The
contract states a resolution rule for relationship targets and none for
references (GAP-011, owned by issue #9). Captured for analysis; this story
introduces no answer.

## Traceability (Informative)

Potential trace relationships: this story serves the durable-governance
stakeholder requirement, and is likely to drive requirements for the IR-to-Rust
mapping, identifier derivation, crate emission, constraint enforcement,
diagnostics, conformance agreement, determinism, consumption, and branch
coverage. Links may be updated as understanding evolves.
