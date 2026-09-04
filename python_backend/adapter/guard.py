"""The refusal guards (FR-075).

Both guards run in the same interpreter as the runner and before it spawns
anything, which is why they are Python and not JavaScript: a Python process
cannot call a JavaScript guard without spawning a process first, and the
zero-spawn assertion would then be false by construction.

Pure: no filesystem write, no network, no clock. A refusal writes no file.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from python_backend import ROOT
from python_backend.adapter.profiles import PROHIBITED_OPTIONS, REJECTED_OPTIONS

REFUSALS_PATH = ROOT / "refusals.json"

_SCHEME = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")
_DRIVE = re.compile(r"^[A-Za-z]:[\\/]")

#: Remote-reference, lock, and watch options. Refused independently of the
#: profile that also omits them: one defence that is misconfigured once is no
#: defence.
NETWORK_OPTIONS: frozenset[str] = frozenset(
    {
        "--allow-remote-refs",
        "--allow-private-network",
        "--url",
        "--http-backend",
        "--http-headers",
        "--http-query-parameters",
        "--http-ignore-tls",
        "--http-local-ref-path",
        "--http-timeout",
        "--lockfile",
        "--update-lock",
        "--locked",
        "--watch",
        "--watch-delay",
    }
)

#: Every option token a declared profile is permitted to carry. Anything else is
#: refused, including an option that is merely new: a future upstream option is
#: reviewed before it is admitted.
ALLOWED_OPTIONS: frozenset[str] = frozenset(
    {
        "--input",
        "--input-file-type",
        "--output",
        "--output-model-type",
        "--target-python-version",
        "--disable-timestamp",
        "--formatters",
        "--strict-refs",
        "--no-allow-remote-refs",
        "--field-constraints",
        "--use-annotated",
        "--strict-nullable",
        "--use-standard-collections",
        "--use-union-operator",
    }
)

#: Values the allow-listed options may take, so a permitted option cannot smuggle
#: an arbitrary value. `--input` and `--output` are runner-supplied scratch paths
#: and are checked by position rather than by value.
_OPTION_VALUES: dict[str, frozenset[str] | None] = {
    "--input": None,
    "--output": None,
    "--input-file-type": frozenset({"jsonschema"}),
    "--output-model-type": frozenset(
        {
            "pydantic_v2.BaseModel",
            "pydantic_v2.dataclass",
            "dataclasses.dataclass",
            "typing.TypedDict",
            "msgspec.Struct",
        }
    ),
    "--target-python-version": frozenset({"3.13"}),
    "--formatters": frozenset({"builtin"}),
}

_FLAGS: frozenset[str] = frozenset(
    {
        "--disable-timestamp",
        "--strict-refs",
        "--no-allow-remote-refs",
        "--field-constraints",
        "--use-annotated",
        "--strict-nullable",
        "--use-standard-collections",
        "--use-union-operator",
    }
)


class RefusalError(ValueError):
    """A declared refusal fired. Carries the code and the location."""

    def __init__(self, code: str, message: str, location: str) -> None:
        super().__init__(f"{code} at {location}: {message}")
        self.code = code
        self.location = location


@dataclass(frozen=True)
class Register:
    schema_keys: dict[str, str]
    reference_shapes: dict[str, str]
    argument_tokens: list[str]

    @property
    def codes(self) -> list[str]:
        return (
            list(self.schema_keys.values())
            + list(self.reference_shapes.values())
            + list(self.argument_tokens)
        )


def register() -> Register:
    document: dict[str, Any] = json.loads(REFUSALS_PATH.read_text(encoding="utf-8"))
    return Register(
        schema_keys={row["key"]: row["code"] for row in document["schemaKeys"]},
        reference_shapes={
            row["shape"]: row["code"] for row in document["referenceShapes"]
        },
        argument_tokens=[row["code"] for row in document["argumentTokens"]],
    )


FORBIDDEN_KEYS: tuple[str, ...] = tuple(register().schema_keys)


def _escape(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def _classify_ref(value: str) -> str | None:
    if value.startswith("#"):
        return None
    if _DRIVE.match(value):
        return "drive-letter"
    if _SCHEME.match(value):
        return "uri-scheme"
    if value.startswith("/"):
        return "absolute-path"
    head = value.split("#", 1)[0]
    if any(segment == ".." for segment in head.replace("\\", "/").split("/")):
        return "parent-escape"
    return None


def assert_schema_safe(document: Any, pointer: str = "") -> None:
    """Refuse every executable schema extension and every escaping reference.

    The walk is over every object key at every position, not over a keyword
    allow-list: an extension key can sit anywhere a JSON object can, and a walk
    that only visited known applicators would miss the places the generator
    still reads.
    """

    keys = register().schema_keys
    shapes = register().reference_shapes

    def visit(node: Any, at: str) -> None:
        if isinstance(node, list):
            for index, item in enumerate(node):
                visit(item, f"{at}/{index}")
            return
        if not isinstance(node, dict):
            return
        for key, value in node.items():
            here = f"{at}/{_escape(key)}"
            if key in keys:
                raise RefusalError(
                    keys[key],
                    f"forbidden executable Python schema extension {key!r}",
                    here or "/",
                )
            if key == "$ref" and isinstance(value, str):
                shape = _classify_ref(value)
                if shape is not None:
                    raise RefusalError(
                        shapes[shape],
                        f"refused $ref shape {shape}: {value!r}",
                        here,
                    )
            visit(value, here)

    visit(document, pointer)


def assert_argv_safe(argv: list[str]) -> None:
    """Refuse every prohibited, network-enabling, and unrecognised option token."""

    prohibited_code, network_code, unknown_code = register().argument_tokens

    index = 0
    while index < len(argv):
        token = argv[index]
        if not token.startswith("--"):
            index += 1
            continue
        name, _, inline = token.partition("=")
        if name in PROHIBITED_OPTIONS or name in REJECTED_OPTIONS:
            raise RefusalError(
                prohibited_code,
                f"prohibited generator option {name!r}",
                f"argv[{index}]",
            )
        if name in NETWORK_OPTIONS:
            raise RefusalError(
                network_code,
                f"remote-reference or lock option {name!r}",
                f"argv[{index}]",
            )
        if name not in ALLOWED_OPTIONS:
            raise RefusalError(
                unknown_code,
                f"unrecognised option {name!r}; the allow-list defaults to refuse",
                f"argv[{index}]",
            )
        permitted = _OPTION_VALUES.get(name)
        if name in _FLAGS:
            if inline:
                raise RefusalError(
                    unknown_code,
                    f"{name!r} takes no value",
                    f"argv[{index}]",
                )
            index += 1
            continue
        value = inline if inline else (argv[index + 1] if index + 1 < len(argv) else "")
        if permitted is not None and value not in permitted:
            raise RefusalError(
                unknown_code,
                f"{name!r} may not take {value!r}",
                f"argv[{index}]",
            )
        index += 1 if inline else 2
