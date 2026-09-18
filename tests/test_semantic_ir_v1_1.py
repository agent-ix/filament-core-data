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
    "positive/semantic-ir-v1-1.json",
    "positive/semantic-ir-v1-1-spec-bundle.json",
)

# `normalize` (`tests/semantic_ir_reader.py`) materializes `nullable`
# unconditionally — it does not gate on `contractVersion` and never derives
# `multiplicity` from `presence` — so this exercises the round-trip property
# (FR-020-AC-7) over a field carrying `presence` with no `multiplicity`,
# which normalize leaves absent rather than defaulting.
MULTIPLICITY_OMITTED = {
    "contractVersion": "2.0.0",
    "types": [
        {
            "kind": "record",
            "fields": [{"name": "a", "presence": "optional"}],
        }
    ],
}


@pytest.fixture(scope="module")
def validator():
    return _schema_validator()


def _fixture(name: str):
    return json.loads((FIXTURE_ROOT / name).read_text())


class TestSecondReader:
    """Independent Python reader for semantic IR.

    Description: TC-232 second-reader evidence for FR-020-AC-8; every golden
    document validates and reads clean, every recorded negative and reader
    case is rejected, and the normalized form matches FR-027 / FR-020-AC-7.
    `2.0.0` is the only supported contract; a document declaring another is
    refused, asserted in `TestContract20` (TC-1756, NFR-044-AC-1), not here.
    `normalize` does not gate on `contractVersion` at all; `MULTIPLICITY_OMITTED`
    below is a round-trip fixture over a field missing `multiplicity`, not a
    test of a version gate.
    Assumptions: the poetry dev group is installed; fixtures are the committed
    ones under fixtures/semantic/v1.
    Criteria: FR-020-AC-7, FR-020-AC-8, FR-027-AC-1, FR-027-AC-6.
    """

    def test_golden_documents_validate_and_read_clean(self, validator) -> None:
        """Criteria: FR-020-AC-8, FR-027-AC-6 — every golden document ported
        to contract `2.0.0` passes."""
        for name in GOLDEN:
            document = _fixture(name)
            assert schema_valid(validator, document), name
            assert read_semantic_ir(document) == [], name

    def test_normalized_form_round_trips(self) -> None:
        """Criteria: FR-020-AC-7, FR-027-AC-1 — normalize is idempotent."""
        for name in GOLDEN:
            first = normalize(_fixture(name))
            assert normalize(json.loads(first)) == first, name
        first = normalize(MULTIPLICITY_OMITTED)
        assert normalize(json.loads(first)) == first

    def test_normalize_never_derives_multiplicity_from_presence(self) -> None:
        """Criteria: FR-027-AC-1 — `multiplicity` and `presence` are
        schema-required and independently authored; a field carrying
        `presence` with no `multiplicity` stays that way through `normalize`
        rather than gaining an invented value."""
        first = normalize(MULTIPLICITY_OMITTED)
        field = json.loads(first)["types"][0]["fields"][0]
        assert "multiplicity" not in field
        assert field["presence"] == "optional"
        assert field["nullable"] is False

    def test_materializes_nullable_is_true_only_fcd_187(self) -> None:
        """fcd#187: `normalize` materializes `nullable` to a literal boolean
        only where the authored member `is True`, never by truthiness
        coercion. `fixtures/semantic/v1/nullable-truthiness-cases.json` is
        the shared cross-language fixture the Rust (`normalize::tests`), the
        compiler frontend (`test/compiler-core.test.ts`), and the TypeScript
        backend (`test/typescript-backend.test.ts`) tests consume
        identically, so a divergence in any one language's coercion rule
        fails only that language's own test."""
        fixture = json.loads(
            (FIXTURE_ROOT / "nullable-truthiness-cases.json").read_text()
        )
        cases = fixture["cases"]
        assert len(cases) == 5
        for case in cases:
            field = {
                "name": "a",
                "presence": "required",
                "multiplicity": {"lower": 1, "upper": 1},
            }
            if "raw" in case:
                field["nullable"] = case["raw"]
            document = {
                "contractVersion": "2.0.0",
                "types": [
                    {
                        "identity": "ix://a/b/type/T",
                        "kind": "record",
                        "fields": [field],
                    }
                ],
            }
            normalized_field = json.loads(normalize(document))["types"][0][
                "fields"
            ][0]
            assert normalized_field["nullable"] is case["normalized"], case["id"]

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

    Description: TC-1740, TC-1745, TC-1746, TC-1756 and TC-1789 Python-reader
    evidence; the committed 2.0.0 positive reads clean, each construct
    missing a required member is refused by the schema, and a document
    declaring any contract other than `2.0.0` is refused too.
    Assumptions: the poetry dev group is installed; fixtures are the committed
    ones under fixtures/semantic/v1.
    Criteria: FR-141-AC-1, FR-142-AC-1, FR-142-AC-2, FR-142-CON-1, FR-142-AC-8,
    NFR-044-AC-1.
    """

    def test_constructs_document_validates_and_reads_clean(self, validator) -> None:
        """Criteria: FR-141-AC-1, FR-142-AC-1 (TC-1740, TC-1745)."""
        document = _fixture(CONSTRUCTS)
        assert schema_valid(validator, document)
        assert read_semantic_ir(document) == []
        first = normalize(document)
        assert normalize(json.loads(first)) == first

    def test_a_ported_fixture_validates_and_a_deleted_contract_fixture_is_refused(
        self, validator
    ) -> None:
        """fcd#179 deleted contracts `1.0.0` and `1.1.0`; `2.0.0` is the only
        one. This test once mutated a `1.1.0`-declared document by adding one
        FR-141 model member or construct kind at a time and asserted the
        schema refused it. `semantic-ir-v1-1.json` is now itself a `2.0.0`
        document (fcd#179 ported it, mirroring the Rust `tc_1756` fix in
        `crates/extraction-frontend/tests/constructs.rs`), so every one of
        those members is a legitimate `2.0.0` addition and the mutated
        documents would validate: there is no `1.1.0` document left to refuse
        a member inside. A document declaring any other `contractVersion` is
        refused wholesale, before a reader ever evaluates a member, by
        FR-050's `contractVersion` rule — so "does member X trigger refusal
        in an old document" is no longer distinguishable from "is this
        document's contractVersion wrong at all", which is already covered
        elsewhere (FR-050's own tests). A restated version of the old
        assertion would pass regardless of which member was mutated in,
        which is the tautology this fix must not manufacture. FR-141-CON-1
        and FR-141-AC-5 (TC-1744) are deleted with it: neither has a
        surviving, non-vacuous subject to test.

        Criteria: NFR-044-AC-1 (TC-1756).
        """
        v11 = "positive/semantic-ir-v1-1.json"
        clean = _fixture(v11)
        assert validator.is_valid(clean)
        assert read_semantic_ir(clean) == []
        # NFR-044-AC-1: a document still declaring the deleted contract
        # `1.0.0` or `1.1.0` is refused. fcd#179 deleted the two fixtures
        # that used to be frozen at those contracts (`semantic-ir.json`,
        # `config-version-v1-1.json`), so this mutates the clean `2.0.0`
        # document's own `contractVersion` instead of reading them.
        for deleted in ("1.0.0", "1.1.0"):
            document = json.loads(json.dumps(clean))
            document["contractVersion"] = deleted
            assert not validator.is_valid(document), deleted
            # fcd#179 (F1): `is_valid` alone only proves *some* schema defect;
            # that would still pass if this document picked up an unrelated
            # one and its declared `contractVersion` were quietly repaired.
            # Pin the actual reason: an error at `contractVersion` itself.
            paths = [list(error.absolute_path) for error in validator.iter_errors(document)]
            assert ["contractVersion"] in paths, (deleted, paths)

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
