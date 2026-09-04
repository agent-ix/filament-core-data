"""An ordinary consumer of the `pydantic_v2_basemodel` package (FR-079)."""

from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from python_backend.generated.pydantic_v2_basemodel import common_schema

CONFORMING: dict[str, Any] = {
    "sourceIdentity": "ix://agent-ix/filament-core-data",
    "path": "schema/semantic/v1/common.schema.json",
    "startLine": 1,
    "startColumn": 1,
}


def accepts() -> common_schema.SourceLocus:
    """Build a conforming value and round-trip it through serialization."""

    locus = common_schema.SourceLocus.model_validate(CONFORMING)
    restored = common_schema.SourceLocus.model_validate(
        locus.model_dump(mode="json", by_alias=True, exclude_none=True)
    )
    assert restored == locus
    return locus


def rejects_unknown_member() -> str:
    """A member the contract does not declare must be refused."""

    try:
        common_schema.SourceLocus.model_validate({**CONFORMING, "extra": 1})
    except ValidationError as error:
        return str(error)
    msg = "a sealed object accepted an undeclared member"
    raise AssertionError(msg)


def rejects_out_of_range() -> str:
    """A value outside the declared bound must be refused."""

    try:
        common_schema.SourceLocus.model_validate({**CONFORMING, "startLine": 0})
    except ValidationError as error:
        return str(error)
    msg = "a bounded integer accepted a value outside its bound"
    raise AssertionError(msg)


def rejects_escaping_path() -> str:
    """The four-lookahead `sourceLocus` path pattern must be enforced.

    `conformance/contract-gaps.json` GAP-002 records that this pattern cannot
    compile under RE2, which is why the Rust backend must hand-write the check.
    Python's `re` supports lookahead, so the pattern reaches the generated type
    intact and is enforced here rather than restated.
    """

    try:
        common_schema.SourceLocus.model_validate({**CONFORMING, "path": "../escape"})
    except ValidationError as error:
        return str(error)
    msg = "a path pattern with four lookaheads accepted an escaping path"
    raise AssertionError(msg)


def main() -> None:
    accepts()
    rejects_unknown_member()
    rejects_out_of_range()
    rejects_escaping_path()


if __name__ == "__main__":
    main()
