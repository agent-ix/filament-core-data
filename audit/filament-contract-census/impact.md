# Filament contract census impact assessment

The machine-readable authority is [impact.json](./impact.json). Every entry is a
recommendation with `approvalStatus: not-approved`.

## Repository impact

| Repository | Effort | Risk | Wave | Recommendation |
|---|---:|---:|---|---|
| `filament-core-data` | XL | High | 2–4 | Settle schema source/IR, then compiler/packages; retain Avro bridge |
| `filament-domain-events` | L | High | 5 | Map strict Pydantic models and specify an additive versioned event envelope |
| `filament-core-service` | XL | High | 5 + DB gate | Preserve SQLModel/DB authority; adapters first, migration only with full rollback evidence |
| `filament-parser-lib` | M | Medium | 5 | Resolve current shim and generate adapters later; keep legacy readable until cutover |
| `filament-ide-rs` | XL | High | 5–6 | Wait for graph/core/assurance stability; separate DTO and database gates |
| `quire-rs` | L | Medium | Project 18 3–4 | Add semantic extraction metadata only; keep rendering/generation out |
| `quoin` | L | High | Project 18 1–3 | Freeze architecture and manifest semantics before pin/publication changes |
| `quire-corpus` | S | Low | continuous | Reuse pinned truth set; do not confuse it with module/business schemas |

## Highest-risk concept families

1. Core Document/Artifact/ObjectType/Graph identity and data-plane split (`PAR-002`).
2. Database schema alignment (`PAR-007`).
3. Semantic module manifest/registry/catalog split (`PAR-005`).
4. Versioned domain event contract and unknown consumers (`PAR-003`).
5. Accumulated QA/run/result/evidence semantics before Arrow/Parquet (`PAR-011`).

## Mandatory sequencing consequence

The census supports continuing specification and analysis. It does not support a
consumer, database, package-publication, enforcement, or legacy-retirement merge.
The Project 17/18 item collections are explicitly incomplete at 200 records, and
active core-service/parser/IDE/Quoin work overlaps contract surfaces. Those facts
must be refreshed at their named gates, not “resolved” by this audit.
