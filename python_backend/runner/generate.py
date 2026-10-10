"""The sandboxed generator runner (FR-076).

The schema is potentially executable input, so the boundary is mechanical:
the guards run first, in this interpreter, before anything is spawned; the
generator runs as a subprocess of the running interpreter, resolved through its
own distribution entry point rather than through `PATH`; it sees an allow-listed
environment and a scratch root this module creates and removes; and its output
reaches the caller-named path only after the enforcing inspection has passed.

The generator is never imported in-process. The subprocess boundary *is* the
sandbox, and an in-process call would put schema-driven code execution in the
test interpreter.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from importlib import metadata
from pathlib import Path
from typing import Any

from python_backend import DEPENDENCY_GROUP, ROOT
from python_backend.adapter.guard import assert_argv_safe, assert_schema_safe
from python_backend.adapter.prepare import Prepared
from python_backend.adapter.profiles import profile_by_id
from python_backend.runner.toolchain import GENERATOR_DISTRIBUTION, ProvisioningError

LIMITS_PATH = ROOT / "limits.json"


class GenerationError(RuntimeError):
    """The generator failed, timed out, warned, or wrote nothing."""


class LimitExceededError(GenerationError):
    """A declared limit was exceeded. Names the limit and its value."""


def _class_name(definition: str) -> str:
    """Match datamodel-codegen's class spelling for a ``$defs`` key."""

    return "".join(
        part[:1].upper() + part[1:]
        for part in re.split(r"[^A-Za-z0-9]+", definition)
        if part
    )


def _conditional_rules(
    documents: dict[str, dict[str, Any]],
) -> dict[str, list[tuple[int, int]]]:
    """Find numeric conditional bounds the generator cannot express itself.

    The pinned datamodel-code-generator preserves each property's scalar bounds
    but drops cross-property ``if``/``then`` constraints.  Keep the source
    schema as the authority and return only the precise ``const`` to
    ``maximum`` rules that can be rendered into the generated class.
    """

    rules: dict[str, list[tuple[int, int]]] = {}
    for document in documents.values():
        definitions = document.get("$defs", {})
        if not isinstance(definitions, dict):
            continue
        for definition, schema in definitions.items():
            if not isinstance(schema, dict):
                continue
            for clause in schema.get("allOf", []):
                if not isinstance(clause, dict):
                    continue
                condition = clause.get("if", {})
                consequent = clause.get("then", {})
                guarded = condition.get("properties", {})
                bounded = consequent.get("properties", {})
                if len(guarded) != 1 or len(bounded) != 1:
                    continue
                guarded_name, guarded_schema = next(iter(guarded.items()))
                bounded_name, bounded_schema = next(iter(bounded.items()))
                if (
                    not isinstance(guarded_schema, dict)
                    or not isinstance(bounded_schema, dict)
                    or not isinstance(guarded_schema.get("const"), int)
                    or not isinstance(bounded_schema.get("maximum"), int)
                ):
                    continue
                if guarded_name != "precision" or bounded_name != "scale":
                    continue
                rules.setdefault(_class_name(definition), []).append(
                    (guarded_schema["const"], bounded_schema["maximum"])
                )
    return rules


def _insert_after_class(source: str, class_name: str, method: str) -> str:
    """Insert a generated validation method at the end of one class."""

    marker = f"class {class_name}"
    start = source.find(marker)
    if start < 0:
        return source
    end = source.find("\nclass ", start + len(marker))
    if end < 0:
        end = len(source)
    block = source[start:end].rstrip()
    return source[:start] + block + "\n\n" + method + "\n\n" + source[end:].lstrip("\n")


