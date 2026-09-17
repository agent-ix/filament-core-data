# FR-090 — evidence for closing `UA-serialization-parity`

`conformance/corpus.json` carries the unmet area `UA-serialization-parity`,
owned by `#21`, `#22`, `#23` and `#11`, on the rationale that no generated
package existed to serialize. All four packages now exist under
`packages/semantic-kernel/`, and this document is the measured evidence offered
to `agent-ix/filament-core-data#20`, the corpus owner, for closing that row.

This requirement does not edit the row, its `rationale`, its `owningIssues`,
the `unmetAreas` register, `corpusVersion`, `corpusDigest`, or the
"What this corpus does not do" section of `conformance/README.md`. Closing the
area is the corpus owner's act.

**The issue asking `#20` to close the row: `agent-ix/filament-core-data#130`.**

## What was measured

One golden corpus of 112 kernel instance documents under
`packages/semantic-kernel/parity/golden/`, covering all 30 kernel declarations
(21 models, 1 union, 4 enums, 4 scalars) in the `positive` / `negative` /
`boundary` classes the existing conformance cases use. Every one of the four
packages decides every document; no package is excused from any document.

The five properties FR-090 names are exercised: serialized member names,
presence versus null, defaults, unknown-member states, and relation semantics.

Every answer — the contract's included — is lifted into the corpus verdict shape
by `project.mjs` and normalized by `substantive()` imported from
`conformance/oracle/index.mjs`. The harness defines no verdict, no
canonicalization and no comparison of its own; two answers agree when their
`substantive` projections are the same text. An undecided or unavailable answer
is counted unmet, never as a pass.

Reproduce with:

```
node --experimental-strip-types \
  --import ./packages/semantic-kernel/parity/emitters/ts-register.mjs \
  packages/semantic-kernel/parity/run.mjs
```

## The measured agreement

```
89/112 documents agree; 47 divergence rows, 0 unadjudicated
```

| Property | Agreeing | Documents |
| --- | --- | --- |
| serialized-member-names | 75 | 94 |
| round-trip | 64 | 69 |
| presence-versus-null | 8 | 11 |
| unknown-member-states | 5 | 5 |
| defaults | 3 | 8 |
| relation-semantics | 10 | 11 |

| Package | Agreeing with the contract | Documents |
| --- | --- | --- |
| json-schema | 112 | 112 |
| typescript | 90 | 112 |
| python | 110 | 112 |
| rust | 89 | 112 |

## Every divergence, and who owns it

All 47 rows are adjudicated. No row is closed by editing a golden
document, an expectation, a base, the oracle, or this register.

| Cause | Wrong side | Property | Rows | Adjudicated by |
| --- | --- | --- | --- | --- |
| `ir-drops-string-scalar-constraints` | rust | decision | 16 | agent-ix/filament-core-data#127 |
| `ir-drops-string-scalar-constraints` | typescript | decision | 16 | agent-ix/filament-core-data#127 |
| `ir-unconstrained-value` | rust | decision | 4 | agent-ix/filament-core-data#78 |
| `ir-unconstrained-value` | typescript | decision | 5 | agent-ix/filament-core-data#78 |
| `ir-required-collection-presence` | rust | decision | 1 | agent-ix/filament-core-data#78 |
| `ir-required-collection-presence` | typescript | decision | 1 | agent-ix/filament-core-data#78 |
| `null-erased-on-serialization` | python | serialized-member-names | 1 | agent-ix/filament-core-data#129 |
| `null-erased-on-serialization` | rust | serialized-member-names | 1 | agent-ix/filament-core-data#129 |
| `null-accepted-for-non-nullable-optional` | python | decision | 1 | agent-ix/filament-core-data#129 |
| `null-accepted-for-non-nullable-optional` | rust | decision | 1 | agent-ix/filament-core-data#129 |

**`ir-drops-string-scalar-constraints`** — A string scalar's `pattern` and `minLength` never reach the IR: every string scalar in semantic-ir.json carries `constraints: []` while every integer scalar carries its `min`/`max`. The package renders the IR faithfully; the lowering under #11 lost the constraint, so the package accepts identifiers, clause languages, format names and locus paths the published JSON Schema refuses.

**`ir-unconstrained-value`** — `DefaultDecl.value` is `{}` in the schema — any JSON value — and IR v1.1 has no any-type, so it lowers to a record with no fields. packages/semantic-kernel/losses.json records this as `unconstrained-value`; #78 is the expressiveness gap and #93 the v1.2 fix.

**`ir-required-collection-presence`** — `OperationDecl.params` is required-but-possibly-empty, which IR v1.1 cannot express, so it lowers to optional and the package admits a document omitting it. packages/semantic-kernel/losses.json records this as `required-collection-presence`; #78 is the expressiveness gap and #93 the v1.2 fix.

**`null-erased-on-serialization`** — An authored `null` on an unconstrained member is erased on the way back out — Rust by `skip_serializing_if = "Option::is_none"`, Python by `exclude_none=True` in the documented serialization path — so the round trip drops a member the contract preserves.

**`null-accepted-for-non-nullable-optional`** — A non-nullable optional member typed `str | None` accepts a written `null`, which the published schema refuses: optional and nullable are the same type in the generated package.

## Which owning issues this discharges, and which remain

The corpus owner is deciding on a stated scope. This evidence discharges the
measurement the unmet area names; it does not claim the named defects are fixed.

| Owning issue | Status against `UA-serialization-parity` |
| --- | --- |
| `#21` Rust/Serde backend | **Discharged as measured.** The crate decides all 112 documents and agrees on 89. Of its 23 divergence rows, 21 are rendered-from-IR (`#127`, `#78`) and 2 are its own (`#129`). |
| `#22` TypeScript backend | **Discharged as measured.** The package decides all 112 documents and agrees on 90. All 22 of its divergence rows are rendered-from-IR (`#127`, `#78`); no divergence is owned by `#22` itself. |
| `#23` Python backend | **Discharged as measured.** The package decides all 112 documents and agrees on 110, the highest of the three IR-independent paths. Both of its divergence rows are its own (`#129`). |
| `#11` semantic-core packages | **Not discharged.** `#11` owns the JSON Schema package, which agrees on 112 of 112 — but that figure is not independent evidence: the golden expectations are derived from the same published schemas ajv validates against, so the JSON Schema package is the contract's own voice in this measurement, not a fourth witness to it. `#11` also owns the IR lowering, and 43 of the 47 divergence rows are lowering defects (`#127` 32 rows plus the `#78` expressiveness losses). |

What remains is therefore not an absence of measurement but three named, owned
defects. That is what the issue register records; it is not what an unmet-area
row records.

## Publication

Nothing here publishes. Publication of all four kernel packages is blocked on
`agent-ix/quoin#290`; the record is
[`publication-gate.json`](./publication-gate.json).
