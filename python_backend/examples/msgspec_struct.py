"""An ordinary consumer of the `msgspec_struct` package (FR-079).

`msgspec` validates on decode rather than on construction, so the example
decodes rather than constructs. It also demonstrates what this family does not
carry: the qualification records object closure as lost for `msgspec.Struct`,
and the last function here asserts that loss rather than asserting it away.
"""

from __future__ import annotations

import msgspec

from python_backend.generated.msgspec_struct import common_schema

CONFORMING = (
    b'{"sourceIdentity": "ix://agent-ix/filament-core-data",'
    b' "path": "schema/semantic/v1/common.schema.json",'
    b' "startLine": 1, "startColumn": 1}'
)

_DECODER = msgspec.json.Decoder(common_schema.SourceLocus)


def accepts() -> common_schema.SourceLocus:
    locus = _DECODER.decode(CONFORMING)
    restored = _DECODER.decode(msgspec.json.encode(locus))
    assert restored == locus
    return locus


def rejects_out_of_range() -> str:
    payload = CONFORMING.replace(b'"startLine": 1', b'"startLine": 0')
    try:
        _DECODER.decode(payload)
    except msgspec.ValidationError as error:
        return str(error)
    msg = "a bounded integer accepted a value outside its bound"
    raise AssertionError(msg)


def accepts_unknown_member_by_design() -> common_schema.SourceLocus:
    """The recorded loss, asserted rather than asserted away.

    `python_backend/qualification/gaps.json` records object closure as lost for
    this family: the pinned generator emits no `forbid_unknown_fields`, so an
    undeclared member decodes without complaint. A consumer that needs the seal
    must not use this family, and this function is what makes that verdict
    falsifiable instead of a claim.
    """

    payload = CONFORMING.replace(b"{", b'{"undeclared": 1, ', 1)
    return _DECODER.decode(payload)


def main() -> None:
    accepts()
    rejects_out_of_range()
    accepts_unknown_member_by_design()


if __name__ == "__main__":
    main()