def _preserve_conditional_constraints(
    files: dict[str, str], documents: dict[str, dict[str, Any]], profile_id: str
) -> dict[str, str]:
    """Restore conditional numeric constraints omitted by the pinned generator."""

    rules = _conditional_rules(documents)
    if not rules or profile_id not in {
        "pydantic_v2_basemodel",
        "pydantic_v2_dataclass",
        "msgspec_struct",
    }:
        return files

    patched = dict(files)
    for name, source in files.items():
        if not name.endswith(".py"):
            continue
        applicable = {
            class_name: values
            for class_name, values in rules.items()
            if f"class {class_name}" in source
        }
        for class_name, values in applicable.items():
            checks = "\n".join(
                "        if self.precision == "
                f"{precision} and self.scale > {maximum}:\n"
                "            raise ValueError("
                f'"scale must be <= precision ({maximum})")'
                for precision, maximum in values
            )
            if profile_id == "msgspec_struct":
                method = "    def __post_init__(self) -> None:\n" + checks
            else:
                if "model_validator" not in source:
                    source = source.replace(
                        "from pydantic import ",
                        "from pydantic import model_validator\nfrom pydantic import ",
                        1,
                    )
                method = (
                    '    @model_validator(mode="after")\n'
                    "    def _validate_"
                    f"{class_name[0].lower() + class_name[1:]}"
                    f"(self) -> {class_name}:\n" + checks + "\n        return self"
                )
            source = _insert_after_class(source, class_name, method)
        patched[name] = source
    return patched


def limits() -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(LIMITS_PATH.read_text(encoding="utf-8"))
    return loaded


@dataclass
class GenerationResult:
    profile_id: str
    files: dict[str, str]
    preparation: list[dict[str, str]] = field(default_factory=list)
    limits: dict[str, Any] = field(default_factory=dict)
    stderr_allow_list: list[str] = field(default_factory=list)


def _entry_point() -> list[str]:
    """The pinned generator's own console entry point.

    Resolved from distribution metadata rather than by a `PATH` lookup, so a
    shadowing `datamodel-codegen` earlier on `PATH` cannot be selected.
    """

    distribution = GENERATOR_DISTRIBUTION
    try:
        dist = metadata.distribution(distribution)
    except metadata.PackageNotFoundError as error:
        msg = (
            f"{distribution} is not installed, so generation cannot run; "
            f"install the `{DEPENDENCY_GROUP}` Poetry group with "
            f"`poetry install --with {DEPENDENCY_GROUP}`"
        )
        raise ProvisioningError(msg) from error
    for entry in dist.entry_points:
        if entry.group == "console_scripts" and entry.name == "datamodel-codegen":
            module, _, attribute = entry.value.partition(":")
            # The socket guard is installed IN THE CHILD, before the generator is
            # imported. Patching `socket.socket` in the parent asserts nothing:
            # the generator runs in a subprocess and never sees the parent's
            # module table. This makes the no-network property a property of the
            # sandbox rather than of a test, and the test then observes the
            # child's own refusal.
            guard = (
                "import socket, sys\n"
                "def _no_network(*a, **k):\n"
                "    raise OSError('agent-ix: generation opened a socket')\n"
                "socket.socket = _no_network\n"
                "socket.create_connection = _no_network\n"
                "socket.socketpair = _no_network\n"
                f"from {module} import {attribute} as _m\n"
                "sys.exit(_m())\n"
            )
            return [sys.executable, "-c", guard]
    msg = f"{distribution} declares no `datamodel-codegen` console entry point"
    raise ProvisioningError(msg)


@dataclass
class Completed:
    returncode: int
    stdout: str
    stderr: str


