# agent-ix-conformance

Generated Rust/Serde declarations for the semantic contract `agent-ix/conformance` at version `1.0.0`.

This crate is generated. Edit the contract, not this crate: the next
generation overwrites every file here, and a hand edit is invisible to the
determinism gate that compares two generations byte for byte.

## Provenance

- Source identity: `ix://agent-ix/filament-core-data/source/typespec`
- Source version: `1.0.0`
- Source digest: `sha256:0000000000000000000000000000000000000000000000000000000000000000`
- Contract version: `1.0.0`

The same values are exported as `&'static str` constants from
`src/identity.rs`, so a consumer can assert against them at run time.

## Declared gaps

The `format` constraint keyword is registered against no format in this
crate, and the emptiness is the declared position rather than an omission.
`format` takes a namespaced name, the only name any published artifact
carries is `agent-ix:plain-text`, and no published artifact states the
language that name checks: `common.schema.json` does not define it, FR-029
says only that the name is namespaced, and no fixture pins a rejected value.
Registering a check would be this backend deciding a cross-language
validation rule that belongs to the constraint vocabulary — the same shape
as choosing a JSON wire form for the `bytes` kernel scalar, which is filed
as issue #58. Every `format` operand therefore raises
`agent-ix.rust-backend.UNKNOWN_FORMAT` and stops generation until a
definition is published.

The `sourceLocus.path` pattern's published language and its intended
language differ, because each of the pattern's guards is a lookahead over
`.` and `.` stops at the first line terminator. `SourceLocusPath::try_new`
decides the published language and `SourceLocusPath::is_traversal_free` the
intended one; the two are separately named rather than one standing for the
other. The divergence is GAP-002 and issue #56.

## Licence

AGPL-3.0-only. The repository `LICENSE` is carried verbatim beside this file.
