"""The FR-087 Python package's decision path (family `pydantic_v2_basemodel`).

The generated model for the golden document's declaration validates it, and the
family's own documented serialization — `model_dump(mode="json",
by_alias=True, exclude_none=True)`, the call
`packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py` makes — is
the wire form it answers with.

One of the three generated families is measured here because a family is a
rendering of one contract, not a second contract: `pydantic_v2_basemodel` is the
validating family, and `msgspec_struct` cannot build a decoder for four of the
thirty kernel types at all (FR-087 finding F2,
`agent-ix/filament-core-data#125`), which is reported as unmet rather than as
agreement.

It imports nothing under `conformance/` (FR-090-CON-4) and reads no clock and
no environment variable (FR-090-CON-11).
"""

from __future__ import annotations

import enum
import importlib
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PARITY = HERE.parent
KERNEL = PARITY.parent
FAMILY = "pydantic_v2_basemodel"


def _answers() -> list[dict]:
    sys.path.insert(0, str(KERNEL))
    from pydantic import ValidationError

    out: list[dict] = []
    for path in sorted((PARITY / "golden").glob("*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        declaration = document["declaration"]
        exercised = "unknown-member-states" in document["properties"]
        try:
            module = importlib.import_module(f"python.{FAMILY}.{declaration}")
            model = getattr(module, declaration)
        except (ImportError, AttributeError):
            out.append({"id": document["id"], "resultState": "undecided"})
            continue
        if isinstance(model, type) and issubclass(model, enum.Enum):
            try:
                member = model(document["instance"])
            except ValueError:
                out.append(
                    {
                        "id": document["id"],
                        "resultState": "invalid",
                        "unknownFate": _fate(document),
                    }
                )
                continue
            out.append(
                {
                    "id": document["id"],
                    "resultState": "success",
                    "wire": member.value,
                    "unknownFate": _fate(document),
                }
            )
            continue
        try:
            value = model.model_validate(document["instance"])
        except ValidationError:
            out.append(
                {
                    "id": document["id"],
                    "resultState": "invalid",
                    "unknownFate": "rejected" if exercised else _fate(document),
                }
            )
            continue
        wire = value.model_dump(mode="json", by_alias=True, exclude_none=True)
        fate = _fate(document)
        if exercised:
            declared = set(document["instance"]) - set(
                _declared(document["instance"], wire)
            )
            fate = "preserved" if declared else "dropped"
        out.append(
            {
                "id": document["id"],
                "resultState": "success",
                "wire": wire,
                "unknownFate": fate,
            }
        )
    return out


def _declared(instance: object, wire: object) -> object:
    """The members of `instance` the wire form kept, for the unknown-member fate."""

    if isinstance(instance, dict) and isinstance(wire, dict):
        return {key: wire[key] for key in instance if key in wire}
    return {}


def _fate(document: dict) -> str:
    if document["unknownPolicy"] != "reject":
        return "not-applicable"
    if "unknown-member-states" not in document["properties"]:
        return "not-exercised"
    return "rejected"


def main() -> int:
    json.dump(_answers(), sys.stdout, indent="\t", ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
