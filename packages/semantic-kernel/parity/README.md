# FR-090 — cross-language parity

Four generated kernel packages decide one shared corpus of kernel instance
documents. This directory measures whether they decided it the same way, and
records every disagreement against an owning issue.

Run it:

```
node --experimental-strip-types \
  --import ./packages/semantic-kernel/parity/emitters/ts-register.mjs \
  packages/semantic-kernel/parity/run.mjs
```

or `make semantic-kernel-parity`.

Current result:

```
89/112 documents agree; 47 divergence rows, 0 unadjudicated
```

## What is here

| Path | Written by | What it is |
| --- | --- | --- |
| `golden/PAR-NNNN.json` | authored | 112 kernel instance documents, all 30 kernel declarations, classes `positive` / `negative` / `boundary` |
| `golden.mjs` | authored | loads the corpus; names the four packages |
| `project.mjs` | authored | lifts an emitter answer into the corpus verdict shape |
| `emitters/*` | authored | one decision path per package; each returns `{id, resultState, wire, unknownFate}` |
| `run.mjs` | authored | runs every emitter, compares, writes the two reports |
| `agreement.json` | **generated** | per document and per property, what each package decided and whether it agrees |
| `divergences.json` | **`adjudication` authored, `rows` generated** | the divergence register |
| `unmet-area-evidence.md` | authored | the evidence offered to `#20` for closing `UA-serialization-parity` |
| `publication-gate.json` | authored | the `agent-ix/quoin#290` record and the exact command list |

## How agreement is decided

The harness defines **no verdict, no canonicalization and no comparison of its
own** (FR-090-AC-9). Every answer, the contract's expectation included, is:

1. flattened by `project.mjs` into the corpus verdict shape — one diagnostic per
   wire leaf, addressed by an RFC 6901 pointer, the leaf's JSON text carried in
   `locus.jsonText`;
2. normalized by `substantive()` imported from `conformance/oracle/index.mjs`;
3. compared as text. Two answers agree when their `substantive` projections are
   the same string.

The comparison form is `agent-ix-conformance-jcs-v1`, the corpus's own. It is
not, and does not claim to be, `RFC8785-JCS-with-identity-sorted-sets-v1`, which
`conformance/contract-gaps.json` GAP-004 records as named but undefined.

`conformance/oracle/index.mjs` is the **only** module under `conformance/`
this directory imports (FR-090-CON-3), and the run writes nothing under
`conformance/` at all (FR-090-CON-2). An undecided or unavailable answer is
counted unmet, never as a pass.

## How a disagreement is closed

Not by editing anything here. A divergence row names the document, the property,
both decisions and which side is wrong; the authored `adjudication` array in
`divergences.json` binds each row to the issue that owns the defect, and the
gate rejects a row without one. An adjudication entry the run does not reproduce
fails the run, so a fixed defect cannot stay suppressed.

A disagreement with the published contract rather than between two packages is
reported by **filing an issue** naming the owner
`conformance/contract-gaps.json` would assign — not by adding a row to that
file, which NFR-030 forbids. The remaining open defect owners are:

| Cause | Rows | Issue |
| --- | --- | --- |
| String scalar `pattern` / `minLength` dropped in lowering | 32 | `agent-ix/filament-core-data#127` |
| `DefaultDecl.value` and `OperationDecl.params` IR expressiveness losses | 11 | `agent-ix/filament-core-data#78` |
| Optional and nullable are the same type in Rust and Python | 4 | `agent-ix/filament-core-data#129` |

43 of the 47 rows are IR lowering defects rendered faithfully by the Rust and
TypeScript packages, not backend defects. The previous untagged-union defect
(#128) was fixed; its 36 rows no longer occur.

## Publication

Nothing here publishes. All four packages are blocked on `agent-ix/quoin#290` —
see [`publication-gate.json`](./publication-gate.json).
