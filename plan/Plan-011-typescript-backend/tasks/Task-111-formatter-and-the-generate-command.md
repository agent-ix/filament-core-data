---
id: Task-111
title: "The injected biome formatter and the `generate` command"
type: Task
status: pending
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-110"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-826"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-827"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-828"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-829"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-832"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-833"
    type: verifies
---
# Task-111: The injected biome formatter and the `generate` command

## Scope

Land the impure edge: the injected formatter that makes the output deterministically formatted, and the one command that reads an IR document and writes a generated package.

## Subtasks

- [ ] Author `src/compiler/backends/format.mjs` exporting `biomeFormatter(host)`, rendering text through this repository's exactly-pinned `@biomejs/biome` binary exactly as `conformance/tools/format-json.mjs` already does for JSON. It is the one module under `src/compiler/backends/` that starts a process; say so in its header, as `src/compiler/identity.mjs` says it for file reading.
- [ ] Keep every module under `src/compiler/backends/typescript-v1/` pure. Compute the output manifest's file digests over the formatted bytes.
- [ ] Author `emit.mjs` exporting `emitTypeScriptPackage(request, options)`, the orchestration behind the verb.
- [ ] Add the `generate --ir <file> --target <target> --out-root <dir> [--profile <file>] [--manifest <file>] [--limits <file>]` verb to `src/compiler/cli.mjs`, defaulting `--target` to `typescript` and leaving the four existing verbs' flags and behaviour byte-unchanged.
- [ ] Write every output through a sibling `<path>.tmp` and a rename, as `compile` does. Write no file under `--out-root` when any diagnostic blocks, and leave a pre-existing file there byte-unchanged.
- [ ] Write the output manifest to `--manifest` when given and to standard output otherwise.
- [ ] Keep the existing exit-code contract: `0` clean, `1` blocking diagnostic or non-success state, `2` unknown command, unknown flag, missing required flag, or unreadable flag value. Read no environment variable to decide behaviour.
- [ ] Add `make generate-typescript` and `make generate-typescript-check`; `--check` regenerates into a scratch directory and compares, and never rewrites a committed artifact in place, which is the issue #49 defect.
- [ ] Assert the command opens no network socket and starts no child program other than the pinned formatter.

## Deliverables

- `src/compiler/backends/format.mjs`, `format.d.mts`
- `src/compiler/backends/typescript-v1/emit.mjs`, `emit.d.mts`
- The `generate` verb in `src/compiler/cli.mjs`
- `make generate-typescript`, `make generate-typescript-check`

## Notes

- `package.json` gains no script. The Make targets call `node` directly, as issue #20's targets already do, because `package.json` `exports`, `main`, `module`, `types`, `files` and every dependency block stay byte-unchanged.
- Because the formatter is the repository's own, `biome format .` over the committed generated fixture is a no-op by construction and `biome.json` is never edited — it is a prohibited path.
