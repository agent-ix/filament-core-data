"""An ordinary consumer of the kernel `pydantic_v2_dataclass` package (FR-089).

Imports the generated package, the standard library and the family's runtime,
and nothing else. The caller puts `packages/semantic-kernel` on the path and
the tree imports as `python.<profile-id>`. Publication passes
`agent-ix/quoin#290`.
"""

from __future__ import annotations

from typing import Any

from pydantic import TypeAdapter, ValidationError

from python.pydantic_v2_dataclass.FieldDecl import FieldDecl
from python.pydantic_v2_dataclass.SourceLocus import SourceLocus

FIELD: TypeAdapter[FieldDecl] = TypeAdapter(FieldDecl)
LOCUS: TypeAdapter[SourceLocus] = TypeAdapter(SourceLocus)

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

    field = FIELD.validate_python(CONFORMING_FIELD)
    restored = FIELD.validate_python(FIELD.dump_python(field, mode="json"))
    assert restored == field
    return field


def rejects_undeclared_member() -> str:
    """A sealed kernel object refuses a member the contract does not declare."""

    try:
        FIELD.validate_python({**CONFORMING_FIELD, "undeclared": 1})
    except ValidationError as error:
        return str(error)
    msg = "a sealed kernel object accepted an undeclared member"
    raise AssertionError(msg)


def rejects_non_identifier_name() -> str:
    """`Identifier` admits no leading digit; the pattern reaches the model."""

    try:
        FIELD.validate_python({**CONFORMING_FIELD, "name": "1nvalid"})
    except ValidationError as error:
        return str(error)
    msg = "a declaration name accepted a leading digit"
    raise AssertionError(msg)


def rejects_out_of_range_line() -> str:
    """`startLine` is bounded at 1; the bound reaches the model."""

    try:
        LOCUS.validate_python({**CONFORMING_LOCUS, "startLine": 0})
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
