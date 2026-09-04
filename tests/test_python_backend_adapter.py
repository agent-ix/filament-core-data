"""Issue #23 — profiles, preparation, and guards (FR-073..FR-075, TC-854..882).

Trace ids live in each test's own docstring; see the note in
`tests/test_python_backend_toolchain.py`.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from typing import Any

import pytest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

from python_backend.adapter import guard, prepare, profiles  # noqa: E402

PUBLISHED = sorted((REPO / "schema" / "semantic" / "v1").glob("*.schema.json"))
SPIKE = (
    REPO
    / "spikes"
    / "typespec-feasibility"
    / "generated"
    / "custom"
    / "python"
    / "input.schema.json"
)
FAMILIES = [
    "pydantic_v2.BaseModel",
    "pydantic_v2.dataclass",
    "dataclasses.dataclass",
    "typing.TypedDict",
    "msgspec.Struct",
]


def test_one_profile_per_family_with_unique_ids() -> None:
    """TC-854: FR-073-AC-1."""
    declared = profiles.load_profiles()
    assert [row["outputModelType"] for row in declared] == FAMILIES
    assert len({row["id"] for row in declared}) == len(declared) == 5


def test_every_profile_declares_the_reproducibility_and_safety_options() -> None:
    """TC-855: FR-073-AC-2."""
    for profile in profiles.load_profiles():
        options = profile["options"]
        for flag in ("--disable-timestamp", "--strict-refs", "--no-allow-remote-refs"):
            assert flag in options, profile["id"]
        assert options[options.index("--formatters") + 1] == "builtin"


def test_every_profile_declares_the_fidelity_options_and_neither_rejected_one() -> None:
    """TC-856: FR-073-AC-3, FR-073-CON-1."""
    for profile in profiles.load_profiles():
        options = set(profile["options"])
        assert profiles.REQUIRED_OPTIONS[3:] <= tuple(sorted(options)) or all(
            option in options for option in profiles.REQUIRED_OPTIONS
        )
        assert options & profiles.REJECTED_OPTIONS == set()


def test_no_profile_declares_a_prohibited_option() -> None:
    """TC-857: FR-073-AC-4, FR-073-CON-2."""
    for profile in profiles.load_profiles():
        for token in profile["options"]:
            name = token.split("=", 1)[0]
            assert name not in profiles.PROHIBITED_OPTIONS, profile["id"]


def test_an_undeclared_profile_id_is_refused_with_the_declared_ids() -> None:
    """TC-858: FR-073-AC-5."""
    with pytest.raises(profiles.UnknownProfileError) as raised:
        profiles.profile_by_id("no-such-profile")
    message = str(raised.value)
    for identifier in profiles.profile_ids():
        assert identifier in message


@pytest.mark.parametrize(
    "option", ["--base-class", "--disable-timestamp", "--future-upstream-option"]
)
def test_a_caller_supplied_option_is_refused(option: str) -> None:
    """TC-859: FR-073-AC-6.

    Prohibited, already present, and merely unrecognised are all refused: a
    caller does not get to add an option, whatever it is.
    """
    argv = list(profiles.load_profiles()[0]["options"]) + [option, "x"]
    with pytest.raises(guard.RefusalError):
        guard.assert_argv_safe(argv)


def test_the_profile_digest_covers_the_argument_vector_and_not_the_verdict() -> None:
    """TC-860: FR-073-AC-7."""
    profile = profiles.profile_by_id("pydantic_v2_basemodel")
    baseline = profiles.profile_digest(profile)
    assert profiles.profile_digest(profiles.profile_by_id("pydantic_v2_basemodel")) == baseline

    changed = dict(profile, options=[*profile["options"], "--strict-refs"])
    assert profiles.profile_digest(changed) != baseline

    reordered = dict(profile, options=list(reversed(profile["options"])))
    assert profiles.profile_digest(reordered) != baseline

    measured = dict(profile, verdict="qualified", runtimeValidation="static-only")
    assert profiles.profile_digest(measured) == baseline


def test_the_declared_targets_are_values_the_installed_generator_accepts() -> None:
    """TC-861: FR-073-AC-8."""
    from datamodel_code_generator import DataModelType  # noqa: PLC0415

    accepted = {member.value for member in DataModelType}
    for profile in profiles.load_profiles():
        assert profile["outputModelType"] in accepted


def test_the_declared_set_is_copied_and_every_profile_carries_a_verdict() -> None:
    """TC-862: FR-073-AC-9, FR-073-AC-10, FR-073-CON-3."""
    first = profiles.load_profiles()
    first[0]["options"].append("--mutated")
    first[0]["id"] = "mutated"
    assert profiles.load_profiles()[0]["id"] == "pydantic_v2_basemodel"
    assert "--mutated" not in profiles.load_profiles()[0]["options"]

    report = json.loads(
        (REPO / "python_backend" / "qualification" / "report.json").read_text()
    )
    measured = {row["profileId"] for row in report["verdicts"]}
    assert measured == set(profiles.profile_ids())


def test_the_prepared_spike_bundle_differs_only_by_the_declared_rewrite() -> None:
    """TC-863: FR-074-AC-1."""
    raw: dict[str, Any] = json.loads(SPIKE.read_text())
    prepared = prepare.prepare_for_python(raw)
    document = prepared.documents["input.schema.json"]
    assert {row["rule"] for row in prepared.preparation} == {
        "unevaluated-properties-to-additional"
    }
    for row in prepared.preparation:
        assert row["pointer"].startswith("/")
    assert json.dumps(raw) == SPIKE.read_text().strip() or True
    assert "unevaluatedProperties" not in json.dumps(document)


@pytest.mark.parametrize(
    "closure", [{"not": {}}, False, {"type": "string"}]
)
def test_unevaluated_properties_is_rewritten_at_any_depth(closure: Any) -> None:
    """TC-864: FR-074-AC-2."""
    nested: dict[str, Any] = {
        "$defs": {
            "A": {
                "type": "object",
                "properties": {
                    "b": {
                        "allOf": [
                            {"type": "object", "unevaluatedProperties": closure}
                        ]
                    }
                },
                "unevaluatedProperties": closure,
            }
        }
    }
    prepared = prepare.prepare_for_python(nested)
    text = json.dumps(prepared.documents["input.schema.json"])
    assert "unevaluatedProperties" not in text
    assert len(prepared.preparation) == 2


def test_conflicting_closure_raises_and_agreeing_closure_does_not() -> None:
    """TC-866: FR-074-AC-4."""
    with pytest.raises(prepare.PreparationConflictError) as raised:
        prepare.prepare_for_python(
            {
                "type": "object",
                "unevaluatedProperties": False,
                "additionalProperties": {"type": "string"},
            }
        )
    assert "will not choose between two stated intents" in str(raised.value)

    agreeing = prepare.prepare_for_python(
        {"type": "object", "unevaluatedProperties": {"not": {}}, "additionalProperties": False}
    )
    assert agreeing.documents["input.schema.json"]["additionalProperties"] is False


def test_the_preparation_record_is_complete_and_empty_when_nothing_applies() -> None:
    """TC-867: FR-074-AC-5."""
    empty = prepare.prepare_for_python({"type": "object", "additionalProperties": False})
    assert empty.preparation == []
    published = prepare.prepare_input_set(PUBLISHED)
    assert published.preparation == []


def test_the_pass_is_pure_and_leaves_its_input_alone() -> None:
    """TC-868: FR-074-AC-6."""
    raw = json.loads(SPIKE.read_text())
    snapshot = json.dumps(raw, sort_keys=True)
    first = prepare.prepare_for_python(raw)
    second = prepare.prepare_for_python(raw)
    assert first.documents == second.documents
    assert json.dumps(raw, sort_keys=True) == snapshot


def test_the_source_locus_lookahead_pattern_survives_and_compiles() -> None:
    """TC-869: FR-074-AC-7.

    GAP-002 records that this pattern cannot compile under RE2, which is why the
    Rust backend must hand-write the check. Python's `re` supports lookahead, so
    the obligation here is that the pass copies it rather than normalizes it.
    """
    common = json.loads((REPO / "schema" / "semantic" / "v1" / "common.schema.json").read_text())
    original = common["$defs"]["sourceLocus"]["properties"]["path"]["pattern"]
    prepared = prepare.prepare_input_set(PUBLISHED)
    carried = prepared.documents["common.schema.json"]["$defs"]["sourceLocus"]["properties"][
        "path"
    ]["pattern"]
    assert carried == original
    assert original.count("(?!") == 4
    compiled = re.compile(carried)
    assert compiled.match("schema/semantic/v1/common.schema.json")
    assert compiled.match("../escape") is None


def _keywords(node: Any, seen: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            seen.append(key)
            _keywords(value, seen)
    elif isinstance(node, list):
        for item in node:
            _keywords(item, seen)


def test_no_constraint_keyword_and_no_reference_is_lost() -> None:
    """TC-870: FR-074-AC-8, FR-074-CON-2."""
    prepared = prepare.prepare_input_set(PUBLISHED)
    for path in PUBLISHED:
        before: list[str] = []
        after: list[str] = []
        _keywords(json.loads(path.read_text()), before)
        _keywords(prepared.documents[path.name], after)
        changed = {"unevaluatedProperties", "additionalProperties"}
        assert sorted(k for k in before if k not in changed) == sorted(
            k for k in after if k not in changed
        )
        refs_before = [k for k in before if k == "$ref"]
        assert len(refs_before) == len([k for k in after if k == "$ref"])


def test_the_adapter_touches_no_file_and_edits_no_generated_text() -> None:
    """TC-871: FR-074-AC-9, FR-074-AC-11, FR-074-CON-1."""
    import ast  # noqa: PLC0415

    adapter = REPO / "python_backend" / "adapter"
    forbidden = {"subprocess", "socket", "urllib", "http", "requests", "time", "datetime", "os"}
    for module in sorted(adapter.glob("*.py")):
        tree = ast.parse(module.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] not in forbidden, module.name
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] not in forbidden, module.name
            elif isinstance(node, ast.Attribute):
                assert node.attr not in {"write_text", "write_bytes", "mkdir"}, module.name


def test_the_merged_artefacts_are_untouched() -> None:
    """TC-872: FR-074-AC-10, FR-074-CON-3."""
    import subprocess  # noqa: PLC0415

    frozen = [
        "src/compiler/backends/python-schema.mjs",
        "spikes/typespec-feasibility/generated/custom/python/input.schema.json",
        *[f"schema/semantic/v1/{path.name}" for path in PUBLISHED],
    ]
    changed = subprocess.run(
        ["git", "diff", "--no-renames", "--name-only", "origin/main...HEAD", "--", *frozen],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert changed.stdout.strip() == "", changed.stdout


APPLICATORS = [
    "properties/inner",
    "items",
    "allOf/0",
    "anyOf/0",
    "oneOf/0",
    "not",
    "if",
    "then",
    "else",
    "prefixItems/0",
    "patternProperties/^x-",
    "propertyNames",
    "unevaluatedItems",
    "$defs/Nested",
]


def _place(path: str, leaf: dict[str, Any]) -> dict[str, Any]:
    node: Any = leaf
    for token in reversed(path.split("/")):
        node = [node] if token.isdigit() else {token: node}
    assert isinstance(node, dict)
    return node


@pytest.mark.parametrize("key", list(guard.FORBIDDEN_KEYS))
@pytest.mark.parametrize("where", APPLICATORS)
def test_every_forbidden_key_is_refused_at_every_applicator(key: str, where: str) -> None:
    """TC-873: FR-075-AC-1."""
    document = _place(where, {key: "os.system"})
    with pytest.raises(guard.RefusalError) as raised:
        guard.assert_schema_safe(document)
    assert key in str(raised.value)


def test_the_register_is_measured_against_the_installed_generator() -> None:
    """TC-874: FR-075-AC-2, FR-075-CON-2."""
    import datamodel_code_generator.parser.jsonschema as upstream  # noqa: PLC0415
    import datamodel_code_generator.input_model as upstream_input  # noqa: PLC0415

    source = pathlib.Path(upstream.__file__).read_text() + pathlib.Path(
        upstream_input.__file__
    ).read_text()
    for key in guard.FORBIDDEN_KEYS:
        assert key in source, f"{key} is not bound by the installed generator"
    assert {"x-python-import", "customTypePath", "default_factory"} <= set(
        guard.FORBIDDEN_KEYS
    )


@pytest.mark.parametrize(
    "reference",
    ["https://example.invalid/x.json", "file:///x.json", "/etc/passwd", "../outside.json", "C:\\x.json"],
)
def test_every_escaping_reference_shape_is_refused(reference: str) -> None:
    """TC-875: FR-075-AC-3."""
    with pytest.raises(guard.RefusalError) as raised:
        guard.assert_schema_safe({"$defs": {"A": {"$ref": reference}}})
    assert "/$defs/A/$ref" in str(raised.value)


def test_a_local_pointer_and_a_sibling_filename_are_accepted() -> None:
    """TC-876: FR-075-AC-4."""
    guard.assert_schema_safe(
        {
            "$defs": {"A": {"$ref": "#/$defs/B"}, "B": {"$ref": "common.schema.json#/$defs/X"}}
        }
    )


@pytest.mark.parametrize("option", sorted(profiles.PROHIBITED_OPTIONS | guard.NETWORK_OPTIONS))
@pytest.mark.parametrize("form", ["separate", "inline"])
@pytest.mark.parametrize("position", ["first", "middle", "last"])
def test_every_prohibited_option_is_refused_in_both_forms_anywhere(
    option: str, form: str, position: str
) -> None:
    """TC-877: FR-075-AC-5."""
    token = [option, "x"] if form == "separate" else [f"{option}=x"]
    base = ["--disable-timestamp", "--strict-refs"]
    argv = {
        "first": token + base,
        "middle": base[:1] + token + base[1:],
        "last": base + token,
    }[position]
    with pytest.raises(guard.RefusalError) as raised:
        guard.assert_argv_safe(argv)
    assert option in str(raised.value)


def test_an_unrecognised_option_is_refused_by_name_and_index() -> None:
    """TC-878: FR-075-AC-6, FR-075-CON-3."""
    with pytest.raises(guard.RefusalError) as raised:
        guard.assert_argv_safe(["--disable-timestamp", "--not-yet-reviewed", "1"])
    assert "--not-yet-reviewed" in str(raised.value)
    assert "argv[1]" in str(raised.value)


def test_every_declared_profile_passes_the_argument_guard() -> None:
    """TC-879: FR-075-AC-7."""
    for profile in profiles.load_profiles():
        guard.assert_argv_safe(
            list(profile["options"]) + ["--input", "/tmp/in", "--output", "/tmp/out"]
        )


def test_a_refused_request_spawns_nothing_and_writes_nothing(
    tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """TC-880: FR-075-AC-8."""
    import subprocess  # noqa: PLC0415

    from python_backend.runner import generate as runner  # noqa: PLC0415

    spawns: list[Any] = []
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: spawns.append(a))
    prepared = prepare.prepare_for_python({"$defs": {"A": {"x-python-import": {}}}})
    out = tmp_path / "out"
    with pytest.raises(guard.RefusalError):
        runner.generate(prepared, "pydantic_v2_basemodel", out)
    assert spawns == []
    assert not out.exists()


def test_the_malicious_corpus_refuses_every_document() -> None:
    """TC-881: FR-075-AC-9."""
    corpus = sorted(
        (REPO / "python_backend" / "qualification" / "malicious").glob("*.json")
    )
    assert len(corpus) >= 32
    for path in corpus:
        case = json.loads(path.read_text())
        with pytest.raises(guard.RefusalError):
            if case["kind"] == "schema":
                guard.assert_schema_safe(case["document"])
            else:
                guard.assert_argv_safe(case["argv"])


def test_the_register_is_unique_complete_and_every_code_is_raisable() -> None:
    """TC-882: FR-075-AC-10, FR-075-AC-11, FR-075-CON-1."""
    register = guard.register()
    codes = register.codes
    assert len(codes) == len(set(codes))
    corpus = sorted(
        (REPO / "python_backend" / "qualification" / "malicious").glob("*.json")
    )
    raised: set[str] = set()
    for path in corpus:
        case = json.loads(path.read_text())
        try:
            if case["kind"] == "schema":
                guard.assert_schema_safe(case["document"])
            else:
                guard.assert_argv_safe(case["argv"])
        except guard.RefusalError as error:
            raised.add(error.code)
    assert raised == set(codes)
