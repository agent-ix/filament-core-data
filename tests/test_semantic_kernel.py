"""The Python kernel target (issue #11, FR-087).

The issue #23 route is reached by import and edited nowhere. Exactly one
component is new — the pure reference localization of
`python_backend/kernel/localize.py` — and these tests exist to hold that line:
the guard is unmodified and unassisted, the refusal register is closed, the
profiles are frozen, and the repair is in the input.

Two measured findings are pinned here rather than silenced. F1
(`agent-ix/filament-core-data#79`) is a `StrEnum` member that shadows a `str`
method; F2 (`agent-ix/filament-core-data#125`) is `msgspec`'s refusal of four
kernel types. Both assert the measurement, so the day either is settled these
tests fail and say so instead of the resolution passing unnoticed.
"""

from __future__ import annotations

import ast
import copy
import importlib
import json
import pathlib
import subprocess
import sys
import warnings
from typing import Any

import pytest

from python_backend.adapter.guard import RefusalError, assert_schema_safe
from python_backend.adapter.prepare import prepare_documents, prepare_input_set
from python_backend.kernel import emit, localize
from python_backend.runner import emit as route
from python_backend.runner.generate import generate

REPO = pathlib.Path(__file__).resolve().parents[1]
KERNEL_SCHEMAS = REPO / "packages/semantic-core/generated/json-schema"
BACKEND = REPO / "python_backend"

#: The bundle, measured. Thirty documents carrying thirty-five absolute `$ref`s,
#: none of them with a `title`.
DOCUMENTS = 30
ABSOLUTE_REFS = 35

#: `python_backend/` paths this requirement reads and imports and may not edit
#: (FR-087-CON-7), plus `pyproject.toml` (FR-087-CON-8).
UNTOUCHABLE = (
    "python_backend/adapter",
    "python_backend/runner",
    "python_backend/qualification",
    "python_backend/generated",
    "python_backend/profiles.json",
    "python_backend/refusals.json",
    "python_backend/limits.json",
    "python_backend/toolchain.json",
    "pyproject.toml",
)


def _changed_against_main() -> set[str]:
    completed = subprocess.run(
        ["git", "diff", "--name-only", "origin/main...HEAD"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=True,
    )
    tracked = set(completed.stdout.split())
    dirty = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=True,
    )
    for line in dirty.stdout.splitlines():
        tracked.add(line[3:].strip())
    return tracked


