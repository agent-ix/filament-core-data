# Semantic-kernel consumer examples

These are independent consumers of the generated kernel packages, rather than
tests of their generators.

| Consumer | Package surface | Execution |
| --- | --- | --- |
| TypeScript | `@agent-ix/semantic-agent-ix__semantic-kernel` root export | `make test-node` |
| Rust | `agent_ix_semantic_kernel` crate root from an unpacked offline artifact | `make rust-test` |
| Python | generated `python.pydantic_v2_basemodel` package | `make test-python` |

Each consumer constructs a kernel value, deserializes a shared FR-090 golden,
names every closed-grammar refusal it checks, and reads generated identity and
provenance. `closures.json` is written by the language runners from their
resolved dependency state; it is not a hand-maintained manifest.

The Rust harness invokes exactly `cargo package --offline --no-verify`, unpacks
the artifact into a temporary directory, and builds the consumer there. No
example publishes a package or contacts a registry.
