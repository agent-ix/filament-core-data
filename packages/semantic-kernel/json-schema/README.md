# The semantic kernel JSON Schema package

`index.json` beside this file is an index over
`packages/semantic-core/generated/json-schema/`, written by
`scripts/build-semantic-kernel.mjs` (FR-088). It is never a copy of those
documents. This README is authored; `index.json` is generated.

## Publication is blocked

**Publication of this package is blocked on
[`agent-ix/quoin#290`](https://github.com/agent-ix/quoin/issues/290).**

Nothing is published to any public registry. The index is a manifest of
documents, not a distribution: it carries no registry entry, and adding one
fails the FR-090 gate naming the manifest. No `make` target and no step of the
parity run publishes it or contacts an index.

The record for all four kernel packages is
[`../parity/publication-gate.json`](../parity/publication-gate.json).

## Its role in the FR-090 parity measurement

This package agrees with the contract on all 111 golden kernel instance
documents, and that figure is **not** independent evidence: the golden
expectations are derived from the same published schemas this package indexes,
so it is the contract's own voice in the measurement rather than a fourth
witness to it. It is included so that every package decides every document, as
FR-090 requires.

See [`../parity/unmet-area-evidence.md`](../parity/unmet-area-evidence.md).
