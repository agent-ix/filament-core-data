"""Construct-vocabulary parity, Python side (issue #172, TC-1786).

The closed core vocabulary of contract 2.0.0 construct declarations is stated
once, in ``schema/semantic/v1/construct-vocabulary.json``. The Python reading of
it is the generated ``semantic_ir_schema`` module; these tests hold that reading,
the vocabulary file and the published schema's ``constructDeclaration`` to the
same terms.
"""

from __future__ import annotations

import json
from enum import Enum

from python_backend.generated.pydantic_v2_basemodel import semantic_ir_schema
from tests.semantic_ir_reader import SCHEMA_ROOT

VOCABULARY = json.loads((SCHEMA_ROOT / "construct-vocabulary.json").read_text())
SCHEMA = json.loads((SCHEMA_ROOT / "semantic-ir.schema.json").read_text())
DECLARATION = SCHEMA["$defs"]["constructDeclaration"]["properties"]


def _values(enum: type[Enum]) -> list[str]:
    return [member.value for member in enum]


def test_the_generated_python_vocabulary_is_the_declared_vocabulary() -> None:
    """TC-1786: FR-142-AC-11."""
    assert _values(semantic_ir_schema.Identity) == VOCABULARY["identities"]
    assert _values(semantic_ir_schema.Shape) == VOCABULARY["shapes"]
    assert _values(semantic_ir_schema.Members) == VOCABULARY["presences"]
    assert _values(semantic_ir_schema.Rule) == [
        rule["name"] for rule in VOCABULARY["rules"]
    ]
    # Each flag is an optional boolean field of the generated declaration.
    fields = semantic_ir_schema.ConstructDeclaration.model_fields
    for flag in VOCABULARY["flags"]:
        assert flag["name"] in fields, flag["name"]
        assert fields[flag["name"]].annotation == bool | None, flag["name"]
        assert isinstance(flag["default"], bool), flag["name"]


def test_the_schema_declaration_enumerates_the_declared_vocabulary() -> None:
    """TC-1786: FR-142-AC-11."""
    members = [member["name"] for member in VOCABULARY["members"]]
    references = [
        member["name"] for member in VOCABULARY["members"] if "referenceItems" in member
    ]
    assert DECLARATION["identity"]["enum"] == VOCABULARY["identities"]
    assert DECLARATION["shape"]["enum"] == VOCABULARY["shapes"]
    assert DECLARATION["members"]["propertyNames"]["enum"] == members
    assert (
        DECLARATION["members"]["additionalProperties"]["enum"]
        == VOCABULARY["presences"]
    )
    assert DECLARATION["references"]["propertyNames"]["enum"] == references
    assert DECLARATION["rules"]["items"]["enum"] == [
        rule["name"] for rule in VOCABULARY["rules"]
    ]
    # Every rule requires a presence of a member the vocabulary declares, and a
    # rule marked nonEmpty requires a list member.
    for rule in VOCABULARY["rules"]:
        assert rule["member"] in members, rule["name"]
        assert rule["presence"] in VOCABULARY["presences"], rule["name"]
        assert set(rule) <= {"name", "member", "presence", "nonEmpty"}, rule["name"]
        if "nonEmpty" in rule:
            assert rule["nonEmpty"] is True, rule["name"]
    # Every member default is a presence, and every reference member's items
    # name the members of an item that name types.
    for member in VOCABULARY["members"]:
        assert member["default"] in VOCABULARY["presences"], member["name"]
        for item in member.get("referenceItems", []):
            assert isinstance(item, str) and item, member["name"]
    # Each identity and shape requirement, and each flag, is stated over the
    # same terms the vocabulary states elsewhere.
    for requirement in VOCABULARY["identityRequirements"]:
        assert requirement["identity"] in VOCABULARY["identities"]
        assert requirement["member"] in members
        assert requirement["presence"] in VOCABULARY["presences"]
    for requirement in VOCABULARY["shapeRequirements"]:
        assert requirement["shape"] in VOCABULARY["shapes"]
        assert requirement["member"] in members
        assert requirement["presence"] in VOCABULARY["presences"]
    for flag in VOCABULARY["flags"]:
        assert DECLARATION[flag["name"]] == {"type": "boolean"}, flag["name"]
