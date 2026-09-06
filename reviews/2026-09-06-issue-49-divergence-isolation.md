# Issue #49 divergence and coverage writers: implementing review

Base: `3ac4c133863ea828aeb91c935e081cee31502468`.
Coordinator independent review remains the integration gate. No push was made.

## Scope and controls

FR-037 and NFR-028 were updated before their tests. TC-306's two original entry
semantics are unchanged: `DIV-TEST` is unreproduced and `DIV-OLD` has an expired
review date. Only the copied register is seeded; no oracle, schema, expectation,
production runner, divergence register, or generated output is edited.

The shared corpus scratch helper creates a local clone with an independent
checkout, index and refs. Existing source Git objects are read-only shared
inputs. Scratch `origin/main` is explicitly pinned to the source's exact
`origin/main` hash, not the clone's interpretation of the source's local main.
Before running, cloned corpus/compiler/schema/crate bytes must match the source
snapshot: uncommitted changes cannot silently be tested as older committed code.
Only installed Node dependencies are linked; Cargo output is explicitly directed
inside scratch instead of into the linked `node_modules` cache.

Each TC-306 test first requires the unchanged real command to complete with
status 0. A separate child writes the exact seeded JSON bytes and kills itself
with SIGKILL. The test observes that signal, null process status and retained
bytes. The real command then returns exactly 1:

- The differential report contains exactly the original intended
  `unreproduced-divergence` problem for `ENV-001`, `typescript-backend`,
  `DIV-TEST`; there is no unrelated failure allowed beside it.
- The audit names the expired `DIV-OLD` entry, its adapter and original
  `2000-01-01` deadline, and reports one past-review entry.

Neither validator may rewrite the seeded register. Source input/corpus names
and byte fingerprints are compared before scratch cleanup, including failure
paths; no source restoration is performed.

The inventory also found that the kernel suite's differential CLI call writes
tracked `conformance/coverage.json`, even during test collection. That call now
uses the same scratch boundary. Real registered Rust/TypeScript adapters,
unavailable adapter accounting and the exact predecessor gate remain enabled;
no stub adapter or `skipCorpusGates` substitution is used.

## Verification

- TC-306 alone: 2/2 passed, 105 unrelated tests not selected.
- Concurrent TC-306 plus kernel's five corpus-agreement checks: **7/7 passed**,
  142 unrelated tests not selected (15.85 seconds on the final strict assertion).
  Kernel's real CLI ran during collection and completed status 0 in its clone.
- Root TypeScript check passed. Changed authored files pass Biome formatting.
- Both owning specs passed Quire validation (exit 0, pre-existing duplicate
  archetype/inverse-edge warnings only).
- `git diff --check` passed. No production, schema, output, or corpus-data diff.
- No full corpus suite was run for this repair. The two previously recorded
  moving-main kernel ownership failures are not repaired or called passing.

```bash
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13 \
node node_modules/vitest/vitest.mjs run test/semantic-kernel.test.ts \
  test/conformance-corpus.test.ts -t 'TC-306|cross-language agreement'
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
quire validate --scope . \
  spec/functional/FR-037-run-the-differential-conformance-harness.md \
  spec/non-functional/NFR-028-deterministic-kernel-generation.md
```

## Read-only write inventory and remaining scope

The inventory searched `test/` and `tests/` including NUL-containing Rust-test
source with `rg --text`, checking filesystem writes/removals/copies, subprocess
entrypoints, writer environment flags, and called generation/mutation helpers.
Rust crate `write_all` hits write subprocess stdin, not tracked files. This is a
bounded source audit, not a claim to prove every possible dynamically loaded
program effect.

| Boundary | Disposition |
|---|---|
| Semantic-core EnumValue mutation | Scratch copy plus SIGKILL/source checks, prior `597596e` |
| Python qualification report / generated README | Scratch copied checker and SIGKILL/source checks, prior `362b722` |
| Compiler declaration drift | Scratch copied declarations/consumer plus SIGKILL/source checks, prior `362b722` |
| Legacy TS/Python regeneration and kernel generation/environment/staleness probes | Scratch-only real generation plus negative/source checks, prior `3ac4c1` |
| TC-306 divergence register | Repaired in this slice |
| Kernel differential CLI coverage writer during collection | Repaired in this slice |
| Compiler-core TC-484 `NOTES.tmp` under `test/fixtures/compiler/packages/assurance/` | **Still open:** `compiler-core.test.ts` near line 2367 writes/removes an untracked fixture-root file in `finally`; killed runs can leave debris |
| `SEMANTIC_CORE_WRITE_LOWERED=1` | **Still open:** `semantic-core.test.ts` near line 1043 conditionally rewrites `fixtures/semantic-core/positive/config-version-lowered.json`; explicit authoring escape hatch, inactive in normal runs but vulnerable to inherited environment |
| Other compiler/TypeScript/Rust direct mutation probes | Inspected destinations are `mkdtemp` scratch roots; Rust mutation helper `scratchCopy` creates independent backend copies |
| TypeScript emitted package formatting and Python generation tests | Formatting receives copied scratch files; Python runner uses temporary directories, with optional outputs supplied from pytest `tmp_path` |
| Semantic-core additive TypeSpec compilation | Unique directory under ignored `node_modules/.cache`, not a tracked source/output target |
| Python imports/typechecking and native builds | May create ignored bytecode/checker/build caches; not a promise of zero filesystem writes or cache-free execution |

The two open fixture/authoring cases need a separate bounded followup. Full #49
closure is therefore not claimed. Wider kernel ownership/traceability debt and
generator formatting remain separate from interrupted-test source preservation.
