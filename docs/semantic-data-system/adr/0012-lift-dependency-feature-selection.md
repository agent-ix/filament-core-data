---
id: ADR-0012
title: "Select only lift dependency features at the frontend edge"
type: ADR
status: accepted
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: relates_to
---
# ADR-0012: Select only lift dependency features at the frontend edge

## Context

[FR-091](../../../spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md)
owns the in-process Quire Markdown-to-semantic extraction contract. Its former
Inputs selected `quire-rs` default features, which also activate Rust, Python
and TypeScript source-symbol parsers. These source grammars are not inputs to
the frontend's bundle lift. The pinned engine already separates `resolve-file`
from `rust-symbols`, `python-symbols` and `typescript-symbols`; typed Markdown
`body_extraction`, model/enum tables and semantic declarations remain available
without the source-symbol features.

[IR-640](https://linear.app/agent-ix/issue/IR-640) changes this dependency
selection contract before implementation. Reducing build weight must preserve
the genuine public lift that downstream QSL model intake reaches through
`LiftRequest` and that contract-generator reaches through qsl-replay.

## Options

- **A: Select existing features at the frontend dependency edge.** Disable
  `quire-rs` defaults and select `resolve-file` at the existing revision. This
  uses the same crate and API with the smallest owner change. Cargo may retain
  optional packages in the lockfile even when it stops activating or compiling
  them.
- **B: Introduce a separate lift crate.** This adds publication and consumer
  migration work and risks a second implementation, although the existing
  feature seam already expresses the needed boundary.
- **C: Skip lift in QSL replay or patch contract-generator intake.** This would
  remove the real model-lift control instead of reducing its dependencies and
  would move the change outside the owning dependency edge.

## Decision

Choose **A**. The frontend selects `quire-rs` with `default-features = false`
and `features = ["resolve-file"]`, keeping `python` off, at the exact revision
already governed by
[NFR-033](../../../spec/non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md).
It excludes source-symbol parser activation from its own normal/build path.
An unrelated consumer dependency may re-enable features through Cargo feature
unification; this decision does not govern that edge or change upstream CLI
defaults.

The real `lift(LiftRequest)` path, typed `body_extraction` for model and enum
tables, canonical document bytes, package/node identities and typed diagnostics
remain the contract. There is no new crate, compatibility layer, copied parser
or replay bypass. Semantic schema and semantic IR dependencies remain governed
by their existing contracts.

## Consequences and verification

FR-091 Inputs and FR-091-AC-12 through FR-091-AC-14 change. Its existing loading,
extraction and refusal criteria remain in force.
[FR-099](../../../spec/functional/FR-099-provide-the-extraction-frontend-command-line.md)
keeps its public command and exit contract. NFR-033 keeps its dependency pin,
license, toolchain and independence requirements.
[ADR-0006](0006-frontend-host-boundary.md) keeps its injected producer and
filesystem/process boundaries. No prior ADR is superseded.

Implementation must check the actual activated normal/build graph and exercise
real public lift and CLI positive, negative and legacy controls. Restoring
defaults in a scratch control must expose parser activation to the same graph
check. Manifest text and package absence from `Cargo.lock` are insufficient
oracles. Optional lockfile entries may remain without violating the decision.

Qualification records lock bytes/package identities, activated dependencies,
compiled grammar packages, wall time and peak memory separately. A matched
upgrade-only control isolates the feature selection from unrelated upstream
revision movement; both builds use independent initially absent targets under
the same compiler, profile, job count and source-cache policy. First-run
failures remain evidence. A single build comparison is observational and
establishes no numeric performance guarantee.

Downstream adoption requires QSL to select the reviewed frontend revision via
its ordinary producer dependency before contract-generator qualification.
Regenerating a consumer lockfile alone cannot select a revision that QSL does
not name. This adoption preserves the qsl-replay-only consumer boundary.

## Status

The decision is normative upon merge. Implementation and runtime qualification
under IR-640 are **planned and unimplemented by this spec-only change**. This
record reports no candidate measurement or claimed savings.
