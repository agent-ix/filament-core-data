"""An ordinary consumer of the kernel `msgspec_struct` package (FR-089).

Imports the generated package, the standard library and the family's runtime,
and nothing else. The caller puts `packages/semantic-kernel` on the path and
the tree imports as `python.<profile-id>`. Publication passes
`agent-ix/quoin#290`.

This family is `qualified-with-conditions` and the conditions bite here. A
family generated for the kernel does not become a better family, and an example
that demonstrated only what works would be a worse record than one that states
what does not. Three measured losses are asserted below rather than avoided:

- object closure. The kernel seals `SourceLocus` with `unevaluatedProperties`,
  the FR-074 pass rewrites it to `additionalProperties: false`, and this family
  still renders an open struct. Recorded in
  `python_backend/qualification/gaps.json` as `closure-additional` and
  `closure-unevaluated`.
- a union of string-like types. `TypeRef.target` is
  `SemanticId | KernelScalar` — a `str` and a `StrEnum` — and `msgspec` refuses
  to build a decoder for any union carrying more than one string-like member.
- a union of untagged structs. `ConstraintDecl` is an `anyOf` over eleven
  constraint structs with no discriminator, and `msgspec` requires every
  `Struct` in a union to be tagged.

The last two are structural: the four kernel types `TypeRef`, `FieldDecl`,
`OperationDecl` and `ConstraintDecl` cannot be decoded by this family at all,
and the failure is a `TypeError` at decoder-construction time rather than a
validation error. Neither is in the qualification's probe set, which was
measured over the thirteen published documents and not over this bundle.
"""

from __future__ import annotations

import msgspec

from python.msgspec_struct.Multiplicity import Multiplicity
from python.msgspec_struct.SourceLocus import SourceLocus

#: The four kernel types this family cannot build a decoder for, and why.
UNDECODABLE = {
    "TypeRef": "a union of a `str` and a `StrEnum`",
    "FieldDecl": "reaches `TypeRef`",
    "OperationDecl": "reaches `TypeRef`",
    "ConstraintDecl": "a union of eleven untagged structs",
}

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


def cannot_decode_the_declaration_types() -> dict[str, str]:
    """The two structural losses, demonstrated rather than hidden.

    Returns the refusal message for each of the four kernel types this family
    cannot build a decoder for, so a change in either direction is a visible
    diff rather than a silent one.
    """

    import importlib

    refusals: dict[str, str] = {}
    for name in sorted(UNDECODABLE):
        module = importlib.import_module(f"python.msgspec_struct.{name}")
        try:
            msgspec.json.decode(b"{}", type=getattr(module, name))
        except msgspec.ValidationError as error:  # pragma: no cover - see below
            msg = f"{name} built a decoder; the recorded structural loss is gone"
            raise AssertionError(msg) from error
        except TypeError as error:
            refusals[name] = str(error)
    if sorted(refusals) != sorted(UNDECODABLE):
        msg = f"expected {sorted(UNDECODABLE)} to be undecodable, got {sorted(refusals)}"
        raise AssertionError(msg)
    return refusals


def main() -> int:
    accepts()
    accepts_multiplicity()
    rejects_out_of_range_line()
    rejects_empty_path()
    accepts_undeclared_member_the_contract_seals()
    cannot_decode_the_declaration_types()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
