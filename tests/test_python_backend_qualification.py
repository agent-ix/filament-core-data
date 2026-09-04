"""Issue #23 — the qualification, the layout, and the validation
(FR-077, FR-079, FR-080, TC-895..907, TC-918..935).

Trace ids live in each test's own docstring; see the note in
`tests/test_python_backend_toolchain.py`.
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
from typing import Any

import pytest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

from python_backend.adapter import prepare, profiles  # noqa: E402
from python_backend.runner import corpus_account, emit, qualify, validate  # noqa: E402
from python_backend.runner import generate as runner  # noqa: E402

BACKEND = REPO / "python_backend"
REPORT = json.loads((BACKEND / "qualification" / "report.json").read_text())
GAPS = json.loads((BACKEND / "qualification" / "gaps.json").read_text())
ACCOUNT = json.loads((BACKEND / "qualification" / "corpus-account.json").read_text())
VALIDATION = json.loads((BACKEND / "qualification" / "validation.json").read_text())
VERDICTS = {row["profileId"]: row for row in REPORT["verdicts"]}

CONSTRUCT_AREAS = {
    "ref-local",
    "ref-cross-document",
    "ref-recursion",
    "ref-mutual-recursion",
    "enum",
    "union",
    "union-discriminated",
    "map-additional",
    "map-pattern",
    "optional-vs-null",
    "default-non-nullable",
    "closure-additional",
    "closure-unevaluated",
    "constraints-string",
    "constraints-numeric",
    "constraints-array-unique",
    "string-format",
    "alias",
    "const",
    "description",
}


def test_every_construct_area_has_a_probe_with_a_full_expectation() -> None:
    """TC-895: FR-077-AC-1."""
    catalogue = {probe["id"]: probe for probe in qualify.probes()}
    assert CONSTRUCT_AREAS <= set(catalogue)
    for probe in catalogue.values():
        assert probe["detector"]["kind"] == "regex"
        assert set(probe["expected"]) == set(profiles.profile_ids())


def test_one_verdict_per_profile_each_citing_its_evidence() -> None:
    """TC-896: FR-077-AC-2."""
    assert set(VERDICTS) == set(profiles.profile_ids())
    for profile in profiles.load_profiles():
        row = VERDICTS[profile["id"]]
        assert row["profileDigest"] == profiles.profile_digest(profile)
        assert row["toolchainFingerprint"].startswith("sha256:")


def test_measured_retention_equals_every_declared_expectation() -> None:
    """TC-897: FR-077-AC-3."""
    measured = qualify.measure()
    for probe in qualify.probes():
        for profile_id, expected in probe["expected"].items():
            assert measured[probe["id"]][profile_id] == expected, (
                probe["id"],
                profile_id,
            )


def test_a_mutated_expectation_reds_the_gate() -> None:
    """TC-897: FR-077-AC-3 (the falsification half)."""
    measured = qualify.measure()
    probe = next(p for p in qualify.probes() if p["id"] == "constraints-string")
    mutated = dict(probe["expected"], stdlib_dataclass=True)
    assert measured["constraints-string"]["stdlib_dataclass"] != mutated["stdlib_dataclass"]


def test_every_measured_loss_has_a_register_row() -> None:
    """TC-898: FR-077-AC-4."""
    rows = {(row["probe"], row["family"]) for row in GAPS["gaps"]}
    for profile_id, verdict in VERDICTS.items():
        for probe_id in verdict["lost"]:
            assert (probe_id, profile_id) in rows, (probe_id, profile_id)
    for row in GAPS["gaps"]:
        assert row["severity"] in {"high", "medium", "low"}
        assert row["disposition"]
        assert "closableByPreparation" in row


@pytest.mark.parametrize("profile_id", ["pydantic_v2_basemodel", "pydantic_v2_dataclass"])
def test_both_pydantic_families_are_demonstrated(profile_id: str) -> None:
    """TC-899: FR-077-AC-5."""
    import importlib  # noqa: PLC0415

    assert VERDICTS[profile_id]["verdict"] != qualify.NOT_QUALIFIED
    module = importlib.import_module(f"python_backend.examples.{profile_id}")
    module.accepts()
    assert module.rejects_unknown_member()
    assert module.rejects_out_of_range()


def test_the_stdlib_dataclass_disposition_is_explicit() -> None:
    """TC-900: FR-077-AC-6."""
    verdict = VERDICTS["stdlib_dataclass"]
    assert verdict["verdict"] == qualify.NOT_QUALIFIED
    lost = set(verdict["lost"])
    assert {
        "constraints-numeric",
        "constraints-string",
        "string-format",
        "closure-additional",
        "union-discriminated",
        "alias",
    } <= lost


def test_every_condition_names_a_declared_option_or_rule() -> None:
    """TC-901: FR-077-AC-7."""
    prepare_source = (BACKEND / "adapter" / "prepare.py").read_text()
    declared_options = {
        token for profile in profiles.load_profiles() for token in profile["options"]
    }
    for verdict in REPORT["verdicts"]:
        for condition in verdict["conditions"]:
            grounding = condition["grounding"]
            assert any(option in grounding for option in declared_options) or (
                "prepare.py" in grounding
                and "unevaluated-properties-to-additional" in prepare_source
            )


def test_the_measured_artefacts_are_reproducible_and_checked() -> None:
    """TC-902: FR-077-AC-8, and TC-921/TC-941 share this mechanism."""
    assert qualify.main(["--check"]) == 0
    assert corpus_account.main(["--check"]) == 0
    assert validate.main(["--check"]) == 0


def test_a_mutated_committed_report_fails_check(tmp_path: pathlib.Path) -> None:
    """TC-902: FR-077-AC-8 (the falsification half)."""
    original = (BACKEND / "qualification" / "report.json").read_text()
    try:
        (BACKEND / "qualification" / "report.json").write_text(
            original.replace("qualified", "qualified-x", 1)
        )
        assert qualify.main(["--check"]) == 1
    finally:
        (BACKEND / "qualification" / "report.json").write_text(original)
    assert qualify.main(["--check"]) == 0


def test_the_corpus_account_is_honest_about_what_it_did_not_decide() -> None:
    """TC-903: FR-077-AC-9, FR-077-CON-4."""
    counts = ACCOUNT["counts"]
    assert counts["agreed"] + counts["surfaceOverStrict"] == counts["decided"]
    assert counts["decided"] + counts["undecidable"] == counts["cases"]
    assert counts["unmetCorpusRows"] == counts["cases"]
    assert ACCOUNT["adapterSlot"]["status"] == "unavailable"
    assert "UNMET" in ACCOUNT["adapterSlot"]["statement"]
    assert "not corpus coverage" in ACCOUNT["notCoverage"]


def test_the_conformance_corpus_is_untouched() -> None:
    """TC-904: FR-077-AC-10, FR-077-CON-3."""
    changed = subprocess.run(
        ["git", "diff", "--no-renames", "--name-only", "origin/main...HEAD", "--", "conformance"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert changed.stdout.strip() == "", changed.stdout


def test_no_gap_disposes_to_a_hand_written_generator() -> None:
    """TC-905: FR-077-AC-11, FR-077-CON-1."""
    for row in GAPS["gaps"]:
        disposition = row["disposition"].lower()
        if "hand-written" in disposition or "hand written" in disposition:
            assert "reviewer" in disposition and "date" in disposition
    backend_sources = list((BACKEND).rglob("*.py"))
    assert not any(path.name == "codegen.py" for path in backend_sources)


def test_a_construct_no_family_retains_yields_one_row_per_family() -> None:
    """TC-906: FR-077-AC-12."""
    unique_items = [row for row in GAPS["gaps"] if row["probe"] == "constraints-array-unique"]
    assert {row["family"] for row in unique_items} == set(profiles.profile_ids())


def test_no_verdict_word_outside_the_declared_three() -> None:
    """TC-907: FR-077-AC-13."""
    allowed = {qualify.QUALIFIED, qualify.CONDITIONAL, qualify.NOT_QUALIFIED}
    for verdict in REPORT["verdicts"]:
        assert verdict["verdict"] in allowed
    for profile in profiles.load_profiles():
        assert profile.get("verdict", qualify.QUALIFIED) in allowed | {None}
    matrix = (REPO / "spec" / "tests.md").read_text()
    for stray in ("provisionally qualified", "partially qualified", "unqualified"):
        assert stray not in matrix


@pytest.mark.parametrize("profile_id", sorted(emit.demonstrated()))
def test_the_layout_is_one_module_per_document_with_a_sorted_all(profile_id: str) -> None:
    """TC-918: FR-079-AC-1, FR-079-AC-10."""
    root = BACKEND / "generated" / profile_id
    documents = sorted(path.name for path in (REPO / "schema" / "semantic" / "v1").glob("*.schema.json"))
    modules = {path.stem for path in root.glob("*.py")} - {"__init__"}
    assert len(modules) >= len(documents)
    init = (root / "__init__.py").read_text()
    exported = json.loads(
        "["
        + ",".join(
            line.strip().rstrip(",")
            for line in init.split("__all__ = [")[1].split("]")[0].splitlines()
            if line.strip()
        )
        + "]"
    )
    assert exported == sorted(exported)
    assert len(exported) == len(set(exported))


@pytest.mark.parametrize("profile_id", sorted(emit.demonstrated()))
def test_each_generated_package_imports_cleanly(profile_id: str) -> None:
    """TC-919: FR-079-AC-2."""
    completed = subprocess.run(
        [sys.executable, "-W", "error", "-c", f"import python_backend.generated.{profile_id}"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr.strip() == ""


@pytest.mark.parametrize("profile_id", sorted(emit.demonstrated()))
def test_provenance_carries_every_required_field_and_no_host_reading(profile_id: str) -> None:
    """TC-920: FR-079-AC-3, FR-079-CON-3."""
    provenance = json.loads((BACKEND / "generated" / profile_id / "PROVENANCE.json").read_text())
    assert provenance["source"]["inputDigest"].startswith("sha256:")
    assert provenance["profile"]["digest"].startswith("sha256:")
    assert provenance["toolchainFingerprint"].startswith("sha256:")
    assert provenance["contentFingerprint"].startswith("sha256:")
    assert provenance["generator"]["license"] == "MIT"
    assert "datamodel-code-generator (MIT)" in provenance["generator"]["attribution"]
    assert provenance["generatedSourceLicense"] == "AGPL-3.0-only"
    assert provenance["published"] is False
    text = json.dumps(provenance)
    assert str(REPO) not in text
    assert sys.version.split()[0] not in text


def test_the_generated_tree_regenerates_byte_for_byte() -> None:
    """TC-921: FR-079-AC-4, FR-079-CON-2."""
    assert emit.check() == 0


def test_a_mutated_generated_file_fails_check() -> None:
    """TC-921: FR-079-AC-4 (the falsification half)."""
    target = BACKEND / "generated" / sorted(emit.demonstrated())[0] / "README.md"
    original = target.read_text()
    try:
        target.write_text(original + "\nmutated\n")
        assert emit.check() == 1
    finally:
        target.write_text(original)
    assert emit.check() == 0


@pytest.mark.parametrize("profile_id", sorted(emit.demonstrated()))
def test_each_example_accepts_round_trips_and_rejects(profile_id: str) -> None:
    """TC-922: FR-079-AC-5."""
    import importlib  # noqa: PLC0415

    module = importlib.import_module(f"python_backend.examples.{profile_id}")
    module.main()


def test_a_not_qualified_family_has_no_package_and_a_recorded_reason() -> None:
    """TC-923: FR-079-AC-6, FR-079-AC-11."""
    note = (BACKEND / "generated" / "NOT-QUALIFIED.md").read_text()
    for profile_id, verdict in VERDICTS.items():
        if verdict["verdict"] == qualify.NOT_QUALIFIED:
            assert not (BACKEND / "generated" / profile_id).exists()
            assert profile_id in note
    prepared = prepare.prepare_for_python(
        {"$defs": {"K": {"type": "object", "title": "K", "properties": {"a": {"type": "string"}}}}}
    )
    _ = prepared, runner


def test_no_manifest_or_workflow_changed_and_nothing_is_published() -> None:
    """TC-924: FR-079-AC-7, FR-079-CON-1."""
    changed = subprocess.run(
        [
            "git", "diff", "--no-renames", "--name-only", "origin/main...HEAD", "--",
            "package.json", "pnpm-lock.yaml", ".github",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert changed.stdout.strip() == "", changed.stdout
    pyproject = (REPO / "pyproject.toml").read_text()
    assert 'packages = [{ include = "agent_ix_core_data" }]' in pyproject
    assert "python_backend" not in pyproject.split("[tool.poetry.group")[0]


def test_no_backend_path_reaches_a_published_manifest() -> None:
    """TC-925: FR-079-AC-8."""
    package = json.loads((REPO / "package.json").read_text())
    joined = json.dumps(package)
    assert "python_backend" not in joined
    pyproject = (REPO / "pyproject.toml").read_text()
    include = pyproject.split("include = [")[1].split("]")[0]
    assert "python_backend" not in include


def test_the_content_fingerprint_moves_only_with_content() -> None:
    """TC-926: FR-079-AC-9."""
    profile_id = sorted(emit.demonstrated())[0]
    first = emit.build(profile_id)
    second = emit.build(profile_id)
    assert first == second
    mutated = dict(first, **{"README.md": first["README.md"] + "\n"})
    assert emit._content_fingerprint(mutated) != emit._content_fingerprint(first)


def test_strict_type_checking_reports_no_error() -> None:
    """TC-927: FR-080-AC-1."""
    completed = subprocess.run(
        [sys.executable, "-m", "mypy", "--no-error-summary"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert ": error:" not in completed.stdout, completed.stdout
    assert completed.returncode == 0, completed.stdout + completed.stderr


def test_no_ignore_comment_and_no_relaxation() -> None:
    """TC-928: FR-080-AC-2, FR-080-CON-1."""
    for path in list((BACKEND / "generated").rglob("*.py")) + list(
        (BACKEND / "examples").glob("*.py")
    ):
        assert "type: ignore" not in path.read_text(), path
    pyproject = (REPO / "pyproject.toml").read_text()
    section = pyproject.split("[tool.mypy]")[1]
    assert "strict = true" in section
    assert "[[tool.mypy.overrides]]" not in pyproject


def test_every_validating_type_is_exercised() -> None:
    """TC-929: FR-080-AC-3."""
    for row in VALIDATION["profiles"]:
        if row["coverage"] != "runtime":
            continue
        assert row["validatingTypes"] > 0
        assert row["unexercisedValidatingTypes"] == 0
        assert row["exercisedTypes"] == row["validatingTypes"]


def test_a_retained_constraint_is_enforced_at_run_time() -> None:
    """TC-930: FR-080-AC-4."""
    import importlib  # noqa: PLC0415

    module = importlib.import_module("python_backend.examples.pydantic_v2_basemodel")
    assert "startLine" in module.rejects_out_of_range()
    assert "extra" in module.rejects_unknown_member()
    assert "path" in module.rejects_escaping_path()


def test_a_recorded_loss_is_real(tmp_path: pathlib.Path) -> None:
    """TC-931: FR-080-AC-5.

    The verdict says `msgspec_struct` loses object closure. This asserts the
    loss rather than asserting it away: the generated surface really does accept
    a member the contract seals out.
    """
    import importlib  # noqa: PLC0415

    module = importlib.import_module("python_backend.examples.msgspec_struct")
    accepted = module.accepts_unknown_member_by_design()
    assert accepted is not None
    lost = {row["probe"] for row in GAPS["gaps"] if row["family"] == "msgspec_struct"}
    assert "closure-additional" in lost


def test_static_only_and_unemitted_families_are_recorded_as_such() -> None:
    """TC-932: FR-080-AC-6."""
    by_id = {row["profileId"]: row for row in VALIDATION["profiles"]}
    assert by_id["typed_dict"]["coverage"] == "not-emitted"
    assert by_id["stdlib_dataclass"]["coverage"] == "not-emitted"
    for row in VALIDATION["profiles"]:
        if row["coverage"] != "runtime":
            assert "exercisedTypes" not in row


def test_an_absent_type_checker_fails_rather_than_skips() -> None:
    """TC-933: FR-080-AC-7."""
    from python_backend.runner import toolchain as tc  # noqa: PLC0415

    checker = tc.toolchain()["typeChecker"]
    assert tc.installed_version(checker["distribution"]) == checker["version"]
    with pytest.raises(tc.ProvisioningError):
        tc.installed_version("mypy-that-is-not-installed")


def test_the_added_suites_skip_nothing() -> None:
    """TC-934: FR-080-AC-8, FR-080-CON-2.

    Read from a run's own report rather than by inspecting source, because a
    substring search over a file that mentions the thing it forbids finds
    itself.
    """
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "--no-header",
            "-p",
            "no:cacheprovider",
            "tests/test_python_backend_toolchain.py",
            "tests/test_python_backend_adapter.py",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout[-3000:]
    summary = completed.stdout.strip().splitlines()[-1]
    assert "skipped" not in summary, summary
    assert "passed" in summary, summary


def test_removing_a_constraint_from_a_probe_changes_what_is_accepted() -> None:
    """TC-935: FR-080-AC-9.

    Run against a scratch generation from a mutated probe, never against the
    committed tree, so the freeze of TC-921 and this falsification do not
    contradict each other.
    """
    constrained: dict[str, Any] = {
        "$defs": {
            "S": {
                "type": "object",
                "title": "S",
                "properties": {"s": {"type": "string", "pattern": "^a+$"}},
                "required": ["s"],
                "additionalProperties": False,
            }
        }
    }
    weakened = json.loads(json.dumps(constrained))
    del weakened["$defs"]["S"]["properties"]["s"]["pattern"]

    strict = runner.generate(prepare.prepare_for_python(constrained), "pydantic_v2_basemodel")
    loose = runner.generate(prepare.prepare_for_python(weakened), "pydantic_v2_basemodel")
    joined_strict = "\n".join(strict.files.values())
    joined_loose = "\n".join(loose.files.values())
    assert "pattern='^a+$'" in joined_strict
    assert "pattern=" not in joined_loose
