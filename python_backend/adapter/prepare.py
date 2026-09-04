"""The owned schema preparation pass (FR-074).

One rewrite, measured rather than assumed. The official TypeSpec JSON Schema
emitter states a sealed model with `unevaluatedProperties`, usually as the
always-false schema `{"not": {}}`. The pinned generator reads neither: measured
against `0.76.0`, `unevaluatedProperties: {"not": {}}` produces `extra='allow'`
in both Pydantic families and no `closed=True` in `TypedDict`, while
`additionalProperties: false` produces `extra='forbid'` and `closed=True`. Every
sealed contract type would otherwise generate as an open Python model, in every
family, silently.

This pass deliberately does *not* call FR-043's `normalizeJsonSchemaForPython`.
That function is defined over the official spike bundle alone: it stamps a
spike-specific `urn:` `$id` and deletes every `$defs` entry's `$id` and
`$schema`. Over a published `schema/semantic/v1/*.schema.json` document that
would destroy the identities its cross-file `$ref`s resolve through. Where the
input *is* the spike bundle, the committed adapter output is consumed as-is, so
FR-043's byte-golden stays the authority for its own half.

Pure: same result on every call, inputs unmutated, no clock and no network.
"""

from __future__ import annotations

import copy
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

#: Keywords whose values are subschemas or maps of subschemas. The pass walks
#: these rather than every key, so a `properties` entry literally named
#: `unevaluatedProperties` is data and not a keyword.
_SUBSCHEMA_MAPS = ("properties", "patternProperties", "$defs", "definitions")
_SUBSCHEMA_LISTS = ("allOf", "anyOf", "oneOf", "prefixItems")
_SUBSCHEMA_VALUES = (
    "items",
    "not",
    "if",
    "then",
    "else",
    "propertyNames",
    "contains",
    "unevaluatedItems",
    "additionalProperties",
    "additionalItems",
)

CLOSED = False


class PreparationConflictError(ValueError):
    """A subschema states closure twice with values that do not agree."""


@dataclass
class Rewrite:
    rule: str
    document: str
    pointer: str

    def as_dict(self) -> dict[str, str]:
        return {"rule": self.rule, "document": self.document, "pointer": self.pointer}


@dataclass
class Prepared:
    documents: dict[str, dict[str, Any]]
    rewrites: list[Rewrite] = field(default_factory=list)

    @property
    def preparation(self) -> list[dict[str, str]]:
        return [rewrite.as_dict() for rewrite in self.rewrites]


def _escape(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def _is_always_false(value: Any) -> bool:
    return value is False or (isinstance(value, dict) and value == {"not": {}})


def _closure_value(value: Any) -> Any:
    return False if _is_always_false(value) else value


def _walk(node: Any, name: str, pointer: str, out: list[Rewrite]) -> Any:
    if isinstance(node, list):
        return [_walk(item, name, f"{pointer}/{i}", out) for i, item in enumerate(node)]
    if not isinstance(node, dict):
        return node

    result: dict[str, Any] = {}
    for key, value in node.items():
        child_pointer = f"{pointer}/{_escape(key)}"
        if key in _SUBSCHEMA_MAPS and isinstance(value, dict):
            result[key] = {
                inner: _walk(sub, name, f"{child_pointer}/{_escape(inner)}", out)
                for inner, sub in value.items()
            }
        elif key in _SUBSCHEMA_LISTS and isinstance(value, list):
            result[key] = [
                _walk(sub, name, f"{child_pointer}/{i}", out)
                for i, sub in enumerate(value)
            ]
        elif key in _SUBSCHEMA_VALUES:
            result[key] = _walk(value, name, child_pointer, out)
        else:
            result[key] = copy.deepcopy(value)

    if "unevaluatedProperties" in result:
        rewritten = _closure_value(result.pop("unevaluatedProperties"))
        if "additionalProperties" in result:
            existing = _closure_value(result["additionalProperties"])
            if existing != rewritten:
                msg = (
                    f"{name}{pointer}: `unevaluatedProperties` and "
                    "`additionalProperties` state closure differently; the pass "
                    "will not choose between two stated intents"
                )
                raise PreparationConflictError(msg)
        else:
            result["additionalProperties"] = rewritten
            out.append(Rewrite("unevaluated-properties-to-additional", name, pointer))
    return result


def prepare_for_python(document: dict[str, Any], name: str = "input.schema.json") -> Prepared:
    rewrites: list[Rewrite] = []
    prepared = _walk(copy.deepcopy(document), name, "", rewrites)
    return Prepared(documents={name: prepared}, rewrites=rewrites)


def prepare_input_set(paths: list[Path]) -> Prepared:
    """The multi-document form.

    The thirteen published documents `$ref` one another by relative filename and
    the generator resolves that itself as a modular input directory, emitting one
    module per document. Every `$ref` is copied verbatim, so a reference that
    resolved before the pass resolves after it.
    """

    documents: dict[str, dict[str, Any]] = {}
    rewrites: list[Rewrite] = []
    for path in sorted(paths, key=lambda p: p.name):
        loaded = json.loads(path.read_text(encoding="utf-8"))
        documents[path.name] = _walk(loaded, path.name, "", rewrites)
    return Prepared(documents=documents, rewrites=rewrites)
