---
id: ARCH-009
title: "TypeSpec feasibility gate"
status: historical
superseded_by: ADR-0005
---
# TypeSpec feasibility gate

> **Historical.** This gate was resolved on 2026-09-03 by the owner decision on
> [issue #4](https://github.com/agent-ix/filament-core-data/issues/4) and
> recorded in [ADR-0005](adr/0005-typespec-structural-source.md). TypeSpec is
> the structural schema source. The matrix is kept as the record of what the
> spike measured.

## Capability matrix

| Capability | Pass evidence | Spike result |
|---|---|---|
| Reusable packages and imports | Two independent module packages import a small semantic core without flattening identity/version ownership | pass |
| Rust generation | Native Serde-compatible structs/enums preserve constraints and discriminated unions | pass |
| TypeScript generation | Static types and runtime validation agree on golden fixtures | pass |
| Python generation | Ordinary typed models validate golden fixtures without authoring decorators/custom `@` tags | pass |
| JSON Schema 2020-12 | Stable `$id`, modular references, constraints, and unknown-field policy round-trip | partial: official emitter `$id` defect, tracked in [issue #31](https://github.com/agent-ix/filament-core-data/issues/31) |
| Protobuf mapping | Stable field numbers/reservations can be declared outside language-specific source | pass (parser-validated; native `protoc` not run) |
| Markdown metadata | Frontmatter, heading, prose, table, and extraction mappings survive without forcing renderer ownership into Quire | pass |
| Determinism | Repeated generation is byte-identical after normalized tool metadata | pass |
| Compatibility diff | Patch/additive/breaking examples classify consistently across targets | pass |
| Toolchain operation | Pinned, reproducible CLI/library integration works in CI and Rust-oriented orchestration | pass |

## Pass rule

The gate passed if all P0 capabilities—package/import identity, four core
consumer surfaces, deterministic generation, and reproducible CI operation—pass
with checked-in fixtures.

## Result

The spike under `spikes/typespec-feasibility/` met the rule above. Its report
recommended a hold under a stricter rule added during the spike (a capability
needing custom code counted as partial without a pre-accepted owner and budget).
The owner rejected that rule; the retained spike outputs are unchanged and record
what was measured on 2026-08-30.

## Promotion inventory

Issue #27 promoted the prototype emitters into `src/compiler/`. Every prototype
component carries a written disposition in
[`src/compiler/inventory.json`](../../src/compiler/inventory.json), and no
component was promoted merely because the representative golden passed. The
fourteen components disposition as: **2 retain**, **3 rewrite**,
**1 replace-with-official**, **8 discard**. 4 files under `src/compiler/` are
recorded as authored by the promotion rather than inherited from the prototype.

The two promoted language backends are qualified against the issue #4
representative slice only. Their recorded limitation names the four gates they
have not passed — no conformance corpus, no property/fuzz suite, no release
compatibility matrix, no independent downstream adoption — and it stands until
issues #21 and #22 discharge it against the issue #20 corpus.

## Retained evidence

The retained tree under `spikes/typespec-feasibility/{generated,evidence}` and
`report.md` is the historical issue #4 record. Issue #27 does **not** update it
to match the promotion: `capabilities.json` and `report.md` still say what was
measured on 2026-08-30, including statements the promotion supersedes (that no
separate compiler source exists, and that promotion would require a separate
gated change — which is this ticket). The superseding statement lives here, not
in the evidence.

Exactly one retained byte range changed: the `command` field of
`evidence/custom.json`, because the emitter package that command named no longer
exists. Before and after:

```text
pnpm exec tsp compile spikes/typespec-feasibility/main.tsp --emit @agent-ix/typespec-semantic-ir-emitter-spike
node src/compiler/cli.mjs emit-ir --entrypoint spikes/typespec-feasibility/main.tsp --generator @agent-ix/typespec-semantic-ir-emitter-spike@0.0.0 --out generated/custom/semantic-ir.json
```

### Host reproducibility

`pnpm run spike:typespec:check` cannot pass off the workstation that minted the
evidence, for three measured reasons recorded in
[issue #42](https://github.com/agent-ix/filament-core-data/issues/42):

1. The generated Rust package pinned only `serde` and `serde_json`, so its
   retained `Cargo.lock` was regenerated on every run and drifted whenever a
   transitive crate published. **Issue #27 fixes this** by seeding the committed
   lockfile instead of resolving afresh; it changes no committed byte.
2. `evidence/toolchain.json` is inside the byte-compared set and records the
   host's own `node`, `rustc`/`cargo` and `python3` versions (24.15.0, 1.95.0,
   3.14.7). Repairing this rewrites retained evidence and needs an owner
   decision plus a run on a conforming host, so issue #27 does not do it.
3. The generated Python models target 3.13 and import `StrEnum`, so a host whose
   `python3` is 3.10 cannot import them. The required floor is undeclared.

Because of 2 and 3, the promotion is verified per component — the semantic IR,
TypeScript, Rust and Python-input bytes are each compared against the committed
issue #4 goldens — rather than by a full replay.
