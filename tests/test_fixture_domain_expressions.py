"""Inline Quire expressions validate against the fixture-domain declaration
schemas: `guardExpression` on a transition and a top-level
`operationExpressions` list on a type that declares operations."""

from __future__ import annotations

import json
import pathlib

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO = pathlib.Path(__file__).resolve().parents[1]
DOMAIN = REPO / "crates/extraction-frontend/fixtures/modules/fixture-domain/schemas"
CORE = REPO / "packages/semantic-core/generated/json-schema"
DOMAIN_ID = "https://schemas.agent-ix.org/fixture/domain/0.1.0/"

SPAN = {
    "sourceIdentity": "ix://agent-ix/fixture/Order",
    "path": "spec/functional/SM-001-order.md",
    "startLine": 12,
    "startColumn": 3,
}
EXPRESSION = {"kind": "expression", "text": "total > 0", "sourceSpan": SPAN}


def _registry() -> Registry:
    registry = Registry()
    for path in [*DOMAIN.glob("*.json"), *CORE.glob("*.json")]:
        document = json.loads(path.read_text(encoding="utf-8"))
        registry = registry.with_resource(
            document["$id"], Resource.from_contents(document)
        )
    return registry


REGISTRY = _registry()


def _errors(name: str, record: dict) -> list[str]:
    schema = json.loads((DOMAIN / f"{name}.json").read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, registry=REGISTRY)
    return [error.message for error in validator.iter_errors(record)]


TRANSITION = {"from": "Draft", "to": "Placed", "trigger": "place"}


def test_transition_admits_a_guard_expression() -> None:
    """Trace: TC-1897, FR-143-AC-12."""
    assert _errors("Transition", {**TRANSITION, "guardExpression": EXPRESSION}) == []


def test_transition_refuses_an_expression_of_another_kind() -> None:
    """Trace: TC-1897, FR-143-AC-12."""
    bad = {**EXPRESSION, "kind": "clause"}
    assert _errors("Transition", {**TRANSITION, "guardExpression": bad}) != []


OPERATION_TYPES = [
    "Entity",
    "AggregateRoot",
    "NestedEntity",
    "Process",
    "StateMachine",
    "Repository",
]


@pytest.mark.parametrize("name", OPERATION_TYPES)
@pytest.mark.parametrize("slot", ["pre", "post"])
def test_operation_types_admit_operation_expressions(name: str, slot: str) -> None:
    """Trace: TC-1897, FR-143-AC-12."""
    base = {"operations": []}
    record = {
        **base,
        "operationExpressions": [
            {"operation": "place", "slot": slot, "expression": EXPRESSION}
        ],
    }
    assert _errors(name, record) == _errors(name, base)
    assert _errors(name, {**base, "operationExpressions": [{}]}) != _errors(
        "StateMachine", base
    )


def test_operation_expression_refuses_an_unknown_slot() -> None:
    """Trace: TC-1897, FR-143-AC-12."""
    entry = {"operation": "place", "slot": "during", "expression": EXPRESSION}
    assert _errors("OperationExpression", entry) != []
