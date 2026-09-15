# Filament Core Data

`filament-core-data` owns the semantic contract compiler and generated kernel
packages. The retired Avro compatibility boundary had zero in-scope readers at
its final census; it is no longer exported, generated, or released.

The durable design record is the
[semantic data system architecture](docs/semantic-data-system/index.md). It
defines authority, ownership, metamodel and package boundaries, projections,
compatibility, feasibility gates, and the staged non-disruptive roadmap.

The generated kernel packages under `packages/semantic-kernel/` are the
supported consumer surface. Their deterministic build and parity gates are
available through the repository Make targets.
