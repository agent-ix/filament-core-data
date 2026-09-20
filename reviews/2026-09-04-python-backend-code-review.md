---
id: SR-105
title: "Code review — issue #23 qualified Python/Pydantic backend"
type: SpecReview
analysis: code-review
scope: "python_backend/, tests/test_python_backend_*.py, tests/change_range.py, test/python-backend.test.ts, the six converted changed-path suites, Makefile, pyproject.toml"
review_set: subset
---

# Code review — issue #23 qualified Python/Pydantic backend

## Summary

Issue #23 qualifies the MIT `datamodel-code-generator==0.76.0` rather than
writing a generator: declared pins with an advisory floor, five immutable target
profiles, one measured schema-preparation rewrite, two refusal guards, a
subprocess-isolated runner, an `ast`-only generated-source inspection with a
report/enforce split, three emitted and byte-compared packages, and four
measured artefacts. The shape is right — the generator is used and never
imported in-process, the qualification measures instead of asserting, and the
gap register carries the losses rather than hiding them. Four of the five gates
run green; `ruff` does not, and nothing in the repository runs it. Three of the
green ones are green because they cannot go red: the FR-078 attribution can
classify a real loss as sanctioned, the FR-080 coverage account reports numbers
that equal themselves by construction, and three tautological assertions sit in
the freeze, preparation, and network suites.

## Verdict

**FAIL** — three high findings. Each is a gate that passes for a reason other
than the property it names holding.

## Gate results actually observed

Run from `.worktrees/23-python-pydantic-backend`
at HEAD `8991204`:

| Gate | Result |
| --- | --- |
| `make lint` | exit 0 |
| `poetry run pytest -q` | exit 0 — 495 passed in 157.72s |
| `poetry run mypy --no-error-summary` | exit 0, no output |
| `poetry run ruff check python_backend tests` | **exit 1 — 2 × F401** |
| `pnpm run test` | exit 0 — 421 passed, 11 files |

### The tree moved during this review

`python_backend/adapter/guard.py`, `adapter/prepare.py`,
`qualification/validation.json`, `runner/emit.py`, `runner/generate.py`,
`runner/qualify.py`, `runner/validate.py`,
`tests/test_python_backend_qualification.py` and
`tests/test_python_backend_runner.py` were modified in the working tree *while
this review was running* (mtimes 10:18–10:22, mid-read), by an in-flight
remediation of an earlier review. Every finding below is stated against the
committed tree at `8991204` and every line reference is a HEAD line, verified
with `git show HEAD:<path>`. The gate table above was collected across that
window and is therefore a snapshot, not a reproducible measurement of HEAD; the
`ruff` failure was re-confirmed against `git show HEAD:` content. That
uncommitted work is not reviewed here and does not close anything below except
where noted.

## The two questions put to this review

**Is `inspect_source.candidates_for`'s narrowing sound?** No. See FND-1188 — it
is demonstrably possible to have a real constraint loss classified `sanctioned`
against a schema node in a different `$defs` entry, with `enforce` mode passing.
The structural-attribution *premise* is right (the generator carries no
provenance and every option that would is prohibited), and multi-candidate
ambiguity does fail closed. What is unsound is the single-survivor case: nothing
corroborates that the one surviving node has anything to do with the class the
annotation came from.

**Does a gate catch `render.py` diverging from biome?** Yes. `biome.json`
includes `**` with no exclusion for `python_backend/`, and I confirmed that bare
`biome format <file>` (what `pnpm run lint` runs) exits 1 on a formatting
difference rather than only printing one — so any rendered artefact whose bytes
biome would print differently reddens `make lint`. The gate is real but
indirect: it covers only the JSON shapes that happen to be committed, and there
is no differential test that feeds `render()` output straight to biome. A
divergence in a shape the committed artefacts do not exercise would be found
only when someone first produces it. Recorded in FND-1193, not raised as its own
finding.

## Findings

| ID       | Severity | Summary                                                                                         | Refs                                            |
| -------- | -------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| FND-1188 | high     | FR-078 attribution can classify a real loss `sanctioned` against an unrelated schema node          | python_backend/runner/inspect_source.py:297      |
| FND-1189 | high     | FR-080 exercises no conforming value and its coverage gate is numbers that equal themselves       | python_backend/runner/validate.py:202            |
| FND-1190 | high     | Four assertions that cannot fail, in the revert, preparation, and network gates                   | test/python-backend.test.ts:340                  |
| FND-1191 | medium   | `ruff check` fails with 2 × F401 and no `make` target or workflow runs ruff at all                | python_backend/runner/emit.py:337                |
| FND-1192 | medium   | Freeze gates measure a range ending six commits before the tip, so later commits go unjudged      | tests/change_range.py:79                         |
| FND-1193 | medium   | `killGraceSeconds` never enforced; `$dynamicRef` and percent-encoded `..` never classified        | python_backend/adapter/guard.py:161              |

