"""Published JSON Schema (draft 2020-12) documents for the filament-core-data
semantic package contract v1.

This package's only job is to make ``v1/*.schema.json`` importable data for a
Python consumer (e.g. agent-ix/filament-core-service), the same way
``@agent-ix/semantic-schema`` makes them importable for a JS/TS consumer and
the ``agent-ix-semantic-schema`` crate makes them available to a Rust
consumer. All three packagings ship the exact same files from
``schema/semantic/v1/`` in this repository; none of them is a copy of another.
"""

from __future__ import annotations

from importlib import resources
from pathlib import Path

V1 = resources.files(__name__) / "v1"


def schema_path(filename: str) -> Path:
    """The on-disk path of a published schema file, e.g. ``"module-manifest.schema.json"``."""
    return Path(str(V1 / filename))


def schema_text(filename: str) -> str:
    """The text of a published schema file, e.g. ``"module-manifest.schema.json"``."""
    return (V1 / filename).read_text(encoding="utf-8")