def _refs(node: Any, out: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref" and isinstance(value, str):
                out.append(value)
            else:
                _refs(value, out)
    elif isinstance(node, list):
        for item in node:
            _refs(item, out)


# --------------------------------------------------------------------------
# TC-1058 — FR-087-CON-1, FR-087-CON-2, FR-087-CON-3
# --------------------------------------------------------------------------


def test_the_guard_the_register_and_the_published_bundle_are_untouched() -> None:
    """TC-1058: FR-087-CON-1, FR-087-CON-2, FR-087-CON-3.

    A guard weakened to admit an input is the failure this requirement exists
    to avoid, and a text patch over generated source is a hand-written
    generator by another name.
    """
    changed = _changed_against_main()

    # CON-1: nothing that decides what is admissible moved.
    for path in (
        "python_backend/adapter/guard.py",
        "python_backend/refusals.json",
        "python_backend/profiles.json",
    ):
        assert path not in changed, path

    # CON-2: the localization is in memory; the published bundle is published.
    assert not [path for path in changed if path.startswith("packages/semantic-core/")]

    # CON-3: the pass is schema-to-schema. Nothing it imports can reach
    # generated source, open a file, or run a regular expression over text.
    source = (BACKEND / "kernel/localize.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    imported = {
        node.names[0].name if isinstance(node, ast.Import) else node.module
        for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
    }
    assert imported == {
        "__future__",
        "copy",
        "dataclasses",
        "typing",
        "python_backend.adapter.prepare",
    }, sorted(imported)
    assert "write_text" not in source
    assert "read_text" not in source


# --------------------------------------------------------------------------
# TC-1059 — FR-087-CON-4, FR-087-CON-5, FR-087-CON-6
# --------------------------------------------------------------------------


def test_the_emitted_set_the_manifests_and_the_generator_are_as_declared() -> None:
    """TC-1059: FR-087-CON-4, FR-087-CON-5, FR-087-CON-6."""
    changed = _changed_against_main()

    # CON-4: no not-qualified family emits, and the verdicts were not re-run.
    report = json.loads((BACKEND / "qualification/report.json").read_text())
    refused = {
        row["profileId"]
        for row in report["verdicts"]
        if row["verdict"] == route.NOT_QUALIFIED
    }
    assert refused
    for profile_id in refused:
        assert not (emit.PACKAGES / profile_id).exists()
        with pytest.raises(emit.KernelEmitError):
            emit.build(profile_id)
    assert not [path for path in changed if path.startswith("python_backend/qualif")]

    # CON-5: no distribution manifest and no workflow names the tree.
    assert not [path for path in changed if path.startswith(".github/")]
    for manifest in (REPO / "package.json", REPO / "pyproject.toml"):
        assert "semantic-kernel" not in manifest.read_text(encoding="utf-8")

    # CON-6: one pinned, attributed, third-party generator.
    toolchain = json.loads((BACKEND / "toolchain.json").read_text())
    assert toolchain["generator"]["version"] == "0.76.0"
    assert "datamodel-code-generator" in route.UPSTREAM_ATTRIBUTION
    driver = (BACKEND / "kernel/emit.py").read_text(encoding="utf-8")
    assert "datamodel_code_generator" not in driver


# --------------------------------------------------------------------------
# TC-1060 — FR-087-CON-7, FR-087-CON-8, FR-087-AC-1
# --------------------------------------------------------------------------


def test_the_route_is_byte_identical_and_refuses_the_bundle_before_localization() -> (
    None
):
    """TC-1060: FR-087-CON-7, FR-087-CON-8, FR-087-AC-1."""
    changed = _changed_against_main()
    for prefix in UNTOUCHABLE:
        assert not [path for path in changed if path.startswith(prefix)], prefix

    paths = sorted(KERNEL_SCHEMAS.glob("*.json"))
    assert len(paths) == DOCUMENTS

    # AC-1, the negative half: the committed bundle is refused, on the scheme.
    committed = prepare_input_set(paths)
    with pytest.raises(RefusalError) as refusal:
        generate(committed, emit.demonstrated()[0])
    message = str(refusal.value)
    assert "PY-REF-010" in message
    assert "uri-scheme" in message
    assert "schemas.agent-ix.org" in message

    # AC-1, the positive half: the same guard, unmodified, admits the localized
    # bundle. `assert_schema_safe` is called here exactly as `generate` calls it.
    _, prepared = emit.prepared()
    for name, document in sorted(prepared.documents.items()):
        assert_schema_safe(document, name)


# --------------------------------------------------------------------------
# TC-1061 — FR-087-AC-2, FR-087-AC-3, FR-087-AC-4
# --------------------------------------------------------------------------


def test_localization_leaves_a_bundle_the_guards_contract_permits() -> None:
    """TC-1061: FR-087-AC-2, FR-087-AC-3, FR-087-AC-4."""
    committed = emit.documents()
    base = emit.bundle_identity()["base"]
    result = localize.localize_bundle(committed, base)

    assert sorted(result.documents) == sorted(committed)
    for name, document in result.documents.items():
        assert "$id" not in document
        assert document["title"] == localize.title_for(name)
        assert document.get("$schema") == committed[name].get("$schema")

        refs: list[str] = []
        _refs(document, refs)
        for value in refs:
            if value.startswith("#"):
                continue
            filename = value.split("#", 1)[0]
            assert filename in committed, value

        # `title` is the only keyword the pass may introduce, and no constraint
        # keyword may be deleted.
        before = set(committed[name]) - {"$id"}
        assert before - set(document) == set()
        assert set(document) - before == set() or set(document) - before == {"title"}

    # AC-3: a reference outside the declared base survives byte-identical and is
    # then refused on its own terms, rather than being localized into
    # acceptability.
    foreign = {
        "Foreign.json": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://schemas.agent-ix.org/semantic-core/0.1.0/Foreign.json",
            "type": "object",
            "properties": {"x": {"$ref": "https://example.invalid/Other.json"}},
        }
    }
    localized = localize.localize_bundle(copy.deepcopy(foreign), base).documents[
        "Foreign.json"
    ]
    assert localized["properties"]["x"]["$ref"] == "https://example.invalid/Other.json"
    with pytest.raises(RefusalError) as refusal:
        assert_schema_safe(localized, "Foreign.json")
    assert "PY-REF-010" in str(refusal.value)

    # AC-4 is asserted structurally by TC-1060; here the traversal vocabulary
    # the two passes walk must agree, or one of them silently stops localizing
    # a subschema the other still rewrites.
    from python_backend.adapter import prepare

    assert localize.SUBSCHEMA_MAPS == prepare._SUBSCHEMA_MAPS
    assert localize.SUBSCHEMA_LISTS == prepare._SUBSCHEMA_LISTS
    assert localize.SUBSCHEMA_VALUES == prepare._SUBSCHEMA_VALUES