## FND-1188 — a real semantic loss can be attributed to the wrong schema node and sanctioned

`candidates_for` (`inspect_source.py:278-304`) indexes every object subschema by
the *set of property names* it declares and matches a generated class by the set
of annotated attributes it carries. When several nodes share a set, it narrows
to those whose subschema for this attribute declares no nested `properties`,
reasoning that the generator renders a declared-property node as a typed model
and so a permissive annotation cannot have come from such a branch. If exactly
one candidate survives, `owner = found[0]` (`inspect_source.py:378`) accepts it
with no further corroboration — in particular, without any check that the
surviving node has any relationship to the class's own name, which the generator
*does* derive from a `title` or a `$defs` key.

That is where it breaks. Measured directly against the committed module:

```python
doc = {"$defs": {
  "X": {"type": "object", "title": "X",
        "properties": {"a": {}}, "additionalProperties": False},
  "Y": {"type": "object", "title": "Y",
        "properties": {"a": {"type": "object",
                             "properties": {"b": {"type": "string"}},
                             "additionalProperties": False}},
        "additionalProperties": False},
}}
files = {"m.py": "from typing import Any\n\n\nclass Y:\n    a: Any\n"}
inspect_generated(files, {"m.json": doc}, "enforce")   # passes
```

The report records `Y.a sanctioned m.json#/$defs/X/properties/a`. `Y.a` is a
genuine degradation — the schema constrains it to a sealed object — and it is
recorded as sanctioned, citing a pointer into `X`. `enforce` mode does not
raise, so an emission carrying this loss would be written. The narrowing rule
removed the true owner (`Y`, whose `a` declares nested `properties`) and left a
single coincidental match, and the class name `Y`, which would have settled it,
is never consulted.

This also diverges from what FR-078 states. The requirement's Behavior clause
says the inspection "SHALL attribute each finding to a schema node by mapping
the enclosing generated symbol to the `$defs` key or `title` the generator
derived it from". The implementation deliberately does the opposite and argues
in its docstring that a name-based map does not survive the generator's
renaming. That argument is correct as far as it goes, but the spec was not
amended to match, and the name is available as a *corroborator* even where it is
unusable as a key. Requiring the surviving candidate's `title`/`$defs` key to be
the class name or its `_VARIANT` stem — and classifying `unattributed` when it
is not — would close this without giving up structural matching.

The published set does not trip this today (TC-910 reports zero `degraded` and
zero `unattributed` over all five families), so this is a hole in the instrument
rather than a live misclassification. But FR-078 exists precisely to catch a
silent loss, and this is a path by which one passes silently.

## FND-1189 — the FR-080 coverage account measures something other than what it reports

FR-080-AC-3 requires every generated type in a `validating` profile to be
exercised "with at least one conforming and one non-conforming value; an
unexercised type fails the gate", and the Behavior clause requires the account
to state "the number of constraints exercised". `validate.py`'s module docstring
restates it — "exercised with a value the contract admits and, per retained
constraint, a value it forbids" — and `_exercise_pydantic`'s docstring claims "A
conforming value is built from the model's own declared requirements"
(`validate.py:61`).

None of that happens. `_exercise_pydantic` feeds exactly one value per type,
`{"__undeclared__": object()}` (`validate.py:88,90`), and records one boolean.
No conforming value is constructed anywhere; no per-constraint forbidden value
is exercised; no constraint count is produced. `_exercise_msgspec` is the same
shape with `b"{}"`. Both wrap the call in `except Exception: rejected = True`
(`validate.py:95,128`), so a `TypeError` from the unserialisable `object()`
sentinel, an import failure, or any unrelated error is recorded identically to a
contract rejection. The recorded boolean is honestly *named*
(`rejectsUndeclaredOrIncomplete`), which is the tell: it conflates "this model
seals undeclared members" with "this model has a required field", and those are
different properties.

The gate on top cannot fail. `validation.json` carries
`"unexercisedValidatingTypes": 0` as a hardcoded literal (`validate.py:202`),
and `exercisedTypes` and `validatingTypes` are both `len(exercised)`
(`validate.py:199,201`). TC-929
(`tests/test_python_backend_qualification.py:394-401`) asserts exactly those
three facts:

