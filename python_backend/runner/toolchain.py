"""Declared pins and the advisory floor (FR-072).

The floor is a version comparison, not a membership test: a version below the
greatest first-patched version fails even when it falls outside every published
range, because a range is a statement about what was known, and the floor is a
statement about what is admissible.

Nothing here reads a clock or a network, and nothing records a host-observed
patch version into a committed artefact — that is the issue #42 coupling.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from importlib import metadata
from typing import Any

from python_backend import DEPENDENCY_GROUP, ROOT

TOOLCHAIN_PATH = ROOT / "toolchain.json"
ADVISORIES_PATH = ROOT / "advisories.json"


class ProvisioningError(RuntimeError):
    """A declared tool is absent. Never a skip: a gate that skips is not a gate."""


class AdvisoryError(RuntimeError):
    """An installed version is inside a published advisory range or below the floor."""


def _read(path: Any) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def toolchain() -> dict[str, Any]:
    return _read(TOOLCHAIN_PATH)


def advisories() -> dict[str, Any]:
    return _read(ADVISORIES_PATH)


def parse_version(text: str) -> tuple[int, ...]:
    """Ordered comparison over the release segment only.

    `packaging` is not a declared dependency and a pre-release suffix has no
    meaning for a floor stated in released versions, so the release digits are
    what is compared.
    """

    parts: list[int] = []
    for chunk in text.split("."):
        digits = ""
        for character in chunk:
            if not character.isdigit():
                break
            digits += character
        if digits == "":
            break
        parts.append(int(digits))
    if not parts:
        msg = f"not a comparable version: {text!r}"
        raise ValueError(msg)
    return tuple(parts)


def declared_floor() -> str:
    """The greatest first-patched version across the declared advisories."""

    document = advisories()
    patched: list[str] = [
        str(row["firstPatchedVersion"]) for row in document["advisories"]
    ]
    return max(patched, key=parse_version)


def installed_version(distribution: str) -> str:
    try:
        return metadata.version(distribution)
    except metadata.PackageNotFoundError as error:
        msg = (
            f"{distribution} is not installed, so this gate cannot run; "
            f"install the `{DEPENDENCY_GROUP}` Poetry group with "
            f"`poetry install --with {DEPENDENCY_GROUP}`"
        )
        raise ProvisioningError(msg) from error


@dataclass(frozen=True)
class AdvisoryVerdict:
    version: str
    floor: str
    admissible: bool
    reason: str


def check_version(version: str) -> AdvisoryVerdict:
    """Decide one version against the declared advisories and the derived floor."""

    document = advisories()
    parsed = parse_version(version)
    for row in document["advisories"]:
        low = parse_version(row["introducedVersion"])
        high = parse_version(row["lastVulnerableVersion"])
        if low <= parsed <= high:
            return AdvisoryVerdict(
                version=version,
                floor=declared_floor(),
                admissible=False,
                reason=(
                    f"{version} is inside {row['id']} ({row['vulnerableRange']}); "
                    f"first patched in {row['firstPatchedVersion']}"
                ),
            )
    floor = declared_floor()
    if parsed < parse_version(floor):
        return AdvisoryVerdict(
            version=version,
            floor=floor,
            admissible=False,
            reason=(
                f"{version} is below the declared floor {floor}, which is the "
                "greatest first-patched version across the declared advisories"
            ),
        )
    return AdvisoryVerdict(
        version=version,
        floor=floor,
        admissible=True,
        reason=f"{version} is at or above the declared floor {floor}",
    )


def assert_generator_admissible() -> AdvisoryVerdict:
    """Read the installed generator's own metadata and decide it.

    The installed distribution is the authority, never `toolchain.json`: a
    record that is believed rather than checked is a record that goes stale.
    """

    distribution = toolchain()["generator"]["distribution"]
    verdict = check_version(installed_version(distribution))
    if not verdict.admissible:
        raise AdvisoryError(verdict.reason)
    return verdict


def resolved_extras() -> set[str]:
    """The generator extras the environment resolved, read from its metadata.

    An extra is reported present when **any** distribution it requires is
    importable. That is deliberately the pessimistic reading: the question this
    answers is whether a transport could be reached, and a partially installed
    extra is not a safe one. The lock file is not consulted, because what is
    installed is what matters.
    """

    distribution = toolchain()["generator"]["distribution"]
    try:
        dist = metadata.distribution(distribution)
    except metadata.PackageNotFoundError as error:
        raise ProvisioningError(str(installed_version(distribution))) from error
    present: set[str] = set()
    for requirement in dist.requires or []:
        if "extra ==" not in requirement:
            continue
        name = requirement.split(";")[0].split("[")[0].split()[0].strip()
        extra = requirement.split("extra ==")[1].strip().strip("\"'")
        try:
            metadata.version(name)
        except metadata.PackageNotFoundError:
            continue
        present.add(extra)
    return present


def python_minor() -> str:
    return "%d.%d" % sys.version_info[:2]
