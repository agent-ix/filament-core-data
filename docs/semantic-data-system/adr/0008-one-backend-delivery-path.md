---
id: ADR-0008
title: "Deliver every backend through the seam"
type: ADR
status: normative
---
# ADR-0008: Deliver every backend through the seam

## Context

`src/compiler/backends/seam.mjs` is the generation seam: one place a target is
selected, one place a request is validated, one place a refusal is shaped, and
one place an `output-manifest.schema.json` document is assembled. It exists so a
backend is chosen by the `target` the caller names "rather than by whichever
call site reached for it".

Alongside it, each backend grew its own entry point. The Rust backend has
`rust-serde/cli.mjs` with its own request builder, its own default limits, its
own register and check verbs. That command is genuinely useful to a backend
author, and it is also how the Rust backend reached every consumer it had —
because until [ADR-0006](0006-frontend-host-boundary.md)'s sibling work,
[FR-130](../../../spec/functional/FR-130-register-the-rust-backend-in-the-generation-seam.md),
the seam registered `rust` as unimplemented. A complete backend was delivered
only by a private development command, and the documented entry point said the
capability did not exist.

That is the defect: **a private command became a delivery path by
default**, because nothing said it could not be.

## Decision

**Every backend reaches consumers through the generation seam. A private
command-line entry point is a development convenience and never a delivery
path.**

- A capability is not delivered until it is reachable by `target` through the
  seam. A backend that works only through its own command is unfinished,
  regardless of how complete its emission is.
- A backend MAY keep its own command for development, registers, goldens and
  checks. That command MUST NOT be the only route to any generation capability,
  and documentation MUST NOT direct a consumer to it.
- The seam remains the only assembler of the manifest a consumer receives. A
  backend returns files and diagnostics; it does not shape the delivered
  document.

## Rationale

**"Reachable through the seam" is the only definition of delivered that can be
checked.** Every other formulation — "the backend is complete", "the tests pass",
"you can generate a crate" — was true of the Rust backend on the day the
documented entry point answered `unavailable` and named a ticket that owed
nothing. The seam registry is a single readable list, so a gate can assert that
every target the contract declares is either registered with a backend or
registered with the ticket that owes it. Nothing can assert the same about a
scattering of private commands.

**A private command is not harmful; being the *only* route is.** The Rust
backend's command carries the register, the golden regeneration and the mutation
catalogue, and none of that belongs in a consumer-facing seam. The rule
therefore constrains what a command may be the sole route *to*, rather than
forbidding commands.

## Consequences

- FR-130 registers the Rust backend, which is the first application of the
  delivery rule; the JSON Schema backend follows, and Python follows that.
- A gate reads the seam registry and asserts every declared target is either
  implemented or attributed to an owning ticket, so "unimplemented" can never
  again be a stale claim about a finished backend.
- `emitTypeScriptPackage` is misnamed: it is the target-generic emitter every
  target passes through, and it now routes Rust and JSON Schema. Renaming it is
  a consequence of this decision rather than a separate cleanup.
- This decision does not extend the seam's contract to carry
  [ADR-0007](0007-emitted-set-contract.md)'s five concepts. That extension is
  real work and is specified separately; recording both in one ADR would let the
  smaller change ride on the larger one's review.

## Status

Normative. It records the owner ruling of 2026-09-12 on
[#100](https://github.com/agent-ix/filament-core-data/issues/100).
