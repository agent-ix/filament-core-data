"""The Python kernel target (issue #11, FR-087).

Task-122 is blocked: the backend refuses the kernel's absolute ``$ref``s, which
the official emitter produces by design. Both sides behave as specified, and
the conflict is recorded as issue #81 rather than resolved by relaxing the
guard or rewriting a published schema.

These tests pin the refusal. The day #81 is settled, they fail and say so,
rather than the resolution passing unnoticed.
"""

from __future__ import annotations

import pathlib

import pytest

from python_backend.adapter.guard import RefusalError
from python_backend.adapter.prepare import prepare_input_set
from python_backend.runner.emit import demonstrated
from python_backend.runner.generate import generate

KERNEL_SCHEMAS = pathlib.Path("packages/semantic-core/generated/json-schema")


def test_the_kernel_schemas_are_absolute_by_design() -> None:
    """TC-1061: FR-087-AC-1. The emitter writes absolute ``$id``s; the normalization is a no-op."""
    import json

    toolchain = json.loads(
        pathlib.Path("packages/semantic-core/generated/toolchain.json").read_text()
    )
    assert toolchain["normalization"]["name"] == "issue-31-absolute-id"
    assert toolchain["normalization"]["applied"] is False
    assert toolchain["base"].startswith("https://")


def test_the_backend_refuses_an_absolute_ref_scheme() -> None:
    """TC-1062: FR-087-AC-2. PY-REF-010 refuses on the scheme, the conservative reading.

    The guard cannot tell an absolute URI that would be fetched from one that
    resolves against a locally supplied ``$id``, because at the point it runs
    there is nothing to distinguish them by. Refusing is the safe half of that
    ambiguity, and issue #81 is where the distinction gets made.
    """
    paths = sorted(KERNEL_SCHEMAS.glob("*.json"))
    assert len(paths) == 30

    # The input set prepares: the refusal is not about reading the documents,
    # it is about what generation would have to resolve.
    prepared = prepare_input_set(paths)
    assert len(prepared.documents) == 30

    with pytest.raises(RefusalError) as refusal:
        generate(prepared, demonstrated()[0])

    message = str(refusal.value)
    assert "PY-REF-010" in message
    assert "uri-scheme" in message
    assert "schemas.agent-ix.org" in message
