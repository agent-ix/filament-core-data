"""An ordinary consumer of the kernel `pydantic_v2_basemodel` package (FR-089).

Imports the generated package, the standard library and the family's runtime,
and nothing else. The caller puts `packages/semantic-kernel` on the path and
the tree imports as `python.<profile-id>` — that is the only accommodation an
ordinary consumer makes, and it is the one any unpublished tree requires.
Publication passes `agent-ix/quoin#290`.
"""

from __future__ import annotations

from typing import Any

from pydantic import ValidationError
from python.pydantic_v2_basemodel.FieldDecl import FieldDecl
from python.pydantic_v2_basemodel.SourceLocus import SourceLocus

CONFORMING_FIELD: dict[str, Any] = {
    "name": "unitSymbol",
    "type": {"target": "String", "multiplicity": {"lower": 1, "upper": 1}},
    "identity": False,
    "nullable": False,
}

CONFORMING_LOCUS: dict[str, Any] = {
    "sourceIdentity": "ix://agent-ix/filament-core-data",
    "path": "packages/semantic-core/main.tsp",
    "startLine": 202,
    "startColumn": 1,
}


def accepts() -> FieldDecl:
    """Build a conforming kernel value and round-trip it."""

    field = FieldDecl.model_validate(CONFORMING_FIELD)
    restored = FieldDecl.model_validate(
        field.model_dump(mode="json", by_alias=True, exclude_none=True)
    )
    assert restored == field
    return field


def rejects_undeclared_member() -> str:
    """A sealed kernel object refuses a member the contract does not declare.

    This is the FR-074 preparation rewrite arriving at the consumer: without
    it the generator reads `unevaluatedProperties` as nothing at all and the
    model is `extra='allow'`.
    """

    try:
        FieldDecl.model_validate({**CONFORMING_FIELD, "undeclared": 1})
    except ValidationError as error:
        return str(error)
    msg = "a sealed kernel object accepted an undeclared member"
    raise AssertionError(msg)


def rejects_non_identifier_name() -> str:
    """`Identifier` admits no leading digit; the pattern reaches the model."""

    try:
        FieldDecl.model_validate({**CONFORMING_FIELD, "name": "1nvalid"})
    except ValidationError as error:
        return str(error)
    msg = "a declaration name accepted a leading digit"
    raise AssertionError(msg)


def rejects_out_of_range_line() -> str:
    """`startLine` is bounded at 1; the bound reaches the model."""

    try:
        SourceLocus.model_validate({**CONFORMING_LOCUS, "startLine": 0})
    except ValidationError as error:
        return str(error)
    msg = "a bounded integer accepted a value outside its bound"
    raise AssertionError(msg)


def main() -> int:
    accepts()
    rejects_undeclared_member()
    rejects_non_identifier_name()
    rejects_out_of_range_line()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