# --------------------------------------------------------------------------
# TC-1062 — FR-087-AC-5, FR-087-AC-6, FR-087-AC-7
# --------------------------------------------------------------------------


def test_the_pass_is_pure_recorded_and_followed_by_closure() -> None:
    """TC-1062: FR-087-AC-5, FR-087-AC-6, FR-087-AC-7."""
    committed = emit.documents()
    base = emit.bundle_identity()["base"]
    snapshot = copy.deepcopy(committed)

    first = localize.localize_bundle(committed, base)
    second = localize.localize_bundle(committed, base)

    # AC-5: deep-equal on every call, inputs unmutated.
    assert first.documents == second.documents
    assert first.localization == second.localization
    assert committed == snapshot

    # AC-6: every rewrite attributable to a rule, by document and pointer, and
    # the counts are the bundle's measured counts.
    record = first.localization
    by_rule: dict[str, int] = {}
    for row in record:
        by_rule[row["rule"]] = by_rule.get(row["rule"], 0) + 1
        assert row["document"] in committed
        assert row["pointer"].startswith("/") or row["pointer"] == ""
    assert by_rule[localize.REF_RULE] == ABSOLUTE_REFS
    assert by_rule[localize.ID_RULE] == DOCUMENTS
    assert by_rule[localize.TITLE_RULE] == DOCUMENTS

    # AC-7: the FR-074 closure pass then seals every sealed object, in both
    # directions — without it the same bundle generates an open model.
    prepared = prepare_documents(first.documents)
    sealed = sum(
        1
        for document in prepared.documents.values()
        if document.get("additionalProperties") is False
    )
    assert sealed == 21
    assert not [
        name
        for name, document in first.documents.items()
        if document.get("additionalProperties") is False
    ]
    for profile_id in ("pydantic_v2_basemodel", "pydantic_v2_dataclass"):
        source = (emit.PACKAGES / profile_id / "FieldDecl.py").read_text()
        assert "extra='forbid'" in source


# --------------------------------------------------------------------------
# TC-1063 — FR-087-AC-8, FR-087-AC-9, FR-087-AC-10
# --------------------------------------------------------------------------


def test_the_emitted_families_layout_and_imports() -> None:
    """TC-1063: FR-087-AC-8, FR-087-AC-9, FR-087-AC-10."""
    report = json.loads((BACKEND / "qualification/report.json").read_text())
    qualified = sorted(emit.demonstrated())
    refused = sorted(
        row["profileId"]
        for row in report["verdicts"]
        if row["verdict"] == route.NOT_QUALIFIED
    )
    trees = sorted(
        path.name
        for path in emit.PACKAGES.iterdir()
        if path.is_dir() and path.name != "__pycache__"
    )
    assert trees == qualified

    note = (emit.PACKAGES / "NOT-QUALIFIED.md").read_text(encoding="utf-8")
    for profile_id in refused:
        assert profile_id in note
        assert route.NOT_QUALIFIED in note

    sys.path.insert(0, str(REPO / "packages/semantic-kernel"))
    try:
        for profile_id in qualified:
            tree = emit.PACKAGES / profile_id
            modules = sorted(
                path.stem for path in tree.glob("*.py") if path.name != "__init__.py"
            )
            assert len(modules) == DOCUMENTS

            # AC-9: sorted, complete, and free of every shared name.
            files = {path.name: path.read_text() for path in tree.glob("*.py")}
            exports = emit.module_exports(files)
            shared = route.collisions(exports)
            with warnings.catch_warnings():
                warnings.simplefilter("error")
                package = importlib.import_module(f"python.{profile_id}")
            declared = list(package.__all__)
            assert declared == sorted(declared)
            assert set(declared) == {
                name
                for names in exports.values()
                for name in names
                if name not in shared
            }
            provenance = json.loads((tree / "PROVENANCE.json").read_text())
            assert provenance["nameCollisions"] == shared

            # AC-10: every module imports clean, with no unresolved forward
            # reference left on any model.
            for module_name in modules:
                with warnings.catch_warnings():
                    warnings.simplefilter("error")
                    module = importlib.import_module(
                        f"python.{profile_id}.{module_name}"
                    )
                for name in emit.public_symbols(files[f"{module_name}.py"]):
                    attribute = getattr(module, name)
                    fields = getattr(attribute, "model_fields", None)
                    if fields is None:
                        continue
                    for field in fields.values():
                        assert "ForwardRef" not in repr(field.annotation), name
    finally:
        sys.path.remove(str(REPO / "packages/semantic-kernel"))


