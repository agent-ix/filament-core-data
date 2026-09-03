"""pytest side of the second reader (issue #34, TC-232).

Traces: TC-232; FR-020-AC-8. The TypeScript suite runs ``semantic_ir_reader.py
--verdicts`` and compares; these tests prove the Python reader stands on its own.
"""

from __future__ import annotations

import json

import pytest

from tests.semantic_ir_reader import (
    FIXTURE_ROOT,
    _schema_validator,
    normalize,
    read_semantic_ir,
    verdicts,
)


@pytest.fixture(scope="module")
def validator():
    return _schema_validator()


def _fixture(name: str):
    return json.loads((FIXTURE_ROOT / name).read_text())


def test_golden_documents_validate_and_read_clean(validator) -> None:
    for name in (
        "positive/semantic-ir.json",
        "positive/semantic-ir-v1-1.json",
        "positive/semantic-ir-v1-1-spec-bundle.json",
        "positive/config-version-v1-1.json",
    ):
        document = _fixture(name)
        assert validator.is_valid(document), name
        assert read_semantic_ir(document) == [], name


def test_v1_document_gains_no_derived_bytes() -> None:
    assert '"multiplicity"' not in normalize(_fixture("positive/semantic-ir.json"))


def test_normalized_form_round_trips() -> None:
    for name in ("positive/semantic-ir-v1-1.json", "positive/config-version-v1-1.json"):
        first = normalize(_fixture(name))
        assert normalize(json.loads(first)) == first, name


def test_every_recorded_case_is_rejected() -> None:
    for verdict in verdicts():
        if verdict["id"].startswith("negative/"):
            assert verdict["schemaValid"] is False, verdict["id"]
        if verdict["id"].startswith("reader/"):
            assert verdict["hit"] is True, verdict["id"]
