"""The immutable target profiles (FR-073).

Pure: no filesystem write, no network, no clock. `load_profiles` reads the
declared document once and hands out deep copies, so a caller that mutates what
it was given cannot change what the next caller sees.
"""

from __future__ import annotations

import copy
import json
from typing import Any

from python_backend import ROOT
from python_backend.adapter.jcs import digest

PROFILES_PATH = ROOT / "profiles.json"

REQUIRED_OPTIONS: tuple[str, ...] = (
    "--disable-timestamp",
    "--strict-refs",
    "--no-allow-remote-refs",
    "--field-constraints",
    "--use-annotated",
    "--strict-nullable",
    "--use-standard-collections",
    "--use-union-operator",
)

#: Options that put caller-controlled Python in the output or load caller-
#: controlled code (FR-073-CON-2).
PROHIBITED_OPTIONS: frozenset[str] = frozenset(
    {
        "--custom-template-dir",
        "--custom-formatters",
        "--custom-formatters-kwargs",
        "--validators",
        "--additional-imports",
        "--import-overrides",
        "--type-mappings",
        "--type-overrides",
        "--extra-template-data",
        "--class-decorators",
        "--base-class",
        "--base-class-map",
        "--input-model",
        "--install-skill",
    }
)

#: Measured, not stylistic. `--extra-fields` closes a model the schema leaves
#: open; `--use-missing-sentinel` renders a value in a type position the pinned
#: type checker rejects. Both are recorded as gaps rather than adopted.
REJECTED_OPTIONS: frozenset[str] = frozenset(
    {"--extra-fields", "--use-missing-sentinel"}
)

_CACHE: dict[str, Any] | None = None


class UnknownProfileError(KeyError):
    """A generation request named a profile the declared set does not carry."""


def _document() -> dict[str, Any]:
    global _CACHE
    if _CACHE is None:
        _CACHE = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    return _CACHE


def load_profiles() -> list[dict[str, Any]]:
    return copy.deepcopy(_document()["profiles"])


def declared_python_version() -> str:
    return str(_document()["pythonVersion"])


def declared_pydantic_version() -> str:
    return str(_document()["pydanticVersion"])


def profile_ids() -> list[str]:
    return [str(profile["id"]) for profile in _document()["profiles"]]


def profile_by_id(identifier: str) -> dict[str, Any]:
    for profile in load_profiles():
        if profile["id"] == identifier:
            return profile
    msg = (
        f"no declared profile {identifier!r}; declared ids are "
        f"{', '.join(profile_ids())}"
    )
    raise UnknownProfileError(msg)


def profile_digest(profile: dict[str, Any]) -> str:
    """SHA-256 over the identity and the argument vector alone.

    `verdict` and `runtimeValidation` are excluded on purpose: FR-077 records a
    measured verdict onto the profile it measured, and a digest that covered it
    would invalidate the very verdict that cites it.
    """

    return digest(
        {
            "id": profile["id"],
            "outputModelType": profile["outputModelType"],
            "options": list(profile["options"]),
        }
    )