# --------------------------------------------------------------------------
# TC-1064 — FR-087-AC-11, FR-087-AC-12, FR-087-AC-13
# --------------------------------------------------------------------------


def test_provenance_type_checking_and_reproducibility(tmp_path: Any) -> None:
    """TC-1064: FR-087-AC-11, FR-087-AC-12, FR-087-AC-13.

    AC-12 is blocked by finding F1 (`agent-ix/filament-core-data#79`): FR-029's
    closed keyword vocabulary contains `format`, `StrEnum` inherits `str`, and
    the shadowing is real. The measurement is pinned rather than silenced — no
    `type: ignore`, no override, no profile change — so the day `#79` is
    settled this assertion fails and says so.
    """
    identity = emit.bundle_identity()
    for profile_id in emit.demonstrated():
        provenance = json.loads(
            (emit.PACKAGES / profile_id / "PROVENANCE.json").read_text()
        )
        source = provenance["source"]
        assert source["bundle"] == identity
        assert source["inputDigest"].startswith("sha256:")
        assert source["localization"] and source["preparation"]
        assert provenance["profile"]["id"] == profile_id
        assert provenance["profile"]["digest"].startswith("sha256:")
        assert provenance["toolchainFingerprint"].startswith("sha256:")
        assert provenance["contentFingerprint"].startswith("sha256:")
        assert provenance["generator"]["version"] == "0.76.0"
        assert provenance["generator"]["license"] == "MIT"
        assert provenance["generator"]["attribution"] == route.UPSTREAM_ATTRIBUTION
        assert provenance["generatedSourceLicense"] == "AGPL-3.0-only"
        assert provenance["published"] is False
        assert provenance["publicationGate"] == emit.PUBLICATION_GATE
        assert provenance["findings"] == emit.FINDINGS[profile_id]
        # No clock reading and no host-observed version.
        serialized = json.dumps(provenance)
        assert str(REPO) not in serialized
        for key in ("timestamp", "generatedAt", "date", "host"):
            assert key not in serialized

    # AC-12, measured: three errors, one per family, all the same finding.
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "mypy",
            "--strict",
            "--no-error-summary",
            "packages/semantic-kernel/python",
            "packages/semantic-kernel/examples/python",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
        env={
            **__import__("os").environ,
            "MYPYPATH": str(REPO / "packages/semantic-kernel"),
        },
    )
    errors = [line for line in completed.stdout.splitlines() if ": error:" in line]
    assert len(errors) == len(emit.demonstrated()), completed.stdout
    for line in errors:
        assert "ConstraintKeyword.py:20" in line, line
        assert 'base class "str" defined the type as' in line, line
    for path in emit.PACKAGES.rglob("*.py"):
        assert "type: ignore" not in path.read_text(), path
    for path in emit.EXAMPLES.glob("*.py"):
        assert "type: ignore" not in path.read_text(), path
    pyproject = (REPO / "pyproject.toml").read_text()
    assert "[[tool.mypy.overrides]]" not in pyproject
    assert "semantic-kernel" not in pyproject

    # AC-13: regeneration is byte-for-byte, and two scratch roots agree.
    first = emit.write_all(tmp_path / "a")
    second = emit.write_all(tmp_path / "b")
    assert first == second
    assert sorted(first) == sorted(emit.demonstrated())

    def tree(root: pathlib.Path) -> dict[str, str]:
        return {
            str(path.relative_to(root)): path.read_text(encoding="utf-8")
            for path in sorted(root.rglob("*"))
            if path.is_file() and "__pycache__" not in path.parts
        }

    assert tree(tmp_path / "a") == tree(tmp_path / "b")
    assert tree(tmp_path / "a") == tree(emit.PACKAGES)

    assert emit.check() == 0
    victim = emit.PACKAGES / "pydantic_v2_basemodel" / "README.md"
    original = victim.read_text(encoding="utf-8")
    try:
        victim.write_text(original + "\n", encoding="utf-8")
        assert emit.check() != 0
    finally:
        victim.write_text(original, encoding="utf-8")


