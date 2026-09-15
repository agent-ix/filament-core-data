---
id: FR-088
title: "Ship the modular kernel JSON Schema as a package artifact"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-088] Ship the modular kernel JSON Schema as a package artifact

## Description

The repository SHALL make the thirty already-emitted JSON Schema 2020-12
documents of `packages/semantic-core/generated/json-schema/` a first-class
package artifact of the semantic kernel — inventoried by an index that names
every document with its path and digest, tied to the package version through the
absolute `$id` base, carrying the emitting toolchain's provenance, and
guaranteed to resolve entirely offline — without regenerating, reordering,
reformatting, copying, or editing a single byte of them, and without publishing
them to any registry.

## Inputs

- The thirty committed documents of `packages/semantic-core/generated/json-schema/`, produced by the pinned official `@typespec/json-schema` emitter under [FR-033](./FR-033-emit-semantic-core-json-schema.md) and byte-gated by `make semantic-core-check`
- `packages/semantic-core/generated/toolchain.json`: `compiler` `@typespec/compiler` `1.15.0`, `emitter` `@typespec/json-schema` `1.15.0`, the issue #31 `normalization` record (`applied: false`, a recorded no-op), the `base` `https://schemas.agent-ix.org/semantic-core/0.1.0/`, the ordered `files` list, and the bundle `digest`
- `packages/semantic-core/package.json`, whose `version` the `base` encodes
- The kernel bundle declaration of FR-081, which names this bundle as the kernel's structural source

## Outputs

- `packages/semantic-kernel/json-schema/index.json`: the index of the bundle — the package name and version, the `$id` base, one row per document naming its `packages/semantic-core/generated/json-schema/<Name>.json` path, its `$id`, and its digest, plus the bundle digest, the emitting toolchain provenance, the offline-resolution facts, and the publication state
- `scripts/build-semantic-kernel.mjs`, the orchestrating generator, with a `--check` verb that recomputes the index and fails naming the first differing member
- `make semantic-kernel` and `make semantic-kernel-check`, alongside the existing `semantic-core-generate` and `semantic-core-check`

## Behavior

### What this requirement does not touch

- This requirement SHALL read the thirty documents and write none of them. It runs no emitter, invokes no `tsp compile`, and reformats nothing; `packages/semantic-core/scripts/generate.mjs` remains the only writer of that directory, as `make semantic-core-generate` and `make semantic-core-check` already establish.
- `packages/semantic-core/` SHALL be unchanged in its entirety, sources, manifest, and generated output alike.
- The index SHALL NOT copy the documents into a second location. Each row names the one committed path and its digest, so the repository holds one copy of every schema document and a gate over it, rather than two copies and the drift between them. A vendored duplicate under `packages/semantic-kernel/` would be a second bundle with its own `$id`s and its own decay.
- The index SHALL live at `packages/semantic-kernel/json-schema/index.json` and never inside `packages/semantic-core/generated/json-schema/`, which `generate.mjs` deletes outright when regenerating and whose `--check` form reports every `*.json` the emitter did not produce as stale. An index placed there would red the byte gate it exists to depend on.
- If a document's bytes and the index disagree, then `--check` SHALL fail rather than rewrite the index, so the committed documents are the authority and the index is the derived artefact.

### The index

- The index SHALL carry one row per document, in the order `packages/semantic-core/generated/toolchain.json` records in `files`, so the row order is the emitter's and not this script's.
- Each row SHALL name the document's repository-relative path under `packages/semantic-core/generated/json-schema/`, its declared absolute `$id`, and the `sha256:` digest of its committed bytes.
- The index SHALL name every document in that directory and no document that is absent from it; a file present in the directory and absent from `files`, or the reverse, SHALL fail the check naming the file.
- The index SHALL carry the bundle digest computed by the same rule `generate.mjs` uses — SHA-256 over `${name}\n${text}` for each document in `files` order — and that value SHALL equal the `digest` member of `packages/semantic-core/generated/toolchain.json`. A difference SHALL fail the check rather than be recorded, because the two are the same number computed twice and a disagreement means one of them is stale.
- The index SHALL be rendered through the same pinned formatter `generate.mjs` writes its own output through, so `make lint` and `make semantic-kernel-check` agree instead of contradicting each other.
- The index SHALL carry no clock reading, no host path, no user name, and no host-observed tool version; every version it records is read from `packages/semantic-core/generated/toolchain.json`.

