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
from python_backend.adapter.jcs import digest
from python_backend.adapter.prepare import Prepared
from python_backend.adapter.profiles import profile_by_id, profile_digest
from python_backend.runner.toolchain import ProvisioningError, toolchain

LIMITS_PATH = ROOT / "limits.json"


class GenerationError(RuntimeError):
    """The generator failed, timed out, warned, or wrote nothing."""


class LimitExceededError(GenerationError):
    """A declared limit was exceeded. Names the limit and its value."""


def limits() -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(LIMITS_PATH.read_text(encoding="utf-8"))
    return loaded


@dataclass
class GenerationResult:
    profile_id: str
    profile_digest: str
    input_digest: str
    toolchain_fingerprint: str
    files: dict[str, str]
    preparation: list[dict[str, str]] = field(default_factory=list)
    limits: dict[str, Any] = field(default_factory=dict)
    stderr_allow_list: list[str] = field(default_factory=list)


def _entry_point() -> list[str]:
    """The pinned generator's own console entry point.

    Resolved from distribution metadata rather than by a `PATH` lookup, so a
    shadowing `datamodel-codegen` earlier on `PATH` cannot be selected.
    """

    distribution = toolchain()["generator"]["distribution"]
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
            return [
                sys.executable,
                "-c",
                f"import sys; from {module} import {attribute} as _m; sys.exit(_m())",
            ]
    msg = f"{distribution} declares no `datamodel-codegen` console entry point"
    raise ProvisioningError(msg)


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


def toolchain_fingerprint(profile: dict[str, Any], input_digest: str) -> str:
    """Over the DECLARED toolchain only.

    Nothing the host observes enters this. A patch-level interpreter or a
    formatter bump must not move a byte-compared artefact: that is issue #42's
    coupling, and it is the reason the declared profiles use the generator's
    dependency-free `builtin` formatter and `toolchain.json` records a Python
    minor series.
    """

    declared = toolchain()
    return digest(
        {
            "generator": declared["generator"]["version"],
            "runtimes": {
                row["distribution"]: row["version"] for row in declared["runtimes"]
            },
            "typeChecker": declared["typeChecker"]["version"],
            "python": declared["python"]["minor"],
            "profileDigest": profile_digest(profile),
            "inputDigest": input_digest,
        }
    )


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
        _ = name

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

    input_digest = digest({name: payload.decode("utf-8") for name, payload in payloads.items()})
    command = _entry_point()

    scratch_parent = Path(tempfile.gettempdir())
    scratch = Path(tempfile.mkdtemp(prefix="agent-ix-python-backend-", dir=scratch_parent))
    try:
        source = scratch / "input"
        source.mkdir()
        for name, payload in payloads.items():
            (source / name).write_bytes(payload)
        target = scratch / "output"
        target.mkdir()

        argv = list(profile["options"]) + ["--input", str(source), "--output", str(target)]
        assert_argv_safe(argv)

        try:
            completed = subprocess.run(  # noqa: S603 - argv is guarded and fixed
                command + argv,
                capture_output=True,
                text=True,
                env=_environment(scratch_parent),
                cwd=str(scratch),
                timeout=declared["wallClockTimeoutSeconds"],
                check=False,
            )
        except subprocess.TimeoutExpired as error:
            msg = (
                "generation exceeded the declared wallClockTimeoutSeconds "
                f"{declared['wallClockTimeoutSeconds']}"
            )
            raise LimitExceededError(msg) from error

        if completed.returncode != 0:
            raise GenerationError(
                f"generator exited {completed.returncode}: {completed.stderr.strip()[-2000:]}"
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
            raise GenerationError("generator wrote zero files; an empty output is not a success")

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
            profile_digest=profile_digest(profile),
            input_digest=input_digest,
            toolchain_fingerprint=toolchain_fingerprint(profile, input_digest),
            files=files,
            preparation=prepared.preparation,
            limits={
                key: declared[key]
                for key in ("wallClockTimeoutSeconds", "killGraceSeconds", "maxInputBytes")
            },
            stderr_allow_list=list(declared["stderrAllowList"]),
        )
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