def _run(
    argv: list[str],
    *,
    env: dict[str, str],
    cwd: str,
    timeout: int,
    grace: int,
) -> Completed:
    """Run the generator, terminating then killing it if it overruns.

    `subprocess.run(timeout=…)` sends a kill and waits forever; the declared
    `killGraceSeconds` only means something if a terminate precedes it, so the
    process is driven directly rather than through the convenience wrapper.
    """

    process = subprocess.Popen(  # noqa: S603 - argv is guarded and fixed
        argv,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        cwd=cwd,
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.terminate()
        try:
            process.communicate(timeout=grace)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate()
        raise
    return Completed(returncode=process.returncode, stdout=stdout, stderr=stderr)


def _environment(scratch_parent: Path) -> dict[str, str]:
    declared = limits()["environmentAllowList"]
    env: dict[str, str] = {}
    for name, value in declared.items():
        if name == "PATH":
            env["PATH"] = os.environ.get("PATH", "")
        elif name == "TMPDIR":
            env["TMPDIR"] = str(scratch_parent)
        else:
            env[name] = str(value)
    return env


def generate(
    prepared: Prepared,
    profile_id: str,
    out_dir: Path | None = None,
    *,
    inspect: Any = None,
) -> GenerationResult:
    """Generate one package from a prepared input set under one declared profile.

    `inspect` is the enforcing inspection callable. When given, it runs over the
    generated file map before anything is written to `out_dir`, so a package that
    degrades a constraint is never written and then imported.
    """

    profile = profile_by_id(profile_id)
    for name, document in prepared.documents.items():
        assert_schema_safe(document, "")

    declared = limits()
    payloads = {
        name: json.dumps(document, sort_keys=True, ensure_ascii=False).encode("utf-8")
        for name, document in prepared.documents.items()
    }
    total = sum(len(payload) for payload in payloads.values())
    if total > declared["maxInputBytes"]:
        msg = (
            f"input set is {total} bytes, over the declared maxInputBytes "
            f"{declared['maxInputBytes']}"
        )
        raise LimitExceededError(msg)

    command = _entry_point()

    scratch_parent = Path(tempfile.gettempdir())
    scratch = Path(
        tempfile.mkdtemp(prefix="agent-ix-python-backend-", dir=scratch_parent)
    )
    try:
        source = scratch / "input"
        source.mkdir()
        for name, payload in payloads.items():
            (source / name).write_bytes(payload)
        target = scratch / "output"
        target.mkdir()

        argv = list(profile["options"]) + [
            "--input",
            str(source),
            "--output",
            str(target),
        ]
        assert_argv_safe(argv)

        try:
            completed = _run(
                command + argv,
                env=_environment(scratch_parent),
                cwd=str(scratch),
                timeout=declared["wallClockTimeoutSeconds"],
                grace=declared["killGraceSeconds"],
            )
        except subprocess.TimeoutExpired as error:
            msg = (
                "generation exceeded the declared wallClockTimeoutSeconds "
                f"{declared['wallClockTimeoutSeconds']}"
            )
            raise LimitExceededError(msg) from error

        if completed.returncode != 0:
            raise GenerationError(
                f"generator exited {completed.returncode}: "
                f"{completed.stderr.strip()[-2000:]}"
            )
        noise = [
            line
            for line in completed.stderr.splitlines()
            if line.strip() and line.strip() not in declared["stderrAllowList"]
        ]
        if noise:
            raise GenerationError(
                "generator wrote to standard error outside the declared allow-list "
                f"{declared['stderrAllowList']}: {noise[:5]}"
            )

        files = {
            str(path.relative_to(target)): path.read_text(encoding="utf-8")
            for path in sorted(target.rglob("*"))
            if path.is_file()
        }
        if not files:
            raise GenerationError(
                "generator wrote zero files; an empty output is not a success"
            )

        files = _preserve_conditional_constraints(files, prepared.documents, profile_id)

        if inspect is not None:
            inspect(files, prepared.documents)

        if out_dir is not None:
            if out_dir.exists():
                shutil.rmtree(out_dir)
            out_dir.mkdir(parents=True)
            for name, text in files.items():
                destination = out_dir / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text(text, encoding="utf-8")

        return GenerationResult(
            profile_id=profile_id,
            files=files,
            preparation=prepared.preparation,
            limits={
                key: declared[key]
                for key in (
                    "wallClockTimeoutSeconds",
                    "killGraceSeconds",
                    "maxInputBytes",
                )
            },
            stderr_allow_list=list(declared["stderrAllowList"]),
        )
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