### The identity base and the package version

- The index SHALL record the package name `@agent-ix/semantic-core`, its `version`, and the `base` `https://schemas.agent-ix.org/semantic-core/<version>/`, and SHALL fail when the recorded `base` does not equal the `base` in `generated/toolchain.json`.
- The tie between the base and the package version is already enforced upstream: `packageBase()` in `packages/semantic-core/scripts/generate.mjs` reads `package.json`'s `version` and `main.tsp`'s `@jsonSchema(...)` argument and throws when they disagree. This requirement SHALL depend on that check rather than restate it in a second, independently drifting place.
- Every document's `$id` SHALL equal the base concatenated with that document's file name; a document whose `$id` does not SHALL fail the check naming the document, because a document identified outside the versioned base is not part of this package version's bundle.
- A version bump of `@agent-ix/semantic-core` therefore moves every `$id`, every row, and the bundle digest together, and a bump that moves only one of them fails. This is the property that makes a consumer's pinned `$id` mean a pinned bundle.

### Toolchain provenance

- The index SHALL copy the `compiler`, `emitter`, and `normalization` records of `packages/semantic-core/generated/toolchain.json` verbatim, including the issue #31 normalization's recorded no-op, so a reader learns what produced these bytes without opening a second file, and so the recorded provenance cannot silently disagree with the one FR-033-AC-5 already ties to the lockfile.
- The index SHALL name the JSON Schema dialect the documents declare, `https://json-schema.org/draft/2020-12/schema`, read from the documents rather than asserted.
- The index SHALL record `AGPL-3.0-or-later` as the licence of the emitted documents, matching `packages/semantic-core/package.json`.

### Resolvable offline

- The index SHALL record, and the check SHALL prove, that the bundle resolves entirely within itself: every `$ref` in every document either begins with the declared base and its remainder names a document the index lists, or is a local `#`-fragment. Thirty-five references are measured across the thirty documents and every one is of the first form.
- A `$ref` carrying any other scheme, authority, or filesystem path SHALL fail the check naming the document and the JSON pointer.
- The absolute `$id` base SHALL be treated as an identity and not as a location: no consumer, no gate, and no script in this repository SHALL fetch `https://schemas.agent-ix.org/...` to resolve a kernel reference, and the check SHALL assert that it opens no socket while resolving the bundle. A schema bundle that only resolves when a host is reachable is not a package artifact.
- The check SHALL confirm every reference resolves against the local files alone, by loading the thirty documents from disk and resolving each reference in that set, so "resolvable offline" is a demonstrated property rather than a claim in a README.
- The index SHALL record the reference count and the count of externally-resolving references, the latter being zero; a non-zero value SHALL fail.

### Publication

