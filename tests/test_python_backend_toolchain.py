"""Issue #23 — the pinned toolchain and its advisory floor (FR-072, TC-845..853).

Nothing here skips. When a declared distribution is absent these gates fail with
a provisioning message, because a skipped row is not coverage.

Trace ids live in each test's own docstring, which is the form this repository
already uses and the engine already binds. A `@pytest.mark.trace` is avoided on
purpose: the formatter can wrap it across lines, after which it binds nothing
and does so silently (quire-rs#395).
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from importlib import metadata

import pytest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

from python_backend.runner import toolchain as tc  # noqa: E402

TOOLCHAIN = json.loads((REPO / "python_backend" / "toolchain.json").read_text())
ADVISORIES = json.loads((REPO / "python_backend" / "advisories.json").read_text())
REFUSALS = json.loads((REPO / "python_backend" / "refusals.json").read_text())


def test_generator_version_and_licence() -> None:
    """TC-845: FR-072-AC-1, FR-072-CON-3."""
    assert tc.installed_version("datamodel-code-generator") == "0.76.0"
    dist = metadata.distribution("datamodel-code-generator")
    declared = (dist.metadata.get("License-Expression") or "") + " " + " ".join(
        dist.metadata.get_all("Classifier") or []
    )
    assert "MIT" in declared
    vendored = list((REPO / "python_backend").rglob("datamodel_code_generator"))
    assert vendored == []


def test_advisory_ranges_and_derived_floor() -> None:
    """TC-846: FR-072-AC-2."""
    ids = {row["id"] for row in ADVISORIES["advisories"]}
    assert ids == {"GHSA-386q-5hp3-95m9", "GHSA-5578-w22f-pfx9"}
    by_id = {row["id"]: row for row in ADVISORIES["advisories"]}
    assert by_id["GHSA-386q-5hp3-95m9"]["vulnerableRange"] == ">= 0.17.0, <= 0.60.1"
    assert by_id["GHSA-386q-5hp3-95m9"]["firstPatchedVersion"] == "0.60.2"
    assert by_id["GHSA-5578-w22f-pfx9"]["vulnerableRange"] == ">= 0.11.6, <= 0.63.0"
    assert by_id["GHSA-5578-w22f-pfx9"]["firstPatchedVersion"] == "0.64.0"
    assert tc.declared_floor() == "0.64.0"


@pytest.mark.parametrize(
    ("version", "advisory"),
    [
        ("0.17.0", "GHSA-386q-5hp3-95m9"),
        ("0.60.1", "GHSA-386q-5hp3-95m9"),
        ("0.11.6", "GHSA-5578-w22f-pfx9"),
        ("0.63.0", "GHSA-5578-w22f-pfx9"),
    ],
)
def test_versions_inside_a_published_range_are_refused(version: str, advisory: str) -> None:
    """TC-847: FR-072-AC-3, FR-072-CON-1."""
    verdict = tc.check_version(version)
    assert not verdict.admissible
    assert advisory in verdict.reason
    assert version in verdict.reason


def test_the_floor_is_compared_by_version_order() -> None:
    """TC-848: FR-072-AC-4.

    0.63.9 falls outside both published ranges and below the derived floor. A
    membership test would admit it; an ordered comparison does not.
    """
    assert tc.check_version("0.64.0").admissible
    outside = tc.check_version("0.63.9")
    assert not outside.admissible
    assert "below the declared floor" in outside.reason


def test_an_absent_distribution_fails_rather_than_skips() -> None:
    """TC-849: FR-072-AC-5, FR-072-CON-4."""
    with pytest.raises(tc.ProvisioningError) as raised:
        tc.installed_version("a-distribution-that-is-not-installed")
    assert "poetry install --with python-backend" in str(raised.value)


def test_every_declared_version_matches_what_is_installed() -> None:
    """TC-850: FR-072-AC-6."""
    assert tc.installed_version("datamodel-code-generator") == TOOLCHAIN["generator"]["version"]
    for row in TOOLCHAIN["runtimes"]:
        assert tc.installed_version(row["distribution"]) == row["version"]
    checker = TOOLCHAIN["typeChecker"]
    assert tc.installed_version(checker["distribution"]) == checker["version"]
    assert tc.python_minor() == TOOLCHAIN["python"]["minor"]


def test_no_http_transport_is_resolved() -> None:
    """TC-851: FR-072-AC-7."""
    assert set(ADVISORIES["forbiddenExtras"]) == {"http", "httpx2"}
    assert tc.resolved_extras() & set(ADVISORIES["forbiddenExtras"]) == set()


def test_the_merged_pins_the_record_and_the_lock_agree() -> None:
    """TC-852: FR-072-AC-8."""
    pins = (REPO / "src" / "compiler" / "backends" / "python-pins.mjs").read_text()
    assert 'DATAMODEL_CODEGEN_VERSION = "0.76.0"' in pins
    assert 'PYDANTIC_VERSION = "2.12.5"' in pins
    lock = (REPO / "poetry.lock").read_text()
    for name, version in (
        ("datamodel-code-generator", "0.76.0"),
        ("pydantic", "2.12.5"),
    ):
        assert re.search(
            rf'name = "{re.escape(name)}"\nversion = "{re.escape(version)}"', lock
        )


def test_no_host_reading_and_every_vector_key_is_refused() -> None:
    """TC-853: FR-072-AC-9, FR-072-AC-10."""
    assert TOOLCHAIN["formatter"] is None
    assert TOOLCHAIN["python"]["minor"].count(".") == 1
    profiles = json.loads((REPO / "python_backend" / "profiles.json").read_text())
    for profile in profiles["profiles"]:
        options = profile["options"]
        assert options[options.index("--formatters") + 1] == "builtin"
    refused = {row["key"] for row in REFUSALS["schemaKeys"]}
    for advisory in ADVISORIES["advisories"]:
        assert set(advisory["vectorKeys"]) <= refused
