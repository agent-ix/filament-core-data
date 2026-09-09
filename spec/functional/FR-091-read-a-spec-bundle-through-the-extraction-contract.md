---
id: FR-091
title: "Read a spec bundle through the Quire extraction contract"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
---
# [FR-091] Read a spec bundle through the Quire extraction contract

## Description

The extraction frontend SHALL read one spec bundle — a repository's `spec/`
tree — by loading its documents and its declared semantic modules through
`quire-rs` in-process, and SHALL obtain every field, clause, and operation
declaration from `quire_rs::semantic::extract_semantic`, so that the frontend
carries no second reading of the Markdown → semantic-core mapping.

## Inputs

- A bundle root: the directory holding `spec/spec.md` and its artifact directories
- One or more module roots, each a directory holding a module `manifest.yaml`, supplied explicitly by the caller
- The `quire-rs` crate at the exact revision NFR-033 pins, with its default features and without the `python` feature
- The `spec.md` frontmatter `org` and `name` of the bundle, which name the package

## Outputs

- `crates/extraction-frontend/src/bundle.rs`: `Bundle::load(root, modules) -> Result<Bundle, Refusal>`, holding the loaded corpus, the `quire_rs::semantic::SemanticModule` of each module, and the `quire_rs::semantic::BundleIndex` built from the corpus
- `crates/extraction-frontend/src/extract.rs`: one `quire_rs::semantic::SemanticExtraction` per object-typed artifact, keyed by artifact id, in artifact-id order
- A `Refusal` naming the reason the bundle could not be read, with the module or document that caused it

## Behavior

### Loading

- The frontend SHALL load the bundle's documents with `quire_rs::corpus::load_repo` over the bundle root and SHALL treat the resulting document set as the bundle.
- The frontend SHALL load modules only from the module roots the caller supplies, through `quire_rs::Registry::load_module_set`, and SHALL NOT read `~/.ix`, an environment variable, or any ambient module location.
- The frontend SHALL take each module's `semantic` block from `Registry::semantic_module`, which is the FR-069 reading quire-rs already performed at load.
- If a supplied module carries no `semantic` block, then the frontend SHALL refuse with `agent-ix.extraction-frontend.MODULE_WITHOUT_SEMANTIC_BLOCK` naming the module.
- If quire-rs refuses a module's `semantic` block, then the frontend SHALL refuse with `agent-ix.extraction-frontend.MODULE_REFUSED` carrying the engine's own `semantic.*` code and path, and SHALL NOT lower any artifact of that bundle.
- If a module's `semantic_core` names a version the pinned engine has no vendored bundle for, then the refusal above applies; the frontend SHALL NOT treat such a module as an empty model.
- If the bundle's `spec.md` is absent or carries no `org` or `name`, then the frontend SHALL refuse with `agent-ix.extraction-frontend.BUNDLE_UNIDENTIFIED` at the file.

### The bundle index

- The frontend SHALL build the `BundleIndex` with `BundleIndex::from_documents`, passing the package identity `<org>/<name>`, the frontmatter of every loaded document, and every loaded `SemanticModule`, so that every object-typed artifact is resolvable by its `id`, `title`, and `name`.
- The frontend SHALL supply that index to every extraction; it SHALL NOT extract an artifact under an empty index.

### Extraction

