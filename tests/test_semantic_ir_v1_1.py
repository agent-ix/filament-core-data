"""pytest side of the second reader (issue #34, TC-232).

The TypeScript suite runs ``semantic_ir_reader.py --verdicts`` and compares
verdicts; these tests prove the Python reader stands on its own.
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

GOLDEN = (
    "positive/semantic-ir.json",
    "positive/semantic-ir-v1-1.json",
    "positive/semantic-ir-v1-1-spec-bundle.json",
    "positive/config-version-v1-1.json",
)


@pytest.fixture(scope="module")
def validator():
    return _schema_validator()


def _fixture(name: str):
    return json.loads((FIXTURE_ROOT / name).read_text())


class TestSecondReader:
    """Independent Python reader for semantic IR 1.1.0.

    Description: TC-232 second-reader evidence for FR-020-AC-8; every golden
    document validates and reads clean, every recorded negative and reader case
    is rejected, and the normalized form matches FR-027 / FR-020-AC-7.
    Assumptions: the poetry dev group is installed; fixtures are the committed
    ones under fixtures/semantic/v1.
    Criteria: FR-020-AC-7, FR-020-AC-8, FR-027-AC-1, FR-027-AC-6, NFR-013-AC-1.
    """

    def test_golden_documents_validate_and_read_clean(self, validator) -> None:
        """Criteria: FR-020-AC-8, FR-027-AC-6 — four golden documents pass."""
        for name in GOLDEN:
            document = _fixture(name)
            assert validator.is_valid(document), name
            assert read_semantic_ir(document) == [], name

    def test_v1_document_gains_no_derived_bytes(self) -> None:
        """Criteria: FR-027 normalized-form rule, NFR-013-AC-1."""
        assert '"multiplicity"' not in normalize(_fixture("positive/semantic-ir.json"))

    def test_normalized_form_round_trips(self) -> None:
        """Criteria: FR-020-AC-7, FR-027-AC-1 — normalize is idempotent."""
        for name in GOLDEN[1:]:
            first = normalize(_fixture(name))
            assert normalize(json.loads(first)) == first, name

    def test_every_recorded_case_is_rejected(self) -> None:
        """Criteria: FR-020-AC-8 — schema and reader cases all fail as recorded."""
        seen = 0
        for verdict in verdicts():
            if verdict["id"].startswith("negative/"):
                assert verdict["schemaValid"] is False, verdict["id"]
                seen += 1
            if verdict["id"].startswith("reader/"):
                assert verdict["hit"] is True, verdict["id"]
                seen += 1
        assert seen >= 30


CONSTRUCTS = "positive/semantic-ir-v1-2-constructs.json"


class TestContract12:
    """Python reader over contract 1.2.0 model members and constructs.

    Description: TC-1740, TC-1744, TC-1745 and TC-1746 Python-reader evidence;
    the committed 1.2.0 positive reads clean, and each member or construct kind
    inside a 1.1.0 document, and each construct missing a required member, is
    refused by the schema.
    Assumptions: the poetry dev group is installed; fixtures are the committed
    ones under fixtures/semantic/v1.
    Criteria: FR-141-AC-1, FR-141-AC-5, FR-141-CON-1, FR-142-AC-1, FR-142-AC-2,
    FR-142-CON-1.
    """

    def test_constructs_document_validates_and_reads_clean(self, validator) -> None:
        """Criteria: FR-141-AC-1, FR-142-AC-1 (TC-1740, TC-1745)."""
        document = _fixture(CONSTRUCTS)
        assert validator.is_valid(document)
        assert read_semantic_ir(document) == []
        first = normalize(document)
        assert normalize(json.loads(first)) == first

    def test_every_1_2_member_in_a_1_1_document_is_refused(self, validator) -> None:
        """Criteria: FR-141-AC-5, FR-141-CON-1 (TC-1744)."""
        document = _fixture(CONSTRUCTS)
        assert validator.is_valid(document)
        document["contractVersion"] = "1.1.0"
        assert not validator.is_valid(document)

        v11 = "positive/semantic-ir-v1-1.json"
        clean = _fixture(v11)
        assert validator.is_valid(clean)
        assert read_semantic_ir(clean) == []
        record = next(
            i
            for i, t in enumerate(clean["types"])
            if t["identity"] == "ix://agent-ix/assurance/type/Artifact"
        )
        scalar = next(
            i
            for i, t in enumerate(clean["types"])
            if t["identity"] == "ix://agent-ix/assurance/type/Text"
        )
        quire = [
            {
                "language": "quire",
                "text": "true",
                "origin": clean["types"][record]["origin"],
            }
        ]

        def set_type(member, value):
            return lambda d: d["types"][record].__setitem__(member, value)

        def set_field(member, value):
            return lambda d: d["types"][record]["fields"][0].__setitem__(
                member, value(d) if callable(value) else value
            )

        def set_operation(member, value):
            return lambda d: d["types"][record]["operations"][0].__setitem__(
                member, value
            )

        mutations = (
            ("supertypes", set_type("supertypes", ["ix://agent-ix/assurance/type/Project"])),
            ("abstract", set_type("abstract", True)),
            ("subsets", set_field("subsets", [])),
            (
                "redefines",
                set_field(
                    "redefines",
                    lambda d: d["types"][record]["fields"][1]["identity"],
                ),
            ),
            ("frame", set_operation("frame", {"modifies": [], "creates": [], "deletes": []})),
            ("requires", set_operation("requires", quire)),
            ("ensures", set_operation("ensures", quire)),
            ("populations", lambda d: d.__setitem__("populations", [])),
            ("scalar any", lambda d: d["types"][scalar].__setitem__("scalar", "any")),
            ("construct kind", set_type("kind", "value_object")),
        )
        for label, mutate in mutations:
            base = _fixture(v11)
            mutate(base)
            assert not validator.is_valid(base), label

    def test_each_construct_without_a_required_member_is_refused(
        self, validator
    ) -> None:
        """Criteria: FR-142-AC-2, FR-142-CON-1 (TC-1746)."""
        for suffix, member, foreign in (
            ("FR-001", "identityFields", "owner"),
            ("VO-001", "fields", "identityFields"),
            ("NE-001", "owner", "members"),
            ("AR-001", "members", "owner"),
            ("EN-001", "variants", "fields"),
            ("EV-001", "occurrenceField", "identityFields"),
            ("SM-001", "transitions", "steps"),
            ("PR-001", "steps", "states"),
            ("RP-001", "persists", "fields"),
            ("DM-001", "vocabulary", "operations"),
        ):
            document = _fixture(CONSTRUCTS)
            target = next(
                t
                for t in document["types"]
                if t["identity"].endswith(f"/type/{suffix}")
            )
            del target[member]
            assert not validator.is_valid(document), f"{suffix} without {member}"

            document = _fixture(CONSTRUCTS)
            target = next(
                t
                for t in document["types"]
                if t["identity"].endswith(f"/type/{suffix}")
            )
            assert foreign not in target, f"{suffix} carries {foreign}"
            target[foreign] = (
                "ix://agent-ix/orders/type/FR-001" if foreign == "owner" else []
            )
            assert not validator.is_valid(document), f"{suffix} with {foreign}"