- No registry publication of this bundle happens here. There is no schema-registry upload, no publication of the documents to `https://schemas.agent-ix.org/`, and no public npm publication; publication is blocked on `agent-ix/quoin#290`, a human sign-off that has not moved, and the index SHALL record that block by name in a `publication` member carrying `published: false`.
- This requirement SHALL change no member of `packages/semantic-core/package.json` — `files`, `exports`, `publishConfig`, and `version` included — and SHALL add no path under `packages/semantic-kernel/` to any npm or Python distribution manifest.
- This requirement SHALL add no publication step to any workflow under `.github/`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-088-CON-1 | This requirement SHALL change no byte anywhere under `packages/semantic-core/`. Those documents are the official emitter's output under ADR-0005 and FR-033, and an index that "fixes" its inputs on the way past is a second emitter. | Integrity | Analysis |
| FR-088-CON-2 | The maintainer SHALL NOT resolve an index-versus-documents disagreement by regenerating the documents to match the index; the documents are regenerated only by `make semantic-core-generate` and only for a reason FR-033 owns. | Integrity | Test |
| FR-088-CON-3 | The maintainer SHALL NOT satisfy the offline-resolution criterion by permitting a fetch, a cache, a proxy, or a bundled copy of a remote schema; a reference that does not resolve inside the bundle is a finding. | Security | Test |
| FR-088-CON-4 | `scripts/build-semantic-kernel.mjs` SHALL recompute the bundle digest in the index, never copy it from `generated/toolchain.json`, so the equality of the two is a check with contents rather than a tautology. | Integrity | Test |
| FR-088-CON-5 | This requirement SHALL NOT introduce a second `$id` normalization step; the pinned issue #31 normalization inside `generate.mjs` remains the only one, and FR-033-CON-2 governs its removal. | Compatibility | Static |
| FR-088-CON-6 | The index SHALL NOT duplicate a schema document; it names paths and digests, so there is one copy of the bundle and a drift gate over it. | Integrity | Static |
| FR-088-CON-7 | No registry publication and no publication workflow change happen here; publication passes `agent-ix/quoin#290`. | Compliance | Analysis |
| FR-088-CON-8 | The index SHALL be regenerable and `--check`-verified rather than hand-edited, because an index over a bundle proves nothing if a maintainer can edit the index. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-088-AC-1 | The index names all thirty documents, in the order `packages/semantic-core/generated/toolchain.json` records in `files`, each with its repository-relative path, its declared `$id`, and the `sha256:` digest of its committed bytes. | Test |
| FR-088-AC-2 | A document present in `packages/semantic-core/generated/json-schema/` and absent from the index, and an index row naming an absent document, each fail `make semantic-kernel-check` naming the file. | Test |
| FR-088-AC-3 | Mutating one byte of one committed document changes exactly that row's digest and the bundle digest, and fails the check. | Snapshot |
| FR-088-AC-4 | The index's recomputed bundle digest equals the `digest` member of `generated/toolchain.json`, and a stubbed disagreement fails the check rather than rewriting either value. | Test |
| FR-088-AC-5 | Every document's `$id` equals the index's `base` concatenated with its file name, and a document given a `$id` outside the base fails the check naming the document. | Property |
| FR-088-AC-6 | The index's `base` equals `generated/toolchain.json`'s `base` and encodes `packages/semantic-core/package.json`'s `version`; a version bumped in `package.json` alone fails, through the existing `packageBase()` check. | Test |
| FR-088-AC-7 | The index's `compiler`, `emitter`, and `normalization` records are deep-equal to those of `generated/toolchain.json`, including the recorded no-op normalization. | Test |
| FR-088-AC-8 | Every `$ref` in every document either begins with the declared base and names a listed document, or is a local `#`-fragment; the index records thirty-five references and zero externally-resolving ones. | Property |
| FR-088-AC-9 | A document carrying a `$ref` to `https://example.invalid/x.json`, to `../outside.json`, or to `/etc/passwd` fails the check naming the document and the JSON pointer. | Test |
| FR-088-AC-10 | Resolving every reference in the bundle from disk succeeds with the runtime's socket constructor instrumented and asserting zero connections, and with no network available. | Integration |
| FR-088-AC-11 | Every document declares `https://json-schema.org/draft/2020-12/schema`, and the index records that dialect read from the documents. | Test |
| FR-088-AC-12 | Every file under `packages/semantic-core/` is byte-identical to `origin/main` on this branch, and `make semantic-core-check` passes. | Analysis |
| FR-088-AC-13 | The index is byte-identical to what the repository's pinned formatter would write for it, so `make lint` and `make semantic-kernel-check` agree. | Static |
| FR-088-AC-14 | Regenerating the index from unchanged inputs reproduces the committed file byte-for-byte, and the check fails naming the first differing member on a mutated index. | Snapshot |
| FR-088-AC-15 | The index carries `published: false` and names `agent-ix/quoin#290`, and carries no clock reading, no host path, no user name, and no host-observed tool version. | Test |
| FR-088-AC-16 | No schema document is duplicated: `packages/semantic-kernel/json-schema/` contains `index.json` and no `*.schema.json` or emitter-produced document. | Static |
| FR-088-AC-17 | No path under `packages/semantic-kernel/` appears in the packed file list of any distribution this repository builds, and every file under `.github/` is byte-identical to `origin/main`. | Test |

## Dependencies

- **Upstream**: FR-081, [FR-033](./FR-033-emit-semantic-core-json-schema.md), [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md)
- **Downstream**: [FR-087](./FR-087-generate-the-kernel-python-package.md), which localizes this bundle in memory for the Python route and changes none of its bytes
- **Constrained by**: NFR-028, NFR-029, NFR-030
- **Blocked**: registry publication of this bundle passes `agent-ix/quoin#290`; it is not decided here