```python
assert row["validatingTypes"] > 0
assert row["unexercisedValidatingTypes"] == 0
assert row["exercisedTypes"] == row["validatingTypes"]
```

All three hold by construction whatever the exercise did or did not do. What
actually protects this artefact is the byte-compare in
`validate.main(["--check"])` asserted by TC-902 — a real gate, but not the one
AC-3 names, and one that cannot notice that the conforming half was never run.
TC-930's three assertions are over three hand-written example functions in
`python_backend/examples/pydantic_v2_basemodel.py`, not over the generated
types, so AC-4's "for each constraint a demonstrated family retains" is
evidenced by one type out of 89.

The in-flight uncommitted work appears to be rewriting exactly this — the
working-tree `validation.json` now reports 62 unexercised validating types and a
`constraintsExercised` count — which is consistent with the reading above: the
committed number was not a measurement.

## FND-1190 — four assertions that cannot fail

Each of these is in a gate whose name states a property the assertion does not
test.

1. **The revert gate.** `test/python-backend.test.ts:305-345`, "restores the
   tree exactly when the change is reverted" (TC-944, NFR-027-AC-12), computes
   `existedBefore` from `git ls-tree` and then asserts
   `expect(typeof existedBefore).toBe("boolean")` (line 340). That is true for
   every input. Nothing in the test performs or checks a revert; the only live
   assertions are the permitted-prefix check, which the first test in the file
   already makes.

2. **The preparation gate.** `tests/test_python_backend_adapter.py:157`:
   `assert json.dumps(raw) == SPIKE.read_text().strip() or True`. The `or True`
   makes the statement unconditionally true, so TC-863's claim that the prepared
   spike bundle "differs only by the declared rewrite" rests on the two
   assertions around it and not on this one.

3. **The network gate.** `test_generation_opens_no_socket`
   (`tests/test_python_backend_runner.py:205-217`) monkeypatches
   `socket.socket` in the *test* interpreter, runs `runner.generate(...)`, and
   asserts `opened == []`. But `generate` never runs the generator in-process —
   the subprocess boundary is the sandbox, as `generate.py`'s own docstring
   says. A patch on the parent's `socket` module is invisible to the child, and
   nothing on the parent's path opens a socket. FR-076-AC-8 and FR-076-CON-4
   therefore rest on an assertion that is true unconditionally. The property is
   defended in earnest elsewhere (`--no-allow-remote-refs`, `NETWORK_OPTIONS`,
   the absent `http`/`httpx2` extras, the proxy-free environment allow-list), so
   I have no reason to think the property is false — the *test* is hollow.
   Observing the child needs an out-of-process mechanism.

4. **The packing gate.** `test/python-backend.test.ts:352`,
   `expect(relative(root, root)).toBe("")`, is a tautology padding a test whose
   real assertion is the `npm pack --dry-run` scan above it.

## FND-1191 — `ruff check` fails, and nothing runs ruff

Run as instructed:

```
$ poetry run ruff check python_backend tests
F401 `python_backend.adapter.jcs.digest_bytes` imported but unused
  --> python_backend/runner/emit.py:23:48
F401 `pathlib.Path` imported but unused
  --> python_backend/runner/validate.py:19:21
Found 2 errors.
```

Both imports are kept alive by a discard statement — `_ = digest_bytes`
(`emit.py:337`) and `_ = Path` (`validate.py:245`) — which is a dead
module-level side effect that does not even achieve its apparent purpose, since
ruff reports the import regardless. Neither symbol is used.

The failure is invisible because no gate runs ruff. `make lint` is
`pnpm run lint`, which is `biome format` plus `tsc` plus four node `--check`
scripts; `make test` is vitest plus pytest. `.github/workflows/build-test.yml`
delegates to the shared `nodejs-actions` workflow driving those same targets.
`ruff` and `black` are declared dev dependencies with real configuration —
`select = ["E","W","F","I","TID"]`, `ban-relative-imports = "all"`,
`extend-exclude` for the generated tree — that nothing reads. The same disconnect
shows in the `# noqa: PLC0415`, `# noqa: BLE001`, `# noqa: S603` and
`# noqa: N802` comments scattered through the new modules: none of those rule
families is in `select`, so every one of those suppressions is inert. The Python
lane added a `make test-python` for pytest; it did not add the lint half.

## FND-1192 — the freeze gates stop six commits short of the tip

`tests/change_range.py` and `test/changed-paths.ts` are right about the defect
they are fixing: a range computed against a moving `origin/main` empties on
merge and accretes before it. But both are told the change's last commit is
`test/python-backend.test.ts`, and that stopped being true. Measured:

