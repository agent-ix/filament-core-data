---
id: ARCH-INDEX
title: "Semantic data system architecture"
status: normative
---
# Semantic data system architecture

This is the durable entry point for the Agent IX semantic data architecture.
It separates semantic meaning from the documents, database rows, messages,
generated language types, and analytical files that represent it. Start with
[principles](principles.md), then use the concern-specific records below.

The record implements [the issue #8 requirements](../../spec/spec.md). At
publication its scope was architecture only: it did not change the then-current
Avro contract, generated bindings, database state, Quire module enforcement,
published packages, or any consumer. The zero-reader Avro boundary was
subsequently retired under recorded owner approval.

## Status vocabulary

- **normative** — accepted and governing until superseded by an indexed ADR.
- **provisional** — usable for exploration but not settled; the indexed
  resolution gate must pass before adoption.
- **informative** — context or evidence that imposes no requirement.
- **historical** — retained superseded guidance that is normative of nothing.

Every artifact has exactly one document status. A subsection may call a detail
provisional without changing the document's governing status; such details name
their own ticket before they can become implementation input.

## Architecture record

| Artifact | Status | Resolution gate | Purpose |
|---|---|---|---|
| [Principles](principles.md) | normative | — | Governing semantic-first rules |
| [Terminology](terminology.md) | normative | — | Shared vocabulary and status meanings |
| [Concern-specific authority](authority.md) | normative | — | Authority, edit direction, and provenance by concern |
| [Ownership boundaries](ownership.md) | normative | — | Repository and subsystem responsibilities |
| [Metamodel and data planes](metamodel.md) | provisional | [issue #9](https://github.com/agent-ix/filament-core-data/issues/9) | Semantic IR, kernel, identity, planes, and extensions |
| [Semantic contract v1](contracts-v1.md) | provisional | [issue #9](https://github.com/agent-ix/filament-core-data/issues/9) | Executable IR, package, mapping, projection, target, compatibility, and legacy contracts |
| [Semantic baseline 1.2](baseline-1-2.md) | provisional | [issue #95](https://github.com/agent-ix/filament-core-data/issues/95) | Selected field-presence, model, relationship, population, and ecosystem-configuration contracts; implementation remains pending |
| [Generated package contract](generated-packages.md) | normative | — | Cross-language package and consumer boundary |
| [Representations and transformations](representations-and-transformations.md) | normative | — | Output selection, mappings, profiles, loss, and provenance |
| [Compatibility policy](compatibility.md) | normative | — | Cross-format evolution and retired-boundary policy |
| [Legacy Avro boundary retirement](legacy-avro-retirement.md) | normative | — | Final census, approval, and retirement scope |
| [TypeSpec feasibility](typespec-feasibility.md) | historical | — | Capability matrix used by the issue #4 spike; resolved by ADR-0005 |
| [Corpus review method](corpus-review-method.md) | normative | — | Evidence format for current-type and contract reviews |
| [Program roadmap](roadmap.md) | normative | — | Ordered waves and human go-or-hold gates |
| [Conflict register](conflicts.md) | normative | — | Dispositions against existing Quire/module architecture |
| [ADR index](adr/index.md) | normative | — | Current decisions and supersession rules |
| [ADR-0001: Concern-specific authority](adr/0001-concern-specific-authority.md) | normative | — | Reject one universal authoritative format |
| [ADR-0002: Generated-package ownership](adr/0002-generated-package-ownership.md) | normative | — | Place compiler and emitters in `filament-core-data` |
| [ADR-0003: Best-fit representations](adr/0003-best-fit-representations.md) | normative | — | Select wire and analytical formats per boundary |
| [ADR-0004: Conditional TypeSpec source](adr/0004-conditional-typespec-source.md) | historical | — | Superseded by ADR-0005 |
| [ADR-0005: TypeSpec structural source](adr/0005-typespec-structural-source.md) | normative | — | TypeSpec is the structural schema source; compiler and emitters stay here |

## Program ownership

- Project 17 program epic: [filament-core-data#3](https://github.com/agent-ix/filament-core-data/issues/3).
- Project 18 companion epic: [quoin#286](https://github.com/agent-ix/quoin/issues/286).
- Quire/Quoin companion architecture: [quoin#289](https://github.com/agent-ix/quoin/issues/289).
- Filament contract census: [filament-core-data#10](https://github.com/agent-ix/filament-core-data/issues/10).
- Quire/Quoin corpus review: [quoin#288](https://github.com/agent-ix/quoin/issues/288).

## Change rule

A normative change requires an ADR that names affected requirements,
compatibility consequences, and any superseded decisions. A provisional record
becomes normative only when its named gate passes and an ADR or explicit review
records promotion. Historical records remain linked from their current
successor, and the supersession graph must remain acyclic with at most one
current successor per historical decision.
