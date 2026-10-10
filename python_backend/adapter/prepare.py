"""The owned schema preparation pass (FR-074).

One rewrite, measured rather than assumed. The official TypeSpec JSON Schema
emitter states a sealed model with `unevaluatedProperties`, usually as the
always-false schema `{"not": {}}`. The pinned generator reads neither: measured
against it, `unevaluatedProperties: {"not": {}}` produces `extra='allow'`
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


def _expand_conditional_numeric(
    schema: dict[str, Any], name: str, pointer: str, out: list[Rewrite]
) -> dict[str, Any]:
    """Express precision-dependent bounds as a generator-native tagged union.

    The pinned generator carries scalar bounds but drops an object property's
    ``if``/``then`` relation.  A finite ``oneOf`` over the same object shape is
    equivalent here and is emitted natively as constrained variants by all
    validating Python families.  This keeps the source schema authoritative;
    no generated Python text is amended after the subprocess returns.
    """

    clauses = schema.get("allOf")
    properties = schema.get("properties")
    if schema.get("type") != "object" or not isinstance(clauses, list) or not clauses:
        return schema
    if (
        not isinstance(properties, dict)
        or "precision" not in properties
        or "scale" not in properties
        or "precision" not in schema.get("required", [])
    ):
        return schema

    precision_schema = properties["precision"]
    scale_schema = properties["scale"]
    if not isinstance(precision_schema, dict) or not isinstance(scale_schema, dict):
        return schema
    if "const" in precision_schema:
        return schema
    if (
        precision_schema.get("type") != "integer"
        or scale_schema.get("type") != "integer"
    ):
        return schema
    minimum = precision_schema.get("minimum")
    maximum = precision_schema.get("maximum")
    if type(minimum) is not int or type(maximum) is not int:
        return schema
    base_scale_maximum = scale_schema.get("maximum")
    if "maximum" in scale_schema and type(base_scale_maximum) is not int:
        return schema

    rules: list[tuple[int, int]] = []
    for clause in clauses:
        if not isinstance(clause, dict):
            return schema
        if set(clause) != {"if", "then"}:
            return schema
        if (
            not isinstance(clause["then"], dict)
            or set(clause["then"]) != {"properties"}
        ):
            return schema
        if not isinstance(clause["if"], dict) or set(clause["if"]) != {"properties"}:
            return schema
        condition = clause["if"]["properties"]
        consequent = clause.get("then", {}).get("properties", {})
        if len(condition) != 1 or len(consequent) != 1:
            return schema
        guarded_name, guarded = next(iter(condition.items()))
        bounded_name, bounded = next(iter(consequent.items()))
        if (
            guarded_name != "precision"
            or bounded_name != "scale"
            or not isinstance(guarded, dict)
            or not isinstance(bounded, dict)
            or set(guarded) != {"const"}
            or not set(bounded) <= {"type", "maximum"}
            or type(guarded.get("const")) is not int
            or type(bounded.get("maximum")) is not int
            or ("type" in bounded and bounded["type"] != scale_schema.get("type"))
        ):
            return schema
        rule = (guarded["const"], bounded["maximum"])
        if rule not in rules:
            if any(existing_precision == rule[0] for existing_precision, _ in rules):
                return schema
            rules.append(rule)

    expected = set(range(minimum, maximum + 1))
    if {precision for precision, _ in rules} != expected:
        return schema

    branches: list[dict[str, Any]] = []
    for precision, maximum in rules:
        branch = copy.deepcopy(schema)
        branch.pop("allOf")
        branch["properties"]["precision"]["const"] = precision
        branch["properties"]["scale"]["maximum"] = (
            min(base_scale_maximum, maximum)
            if type(base_scale_maximum) is int
            else maximum
        )
        branches.append(branch)

    wrapper = {
        key: copy.deepcopy(value)
        for key, value in schema.items()
        if key
        not in {"type", "required", "properties", "additionalProperties", "allOf"}
    }
    wrapper["oneOf"] = branches
    out.append(Rewrite("conditional-numeric-to-one-of", name, pointer))
    return wrapper


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

    if "enum" in result and "default" in result:
        # Measured against the pinned generator: a property that
        # carries both `enum` and a scalar `default` emits a class attribute
        # typed as the enum but assigned the raw default *string*, which
        # mypy --strict correctly rejects as an incompatible assignment in
        # every family (FR-080-AC-1). `default` is presentational — it does
        # not change what value a document is valid against — so dropping it
        # here changes nothing this pass validates; a property outside its
        # schema's `required` list, which is the only place this combination
        # occurs today, was already going to generate as `Optional[...] =
        # None` regardless of the stated default.
        result.pop("default")
        out.append(Rewrite("enum-default-conflict-dropped", name, pointer))

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
    return _expand_conditional_numeric(result, name, pointer, out)


def prepare_for_python(
    document: dict[str, Any], name: str = "input.schema.json"
) -> Prepared:
    rewrites: list[Rewrite] = []
    prepared = _walk(copy.deepcopy(document), name, "", rewrites)
    return Prepared(documents={name: prepared}, rewrites=rewrites)


def prepare_documents(documents: dict[str, dict[str, Any]]) -> Prepared:
    """Prepare an in-memory input set.

    The public form of what `prepare_input_set` does after reading from disk,
    so a caller with documents in hand does not reach into this module's
    internals to get them.
    """

    rewrites: list[Rewrite] = []
    prepared = {
        name: _walk(copy.deepcopy(document), name, "", rewrites)
        for name, document in documents.items()
    }
    return Prepared(documents=prepared, rewrites=rewrites)


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
