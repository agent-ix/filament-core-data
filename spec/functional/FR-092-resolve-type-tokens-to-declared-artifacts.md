---
id: FR-092
title: "Resolve type tokens to declared artifacts, enumerations, kernel scalars, or an explicit failure state"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
---
# [FR-092] Resolve type tokens to declared artifacts, enumerations, kernel scalars, or an explicit failure state

## Description

The extraction frontend SHALL classify every `TypeRef.target` the engine
returns into exactly one closed `Resolution` state, so that no string reaches
the IR as a `typeRef` without a definition behind it and every non-resolution
is one diagnostic at the token's source locus.

## Inputs

- `FieldDecl.type_ref.target` and `OperationDecl.returns.target` from FR-091, which the engine (quire-rs FR-070) has already mapped to a kernel scalar name, `ix://<org>/<name>/type/<Name>` for a bundle artifact, `ix://<package>/type/<Name>` for a module import, or the placeholder `ix://<org>/<name>/unresolved/<Token>`
- The `BundleIndex` of FR-091 and the frontmatter `object` of every indexed artifact
- The kernel scalar library of FR-032 (`packages/semantic-core/kernel-scalars.json`)
- The `SemanticDiagnostic` list, which carries the engine's `semantic.unresolved-type` advisory with `reason` (`unknown-token`, `no-bundle-index`, `import-unresolved`) for every placeholder
- The lowering outcome of every artifact in the bundle (FR-091 refusal, FR-093 `ARTIFACT_NOT_LOWERED`, or a definition), computed before any token is classified

## Outputs

- `crates/extraction-frontend/src/resolve.rs`: `enum Resolution { KernelScalar(KernelScalar), Object(ArtifactRef), Enumeration(ArtifactRef), Unresolved(Unresolved) }` and `enum Unresolved { UnknownToken, NoBundleIndex, ImportUnresolved, ImportUnsupported(String), Stale(ArtifactRef) }`
- One IR `typeRef` identity per resolved token, minted under FR-095
- One IR `typeDefinition` of `kind: scalar` (or the `JsonObject` record, FR-093) per kernel scalar the bundle uses, minted once per package with identity `ix://<org>/<name>/type/<KernelScalar>` (the FR-046 form; `type/` uses the name verbatim)

## Behavior

### Pass order

- The frontend SHALL classify tokens in two passes: pass one extracts every object-typed artifact (FR-091) and decides each artifact's lowering outcome (FR-093 `ARTIFACT_NOT_LOWERED`, `UNNAMEABLE_ARTIFACT`, `DUPLICATE_TYPE_NAME`, or a definition); pass two classifies every `target`, so that `Stale` is decidable for every token.
- The frontend SHALL NOT classify a token before pass one has completed for every artifact of the bundle.

### Classification

- The frontend SHALL classify each `target` from the form the engine returned and, for a placeholder, the companion diagnostic's `reason`.
- The frontend SHALL NOT re-derive a classification from the token's spelling, casing, pluralisation, or from any name the index does not carry.
- If `target` is a kernel scalar name of FR-032, then the frontend SHALL return `KernelScalar`.
- If `target` is `ix://<org>/<name>/type/<Name>` under the bundle package and the resolved artifact's frontmatter `object` is `enumeration`, then the frontend SHALL return `Enumeration` naming that artifact.
- If `target` is `ix://<org>/<name>/type/<Name>` under the bundle package and the resolved artifact's frontmatter `object` is any other declared object type, then the frontend SHALL return `Object` naming that artifact.
- If the resolved artifact's lowering outcome from pass one is anything other than a definition, then the frontend SHALL return `Unresolved::Stale` naming that artifact.
- If `target` is `ix://<package>/type/<Name>` for any `<package>` other than the bundle package, then the frontend SHALL return `Unresolved::ImportUnsupported` naming `<package>`.
- If the engine placeholder's companion diagnostic carries `reason: unknown-token`, then the frontend SHALL return `Unresolved::UnknownToken`.
- If that diagnostic carries `reason: no-bundle-index`, then the frontend SHALL return `Unresolved::NoBundleIndex`.
- If that diagnostic carries `reason: import-unresolved`, then the frontend SHALL return `Unresolved::ImportUnresolved`.
- If a bundle artifact's `title` or frontmatter `name` equals a kernel scalar name, then the frontend SHALL emit `agent-ix.extraction-frontend.KERNEL_NAME_SHADOWED` (warning, non-blocking) at that artifact's frontmatter; the engine resolves such a token to the kernel scalar, so the artifact is unreferenceable by that name.
- If a bundle artifact's `displayName` equals a kernel scalar name that the bundle uses, then the frontend SHALL raise blocking `DUPLICATE_TYPE_NAME` (FR-093) at that artifact naming the kernel scalar, because the minted `type/<Name>` collides with the scalar definition; `KERNEL_NAME_SHADOWED` alone (warning) applies only when the bundle does not use that scalar.

### Diagnostics

- The frontend SHALL emit exactly one FR-096 diagnostic per `Unresolved` value at the row's line and column: `UNRESOLVED_TYPE_TOKEN` for `UnknownToken`, `NoBundleIndex`, and `ImportUnresolved`; `IMPORT_UNSUPPORTED` for `ImportUnsupported`; `STALE_TYPE_TOKEN` for `Stale`; each blocking.
- The frontend SHALL set `related` on a `STALE_TYPE_TOKEN` to the locus of the diagnostic that caused the target artifact not to lower.

