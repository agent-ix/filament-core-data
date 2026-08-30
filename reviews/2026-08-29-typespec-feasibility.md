---
id: SR-014
title: "TypeSpec feasibility and structural schema-source review"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data#4 and spikes/typespec-feasibility/"
review_set: all
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-014"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-015"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-016"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-017"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-018"
    type: reviews
---
# TypeSpec feasibility and structural schema-source review

## Summary

**PASS for the isolated feasibility evidence; HOLD for TypeSpec promotion.** The
spike demonstrates a viable TypeSpec authoring model, official JSON Schema and
Protobuf emission, a semantic intermediate representation, and typed consumers.
It also exposes an adverse P0 result: the official JSON Schema bundle requires a
validation-only URI repair, while semantic IR and production Rust/TypeScript
generation would be Agent IX compiler products without accepted ownership.

The evidence therefore selects modular JSON Schema 2020-12 with explicit
package, profile, mapping, and projection metadata as the safe fallback for the
next specification stage. ADR-0004 remains provisional and current Avro,
consumers, persistence, publications, and catalogs remain unchanged.

## Evidence and Method

The experiment pins TypeSpec compiler and official JSON Schema packages at
1.15.0, the official Protobuf/versioning packages at 0.85.0,
`datamodel-code-generator` at 0.76.0, Pydantic at 2.12.5, and Rust dependencies
exactly. It compiles one modular slice covering identity, provenance, recursive
relations, artifacts, events, runs, evidence, discriminated results,
extensions, optionality, explicit null, deprecation, and two package versions.

Two clean generations have identical normalized fingerprints. The same positive
and negative golden artifacts are exercised by repaired JSON Schema validation,
TypeScript's compiler, Python/Pydantic validation, standard Python dataclasses,
and Rust/Serde. Official Protobuf syntax and message resolution pass through
protobufjs; native `protoc` is unavailable and remains a P1 partial result.

The custom emitter is a real TypeSpec `$onEmit` extension using the compiler's
semantic traversal API. Its deterministic IR retains package/type identity,
source locus, kind, role, field optionality and nullability, pattern constraints,
discriminators, recursion, extension points, package versions, added/removed
versions, and deprecation. Rust and TypeScript generators are deliberately
prototype-only. Python generation uses the established upstream generator
through a local schema normalizer and rejects `x-python-import`,
`customTypePath`, and `default_factory` before generation.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-022 | high | The official JSON Schema bundle emits a shared `Record<string>` helper with a relative `$id`; references from two package namespaces resolve to different absolute URIs. AJV accepts the golden only after explicit validation-only URI aliases, so the unchanged P0 rule is not met. | `generated/official/json-schema/semantic.json`, `evidence/capabilities.json` |
| FND-023 | high | TypeSpec's official emitters do not supply the required governed semantic IR or production Rust/TypeScript surfaces. Selecting this path means operating a separately released, reusable compiler product with named owners, compatibility policy, conformance corpus, upgrade SLA, and incident response. | compiler epic #5; issues #18–#27 |
| FND-024 | medium | `datamodel-code-generator` is a credible Python path for both Pydantic v2 and standard dataclasses and passes the representative case, but its adapter, sandbox, full corpus, security regression, and cross-version behavior still require qualification. | compiler issue #23, `generated/custom/python/` |
| FND-025 | medium | Official Protobuf generation preserves explicit/reserved field numbers and parses successfully, but native `protoc` was not available. Protobuf remains a fit-for-purpose wire projection, not the universal semantic source. | `generated/official/protobuf/semantic.proto` |
| FND-026 | medium | Arrow is intentionally lossy and analytical; Markdown is a text representation with declared round-trip/loss behavior. Neither should own semantic authority. | `generated/custom/arrow/schema.json`, `generated/custom/markdown/mappings.json` |

## Recommendation and Gate

**GO** to accept the issue #4 evidence and use modular JSON Schema 2020-12 as the
fallback input to issue #9's detailed metamodel specification. **HOLD** TypeSpec
promotion and creation of the production compiler repository until compiler
issue #18 accepts ownership, repository boundary, support policy, budget, and
rollback obligations. **HOLD** all consumer migration, database change, package
publication, enforcement, and legacy retirement work behind their existing
gates.

If the decision is not accepted, rollback is simply to close or leave unmerged
the isolated stacked PR and delete its topic branch/worktree. No runtime,
canonical schema, consumer, database, registry, package, or external repository
state depends on the spike. If TypeSpec is later selected, issues #18–#27 must
complete the normal specify, matrix, composite review, plan, implementation,
code-review, and gap-analysis lifecycle before any production adoption.