- For every document whose frontmatter `object` names an object type that one loaded module declares, the frontend SHALL call `extract_semantic` with a `SemanticContext` whose `path` is the document's bundle-root-relative path with `/` separators, whose `source_identity` is `ix://<org>/<name>/spec`, and whose `RequiredSections` are read from that object type's `body_extraction` with `RequiredSections::from_dsl`.
- The frontend SHALL pass the module's reference-form `data_schema` digest for the object type as `schema_digest`.
- The frontend SHALL NOT call `extract_semantic_json`, and SHALL NOT declare a type named `FieldDecl`, `TypeRef`, `Multiplicity`, `Constraint`, `ClauseRef`, `SourceLocus`, or `OperationDecl`.
- If a document's `object` names a type no loaded module declares, then the frontend SHALL emit `agent-ix.extraction-frontend.UNKNOWN_OBJECT_TYPE` at the document's frontmatter and SHALL NOT lower that document.
- The frontend SHALL skip a document with no `object` frontmatter without a diagnostic; requirement, use-case, and review artifacts are not domain declarations.
- The frontend SHALL record every `SemanticDiagnostic` the engine returns, in the engine's order, and SHALL carry each one into FR-096 unchanged in code, severity, line, and column.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-091-CON-1 | The frontend SHALL depend on `quire-rs` as a Rust crate and consume `FieldDecl`, `ClauseRef`, `OperationDecl`, `SemanticExtraction`, `SemanticContext`, `BundleIndex`, and `SemanticDiagnostic` as that crate's types. A second definition of any of them is the drift this program removes. | Integrity | Static analysis |
| FR-091-CON-2 | The frontend SHALL read the file system only through `load_repo` and `load_module_set` while loading a bundle. | Security | Static analysis |
| FR-091-CON-3 | The frontend SHALL NOT parse `## Properties`, `## Invariants`, or `## Operations` itself; the engine's `SemanticExtraction` is the only source of a declaration. | Integrity | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-091-AC-1 | Loading the `config-version` fixture bundle under the spec-objects-business `0.3.0` module yields one `SemanticExtraction` for `FR-006` with `fields` `available` and seven fields, and one for `FR-005`, keyed by id. | Test (TC-1200) |
| FR-091-AC-2 | A module root whose manifest carries no `semantic` block refuses with `MODULE_WITHOUT_SEMANTIC_BLOCK` naming the module and lowers nothing. | Test (TC-1201) |
| FR-091-AC-3 | A module whose `semantic.semantic_core` is `9.9.9` refuses with `MODULE_REFUSED` carrying `semantic.unsupported-semantic-core`, and no artifact of the bundle is lowered to an empty record. | Test (TC-1202) |
| FR-091-AC-4 | The installed module under `~/.ix` and the `QUIRE_MODULES` environment are ignored: with `HOME` pointed at an empty directory the same fixture lifts identically. | Test (TC-1203) |
| FR-091-AC-5 | A bundle whose `spec.md` lacks `org` refuses with `BUNDLE_UNIDENTIFIED` at `spec/spec.md`. | Test (TC-1204) |
| FR-091-AC-6 | A document with `object: widget`, which no module declares, yields `UNKNOWN_OBJECT_TYPE` at that document and is not lowered; a document with no `object` yields no diagnostic. | Test (TC-1205) |
| FR-091-AC-7 | The `BundleIndex` handed to extraction names every object-typed artifact by `id` and `title`, and a `Type` cell naming a sibling by title resolves. | Test (TC-1206) |
| FR-091-AC-8 | A grep of `crates/extraction-frontend/src/` finds no `struct FieldDecl`, `struct TypeRef`, `struct ClauseRef`, `struct OperationDecl`, and no call to `extract_semantic_json`. | Analysis (TC-1207) |
| FR-091-AC-9 | Every `SemanticDiagnostic` the engine returns for the `legacy-form` control appears in the frontend's diagnostics with the same code, severity, line, and column. | Test (TC-1208) |
| FR-091-AC-10 | The legacy `config-service` FR-006 (free-column table) yields `fields` `unavailable` with reason `legacy-form` and the engine's `semantic.legacy-properties-form` warning at line 17, and the document is not lowered. | Test (TC-1209) |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), `ix://agent-ix/quire-rs/FR-069`, `ix://agent-ix/quire-rs/FR-070`, `ix://agent-ix/quire-rs/FR-071`, `ix://agent-ix/quire-rs/FR-072`
- **Downstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
