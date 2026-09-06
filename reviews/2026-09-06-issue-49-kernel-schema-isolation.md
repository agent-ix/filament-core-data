# Issue #49 kernel and legacy binding isolation: implementing review

Base: `362b72284008e85c1acbc3977050380ff50a8580`.
Independent coordinator review remains the integration gate.

## Scope and discrimination

FR-026's legacy-test boundary and NFR-028's kernel test isolation were specified
before implementation. No compiler, generator, schema, generated output,
independent oracle, divergence expectation, or language-toolchain pin changed.

- The actual Avro generator runs from a copied repository layout using the
  installed pinned Biome dependency. Both copied output files are deleted before
  generation, so retaining a copied baseline cannot pass the comparison. Each
  generated binding is independently corrupted by a child that terminates with
  SIGKILL; the retained changed byte and differing fingerprint are observed,
  source bytes remain unchanged, and real regeneration restores only the copy.
  This preserves the legacy baseline, not a claim that an Avro bridge exists.
- Kernel regeneration and changed-environment generation run in separate
  scratch copies of the actual script, compiler modules, published schemas,
  license, package declarations, and committed inputs. The four generated JSON
  artifacts and copied TypeScript tree are removed first, then their generated
  names and SHA-256 byte fingerprints must equal the unchanged source baseline.
- The former positive-only staleness probe now requires the real `--check` to
  pass on the healthy copied tree. A child appends a byte to copied `losses.json`
  and terminates with SIGKILL. The checker must then exit exactly 1 and name
  `agent-ix.compiler.KERNEL_BUNDLE_STALE: losses.json differs from a fresh generation`.
  The checker must leave the mutated copy unchanged.
- The shared test helper compares source names and byte fingerprints before
  cleanup, also on failing checks. Only dependencies are linked. There is no
  source-restoring teardown. Cleanup removes only the unique scratch directory.
- The two remaining in-place-generation exceptions were removed from all three
  changed-path helper functions. A synthetic scratch Git repository proves both
  `src/generated.ts` and `agent_ix_core_data/core_data.py` are reported as genuine
  working-tree changes after interrupted mutations. History attribution is unchanged.

Changed kernel tests now name the owning NFR/FR criteria instead of reusing
historical TC-1103/1104 labels whose matrix rows describe other behavior. The
annotations explicitly qualify only the currently generated TypeScript and JSON
Schema index, not unavailable Rust/Python packages or all NFR-028 acceptance.

## Qualification

- Five focused generation/staleness/changed-path controls passed (6.09 seconds).
- Concurrent six-file run: **275 passed, 2 failed of 277** (82.53 seconds).
  Compiler 59/59, compiler-core 132/132, semantic-core 28/28, legacy schema 4/4,
  Python-tree 12/12, kernel 40/42. Both failures are the unchanged kernel
  `main...HEAD` ownership checks, which incorrectly attribute later changes to
  the original kernel work: `docs/semantic-data-system/contracts-v1.md` is called
  not permitted and `src/compiler/backends/rust-serde/index.d.mts` prohibited.
  No gate was skipped, relaxed, or reclassified as a passing test.
- Python kernel refusal suite: 2/2 passed under the pinned installed environment.
- Root TypeScript no-emit check, authored-file Biome formatting, and
  `git diff --check` passed.
- Kernel staleness: 12 artifacts current. Compatibility: 40 constructed pairs
  checked. Evolution: 2 goldens checked. Compiler docs: 2 documents checked.
  Test-matrix summary is unchanged and its `--check` passed.
- Quire validation exited 0, with existing archetype and grammar warnings.
- Production/output/schema/corpus paths have no diff after concurrent checks.

The first scratch attempt exposed one omitted input (`conformance/schema`),
which was added to the copied input set rather than suppressing the real refusal.
Sandbox subprocess EPERM required an approved subprocess-enabled rerun. An
initial concurrent command set PATH but omitted VIRTUAL_ENV, allowing Poetry to
select an incomplete worktree environment; the final command explicitly selected
the already-installed pinned environment and both Python-reader tests passed.

```bash
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13 \
PATH=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13/bin:$PATH \
node node_modules/vitest/vitest.mjs run test/compiler.test.ts \
  test/compiler-core.test.ts test/semantic-core.test.ts \
  test/semantic-kernel.test.ts test/schema.test.ts test/python-backend.test.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node scripts/build-semantic-kernel.mjs --check
node scripts/test-matrix-summary.mjs --check
node scripts/build-compatibility-cases.mjs --check
node scripts/build-evolution-goldens.mjs --check
node scripts/build-compiler-docs.mjs --check
```

## Remaining gates and newly found hazard

Full #49 closure is not claimed: the audit found two further tracked mutations
at `test/conformance-corpus.test.ts`'s TC-306 tests (approximately lines 965/985).
They mutate `conformance/divergences.json` and restore it in `finally`. Their
tests need a subsequent scratch-only repair; this slice neither runs that broad
suite nor edits its oracle or expectations.

The two moving-main kernel ownership gates and wider historical TC-number debt
remain separate. Generated-kernel formatting still requires the owning generator
fix, never hand-formatting committed outputs. Rust #80, Python #81, lowering
fidelity #78 and publication remain outside this test-isolation slice.
