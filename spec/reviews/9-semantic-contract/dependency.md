---
id: SR-020
title: "Dependency review of the semantic package and projection contract"
type: SpecReview
analysis: dependency
scope: "FR-019..026, NFR-008..012"
review_set: all
---
# Dependency review

## Summary

The issue #9 slice is enablement work. It defines contracts and evidence before
any reusable compiler, registry, runtime adapter, database migration, or
downstream adoption begins. The requirement graph is acyclic and supports
incremental implementation behind a normative-merge gate.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-033 | low | No dependency cycle or feature-before-enablement edge exists; downstream compiler and Quoin package work remain externally gated. | FR-019..026, filament-core-data#5, quoin#293 |

## Logical Dependency Order

1. FR-018 evidence informs FR-019 source selection.
2. FR-019 defines source/IR boundaries; FR-020 defines semantic types and identity.
3. FR-021 defines packages and locks; FR-022 defines mappings and profiles.
4. FR-023 defines representation contracts.
5. FR-024 consumes FR-019 and FR-020 for compilation target contracts.
6. FR-025 consumes identity, mappings, and target contracts for compatibility.
7. FR-026 preserves dynamic and legacy boundaries across the resulting graph.
8. NFR-008..011 constrain the graph; NFR-012 supplies the final non-disruption and human-approval gate.

No edge authorizes compiler implementation inside this ticket. Any retained
custom compiler/code generator belongs to the separate AGPL compiler campaign.
