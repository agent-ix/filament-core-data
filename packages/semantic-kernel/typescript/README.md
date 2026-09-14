# `@agent-ix/semantic-agent-ix__semantic-kernel`

The generated TypeScript semantic kernel package. Every `.ts` file beside this
one is written by the issue #22 backend through
`scripts/build-semantic-kernel.mjs`; this README is authored, and is the only
file here that is not generated.

## Publication is blocked

**Publication of this package is blocked on
[`agent-ix/quoin#290`](https://github.com/agent-ix/quoin/issues/290).**

Nothing is published to any public registry. `package.json` carries no
`publishConfig` and no `registry` entry, and adding one fails the FR-090 gate
naming the manifest. No `make` target and no step of the parity run invokes
`npm publish`, and none passes `--registry` or a publish `--dry-run` — a
dry-run publish still contacts an index.

The record for all four kernel packages is
[`../parity/publication-gate.json`](../parity/publication-gate.json).

## Measured agreement with the other packages

FR-090 measures this package against the Rust, Python and JSON Schema packages
over a shared corpus of 111 golden kernel instance documents. This package
decides all 111 and agrees with the contract on 74. All 37 of its divergence
rows are defects rendered faithfully from an IR that already lost the
constraint — `agent-ix/filament-core-data#127`, `#128` and `#78` — and none is
owned by #22 itself.

See [`../parity/unmet-area-evidence.md`](../parity/unmet-area-evidence.md).
