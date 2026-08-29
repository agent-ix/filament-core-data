# Filament Core Data

`filament-core-data` currently owns the shared Avro compatibility contract for
Filament IDE, `filament-core-service`, `filament-parser-lib`, and Agent IX sync
packages. The target system is semantic-first and uses concern-specific
representations rather than treating Avro—or any one format—as universal.

The durable design record is the
[semantic data system architecture](docs/semantic-data-system/index.md). It
defines authority, ownership, metamodel and package boundaries, projections,
compatibility, feasibility gates, and the staged non-disruptive roadmap.

The canonical schema lives at:

```text
schema/avro/core-data.avpr
```

Generated bindings are checked in:

- TypeScript: `src/generated.ts`
- Python: `agent_ix_core_data/core_data.py`

Regenerate after schema edits:

```sh
pnpm run generate
```

Validate generated output and representative payload compatibility:

```sh
pnpm test
```
