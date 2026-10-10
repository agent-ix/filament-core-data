# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Agent IX

"""Package revision and unused construct admission (FR-050, FR-142)."""

import importlib.util
import json
import subprocess
import sys

import pytest

from tests.semantic_ir_reader import (
    FIXTURE_ROOT,
    ROOT,
    _schema_validator,
    construct_findings,
    normalize,
    read_semantic_ir,
    resolve_kind,
    schema_valid,
)


def fixture():
    return json.loads((FIXTURE_ROOT / "reader-contract/k2-boundary.json").read_text())


@pytest.fixture(scope="module")
def conformance_adapter():
    path = ROOT / "conformance/adapters/python-backend/adapter.py"
    spec = importlib.util.spec_from_file_location("reader_contract_adapter", path)
    assert spec is not None and spec.loader is not None
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    return adapter


CONSTRUCT_REFUSALS = [
    ("duplicate_kind", "/ir/constructs/1/kind"),
    ("identity_requirement", "/ir/constructs/1/construct/identity"),
    ("shape_requirement", "/ir/constructs/1/construct/shape"),
    ("rule_requirement", "/ir/constructs/1/construct/rules/0"),
    ("forbidden_reference", "/ir/constructs/1/construct/references/owner"),
    ("required_member", "/ir/types/1"),
    ("forbidden_member", "/ir/types/1/identityFields"),
    ("nonempty_rule", "/ir/types/1/clauses"),
    ("population_kind", "/ir/populations/0/kind"),
]


def construct_case(name):
    document = fixture()
    unused = document["constructs"][1]["construct"]
    used = document["constructs"][0]["construct"]
    event = document["types"][1]
    match name:
        case "duplicate_kind":
            document["constructs"][1]["kind"]["name"] = "happened"
        case "identity_requirement":
            unused["identity"] = "identified"
        case "shape_requirement":
            unused["shape"] = "enumeration"
        case "rule_requirement":
            unused["rules"] = ["min_operations"]
        case "forbidden_reference":
            unused["references"] = {"owner": ["test:entity"]}
        case "required_member":
            del event["fields"]
        case "forbidden_member":
            event["identityFields"] = ["ix://test/orders/OrderPlaced/occurred_at"]
        case "nonempty_rule":
            used["members"]["clauses"] = "required"
            used["rules"] = ["min_clauses"]
            event["clauses"] = []
        case "population_kind":
            document["populations"] = [
                {
                    "identity": "ix://test/orders/population",
                    "displayName": "Orders",
                    "kind": {"module": "test/business", "name": "missing"},
                    "members": [],
                    "extent": "closed",
                    "origin": event["origin"],
                }
            ]
        case _:
            raise AssertionError(f"unknown construct case {name}")
    return document


@pytest.mark.parametrize("name,pointer", CONSTRUCT_REFUSALS)
def test_construct_schema_refusals_reach_python_reader_and_adapter(
    name, pointer, conformance_adapter
):
    """Trace: FR-142-AC-9, FR-142-AC-15"""
    document = construct_case(name)
    # These are cross-field schema obligations, beyond JSON Schema's checks.
    assert _schema_validator().is_valid(document)
    assert not schema_valid(_schema_validator(), document)
    assert [(row["code"], row["path"]) for row in read_semantic_ir(document)] == [
        (
            "agent-ix.semantic-ir.SCHEMA_VIOLATION",
            pointer.removeprefix("/ir/").replace("/", "."),
        )
    ]
    result = conformance_adapter.answer(
        {"caseId": name, "kind": "admissibility", "input": {"ir": document}}
    )
    assert result["resultState"] == "invalid"
    assert [
        (row["diagnostic"]["code"], row["pointer"]) for row in result["diagnostics"]
    ] == [("agent-ix.semantic-ir.SCHEMA_VIOLATION", pointer)]
    if name == "duplicate_kind":
        assert result["diagnostics"][0]["diagnostic"]["message"] == (
            "constructs declares the kind test/business/happened once"
        )


