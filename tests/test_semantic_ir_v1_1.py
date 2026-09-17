"""pytest side of the second reader (issue #34, TC-232).

The TypeScript suite runs ``semantic_ir_reader.py --verdicts`` and compares
verdicts; these tests prove the Python reader stands on its own.
"""

from __future__ import annotations

import json

import pytest

from tests.semantic_ir_reader import (
    FIXTURE_ROOT,
    SCHEMA_ROOT,
    _is_edge_kind,
    _schema_validator,
    normalize,
    read_semantic_ir,
    schema_valid,
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
            assert schema_valid(validator, document), name
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


CONSTRUCTS = "positive/semantic-ir-v2-constructs.json"


class TestContract20:
    """Python reader over contract 2.0.0 model members and construct kinds.

    Description: TC-1740, TC-1744, TC-1745, TC-1746 and TC-1789 Python-reader
    evidence; the committed 2.0.0 positive reads clean, and each member or
    construct kind
    inside a 1.1.0 document, and each construct missing a required member, is
    refused by the schema.
    Assumptions: the poetry dev group is installed; fixtures are the committed
    ones under fixtures/semantic/v1.
    Criteria: FR-141-AC-1, FR-141-AC-5, FR-141-CON-1, FR-142-AC-1, FR-142-AC-2,
    FR-142-CON-1, FR-142-AC-8.
    """

    def test_constructs_document_validates_and_reads_clean(self, validator) -> None:
        """Criteria: FR-141-AC-1, FR-142-AC-1 (TC-1740, TC-1745)."""
        document = _fixture(CONSTRUCTS)
        assert schema_valid(validator, document)
        assert read_semantic_ir(document) == []
        first = normalize(document)
        assert normalize(json.loads(first)) == first

    def test_every_2_0_member_in_a_1_1_document_is_refused(self, validator) -> None:
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
            (
                "supertypes",
                set_type("supertypes", ["ix://agent-ix/assurance/type/Project"]),
            ),
            ("abstract", set_type("abstract", True)),
            ("subsets", set_field("subsets", [])),
            (
                "redefines",
                set_field(
                    "redefines",
                    lambda d: d["types"][record]["fields"][1]["identity"],
                ),
            ),
            (
                "frame",
                set_operation("frame", {"modifies": [], "creates": [], "deletes": []}),
            ),
            ("inline pre clause", set_operation("pre", quire)),
            ("inline post clause", set_operation("post", quire)),
            ("populations", lambda d: d.__setitem__("populations", [])),
            ("scalar any", lambda d: d["types"][scalar].__setitem__("scalar", "any")),
            (
                "construct kind",
                set_type(
                    "kind",
                    {
                        "module": "agent-ix/spec-objects-business",
                        "name": "value_object",
                    },
                ),
            ),
            ("constructs", lambda d: d.__setitem__("constructs", [])),
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
            assert not schema_valid(validator, document), f"{suffix} without {member}"

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
            assert not schema_valid(validator, document), f"{suffix} with {foreign}"

    def test_the_edge_kinds_are_the_schema_edge_kinds(self) -> None:
        """Criteria: FR-142-AC-9 (TC-1789).

        The schema refuses relationships and operations on every core kind but
        `record`; a construct kind's declaration decides them.
        """
        schema = json.loads((SCHEMA_ROOT / "semantic-ir.schema.json").read_text())
        core = schema["$defs"]["typeDefinition"]["properties"]["kind"]["anyOf"][0]
        refused = [
            branch["if"]["properties"]["kind"]["enum"]
            for branch in schema["$defs"]["typeDefinition"]["allOf"]
            if branch["then"].get("properties", {}).get("relationships") is False
            and "enum" in branch["if"]["properties"].get("kind", {})
        ]
        assert len(refused) == 1
        assert set(refused[0]) == set(core["enum"]) - {"record"}
        assert all(not _is_edge_kind(kind) for kind in refused[0])
        assert _is_edge_kind("record")
        assert _is_edge_kind({"module": "acme/parts", "name": "part"})

    def test_the_constructs_table_is_required_and_its_declarations_checked(
        self, validator
    ) -> None:
        """Criteria: FR-142-AC-9 (TC-1789)."""
        document = _fixture(CONSTRUCTS)
        del document["constructs"]
        assert not validator.is_valid(document)

        document = _fixture(CONSTRUCTS)
        entry = next(
            one
            for one in document["constructs"]
            if one["construct"].get("references", {}).get("owner")
        )
        entry["construct"]["references"]["owner"] = ["*"]
        assert not validator.is_valid(document)

        document = _fixture(CONSTRUCTS)
        document["constructs"][0]["construct"]["members"]["colour"] = "required"
        assert not validator.is_valid(document)

        document = _fixture(CONSTRUCTS)
        document["constructs"].append(
            {"kind": {"module": "acme/parts", "name": "part"}, "construct": {}}
        )
        assert not schema_valid(validator, document)

    def test_a_pre_list_mixes_clause_ids_and_inline_clauses_and_binds_only_the_ids(
        self, validator
    ) -> None:
        """Criteria: FR-141-AC-8 (TC-1795)."""
        document = _fixture(CONSTRUCTS)
        machine = next(
            i
            for i, t in enumerate(document["types"])
            if t["identity"].endswith("/type/SM-001")
        )
        operation = document["types"][machine]["operations"][0]
        assert isinstance(operation["pre"][0], str)
        assert isinstance(operation["pre"][1], dict)
        assert validator.is_valid(document)
        assert read_semantic_ir(document) == []
        operation["pre"][0] = "no_such_clause"
        assert [(d["code"], d["path"]) for d in read_semantic_ir(document)] == [
            (
                "agent-ix.semantic-ir.DANGLING_CLAUSE_REF",
                f"types.{machine}.operations.0.pre.0",
            )
        ]
        operation["pre"] = ["can_ship", operation["pre"][1], operation["pre"][1]]
        assert not validator.is_valid(document)
        operation["pre"] = ["can_ship", 7]
        assert not validator.is_valid(document)

    def test_an_inline_clause_outside_quire_is_carried_with_an_advisory(
        self, validator
    ) -> None:
        """Criteria: FR-141-AC-6, FR-141-CON-2 (TC-1759)."""
        document = _fixture(CONSTRUCTS)
        machine = next(
            i
            for i, t in enumerate(document["types"])
            if t["identity"].endswith("/type/SM-001")
        )
        operation = document["types"][machine]["operations"][0]
        assert operation["pre"][1]["language"] == "quire"
        assert read_semantic_ir(document) == []
        operation["post"][0]["language"] = "ocl"
        assert validator.is_valid(document)
        assert [d["code"] for d in read_semantic_ir(document)] == [
            "agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED"
        ]
