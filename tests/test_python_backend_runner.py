"""Issue #23 — the sandboxed runner and the source inspection
(FR-076, FR-078, TC-883..894 and TC-908..917).

Trace ids live in each test's own docstring; see the note in
`tests/test_python_backend_toolchain.py`.
"""

from __future__ import annotations

import json
import pathlib
import re
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

from python_backend.adapter import guard, prepare  # noqa: E402
from python_backend.runner import generate as runner  # noqa: E402
from python_backend.runner import inspect_source  # noqa: E402

PUBLISHED = sorted((REPO / "schema" / "semantic" / "v1").glob("*.schema.json"))
SPIKE = json.loads(
    (
        REPO
        / "spikes"
        / "typespec-feasibility"
        / "generated"
        / "custom"
        / "python"
        / "input.schema.json"
    ).read_text()
)
PROFILE_IDS = [
    "pydantic_v2_basemodel",
    "pydantic_v2_dataclass",
    "stdlib_dataclass",
    "typed_dict",
    "msgspec_struct",
]


def _prepared() -> prepare.Prepared:
    return prepare.prepare_input_set(PUBLISHED)


def test_two_generations_agree_byte_for_byte() -> None:
    """TC-883: FR-076-AC-1."""
    first = runner.generate(_prepared(), "pydantic_v2_basemodel")
    second = runner.generate(_prepared(), "pydantic_v2_basemodel")
    assert first.files == second.files
    assert first.toolchain_fingerprint == second.toolchain_fingerprint


def test_no_generated_byte_carries_a_host_reading() -> None:
    """TC-884: FR-076-AC-2."""
    import getpass  # noqa: PLC0415
    import re  # noqa: PLC0415

    result = runner.generate(_prepared(), "pydantic_v2_basemodel")
    joined = "\n".join(result.files.values())
    assert str(REPO) not in joined
    assert getpass.getuser() not in joined
    assert socket.gethostname() not in joined
    assert re.search(r"\b20\d\d-\d\d-\d\d\b", joined) is None
    assert re.search(r"\b\d\d:\d\d:\d\d\b", joined) is None


@pytest.mark.parametrize(
    ("profile_id", "closed", "open_"),
    [
        ("pydantic_v2_basemodel", "extra='forbid'", "extra='allow'"),
        ("pydantic_v2_dataclass", "extra='forbid'", "extra='allow'"),
        ("typed_dict", "closed=True", "class SourceLocus(TypedDict):"),
    ],
)
def test_the_preparation_pass_is_what_keeps_a_sealed_type_sealed(
    profile_id: str, closed: str, open_: str
) -> None:
    """TC-865: FR-074-AC-3.

    The committed spike bundle is the official TypeSpec emitter's own output and
    seals its models with `unevaluatedProperties`. The pinned generator reads
    neither that keyword nor the always-false `{"not": {}}` it carries, so
    without the preparation pass every sealed contract type generates open —
    silently, in every family. This is the measurement that decides the pass
    exists, so it is asserted in both directions rather than described.
    """
    prepared = runner.generate(prepare.prepare_for_python(SPIKE), profile_id)
    unprepared = runner.generate(
        prepare.Prepared(documents={"input.schema.json": SPIKE}), profile_id
    )
    prepared_text = "\n".join(prepared.files.values())
    unprepared_text = "\n".join(unprepared.files.values())
    assert closed in prepared_text
    assert open_ in unprepared_text
    assert closed not in unprepared_text or prepared_text.count(
        closed
    ) > unprepared_text.count(closed)


