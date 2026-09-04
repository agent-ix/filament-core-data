"""An ordinary consumer of the `pydantic_v2_dataclass` package (FR-079)."""

from __future__ import annotations

import dataclasses
from typing import Any

from pydantic import TypeAdapter, ValidationError

from python_backend.generated.pydantic_v2_dataclass import common_schema

CONFORMING: dict[str, Any] = {
    "sourceIdentity": "ix://agent-ix/filament-core-data",
    "path": "schema/semantic/v1/common.schema.json",
    "startLine": 1,
    "startColumn": 1,
}

_ADAPTER: TypeAdapter[common_schema.SourceLocus] = TypeAdapter(
    common_schema.SourceLocus
)


def accepts() -> common_schema.SourceLocus:
    """A Pydantic dataclass validates through a `TypeAdapter`, not a classmethod."""

    locus = _ADAPTER.validate_python(CONFORMING)
    restored = _ADAPTER.validate_python(
        {key: value for key, value in dataclasses.asdict(locus).items() if value is not None}
    )
    assert restored == locus
    return locus


def rejects_unknown_member() -> str:
    try:
        _ADAPTER.validate_python({**CONFORMING, "extra": 1})
    except ValidationError as error:
        return str(error)
    msg = "a sealed dataclass accepted an undeclared member"
    raise AssertionError(msg)


def rejects_out_of_range() -> str:
    try:
        _ADAPTER.validate_python({**CONFORMING, "startColumn": 0})
    except ValidationError as error:
        return str(error)
    msg = "a bounded integer accepted a value outside its bound"
    raise AssertionError(msg)


def main() -> None:
    accepts()
    rejects_unknown_member()
    rejects_out_of_range()


if __name__ == "__main__":
    main()