def test_unused_population_meaning_admits_independently_of_revision_or_kind_name():
    """Trace: FR-142-AC-15"""
    document = fixture()
    document["source"]["version"] = document["package"]["version"] = "1.0.0"
    assert schema_valid(_schema_validator(), document)
    assert construct_findings(document) == []
    document["constructs"][1]["kind"]["name"] = "unused_kind"
    assert schema_valid(_schema_validator(), document)
    assert construct_findings(document) == []


@pytest.mark.parametrize("declaration", ["malformed", ["malformed"], True])
def test_malformed_unused_declaration_refuses_without_a_cli_traceback(
    declaration, tmp_path, conformance_adapter
):
    """Trace: FR-142-AC-15"""
    document = fixture()
    document["constructs"][1]["construct"] = declaration
    path = tmp_path / "malformed.json"
    path.write_text(json.dumps(document))
    result = subprocess.run(
        [
            sys.executable,
            str(ROOT / "tests/semantic_ir_reader.py"),
            "--read",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stderr == ""
    assert json.loads(result.stdout)["schemaValid"] is False
    refusal = conformance_adapter.answer(
        {
            "caseId": "malformed-unused",
            "kind": "admissibility",
            "input": {"ir": document},
        }
    )
    assert refusal["resultState"] == "invalid"
    assert [
        (row["diagnostic"]["code"], row["pointer"]) for row in refusal["diagnostics"]
    ] == [("agent-ix.semantic-ir.SCHEMA_VIOLATION", "/ir/constructs/1/construct")]


def test_authored_revision_one_and_unused_population_preserve_timestamp_binding(
    conformance_adapter,
):
    """Trace: FR-050-AC-16, FR-142-AC-15"""
    document = fixture()
    assert schema_valid(_schema_validator(), document)
    assert read_semantic_ir(document) == []
    normalized = json.loads(normalize(document))
    assert normalized["source"]["version"] == "1"
    assert normalized["package"]["version"] == "1"
    assert normalized["constructs"] == document["constructs"]
    assert normalized["types"][0]["target"] == "ix://quire/native/Timestamp"
    types = {definition["identity"]: definition for definition in document["types"]}
    assert resolve_kind(types, {}, "ix://test/orders/Instant") == ("scalar", "datetime")
    result = conformance_adapter.answer(
        {"caseId": "k2-boundary", "kind": "admissibility", "input": {"ir": document}}
    )
    assert result["resultState"] == "success"
    assert result["diagnostics"] == []
    assert json.loads(result["normalized"]) == normalized


@pytest.mark.parametrize(
    "kind,member,code",
    [
        ("alias", "target", "UNRESOLVED_TYPE_REF"),
        ("reference", "target", "UNRESOLVED_TYPE_REF"),
        ("sequence", "items", "UNRESOLVED_ELEMENT_TYPE"),
        ("map", "values", "UNRESOLVED_ELEMENT_TYPE"),
        ("union", "payloadType", "UNRESOLVED_VARIANT_PAYLOAD"),
    ],
)
def test_adapter_resolves_known_natives_and_refuses_unknown_natives(
    kind, member, code, conformance_adapter
):
    """Trace: FR-142-AC-15"""
    document = fixture()
    subject = {
        key: value for key, value in document["types"][0].items() if key != "target"
    }
    subject.update(
        identity="ix://test/orders/Control", displayName="Control", kind=kind
    )
    if kind == "union":
        subject["variants"] = [
            {
                "identity": "ix://test/orders/Control/native",
                "name": "native",
                "payloadType": "ix://quire/native/Timestamp",
                "origin": subject["origin"],
            }
        ]
        target = subject["variants"][0]
        pointer = "/ir/types/2/variants/0/payloadType"
    else:
        subject[member] = "ix://quire/native/Timestamp"
        target = subject
        pointer = f"/ir/types/2/{member}"
    document["types"].append(subject)
    assert schema_valid(_schema_validator(), document)
    result = conformance_adapter.answer(
        {"caseId": kind, "kind": "admissibility", "input": {"ir": document}}
    )
    assert result["resultState"] == "success"
    assert result["diagnostics"] == []
    target[member] = "ix://quire/native/UnsupportedNative"
    result = conformance_adapter.answer(
        {"caseId": kind, "kind": "admissibility", "input": {"ir": document}}
    )
    assert result["resultState"] == "invalid"
    assert [
        (row["diagnostic"]["code"], row["pointer"]) for row in result["diagnostics"]
    ] == [(f"agent-ix.semantic-ir.{code}", pointer)]


def test_construct_identity_axis_preserves_semantic_identity_collision_refusal(
    conformance_adapter,
):
    """Trace: FR-142-AC-15"""
    document = fixture()
    document["types"][1]["identity"] = document["types"][0]["identity"]
    result = conformance_adapter.answer(
        {
            "caseId": "duplicate-identity",
            "kind": "admissibility",
            "input": {"ir": document},
        }
    )
    assert result["resultState"] == "invalid"
    assert [
        (row["diagnostic"]["code"], row["pointer"]) for row in result["diagnostics"]
    ] == [("agent-ix.semantic-ir.DUPLICATE_IDENTITY", "/ir/types/1/identity")]


@pytest.mark.parametrize(
    "revision", ["0", "1", "9007199254740993", "1.2.3", "1.2.3-rc.1+build"]
)
def test_canonical_revision_strings_are_preserved(revision):
    """Trace: FR-050-AC-16"""
    document = fixture()
    document["source"]["version"] = document["package"]["version"] = revision
    assert schema_valid(_schema_validator(), document)
    normalized = json.loads(normalize(document))
    assert normalized["source"]["version"] == revision
    assert normalized["package"]["version"] == revision


@pytest.mark.parametrize(
    "revision", ["", "01", "-1", "1.0", "1 ", "1\n", "1e0", "v1", 1]
)
def test_other_revision_spellings_still_refuse_at_the_version_member(revision):
    """Trace: FR-050-AC-16"""
    for envelope in ["source", "package"]:
        document = fixture()
        document[envelope]["version"] = revision
        errors = list(_schema_validator().iter_errors(document))
        assert errors
        assert all(
            list(error.absolute_path) == [envelope, "version"] for error in errors
        )


def test_unused_declarations_still_validate_and_kinds_must_resolve():
    """Trace: FR-142-AC-15"""
    malformed = fixture()
    malformed["constructs"][1]["construct"]["shape"] = "unsupported"
    errors = list(_schema_validator().iter_errors(malformed))
    assert [list(error.absolute_path) for error in errors] == [
        ["constructs", 1, "construct", "shape"]
    ]
    unresolved = fixture()
    unresolved["types"][1]["kind"]["name"] = "missing"
    assert construct_findings(unresolved) == [
        "types.1.kind: names no constructs entry",
        "constructs.0.kind: no type or population is of that kind",
    ]


@pytest.mark.parametrize(
    "meaning",
    [
        "quire.meaning.model.event-type/v1",
        "quire.meaning.model.unrecognized/v1",
        "quire.meaning.model.population/v2",
    ],
)
def test_unused_kinds_outside_the_recognized_population_meaning_refuse(
    meaning,
    conformance_adapter,
):
    """Trace: FR-142-AC-9, FR-142-AC-15"""
    document = fixture()
    document["constructs"][1]["kind"]["name"] = "ledger"
    document["constructs"][1]["construct"]["meaning"] = meaning
    assert _schema_validator().is_valid(document)
    assert not schema_valid(_schema_validator(), document)
    assert [(row["code"], row["path"]) for row in read_semantic_ir(document)] == [
        ("agent-ix.semantic-ir.SCHEMA_VIOLATION", "constructs.1.kind")
    ]
    result = conformance_adapter.answer(
        {"caseId": "unused-ledger", "kind": "admissibility", "input": {"ir": document}}
    )
    assert result["resultState"] == "invalid"
    assert [
        (row["diagnostic"]["code"], row["pointer"]) for row in result["diagnostics"]
    ] == [("agent-ix.semantic-ir.SCHEMA_VIOLATION", "/ir/constructs/1/kind")]