def test_a_refused_schema_raises_before_any_spawn(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """TC-885: FR-076-AC-3."""
    spawns: list[Any] = []
    monkeypatch.setattr(runner, "_run", lambda *a, **k: spawns.append(a))
    hostile = prepare.prepare_for_python(
        {"$defs": {"A": {"customTypePath": "os.system"}}}
    )
    with pytest.raises(guard.RefusalError):
        runner.generate(hostile, "pydantic_v2_basemodel")
    assert spawns == []


def test_a_timeout_terminates_cleans_up_and_leaves_the_output_alone(
    tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """TC-886: FR-076-AC-4, FR-076-AC-13."""
    scratch_roots: list[pathlib.Path] = []
    real_mkdtemp = runner.tempfile.mkdtemp

    def record(*args: Any, **kwargs: Any) -> str:
        made = real_mkdtemp(*args, **kwargs)
        scratch_roots.append(pathlib.Path(made))
        return made

    monkeypatch.setattr(runner.tempfile, "mkdtemp", record)

    def timeout(*args: Any, **kwargs: Any) -> Any:
        raise subprocess.TimeoutExpired(cmd="datamodel-codegen", timeout=120)

    monkeypatch.setattr(runner, "_run", timeout)
    out = tmp_path / "out"
    with pytest.raises(runner.LimitExceededError) as raised:
        runner.generate(_prepared(), "pydantic_v2_basemodel", out)
    assert "wallClockTimeoutSeconds" in str(raised.value)
    assert str(runner.limits()["wallClockTimeoutSeconds"]) in str(raised.value)
    assert not out.exists()
    assert scratch_roots and not scratch_roots[0].exists()


def test_the_input_size_boundary(monkeypatch: pytest.MonkeyPatch) -> None:
    """TC-887: FR-076-AC-5."""
    spawns: list[Any] = []

    def record(*args: Any, **kwargs: Any) -> Any:
        spawns.append(args)
        return runner.Completed(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(runner, "_run", record)
    declared = runner.limits()["maxInputBytes"]

    def sized(target: int) -> prepare.Prepared:
        filler = "x" * max(target - 40, 1)
        return prepare.Prepared(documents={"p.schema.json": {"title": filler}})

    monkeypatch.setattr(
        runner,
        "_run",
        lambda *a, **k: runner.Completed(returncode=0, stdout="", stderr=""),
    )
    at_limit = sized(declared)
    assert (
        len(json.dumps(at_limit.documents["p.schema.json"], sort_keys=True)) <= declared
    )
    # An input of exactly the declared maximum passes the size check and reaches
    # the generator, so the failure it raises is the stub's empty output rather
    # than the limit. Asserting the *specific* error is what distinguishes
    # "proceeded" from "failed for some other reason".
    with pytest.raises(runner.GenerationError) as at_limit_error:
        runner.generate(at_limit, "pydantic_v2_basemodel")
    assert "zero files" in str(at_limit_error.value)

    over = prepare.Prepared(
        documents={"p.schema.json": {"title": "x" * (declared + 1)}}
    )
    spawns.clear()
    with pytest.raises(runner.LimitExceededError) as raised:
        runner.generate(over, "pydantic_v2_basemodel")
    assert "maxInputBytes" in str(raised.value)
    assert spawns == []


def test_zero_files_is_not_a_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """TC-888: FR-076-AC-6."""

    monkeypatch.setattr(
        runner,
        "_run",
        lambda *a, **k: runner.Completed(returncode=0, stdout="", stderr=""),
    )
    with pytest.raises(runner.GenerationError) as raised:
        runner.generate(_prepared(), "pydantic_v2_basemodel")
    assert "zero files" in str(raised.value)


def test_unexpected_standard_error_fails_the_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """TC-889: FR-076-AC-7, FR-076-CON-3."""

    monkeypatch.setattr(
        runner,
        "_run",
        lambda *a, **k: runner.Completed(
            returncode=0,
            stdout="",
            stderr="FutureWarning: the default formatters will become opt-in",
        ),
    )
    with pytest.raises(runner.GenerationError) as raised:
        runner.generate(_prepared(), "pydantic_v2_basemodel")
    assert "outside the declared allow-list" in str(raised.value)
    assert runner.limits()["stderrAllowList"] == []


def test_generation_opens_no_socket(monkeypatch: pytest.MonkeyPatch) -> None:
    """TC-890: FR-076-AC-8, FR-076-CON-4."""
    opened: list[Any] = []
    original = socket.socket

    class Recorded(original):  # type: ignore[misc,valid-type]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            opened.append(args)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(socket, "socket", Recorded)
    runner.generate(_prepared(), "pydantic_v2_basemodel")
    assert opened == []


def test_the_generator_is_resolved_through_its_distribution_not_path() -> None:
    """TC-891: FR-076-AC-9."""
    command = runner._entry_point()
    assert command[0] == sys.executable
    assert "datamodel_code_generator" in command[-1]
    assert not any(part == "datamodel-codegen" for part in command)


def test_the_subprocess_environment_is_allow_listed() -> None:
    """TC-892: FR-076-AC-10."""
    declared = runner.limits()["environmentAllowList"]
    env = runner._environment(pathlib.Path("/tmp"))
    assert set(env) == set(declared)
    for proxy in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "PYTHONPATH"):
        assert proxy not in env
    assert env["PYTHONHASHSEED"] == "0"


def test_provisioning_failure_and_declared_limits() -> None:
    """TC-893: FR-076-AC-11, FR-076-AC-14, FR-076-CON-5."""
    declared = runner.limits()
    for key in ("wallClockTimeoutSeconds", "killGraceSeconds", "maxInputBytes"):
        assert isinstance(declared[key], int)
    source = (REPO / "python_backend" / "runner" / "generate.py").read_text()
    assert "limits()[" in source
    assert '"python-backend"' not in source or "DEPENDENCY_GROUP" in source

    from python_backend.runner import toolchain as tc  # noqa: PLC0415

    with pytest.raises(tc.ProvisioningError) as raised:
        tc.installed_version("absent-distribution")
    assert "poetry install --with python-backend" in str(raised.value)


# The one module under `src/compiler/` that starts a child process by design.
#
# FR-071 requires `backends/format.mjs` to render generated text through this
# repository's exactly-pinned biome binary, exactly as
# `conformance/tools/format-json.mjs` already does for JSON, so that a committed
# generated artefact is formatted by the formatter `make lint` runs. The
# exemption is one named module rather than a widened pattern, and it is paired
# below with the assertion that no backend can reach it — which is the half that
# matters, and which a blanket "no process anywhere" never made. The JS side of
# the same gate carries the identical named exemption in `test/compiler.test.ts`.
PROCESS_STARTING = ("backends/format.mjs",)


def test_no_compiler_module_spawns_or_imports_the_generator() -> None:
    """TC-894: FR-076-AC-12, FR-076-CON-1, FR-076-CON-2."""
    compiler = REPO / "src" / "compiler"
    exempt = {compiler / relative for relative in PROCESS_STARTING}
    for permitted in exempt:
        assert permitted.is_file(), f"{permitted} is exempt but absent"
    for path in compiler.rglob("*.mjs"):
        if path in exempt:
            continue
        source = path.read_text()
        for token in ("spawn(", "execFile", "execSync", "child_process"):
            assert token not in source, f"{path} uses {token}"
    # The exempt module is unreachable from every backend, so no generation path
    # can start a process through it.
    for entrypoint in (
        "backends/typescript.mjs",
        "backends/rust.mjs",
        "backends/typescript-v1/index.mjs",
    ):
        for reached in _reachable(compiler, entrypoint):
            assert reached not in exempt, f"{entrypoint} reaches {reached}"
    runner_source = (REPO / "python_backend" / "runner" / "generate.py").read_text()
    assert "import datamodel_code_generator" not in runner_source
    assert str(REPO / "src" / "compiler") not in runner_source


def test_a_degraded_annotation_is_named_with_its_pointer() -> None:
    """TC-908: FR-078-AC-1, FR-078-CON-1."""
    document = {
        "$defs": {
            "K": {
                "type": "object",
                "title": "K",
                "properties": {"a": {"type": "string"}},
                "required": ["a"],
                "additionalProperties": False,
            }
        }
    }
    files = {"m.py": "from typing import Any\n\n\nclass K:\n    a: Any\n"}
    with pytest.raises(inspect_source.InspectionError) as raised:
        inspect_source.inspect_generated(files, {"m.json": document}, "enforce")
    message = str(raised.value)
    assert "K.a" in message
    assert "degraded" in message
    assert "m.json#" in message


@pytest.mark.parametrize(
    "node",
    [
        True,
        {},
        {"type": "object"},
        {"title": "only metadata"},
    ],
)
def test_each_sanctioned_shape_passes_in_both_modes(node: Any) -> None:
    """TC-909: FR-078-AC-2."""
    document = {
        "$defs": {"K": {"type": "object", "title": "K", "properties": {"a": node}}}
    }
    files = {"m.py": "from typing import Any\n\n\nclass K:\n    a: Any\n"}
    report = inspect_source.inspect_generated(files, {"m.json": document}, "report")
    assert [finding.classification for finding in report.findings] == ["sanctioned"]
    inspect_source.inspect_generated(files, {"m.json": document}, "enforce")


@pytest.mark.parametrize("profile_id", PROFILE_IDS)
def test_the_published_set_yields_no_degraded_or_unattributed_finding(
    profile_id: str,
) -> None:
    """TC-910: FR-078-AC-3."""
    prepared = _prepared()
    result = runner.generate(prepared, profile_id)
    report = inspect_source.inspect_generated(
        result.files, prepared.documents, "report"
    )
    census = report.census
    assert census["degraded"] == 0
    assert census["unattributed"] == 0
    for finding in report.findings:
        assert finding.pointer is not None


@pytest.mark.parametrize(
    "annotation",
    [
        "Any",
        "list[Any]",
        "dict[str, Any]",
        "str | Any",
        "Annotated[Any, 1]",
        "list[dict[str, Any]]",
    ],
)
def test_a_permissive_annotation_is_found_at_any_depth(annotation: str) -> None:
    """TC-911: FR-078-AC-4."""
    document = {
        "$defs": {
            "K": {
                "type": "object",
                "title": "K",
                "properties": {"a": {"type": "string"}},
            }
        }
    }
    files = {
        "m.py": "from typing import Annotated, Any\n\n\nclass K:\n    a: "
        + annotation
        + "\n"
    }
    report = inspect_source.inspect_generated(files, {"m.json": document}, "report")
    assert report.census["degraded"] == 1


def test_the_import_allow_list_is_closed_but_admits_siblings() -> None:
    """TC-912, TC-938: FR-078-AC-5, FR-078-CON-2, NFR-026-AC-6."""
    document = {"$defs": {}}
    with pytest.raises(inspect_source.InspectionError) as raised:
        inspect_source.inspect_generated(
            {"m.py": "import os\n"}, {"m.json": document}, "enforce"
        )
    assert "'os'" in str(raised.value)
    inspect_source.inspect_generated(
        {"m.py": "from . import other\n", "other.py": ""},
        {"m.json": document},
        "enforce",
    )


def test_a_module_level_call_other_than_model_rebuild_is_refused() -> None:
    """TC-913: FR-078-AC-6."""
    document = {"$defs": {}}
    inspect_source.inspect_generated(
        {"m.py": "class K:\n    pass\n\n\nK.model_rebuild()\n"},
        {"m.json": document},
        "enforce",
    )
    with pytest.raises(inspect_source.InspectionError) as raised:
        inspect_source.inspect_generated(
            {"m.py": "print('side effect')\n"}, {"m.json": document}, "enforce"
        )
    assert "module-level" in str(raised.value)


def test_the_inspection_never_imports_what_it_reads(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """TC-914, TC-938: FR-078-AC-7, FR-078-CON-3, NFR-026-AC-5."""
    import builtins  # noqa: PLC0415

    imported: list[str] = []
    real = builtins.__import__

    def record(name: str, *args: Any, **kwargs: Any) -> Any:
        imported.append(name)
        return real(name, *args, **kwargs)

    document = {"$defs": {"K": {"type": "object", "title": "K", "properties": {}}}}
    files = {"m.py": "from typing import Any\n\n\nclass K:\n    a: Any\n"}
    monkeypatch.setattr(builtins, "__import__", record)
    inspect_source.inspect_generated(files, {"m.json": document}, "report")
    assert "m" not in imported


def test_the_ordering_is_stable_across_presentation_order() -> None:
    """TC-915: FR-078-AC-8."""
    document = {"$defs": {"K": {"type": "object", "title": "K", "properties": {}}}}
    files = {
        "b.py": "from typing import Any\n\n\nclass K:\n    a: Any\n",
        "a.py": "from typing import Any\n\n\nclass K:\n    a: Any\n",
    }
    first = inspect_source.inspect_generated(files, {"a.json": document}, "report")
    second = inspect_source.inspect_generated(
        dict(reversed(list(files.items()))), {"a.json": document}, "report"
    )
    assert [f.module for f in first.findings] == [f.module for f in second.findings]
    assert [f.module for f in first.findings] == ["a.py", "b.py"]


def test_an_unattributable_annotation_fails_only_in_enforcing_mode() -> None:
    """TC-916: FR-078-AC-9."""
    document = {"$defs": {}}
    files = {"m.py": "from typing import Any\n\n\nclass Unknown:\n    a: Any\n"}
    report = inspect_source.inspect_generated(files, {"m.json": document}, "report")
    assert report.census["unattributed"] == 1
    with pytest.raises(inspect_source.InspectionError):
        inspect_source.inspect_generated(files, {"m.json": document}, "enforce")


def test_the_classifier_seam_falsifies_the_gate_and_variants_resolve() -> None:
    """TC-917: FR-078-AC-10, FR-078-AC-11."""
    document = {
        "$defs": {
            "K": {
                "type": "object",
                "title": "K",
                "properties": {"a": {"type": "string"}},
                "additionalProperties": False,
            }
        }
    }
    files = {"m.py": "from typing import Any\n\n\nclass K:\n    a: Any\n"}
    with pytest.raises(inspect_source.InspectionError):
        inspect_source.inspect_generated(files, {"m.json": document}, "enforce")
    relaxed = inspect_source.inspect_generated(
        files, {"m.json": document}, "enforce", classify=lambda node: True
    )
    assert relaxed.census["degraded"] == 0

    variant = {"m.py": "from typing import Any\n\n\nclass K2:\n    a: Any\n"}
    report = inspect_source.inspect_generated(variant, {"m.json": document}, "report")
    assert report.variants == {"K2": "K"}
    assert report.findings[0].variant_of == "K"


def _reachable(compiler: Path, entrypoint: str) -> set[Path]:
    """Every `.mjs` module reachable from `entrypoint` by relative import."""
    seen: set[Path] = set()
    pending = [(compiler / entrypoint).resolve()]
    while pending:
        current = pending.pop()
        if current in seen or not current.is_file():
            continue
        seen.add(current)
        for match in re.finditer(
            r'(?:from|import)\s*\(?\s*"(\.[^"]+\.mjs)"', current.read_text()
        ):
            pending.append((current.parent / match.group(1)).resolve())
    return seen