# --------------------------------------------------------------------------
# TC-1065 — FR-087-AC-14, FR-087-AC-15, FR-087-AC-16
# --------------------------------------------------------------------------


def test_the_bundle_the_distribution_and_the_examples() -> None:
    """TC-1065: FR-087-AC-14, FR-087-AC-15, FR-087-AC-16."""
    # AC-14: a full generation moves no published byte.
    emit.write_all()
    changed = _changed_against_main()
    assert not [path for path in changed if path.startswith("packages/semantic-core/")]

    # AC-15: read from the packed list, not from the manifest text alone.
    packed = subprocess.run(
        ["npm", "pack", "--dry-run", "--json"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=True,
    )
    listed = json.loads(packed.stdout)
    for entry in listed:
        for row in entry["files"]:
            assert not row["path"].startswith("packages/semantic-kernel"), row["path"]

    # AC-16: each example runs, round-trips, and raises on a forbidden value.
    environment = {
        **__import__("os").environ,
        "PYTHONPATH": str(REPO / "packages/semantic-kernel"),
    }
    for profile_id in emit.demonstrated():
        example = emit.EXAMPLES / f"{profile_id}.py"
        assert example.exists(), example
        run = subprocess.run(
            [sys.executable, "-W", "error", str(example)],
            cwd=REPO,
            capture_output=True,
            text=True,
            check=False,
            env=environment,
        )
        assert run.returncode == 0, run.stdout + run.stderr


def test_msgspec_cannot_decode_four_kernel_types() -> None:
    """TC-1065: FR-087-AC-16, finding F2 (`agent-ix/filament-core-data#125`).

    Neither union shape occurs in the thirteen published documents the issue
    #23 qualification probed, so neither is a `gaps.json` row, and
    FR-087-CON-4 and FR-087-CON-7 both forbid making one from here. The loss is
    pinned instead: the day `#125` is settled this fails and says so.
    """
    msgspec = pytest.importorskip("msgspec")
    sys.path.insert(0, str(REPO / "packages/semantic-kernel"))
    try:
        undecodable = set(emit.MSGSPEC_UNION_LOSS["types"])
        refused: set[str] = set()
        for path in (emit.PACKAGES / "msgspec_struct").glob("*.py"):
            if path.name == "__init__.py":
                continue
            module = importlib.import_module(f"python.msgspec_struct.{path.stem}")
            try:
                msgspec.json.Decoder(getattr(module, path.stem))
            except TypeError:
                refused.add(path.stem)
        assert refused == undecodable
    finally:
        sys.path.remove(str(REPO / "packages/semantic-kernel"))


# --------------------------------------------------------------------------
# TC-1066 — FR-087-AC-17, FR-087-AC-18
# --------------------------------------------------------------------------


def test_the_driver_imports_the_route_and_emits_nothing_host_observed() -> None:
    """TC-1066: FR-087-AC-17, FR-087-AC-18."""
    # AC-17, the import half.
    source = (BACKEND / "kernel/emit.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    imported = {
        node.module
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module
    }
    assert "python_backend.runner.emit" in imported
    assert "python_backend.adapter.prepare" in imported
    assert "python_backend.runner.generate" in imported
    assert "python_backend.runner.inspect_source" in imported

    # AC-17, the equality half: one file map, two readings of the same rule.
    files = {
        path.name: path.read_text(encoding="utf-8")
        for path in (emit.PACKAGES / "pydantic_v2_basemodel").glob("*.py")
        if path.name != "__init__.py"
    }
    assert emit.module_exports(files) == route._module_exports(files)
    exports = emit.module_exports(files)
    assert emit.init_module(exports, "python_backend.runner.emit") == (
        route._init_module(exports)
    )
    assert emit.content_fingerprint(files) == route._content_fingerprint(files)
    for name, text in files.items():
        assert emit.public_symbols(text) == route._public_symbols(text)

    # AC-18: no clock, no host, no user, no socket anywhere in the tree.
    for path in list(emit.PACKAGES.rglob("*")) + list(emit.EXAMPLES.glob("*")):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        assert str(REPO) not in text, path
        assert "/home/" not in text, path
        for marker in ("timestamp:", "generated at", "Generated on"):
            assert marker.lower() not in text.lower(), (path, marker)
