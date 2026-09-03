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
