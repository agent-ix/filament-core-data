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

The extraction frontend SHALL obtain every document, module, field, clause,
and operation declaration of one spec bundle from `quire-rs` in-process, so
that the frontend carries no second reading of the Markdown → semantic-core
mapping.

## Inputs

- A bundle root: the directory holding `spec/spec.md` and its artifact directories
- One or more module roots, each a directory holding a module `manifest.yaml`, supplied explicitly by the caller
- The `quire-rs` crate at the exact revision NFR-033 pins, which is at or after `a874fb6` (quire-rs#411, `Registry::load_module_set`), with its default features and without the `python` feature
- The `spec.md` frontmatter `org` and `name` of the bundle, which name the package

## Outputs

- `crates/extraction-frontend/src/bundle.rs`: `Bundle::load(root, modules) -> Result<Bundle, Refusal>`, holding the loaded corpus, the `quire_rs::semantic::SemanticModule` of each module, and the `quire_rs::semantic::BundleIndex` built from the corpus
- `crates/extraction-frontend/src/extract.rs`: one `quire_rs::semantic::SemanticExtraction` per object-typed artifact, keyed by artifact id, in artifact-id order
- A `Refusal` naming the reason the bundle could not be read, with the module or document that caused it

## Behavior

### Loading

- The frontend SHALL load the bundle's documents with `quire_rs::corpus::load_repo` over the bundle root.
- The frontend SHALL treat the document set `load_repo` returns as the bundle.
- The frontend SHALL load modules only from the module roots the caller supplies, through `quire_rs::Registry::load_module_set`.
- The frontend SHALL NOT read `~/.ix`, `$HOME`, `QUIRE_MODULES`, or any other environment variable while loading modules.
- The frontend SHALL take each module's `semantic` block from `Registry::semantic_module`, which is the FR-069 reading quire-rs already performed at load.
- If a supplied module carries no `semantic` block, then the frontend SHALL refuse with `agent-ix.extraction-frontend.MODULE_WITHOUT_SEMANTIC_BLOCK` naming the module.
- If quire-rs refuses a module's `semantic` block, then the frontend SHALL refuse with `agent-ix.extraction-frontend.MODULE_REFUSED` whose message begins with the engine's own `semantic.*` code, whose `causes` is empty, and whose locus is the manifest path (the same reading as `ENGINE_DIAGNOSTIC`, CR-036-2: `causes.items` admits only `agent-ix.*` codes).
- If quire-rs refuses a module's `semantic` block, then the frontend SHALL lower no artifact of that bundle.
- If a module's `semantic_core` names a version the pinned engine has no vendored bundle for, then the frontend SHALL refuse with `MODULE_REFUSED` whose message begins with `semantic.unsupported-semantic-core` rather than loading the module as an empty model.
- If the bundle's `spec.md` is absent, then the frontend SHALL refuse with `agent-ix.extraction-frontend.BUNDLE_UNIDENTIFIED` at `spec/spec.md`.
- If `spec.md` carries no `org` or no `name`, then the frontend SHALL refuse with `BUNDLE_UNIDENTIFIED` at `spec/spec.md`.
- If `org` or `name` does not match the `packageIdentity` segment grammar (`[a-z0-9][a-z0-9-]*`), then the frontend SHALL refuse with `BUNDLE_UNIDENTIFIED` at `spec/spec.md` naming the offending value.
- If two loaded documents carry the same frontmatter `id`, then the frontend SHALL refuse with `agent-ix.extraction-frontend.DUPLICATE_ARTIFACT_ID` at the second document in path order, naming both paths.
- If an object-typed document carries no frontmatter `id`, then the frontend SHALL refuse with `BUNDLE_UNIDENTIFIED` at that document's frontmatter, naming the path.

### The bundle index

- The frontend SHALL build the `BundleIndex` with `BundleIndex::from_documents`, passing the package identity `<org>/<name>`, the frontmatter of every loaded document, and every loaded `SemanticModule`, so that every object-typed artifact is resolvable by its `id`, `title`, and `name`.
- The frontend SHALL supply that index to every extraction.
- The frontend SHALL NOT extract an artifact under an empty index.

### Extraction

- For every document whose frontmatter `object` names an object type that one loaded module declares, the frontend SHALL call `extract_semantic` with a `SemanticContext` whose `path` is the document's bundle-root-relative path with `/` separators, whose `source_identity` is `ix://<org>/<name>/spec`, whose `RequiredSections` are read with `RequiredSections::from_extraction` over that object type's typed `body_extraction`, and to which that typed `body_extraction` is given with `SemanticContext::with_body_extraction` (quire-rs#442), so the engine reads exactly the FR-075 model tables the object type declares.
- The frontend SHALL pass the module's reference-form `data_schema` digest for the object type as `schema_digest`.
- The frontend SHALL NOT call `extract_semantic_json`.
- The frontend SHALL NOT declare a type named `FieldDecl`, `TypeRef`, `Multiplicity`, `Constraint`, `ClauseRef`, `SourceLocus`, or `OperationDecl`.
- If a document's `object` names a type no loaded module declares, then the frontend SHALL emit `agent-ix.extraction-frontend.UNKNOWN_OBJECT_TYPE` at the document's frontmatter.
- If a document's `object` names a type no loaded module declares, then the frontend SHALL NOT lower that document.
- The frontend SHALL skip a document with no `object` frontmatter without a diagnostic; requirement, use-case, and review artifacts are not domain declarations.
- The frontend SHALL record every `SemanticDiagnostic` the engine returns, in the engine's order.
- The frontend SHALL hand each recorded `SemanticDiagnostic` to FR-096, which wraps it as one `ENGINE_DIAGNOSTIC` whose message is `<engine code> (reason: <reason>): <engine message>`, whose `causes` is empty, and whose severity is the FR-096 mapping of the engine severity.
- The frontend SHALL carry the engine's `line` and `column` into the `ENGINE_DIAGNOSTIC` locus unchanged whenever the engine's `line` is at least `1`.
- If the engine reports a `SemanticDiagnostic` with `line` `0` or no `line`, then the frontend SHALL emit the `ENGINE_DIAGNOSTIC` with no `locus` and with the document path in `related`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-091-CON-1 | The frontend SHALL consume `FieldDecl`, `ClauseRef`, `OperationDecl`, `SemanticExtraction`, `SemanticContext`, `BundleIndex`, and `SemanticDiagnostic` as types of the `quire-rs` crate. | Integrity | Static analysis |
| FR-091-CON-2 | The frontend SHALL read the file system, while loading a bundle, only through `quire_rs::corpus::load_repo` and `quire_rs::Registry::load_module_set`; `crates/extraction-frontend/src/bundle.rs` is the only module that names either; `write.rs` is the crate's sole `std::fs` module — its reads are exactly `<module root>/manifest.yaml` for each supplied module root (`write::read_manifest`, called from `lift.rs`, because quire-rs exposes no manifest-bytes API and FR-095 digests those bytes, and from the construct seam in `bundle.rs`, because the pinned engine exposes no object type's `construct` declaration, FR-142), the golden walk, and `inspect --ir`, and its writes are the atomic outputs of FR-097 — and every other module is `std::fs`-free. | Security | Static analysis |
| FR-091-CON-3 | The frontend SHALL NOT parse `## Properties`, `## Invariants`, `## Operations`, or `## Relationships` itself; the engine's `SemanticExtraction` and `harvest_edges` are the only sources of a declaration. | Integrity | Static analysis |

Rationale: a second definition of any type CON-1 names is the drift this
program removes (US-015). A `## Relationships` bullet list is parsed by no
contract today; FR-094-CON-1 records the upstream dependency.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-091-AC-1 | Loading the `config-version-table` fixture bundle under the vendored spec-objects-business `0.7.0` module (`fixtures/modules/spec-objects-business/`, NFR-033) yields one `SemanticExtraction` for `FR-006` with `fields` `available` and seven fields, and one for `FR-005`, keyed by id. | Test (TC-1200) |
| FR-091-AC-2 | A module root whose manifest carries no `semantic` block refuses with `MODULE_WITHOUT_SEMANTIC_BLOCK` naming the module and lowers nothing. | Test (TC-1201) |
| FR-091-AC-3 | A module whose `semantic.semantic_core` is `9.9.9` refuses with `MODULE_REFUSED` whose message begins with `semantic.unsupported-semantic-core` and whose `causes` is empty, and no artifact of the bundle is lowered to an empty record. | Test (TC-1202) |
| FR-091-AC-4 | With `HOME` pointed at a directory whose `.ix/filament/modules/spec-objects-business/manifest.yaml` is a conflicting module (one whose `semantic` block declares `compatibility_posture: declared-lossy` and `legacy_forms: error`, so the same fixture lifts to different bytes under it) and `QUIRE_MODULES` pointed at the same directory, the fixture lifts byte-identically to the lift with the explicit module root and no environment set; the control lift with the conflicting module supplied explicitly differs. | Test (TC-1203) |
| FR-091-AC-5 | A bundle whose `spec.md` lacks `org` refuses with `BUNDLE_UNIDENTIFIED` at `spec/spec.md`; a bundle whose `name` is `Config Service` refuses with `BUNDLE_UNIDENTIFIED` naming `Config Service`. | Test (TC-1204) |
| FR-091-AC-6 | A document with `object: widget`, which no module declares, yields `UNKNOWN_OBJECT_TYPE` at that document and is not lowered; a document with no `object` yields no diagnostic. | Test (TC-1205) |
| FR-091-AC-7 | The `BundleIndex` handed to extraction names every object-typed artifact by `id` and `title`, and a `Type` cell naming a sibling by title resolves. | Test (TC-1206) |
| FR-091-AC-8 | A grep of `crates/extraction-frontend/src/` finds no `struct FieldDecl`, `struct TypeRef`, `struct ClauseRef`, `struct OperationDecl`, no call to `extract_semantic_json`, and `load_repo`/`load_module_set` only in `bundle.rs`; a planted `struct TypeRef` in a scratch module makes the gate fail. | Analysis (TC-1207) |
| FR-091-AC-9 | Every `SemanticDiagnostic` the engine returns for the `legacy-form` control appears in the frontend's diagnostics as one `ENGINE_DIAGNOSTIC` whose message begins with the engine code followed by ` (reason: <reason>): `, whose `causes` is empty, whose severity is the FR-096 mapping of the engine severity, and whose locus line and column equal the engine's. | Test (TC-1208) |
| FR-091-AC-10 | The legacy `config-service` FR-006 (free-column table) yields `fields` `unavailable` with reason `legacy-form` and the engine's `semantic.legacy-properties-form` warning at line 17, and the document is not lowered. | Test (TC-1209) |
| FR-091-AC-11 | A bundle holding two documents with `id: FR-006` refuses with `DUPLICATE_ARTIFACT_ID` at the second path naming both; an engine diagnostic injected with `line: 0` reaches the diagnostics array with no `locus` and the document path in `related`, and the array validates against `common.schema.json#/$defs/diagnostic`. | Test (TC-1331) |

## Dependencies

- **Upstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), `ix://agent-ix/quire-rs/FR-069`, `ix://agent-ix/quire-rs/FR-070`, `ix://agent-ix/quire-rs/FR-071`, `ix://agent-ix/quire-rs/FR-072`
- **Downstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md) (references the no-ambient-module rule stated here)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
