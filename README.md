# Filament Core Data

`filament-core-data` owns the shared Avro core data contract for Filament IDE,
`filament-core-service`, `filament-parser-lib`, and Agent IX sync packages.

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
