---
id: US-013
title: "Generate governed Python types from a qualified upstream generator"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "depends_on"
---
# [US-013] Generate governed Python types from a qualified upstream generator

## Story

**As a** maintainer of the Agent IX semantic data system
**I want** the Python side of the semantic contract to be produced by an established, pinned, security-floored upstream generator whose behaviour has been measured against this repository's own conformance evidence, with only the smallest owned adapter closing the gaps that measurement finds
**So that** Python consumers receive types that carry the contract's constraints rather than a generator's defaults, and this repository does not acquire a hand-written Python code generator it would then have to maintain.

## Context

[FR-043](../functional/FR-043-govern-the-python-generation-adapter.md) already
settled the shape: the repository owns a JSON Schema adapter and the code
generation itself stays `datamodel-code-generator`. It pinned `0.76.0` and
`pydantic` `2.12.5`, closed a three-key forbidden-extension set, and explicitly
left the generator invocation to this story.

Two published advisories bound the floor. GHSA-386q-5hp3-95m9 is code injection
through an attacker-controlled `default_factory` schema field, affecting
`>= 0.17.0, <= 0.60.1` and first patched in `0.60.2`. GHSA-5578-w22f-pfx9 is
code injection through `x-python-import` and `customTypePath` reaching generated
import statements, affecting `>= 0.11.6, <= 0.63.0` and first patched in
`0.64.0`. Both are high severity. A schema is therefore not inert input to this
generator: it is potentially executable input, and the generator has a
command-line surface — custom template directories, custom formatters,
additional imports, import overrides, type mappings, extra template data, class
decorators, base classes, and remote reference fetching — that is equally
capable of putting caller-controlled Python into the output.

The upstream supports five output families: Pydantic v2 `BaseModel`, Pydantic v2
dataclass, stdlib dataclass, `TypedDict`, and `msgspec.Struct`. They are not
equivalent in fidelity, and the difference is invisible unless it is measured.
This story exists to measure it before anything downstream depends on it.

The conformance corpus of issue #20 is the independent oracle, and its
`python-backend` adapter slot is declared `unavailable`. Wiring that slot is
issue #52 and is blocked on GAP-011. Whatever this story cannot demonstrate
against the oracle stays an unmet row rather than becoming a claimed pass.

## Acceptance Examples (Illustrative)

### [US-013-EX-1] A constraint survives the trip into Python

- **Given** a semantic type whose field is a bounded integer, a patterned string, and a closed object
- **When** the governed profile generates Python for it
- **Then** the bound, the pattern, and the closure are present in the generated source and are enforced at run time — and where the chosen output family cannot carry one of them, generation fails naming the construct and the family rather than emitting the weaker type

### [US-013-EX-2] An output family is judged, not assumed

- **Given** the five upstream output families
- **When** the qualification runs
- **Then** each family carries a recorded verdict, the exact toolchain versions that produced it, and the list of constructs it retains and loses — including families judged unsuitable for a validating surface

### [US-013-EX-3] A hostile schema does not become code

- **Given** a schema carrying `x-python-import`, `customTypePath`, `default_factory`, a custom template reference, or a remote `$ref`
- **When** generation is requested
- **Then** it is refused before the generator is invoked, naming the offending construct, and no Python is written

### [US-013-EX-4] Two clean generations agree

- **Given** the same input schema and the same profile
- **When** generation runs twice from a clean state
- **Then** the two outputs are byte-identical after the declared normalization, and the recorded toolchain fingerprint is identical

### [US-013-EX-5] Nothing ships

- **Given** the qualification has landed
- **When** the repository is inspected
- **Then** no package was published to PyPI, no backend consumer was migrated, and no published schema, fixture, or existing generated artefact changed

## Options (Exploratory)

The Python route could be a hand-written generator owned here, the upstream used
as-is, or the upstream plus an owned adapter. The measured gaps decide which:
a hand-written generator is introduced only if the qualification produces a
reviewed P0 gap, and that decision belongs to the program owner, not to this
story. The output family could be fixed to one, or several could be offered
with per-family verdicts. Constraint loss could be tolerated with a warning or
made a hard failure. The functional requirements settle each of these.

## Constraints (Contextual)

The upstream stays an attributed, pinned MIT dependency with its licence
preserved; everything original is AGPL-3.0-only with no carve-outs. No version
affected by either advisory may be installed. No PyPI publication and no backend
consumer migration happen here. The `datamodel-code-generator[http]` extra is
not installed, so remote reference fetching has no transport even if a guard
were bypassed.

## Dependencies (Contextual)

Depends on [US-009](./US-009-build-from-a-supported-compiler.md) for the owned
adapter seam, [US-010](./US-010-compile-a-semantic-package.md) for the IR and its
emitted schemas, and [US-008](./US-008-judge-a-compiler-against-an-independent-corpus.md)
for the oracle. Blocks publication (issue #11) and Python consumer migration.

## Priority and Risk (Informative)

Priority is P0. The principal risk is that a family's defaults quietly widen the
contract — an open object where the schema is closed, a nullable field where the
schema forbids null, a bare `str` where the schema constrains a pattern — and
that the widening is discovered by a consumer rather than by a gate. The
secondary risk is that the generator's option surface is treated as
configuration rather than as an injection surface.

## Traceability (Informative)

This story drives [FR-072](../functional/FR-072-pin-the-python-generation-toolchain.md)
through [FR-080](../functional/FR-080-type-check-and-validate-generated-python.md)
and is constrained by [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md)
and [NFR-027](../non-functional/NFR-027-reproducible-non-disruptive-python-generation.md).
