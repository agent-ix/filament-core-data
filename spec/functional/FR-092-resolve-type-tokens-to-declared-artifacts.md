---
id: FR-092
title: "Resolve type tokens to declared artifacts, enumerations, kernel scalars, or an explicit failure state"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-091"
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

The extraction frontend SHALL resolve every `TypeRef.target` the engine
returns to exactly one of: a kernel scalar, an object artifact declared in the
bundle, an enumeration declared in the bundle, or an export of an imported
package, and SHALL represent every non-resolution as a named state carried to
a diagnostic at the token's source locus, so that no string reaches the IR as a
`typeRef` without a definition behind it.

## Inputs

- `FieldDecl.type_ref.target` and `OperationDecl.returns.target` from FR-091, which the engine has already mapped to a kernel scalar name, `ix://<org>/<repo>/type/<Name>`, `ix://<package>/type/<Name>`, or the placeholder `ix://<org>/<repo>/unresolved/<Token>`
- The `BundleIndex` of FR-091
- The kernel scalar library of FR-032 (`packages/semantic-core/kernel-scalars.json`)
- The `SemanticDiagnostic` list, which carries the engine's `semantic.unresolved-type` advisory with `reason` for every placeholder

## Outputs

- `crates/extraction-frontend/src/resolve.rs`: `enum Resolution { KernelScalar(KernelScalar), Object(ArtifactRef), Enumeration(ArtifactRef), Import(PackageExport), Unresolved(Unresolved) }` and `enum Unresolved { UnknownToken, Ambiguous(Vec<ArtifactRef>), Foreign(String), Stale(ArtifactRef), NoBundleIndex, ImportUnresolved }`
- One IR `typeRef` identity per resolved token, minted under FR-095
- One IR `typeDefinition` of `kind: scalar` (or the `JsonObject` record, FR-093) per kernel scalar the bundle uses, minted once per package

## Behavior

- The frontend SHALL classify each `target` in this order and stop at the first match: a kernel scalar name; an `ix://<bundle package>/type/<Name>` whose `<Name>` is the `id` or a name of exactly one `objects` entry; the same for `enumerations`; an `ix://<package>/type/<Name>` where `<package>` is a key of `imports` and `<Name>` is in its export list; the placeholder form.
- If the engine placeholder's companion diagnostic carries `reason: unknown-token`, then the resolver SHALL return `Unresolved::UnknownToken`.
- If that diagnostic carries `reason: no-bundle-index`, then the resolver SHALL return `Unresolved::NoBundleIndex`.
- If that diagnostic carries `reason: import-unresolved`, then the resolver SHALL return `Unresolved::ImportUnresolved`.
- If a `<Name>` matches more than one `objects` entry, then the resolver SHALL return `Unresolved::Ambiguous` listing every match rather than the first match.
- If a target is `ix://<other>/type/<Name>` where `<other>` is neither the bundle package nor an `imports` key, then the state SHALL be `Unresolved::Foreign` naming `<other>`.
- If a resolved artifact's document was itself refused or not lowered under FR-091, then the state SHALL be `Unresolved::Stale` naming it, because a reference to a declaration that produced no definition is unresolved in the IR.
- Each `Unresolved` state SHALL become exactly one diagnostic of FR-096 at the row's line and column: `UNRESOLVED_TYPE_TOKEN` (unknown, no index, import), `AMBIGUOUS_TYPE_TOKEN`, `FOREIGN_TYPE_TOKEN`, `STALE_TYPE_TOKEN`, each blocking.
- The frontend SHALL mint one package-local `scalar` definition per kernel scalar the bundle uses, carrying the `ix://agent-ix/semantic-core/ext/kernel-scalar` extension FR-034 and FR-046 already use.
- The frontend SHALL map kernel names to IR `scalar` values by the FR-032 table (`UUID→uuid`, `Boolean→boolean`, `Integer→integer`, `Decimal→number`, `String→string`, `Timestamp→datetime`, `Duration→duration`, `Bytes→bytes`); `JsonObject` is a record under FR-093.
- The frontend SHALL NOT resolve a token by its spelling, casing, pluralisation, or by any name the index does not carry.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-092-CON-1 | The resolver SHALL declare `Resolution` and `Unresolved` as closed enums with no string-carrying catch-all variant, so that every `typeRef` in the emitted IR is the identity of a definition the same document or a lock export declares. | Integrity | Static analysis + Test |
| FR-092-CON-2 | The resolver SHALL read no file and consult no module beyond the `BundleIndex` and the kernel scalar table it is given. | Determinism | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-092-AC-1 | Every kernel scalar name resolves to `KernelScalar`, and the `config-version` fixture emits exactly the five scalar definitions it uses (`UUID`, `Integer`, `String`, `Timestamp`) plus the `JsonObject` record, each once, each carrying the kernel-scalar extension. | Test (TC-1210) |
| FR-092-AC-2 | `ConfigOverlay` in a `Type` cell resolves to `Object(FR-005)` by title, and `FR-005` resolves to the same artifact by id. | Test (TC-1211) |
| FR-092-AC-3 | A `Type` cell reading `Sting` yields `Unresolved::UnknownToken` and one blocking `UNRESOLVED_TYPE_TOKEN` at that row's line and column, naming `Sting`; no IR document is written. | Test (TC-1212) |
| FR-092-AC-4 | Two artifacts titled `Status` make a `Status` cell `Unresolved::Ambiguous` listing both ids, and `AMBIGUOUS_TYPE_TOKEN` names both. | Test (TC-1213) |
| FR-092-AC-5 | A cell naming `ix://acme/other/type/Thing` with no `acme/other` import yields `Unresolved::Foreign` and `FOREIGN_TYPE_TOKEN` naming `acme/other`. | Test (TC-1214) |
| FR-092-AC-6 | A cell naming an artifact whose own extraction was refused yields `Unresolved::Stale` and `STALE_TYPE_TOKEN` naming that artifact. | Test (TC-1215) |
| FR-092-AC-7 | An enumeration artifact named in a cell resolves to `Enumeration`, and its `typeRef` is the enumeration's identity. | Test (TC-1216) |
| FR-092-AC-8 | A name exported by an imported module resolves to `Import`, and the same name absent from the export list yields `ImportUnresolved`. | Test (TC-1217) |
| FR-092-AC-9 | Over 256 mutated tokens the resolver returns a `Resolution` and never panics, and every `Unresolved` value maps to exactly one diagnostic code. | Property (TC-1218) |
| FR-092-AC-10 | No `typeRef` in any emitted fixture document names an identity that no `types[]` entry or lock export declares, asserted by the FR-050 reader returning zero `UNRESOLVED_TYPE_REF`. | Test (TC-1219) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), `ix://agent-ix/quire-rs/FR-070`
- **Downstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
