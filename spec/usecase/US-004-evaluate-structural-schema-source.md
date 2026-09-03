---
id: US-004
title: "Evaluate the structural schema source with native consumers"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
---
# [US-004] Evaluate the structural schema source with native consumers

## Story

**As an** owner of the shared semantic-data compiler and generated packages
**I want** a pinned vertical-slice experiment that emits and exercises ordinary Rust, TypeScript, and Python consumer types
**So that** I can confirm TypeSpec as the structural source from retained compatibility evidence rather than ecosystem reputation.

## Context

TypeSpec has official JSON Schema and Protobuf emitters and a programmable
compiler API, but the semantic-data platform also requires domain-model packages,
Arrow projections, cross-package identity, compatibility classification, and
predictable custom-emitter maintenance. A successful syntax example is therefore
insufficient.

## Acceptance Examples (Illustrative)

### [US-004-EX-1] Native consumer construction

- **Given** the representative schema compiles without diagnostics
- **When** Rust, TypeScript, and Python consumers import the generated packages
- **Then** each consumer constructs and validates the same golden artifact, event, run, evidence, and result data without redefining the schema

### [US-004-EX-2] Toolchain defect becomes a tracked defect

- **Given** an official emitter produces output that needs a workaround to validate
- **When** the feasibility report is reviewed
- **Then** the report retains the defect and its workaround as evidence, and the owner records it as a tracked defect rather than a rejection of the source

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| US-004-AC-1 | A reviewer can run one isolated command and inspect normal native Rust, TypeScript, and Python consumer construction over equivalent generated contracts and golden values. | Demonstration (TC-127) |
| US-004-AC-2 | A partial capability caused by a toolchain defect is retained with its workaround and tracked as a defect without changing the current Avro authority or any consumer. | Demonstration (TC-128) |

## Options (Exploratory)

Official emitters, the TypeSpec compiler API, a small custom semantic IR emitter,
and selected generation libraries may be tested. Experimental success does not
commit the production compiler to the spike implementation.

## Constraints (Contextual)

All versions, commands, generated outputs, diagnostics, and compatibility
examples are retained. The spike is unpublished and writes only inside its
isolated directory.

## Dependencies (Contextual)

The issue #8 architecture record defines the pass/fail gate. The issue #10
contract census supplies representative identity, optionality, provenance, event,
persistence, and accumulated-evidence mismatches.

## Priority and Risk (Informative)

Priority is P0 because the semantic IR and package specification depends on this
decision. The principal risk is a compiler upgrade breaking the Agent IX-owned
emitters; the retained golden fixtures qualify each upgrade.

## Notes (Informative)

The report recommends a source and records the cost of being wrong. The owner,
not the spike script, resolves the ADR. The decision is recorded in ADR-0005.

## Traceability (Informative)

This story drives [FR-014](../functional/FR-014-pin-typespec-experiment.md) through
[FR-018](../functional/FR-018-resolve-structural-schema-source.md) and is constrained
by [NFR-006](../non-functional/NFR-006-isolated-reproducible-spike.md) and
[NFR-007](../non-functional/NFR-007-honest-feasibility-evidence.md).
