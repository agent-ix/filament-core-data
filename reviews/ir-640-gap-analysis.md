---
id: SR-11694
title: "IR-640 gap-analysis review"
type: SpecReview
analysis: gap-analysis
scope: "filament-core-data PR 295; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md; docs/semantic-data-system/adr/0012-lift-dependency-feature-selection.md; docs/semantic-data-system/adr/index.md; full spec and source tree"
review_set: subset
---

## Summary

Reviewed frozen PR 295 at 582198895ab23b23df7f6c0509bfe54d45402407 against a684329400b7e28a8b867693ab6df4af72cd2d87. Only FR-091, ADR-0012 and the ADR index change. No manifest, lock, implementation or test changes. Existing FR-091/FR-099/NFR-033 and ADR-0006 contracts remain in force. No applicable AssuranceProfile or repository AGENTS.md/CLAUDE.md was found. The dispatch expressly preserves existing dependency pins, identity contracts and measured evidence; these user requirements override the generic checklist antipattern for those retained controls.

## Verdict

FAIL — Findings require explicit disposition.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The unchanged base already contains 1546 untagged criteria, including this criterion; no verified waiver or tracker owner was established. Full baseline inventory is retained with this review. | FR-001-AC-1; spec/functional/FR-001-indexed-architecture-record.md |
| FND-002 | high | The planned active-graph positive and negative control has no tagged runnable evidence yet; implementation remains owned by open IR-640. | FR-091-AC-12; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |
| FND-003 | high | The planned selected-feature public-lift/CLI regression has no tagged runnable evidence yet; implementation remains owned by open IR-640. | FR-091-AC-13; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |
| FND-004 | medium | The planned matched qualification analysis has no evidence symbol or candidate measurement yet; qualification remains owned by open IR-640. | FR-091-AC-14; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |

## Coverage

Plan completion: not assessed

The full computed matrix includes every declared criterion, including constraints. Base: 2166 rows =1546 untagged,381 method-without-symbol,235 tagged,4 tagged-by-ignored-test. Candidate:2169 rows =1548 untagged,382 method-without-symbol,235 tagged,4 ignored-only. Existing status assignments are unchanged; the only new rows are AC-12/13 untagged and AC-14 method-without-symbol. Baseline criteria have no verified waiver or current ticket owner established by this review; their owning requirement IDs remain the authoritative owners. New planned evidence belongs to IR-640, which remains open. A spec-only merge requires the lead to decide explicitly whether to defer those implementation/evidence findings within IR-640; this reviewer grants no waiver.

Complete matrices and untagged inventories are retained alongside this review as base-matrix.json, candidate-matrix.json, base-untagged.json and candidate-untagged.json. The existing four ignored-only criteria and all method-without-symbol rows are not represented as proven. No run evidence was collected. Optional semantic review was not requested and is skipped.

Whole-tree source surface inventory spans compiler/frontends/IR/package graph/CLI, Rust semantic reader and extraction frontend, semantic schema, conformance adapters and consumers, generated kernel language bindings, and scripts. Requirement owners are FR-041..053 and FR-063/130/131/136/138 for compiler seams; FR-054..080 for backends/readers; FR-081..090 for kernel/packages/consumers; FR-091..099 and FR-142/143 for lift; FR-035..039/140 for conformance; FR-106/133..145 for later vocabulary/identity/numeric contracts. These behavioral families have stated owners. Source scan found no confirmed production todo!/unimplemented! stub or test stub behind changed criteria; test negative-control stubs are intentional perturbations. No changed code creates an unowned behavior. This inventory is static and does not assert exhaustive semantic correctness or test execution.

Frozen head remains unchanged. No native aggregate or implementation qualification is claimed.
