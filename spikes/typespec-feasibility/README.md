# TypeSpec feasibility spike

This directory is an isolated, unpublished experiment for
[`filament-core-data#4`](https://github.com/agent-ix/filament-core-data/issues/4).
It may contain pinned TypeSpec sources, a disposable custom emitter, generated
experimental packages, native consumers, fixtures, raw outputs, and normalized
evidence. Nothing here is a current shared contract or production package.
All original Agent IX source and generated source in this spike is licensed
AGPL-3.0-only under the repository license; third-party tools retain their
upstream licenses.

The experiment must preserve four evidence layers:

1. `packages/` — modular authored TypeSpec sources and explicit mappings.
2. `generated/official/` — immutable output from official TypeSpec emitters.
3. `generated/custom/` — semantic IR and disposable native/projection output.
4. `evidence/` — exact tools, commands, results, limitations, compatibility,
   clean-run fingerprint, recommendation inputs, and validation.

The one-command interface is `pnpm run spike:typespec`. It regenerates only
inside this directory or a caller-supplied temporary output. `--check` compares
fresh output with the checked-in evidence without rewriting it.

The acceptance report must classify every capability as `pass`, `partial`,
`fail`, or `not-applicable`. A missing or compensated P0 capability remains
partial/fail unless its production ownership and maintenance cost are explicitly
accepted. The spike never publishes, updates a catalog, replaces Avro, changes a
consumer, or promotes ADR-0004.
