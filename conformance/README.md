# Semantic conformance corpus and independent differential oracle

Issue [#20](https://github.com/agent-ix/filament-core-data/issues/20).
Requirements: FR-035..FR-039, NFR-015, NFR-016. Plan: `plan/Plan-009-conformance-corpus-and-oracle/`.

This directory is the yardstick the semantic compiler (issue #19) and its Rust,
TypeScript, and Python backends (issues #21, #22, #23) are judged against. It is
authored independently of all of them, because an oracle written by the
implementer of the thing it checks is not an oracle.

## What is here

| Path | What it is |
|---|---|
| `corpus.json` | The manifest: corpus version, construct register, unmet areas, base and case digests, `corpusDigest` |
| `bases/` | Contract-valid input bundles every case patches |
| `cases/<family>/` | One file per case: a base, a patch, a citation, and an expected result |
| `schema/` | The input-bundle, case, manifest, and adapter-result schemas, composing the published v1 schemas |
| `oracle/` | The verdict engine, the pinned schema layer, the canonical-JSON and patch dialect, and the import API |
| `adapters/registry.json` | The four declared adapter slots and who owns each |
| `runner/differential.mjs` | The harness |
| `diagnostic-codes.json` | Every code the oracle may emit, its layer, and the contract clause that obliges it |
| `defects.json` | Defects found in an implementation the corpus judges |
| `contract-gaps.json` | Disagreements with the published contract, recorded rather than repaired |
| `divergences.json` | Adapter divergences the run suppresses, each with an owner and a verdict |
| `thresholds.json` | The promotion thresholds proposed to each owning issue |
| `mutations.json` | The committed mutation catalogue |
| `coverage.json` | Generated on every run; never hand-edited |

## An input bundle

A case's input is a bundle, not a bare IR document: `ir` plus, when the case
needs them, `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and
`consumerPolicy`. Each member is validated by its own published v1 schema.
Without the bundle there is no way to state an unresolved import, a package
cycle, a stale manifest digest, an unknown mapping, or undeclared loss, because
no semantic IR document carries any of those facts.

## Case shape and provenance

A case is a base id plus an ordered patch. The patch is RFC 6902 with one
declared extension, `x-repeat`, which appends `count` copies of a template with
`$i` replaced by the copy index and `$n` by its successor — that is how a case
that sits on a depth limit stays inside the minimization budget of 64 JSON
nodes. An indexed `replace` or `remove` must be preceded by a `test` op pinning
the member it edits, so that an edit to a base cannot silently re-aim a case.

Every case carries `derivedFrom`: the artifact, the locator, and the verbatim
quote its expectation was read from. The gate checks that the quote still occurs
in that artifact. Every case carries `provenance.blessedFromRun: false`; a case
that set it true would need a reviewed `blessing` block naming the
implementation, its version, the command, and the reviewer who checked the
derivation by hand. No case in this corpus is blessed from a run.

The expected result carries `resultState` and an ordered diagnostic list. Each
entry is a `common.schema.json#/$defs/diagnostic` document with an RFC 6901
`pointer` beside it — beside, not inside, because the published diagnostic is
sealed and has no member for a location inside the document
(`contract-gaps.json` GAP-003). The gate compares `resultState`, and per
diagnostic the `code`, `severity`, `owner`, `blocking`, `pointer`, and `locus`.
`message` is authored prose beside the judgement and is not compared, so a
reworded diagnostic is not a corpus failure while a changed code or locus is.

## What the compatibility classification covers

The oracle classifies the **IR surface only**: type kinds, scalars, alias and
reference targets, sequence and map element types, fields and their presence,
nullability, units and defaults, constraints, variants, relationships,
operations, and extensions. `compatibility-report.schema.json` and FR-025
remain the authority for the profile, mapping, representation,
generated-target, and consumer-evidence surfaces; where both speak, the FR-025
report wins and this classification never overrides it. A change no rule models
classifies `unknown` rather than passing silently, because an unclassifiable
change prevents a compatible promotion.

## Canonical form

The corpus comparison form is `agent-ix-conformance-jcs-v1`: object keys ordered
by code point, no insignificant whitespace, array order preserved. **It is not**
the contract's `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form,
which `contract-gaps.json` GAP-004 records as named but undefined. Case and base
digests are over raw file bytes, so a one-byte edit anywhere is detected;
`corpusDigest` is the SHA-256 over those digests joined in base-id then case-id
order.

## Versioning

`corpusVersion` is SemVer and is the only version a consumer pins for corpus
content. Adding a case, a base, or a register row is a minor change. Changing or
removing an existing case's `expected`, or an existing base, is a major change,
and is reached only through a `corpus-defect` verdict in the divergence
register. Editing a title, a citation, or prose is a patch change.

## Running it

```bash
make conformance          # corpus gates, the oracle over every case, the harness
make conformance-audit    # the only entry point that reads a clock
```

`make test` runs the same gates through `test/conformance-corpus.test.ts`, and
`poetry run pytest` runs the Python half through
`tests/test_conformance_corpus.py`. Nothing here opens a network connection.

## What this corpus does not do

- It judges the IR document layer. Cross-language generated-package
  serialization parity has no package to serialize until issues #21, #22, and
  #23 ship, and is recorded as an unmet area, not claimed.
- Every adapter slot is `unavailable` today. That is 444 unmet rows in the
  coverage account and zero passes. An absent backend is visible, never a pass.
- It repairs nothing. Where it disagrees with the published contract or with a
  merged artifact, it records the disagreement in `contract-gaps.json` with the
  issue that owns the decision.
- It publishes nothing. The import surface is `conformance/oracle/index.mjs`;
  adding it to the package's `exports` or `files` belongs to the issue #11
  publication gate.

## Consuming it

```js
import { loadCorpus, buildInput, oracleVerdict, compare }
  from "<checkout>/conformance/oracle/index.mjs";
```

Every loader returns a deep copy and resolves paths relative to the module, so
no particular working directory is needed.