### Kernel scalars

- The frontend SHALL mint one package-local `scalar` definition per kernel scalar the bundle uses, carrying the `ix://agent-ix/semantic-core/ext/kernel-scalar` extension FR-034 and FR-046 already use.
- The frontend SHALL map kernel names to IR `scalar` values by the FR-032 table (`UUID→uuid`, `Boolean→boolean`, `Integer→integer`, `Decimal→number`, `String→string`, `Timestamp→datetime`, `Duration→duration`, `Bytes→bytes`); `JsonObject` is a record under FR-093.

Rationale: the engine has already resolved every token (quire-rs FR-070:
`id` before `names`, two name matches an `error` `semantic.ambiguous-type`
that drops the row; only an identifier-shaped token is matched at all, so a
cell reading `FR-005` fails `is_identifier` on the hyphen and is rejected
upstream as `semantic.invalid-type-token` before by-id resolution applies). A second resolver in this crate disagreed with it on
the same bundle (SR-163 FND-1412); this requirement therefore consumes the
engine's verdict and adds only what the engine cannot know: whether the
target artifact produced a definition. Cross-package imports are out of
scope for this delivery (`spec.md` Out of Scope): a domain package has no
lock, so an `ix://<package>/type/<Name>` import has nothing in the emitted
document to point at.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-092-CON-1 | The frontend SHALL declare `Resolution` and `Unresolved` as closed enums whose only string-carrying variant is `ImportUnsupported(package)`, so that every `typeRef` in the emitted IR is the identity of a definition the same document declares. | Integrity | Static analysis + Test |
| FR-092-CON-2 | The frontend SHALL classify a token from the engine's `target`, the companion `reason`, the `BundleIndex`, the artifacts' frontmatter `object`, the pass-one outcomes, and the kernel scalar table, and from nothing else. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-092-AC-1 | Every kernel scalar name resolves to `KernelScalar`, and the `config-version-table` fixture emits exactly the four scalar definitions it uses (`UUID`, `Integer`, `String`, `Timestamp`) plus the `JsonObject` record, each once, each scalar at `ix://<org>/<name>/type/<KernelScalar>` carrying the kernel-scalar extension. | Test (TC-1210) |
| FR-092-AC-2 | `ConfigOverlay` in a `Type` cell resolves to `Object(FR-005)` by title (or by an identifier-shaped id); a cell reading `FR-005` is rejected upstream by quire-rs FR-070 `is_identifier` as `semantic.invalid-type-token`, so by-id resolution applies only to identifier-shaped ids. | Test (TC-1211) |
| FR-092-AC-3 | A `Type` cell reading `Sting` yields `Unresolved::UnknownToken` and one blocking `UNRESOLVED_TYPE_TOKEN` at that row's line and column, naming `Sting`; no IR document is written. | Test (TC-1212) |
| FR-092-AC-4 | Two artifacts titled `Status` make the engine emit `semantic.ambiguous-type`; the referring artifact yields `ARTIFACT_NOT_LOWERED` plus one `ENGINE_DIAGNOSTIC`, and no `Resolution` value is produced for the dropped row. | Test (TC-1213) |
| FR-092-AC-5 | A cell naming `ix://acme/other/type/Thing` yields `Unresolved::ImportUnsupported("acme/other")` and blocking `IMPORT_UNSUPPORTED` naming `acme/other`. | Test (TC-1214) |
| FR-092-AC-6 | In a two-document bundle where `FR-006` refers by title (or by an identifier-shaped id) to a legacy-form `FR-005`, the referring cell yields `Unresolved::Stale` and `STALE_TYPE_TOKEN` naming `FR-005` with `related` at `FR-005`'s `ARTIFACT_NOT_LOWERED` locus. | Test (TC-1215) |
| FR-092-AC-7 | An artifact with `object: enumeration` named in a cell resolves to `Enumeration`, its `typeRef` is the enumeration's `type/` identity, and the same title under `object: entity` resolves to `Object`. | Test (TC-1216) |
| FR-092-AC-8 | An artifact titled `String` yields one `KERNEL_NAME_SHADOWED` warning at its frontmatter at the resolve layer, a cell reading `String` resolves to `KernelScalar`, and a lift of a bundle that uses no `String` cell is not blocked; the `KERNEL_NAME_SHADOWED` fixture, which uses the scalar, is refused at lift level with `DUPLICATE_TYPE_NAME` (FR-093, TC-1347). | Test (TC-1217) |
| FR-092-AC-9 | Over 256 mutated tokens the resolver returns a `Resolution` and never panics, and every `Unresolved` value maps to exactly one diagnostic code. | Property (TC-1218) |
| FR-092-AC-10 | No `typeRef` in any emitted fixture document names an identity that no `types[]` entry declares, asserted by the FR-050 reader and `agent_ix_semantic_ir::decide` each returning zero `UNRESOLVED_TYPE_REF`. | Test (TC-1219) |
| FR-092-AC-11 | A one-pass implementation is refuted: with pass one stubbed to report every artifact as lowered, TC-1215 fails; with the real pass one it passes. | Test (TC-1332) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md) (the `Code` enum every diagnostic here is emitted through), [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), `ix://agent-ix/quire-rs/FR-070`
- **Downstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