```
change_range(repo, SENTINELS) -> (c1b8807, e3f0a80)
git log --oneline origin/main..HEAD  ->  15 commits, tip 8991204
changed_paths(repo, SENTINELS)                                -> 210 paths
changed_paths(repo, SENTINELS, "python_backend/README.md")    -> []
```

`python_backend/README.md` is a file this change added (`ee9c693`), and the gate
cannot see it. Six commits (`8bb2bfc`..`8991204`) fall outside the range. TC-904
(FR-077-AC-10, "the conformance corpus is untouched"), TC-924 (FR-079-AC-7, "no
manifest or workflow changed"), TC-872 (FR-074-AC-10, the merged artefacts are
untouched) and the two NFR-027 tree gates in `test/python-backend.test.ts`
therefore judge only the first seven commits. I confirmed no violation exists
today — `git diff e3f0a80..HEAD -- conformance package.json pnpm-lock.yaml
.github` is empty — so this is a hole, not a breach. It is self-inflicted by the
sentinel choice, and it will reopen every time a commit lands after the sentinel
file.

The Python helper is also weaker than the TypeScript one it mirrors.
`changedPathsOf` folds the working tree in and subtracts `changedAfter(tip)`;
`changed_paths` (`tests/change_range.py:79`) is `git diff base..tip` alone, with
no working-tree half, so uncommitted work — of which this checkout currently has
nine files — is invisible to every Python freeze gate by construction. `_git`
also runs with `check=False` and returns `""` when git fails
(`tests/change_range.py:37`), which `changed_paths` turns into an empty list: a
git failure reads as "nothing changed" and the gate passes over nothing. The
module docstring commits to the opposite ("must fail loudly rather than assert
over nothing"), and `change_range` does honour that; `_git` does not.

## FND-1193 — declared-but-unenforced limit, and reference shapes the guard never classifies

Three smaller gaps, grouped because each is the same shape: something is
declared or claimed and nothing applies it.

- **`killGraceSeconds` is never enforced.** `limits.json:4` declares it,
  `generate.py:253` copies it into `GenerationResult.limits`, and TC-893 asserts
  it is an `int`. No code path uses it: `subprocess.run(timeout=...)` kills the
  child itself, with no `SIGTERM`-then-grace-then-`SIGKILL` sequence anywhere.
  FR-076-CON-5 is a constraint against widening a limit; a limit that is
  reported and never applied cannot be widened meaningfully either.

- **Escaping references are classified under `$ref` only.** `assert_schema_safe`
  (`guard.py:161-190`) walks every key at every position — which is right — but
  only calls `_classify_ref` when the key is literally `$ref`. `$dynamicRef` and
  `$recursiveRef` are not classified, and `_classify_ref` (`guard.py:146-159`)
  matches `..` segments only in their literal spelling, so a percent-encoded
  `%2e%2e/` traversal is not classified either. The 67-document malicious corpus
  has no case for any of the three. Whether the pinned generator resolves those
  forms is a question the corpus should answer rather than one the guard should
  assume; the guard's own comment on `NETWORK_OPTIONS` makes exactly that
  argument ("one defence that is misconfigured once is no defence").

- **`emit.check()` does not compare `generated/__init__.py`.** Every other
  emitted file is byte-compared and `NOT-QUALIFIED.md` is compared against a
  fresh render, but `generated/__init__.py` is checked for existence only
  (`emit.py:321-322`). A hand edit to it survives `--check`, which is the one
  thing FR-079-AC-4 says cannot happen.

Also recorded here, not raised: `render.py`'s agreement with biome is gated
indirectly, through `make lint` over the committed artefacts, with no direct
`render()`-versus-biome differential. That is sound for the shapes committed
today and untested for any shape a future artefact introduces.

## What is genuinely good

Worth saying, because a FAIL verdict obscures it. The `report`/`enforce` split
in FR-078 is the right instrument design and the reason a lossy family stays
*measurable*. The classifier seam (`classify=`) makes TC-917's mutation run in
CI instead of by hand, which is more than most mutation claims in this repo can
say. `generate()` cleans its scratch root in a `finally`, refuses a zero-file
output as a failure, and treats any unexpected stderr line as a failure with an
empty allow-list. The examples under `python_backend/examples/` are the model
for how a "does it reject?" assertion should be written — each `try/except`
raises `AssertionError` on fall-through instead of passing when nothing was
raised. `corpus_account.py` separates "the oracle reached a rule this surface
does not implement" from "the surface refused what the oracle accepts" and
refuses to fold the second into the first, and it says in its own artefact that
its agreement figure is not coverage.
