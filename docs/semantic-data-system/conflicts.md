---
id: ARCH-012
title: "Quire, Quoin, and module architecture conflict register"
status: normative
---
# Quire, Quoin, and module architecture conflict register

The Quire ADR files cited here are currently marked Proposed even when current
requirements or `docs/USAGE.md` reflect their direction. This register preserves
that metadata distinction: compatibility with an implemented boundary is not a
claim that the originating ADR was formally accepted.

| Existing decision or condition | Evidence snapshot | Apparent conflict | Disposition |
|---|---|---|---|
| Markdown is canonical and authored directly; no template rendering | `quire-rs/docs/USAGE.md` and ADR-0004, observed 2026-08-29 | Concern-specific authority says runtime records may be database-native | **Compatible:** “Markdown canonical” is scoped to authored typed documents, not every semantic occurrence. Preserve direct authoring and no rendering in Quire. |
| Unified compiled archetype shape | Quire ADR-0003 and FR-031 | Semantic packages distinguish compiler metamodel types and runtime kernel types | **Compatible:** Quire's archetype is its generic document-contract node. Generated module types are a different finite consumer projection and do not split Quire's registry. |
| Rendering/templates removed from Quire | Quire FR-031 CR note and current usage guidance | Semantic architecture includes a `rendering` transformation | **Preserve boundary:** rendering is a transformation category owned by presentation adapters/compiler profiles, never restored to Quire core. |
| Quire validates JSON values generically and does not require typed Rust structs per archetype | Quire FR-002 | Program requires generated Rust types | **Compatible:** Quire remains dynamic/generic; static consumers can use separately generated native packages. Quire core does not depend on them. |
| Artifact and object declarations remain separate in current module manifests | Installed module manifests and Quire usage guide, observed 2026-08-29 | ADR-0003 expresses unified-archetype intent | **Preserve current compatibility:** do not rewrite module manifests in issue #8. Project 18 review decides migration/disposition with corpus evidence. |
| Quoin distributes modules and workflows | Quoin installed catalog behavior and quoin#289 | Compiler also consumes module/package definitions | **Compatible ownership:** Quoin distributes; module repos own vocabulary; `filament-core-data` compiles; consumers adapt. |
| Current shared package is Avro-centered | This repository README, schema, generators, and tests | Target architecture is semantic-first and multi-representation | **Preserve compatibility:** Avro remains current and readable until the Project 17 census, bridges, consumer gates, and final retirement decision pass. |

## No silent supersession

Issue #8 supersedes none of the external Quire or Quoin decisions. It narrows
their scope where wording such as “canonical” could otherwise be read globally,
and records compatible ownership. A future change to Quire rendering, manifest
shape, or generic-data boundary requires an owning Quire/Quoin ADR and cannot be
made indirectly through this repository.

## Open decisions

- Exact reconciliation of separate current artifact/object manifest sections
  with unified-archetype intent belongs to
  [quoin#289](https://github.com/agent-ix/quoin/issues/289) and the corpus review.
- Exact metamodel fields and module package metadata belong to
  [filament-core-data#9](https://github.com/agent-ix/filament-core-data/issues/9).
- TypeSpec versus modular JSON Schema remains governed by
  [filament-core-data#4](https://github.com/agent-ix/filament-core-data/issues/4).
