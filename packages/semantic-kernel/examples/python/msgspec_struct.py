"""An ordinary consumer of the kernel `msgspec_struct` package (FR-089).

Imports the generated package, the standard library and the family's runtime,
and nothing else. The caller puts `packages/semantic-kernel` on the path and
the tree imports as `python.<profile-id>`. Publication passes
`agent-ix/quoin#290`.

This family is `qualified-with-conditions`; its measured object-closure loss
is asserted below. The adjacent union source now supplies `kind` tags, so
`TypeRef` and `ConstraintDecl` also construct decoders and round-trip:

- object closure. The kernel seals `SourceLocus` with `unevaluatedProperties`,
  the FR-074 pass rewrites it to `additionalProperties: false`, and this family
  still renders an open struct. Recorded in
  `python_backend/qualification/gaps.json` as `closure-additional` and
  `closure-unevaluated`.
"""

from __future__ import annotations

import msgspec

from python.msgspec_struct.Multiplicity import Multiplicity
from python.msgspec_struct.SourceLocus import SourceLocus
from python.msgspec_struct.ConstraintDecl import ConstraintDecl
from python.msgspec_struct.TypeRef import TypeRef

CONFORMING_LOCUS = (
    b'{"sourceIdentity":"ix://agent-ix/filament-core-data",'
    b'"path":"packages/semantic-core/main.tsp",'
    b'"startLine":202,"startColumn":1}'
)

CONFORMING_MULTIPLICITY = b'{"lower":1,"upper":1,"ordered":false,"unique":false}'


def accepts() -> SourceLocus:
    """Build a conforming kernel value and round-trip it."""

    locus = msgspec.json.decode(CONFORMING_LOCUS, type=SourceLocus)
    restored = msgspec.json.decode(msgspec.json.encode(locus), type=SourceLocus)
    assert restored == locus
    return locus


def accepts_multiplicity() -> Multiplicity:
    """A second conforming value, over a type with only numeric bounds."""

    value = msgspec.json.decode(CONFORMING_MULTIPLICITY, type=Multiplicity)
    restored = msgspec.json.decode(msgspec.json.encode(value), type=Multiplicity)
    assert restored == value
    return value


def rejects_out_of_range_line() -> str:
    """`startLine` is bounded at 1; the bound reaches the model."""

    payload = CONFORMING_LOCUS.replace(b'"startLine":202', b'"startLine":0')
    try:
        msgspec.json.decode(payload, type=SourceLocus)
    except msgspec.ValidationError as error:
        return str(error)
    msg = "a bounded integer accepted a value outside its bound"
    raise AssertionError(msg)


def rejects_empty_path() -> str:
    """`path` declares `minLength: 1`; the bound reaches the model."""

    payload = CONFORMING_LOCUS.replace(
        b'"path":"packages/semantic-core/main.tsp"', b'"path":""'
    )
    try:
        msgspec.json.decode(payload, type=SourceLocus)
    except msgspec.ValidationError as error:
        return str(error)
    msg = "a length-bounded string accepted an empty value"
    raise AssertionError(msg)


def accepts_undeclared_member_the_contract_seals() -> SourceLocus:
    """The measured object-closure loss, demonstrated rather than hidden."""

    payload = CONFORMING_LOCUS.replace(b'"startColumn":1', b'"startColumn":1,"x":1')
    return msgspec.json.decode(payload, type=SourceLocus)


def accepts_adjacent_unions() -> None:
    """Tagged kernel unions decode and round-trip in the generated family."""

    for payload, type_ in (
        (b'{"target":{"kind":"KernelScalar","value":"String"}}', TypeRef),
        (b'{"kind":"NonEmptyConstraint","value":{"keyword":"nonEmpty"}}', ConstraintDecl),
    ):
        value = msgspec.json.decode(payload, type=type_)
        assert msgspec.json.decode(msgspec.json.encode(value), type=type_) == value


def main() -> int:
    accepts()
    accepts_multiplicity()
    rejects_out_of_range_line()
    rejects_empty_path()
    accepts_undeclared_member_the_contract_seals()
    accepts_adjacent_unions()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
