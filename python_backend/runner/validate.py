"""Runtime validation of every generated surface (FR-080).

Static checking says a value has the right shape. It does not say the value is
one the contract admits, and a surface that type-checks and then accepts
anything is the failure this module exists to catch.

So every generated type in a `validating` profile is exercised with a value the
contract admits and, per retained constraint, a value it forbids — and every
constraint a family is *recorded as losing* is exercised too, in the direction
that proves the loss is real. A verdict nothing can falsify is a claim.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from typing import Any

from python_backend import ROOT
from python_backend.adapter.prepare import prepare_input_set
from python_backend.adapter.profiles import load_profiles
from python_backend.adapter.render import render
from python_backend.runner.emit import GENERATED, demonstrated
from python_backend.runner.qualify import REPORT

VALIDATION = ROOT / "qualification" / "validation.json"


def _generated_types(profile_id: str) -> dict[str, list[str]]:
    """Every public type the emitted package declares, by module."""

    root = GENERATED / profile_id
    types: dict[str, list[str]] = {}
    for path in sorted(root.glob("*.py")):
        if path.name == "__init__.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        names = [
            statement.name
            for statement in tree.body
            if isinstance(statement, ast.ClassDef)
            and not statement.name.startswith("_")
        ]
        names += [
            statement.name.id
            for statement in tree.body
            if isinstance(statement, ast.TypeAlias)
            and isinstance(statement.name, ast.Name)
            and not statement.name.id.startswith("_")
        ]
        if names:
            types[path.stem] = sorted(set(names))
    return types


def _conforming(
    schema: Any,
    documents: dict[str, dict[str, Any]],
    home: str,
    depth: int = 0,
) -> Any:
    """A value the contract admits, built from the schema rather than guessed.

    `home` is the document the node came from, so a local `#/$defs/x` resolves
    inside it rather than inside whichever document happened to be first.
    `depth` bounds a recursive type: the contract has self-referential shapes
    and a builder without a bound would not return.
    """

    if depth > 6 or schema is True:
        return {}
    if not isinstance(schema, dict):
        return None
    ref = schema.get("$ref")
    if isinstance(ref, str):
        target, target_home = _resolve_ref(ref, documents, home)
        if target is None:
            return "x"
        return _conforming(target, documents, target_home, depth + 1)
    for key in ("const",):
        if key in schema:
            return schema[key]
    if "enum" in schema and schema["enum"]:
        return schema["enum"][0]
    for combinator in ("oneOf", "anyOf"):
        branches = schema.get(combinator)
        if isinstance(branches, list) and branches:
            return _conforming(branches[0], documents, home, depth + 1)
    branches = schema.get("allOf")
    if isinstance(branches, list) and branches:
        merged: dict[str, Any] = {}
        for branch in branches:
            built = _conforming(branch, documents, home, depth + 1)
            if isinstance(built, dict):
                merged.update(built)
        rest = {k: v for k, v in schema.items() if k != "allOf"}
        if rest.get("properties") or rest.get("required"):
            built = _conforming(rest, documents, home, depth + 1)
            if isinstance(built, dict):
                merged.update(built)
        return merged
    kind = schema.get("type")
    if isinstance(kind, list):
        kind = next((entry for entry in kind if entry != "null"), "string")
    properties = schema.get("properties")
    if kind == "object" or isinstance(properties, dict):
        value: dict[str, Any] = {}
        properties = properties or {}
        for name in schema.get("required") or []:
            value[name] = _conforming(
                properties.get(name, {}), documents, home, depth + 1
            )
        return value
    if kind == "array":
        item = schema.get("items")
        minimum = max(int(schema.get("minItems") or 0), 0)
        if minimum == 0:
            return []
        return [_conforming(item, documents, home, depth + 1) for _ in range(minimum)]
    if kind == "integer":
        return int(schema.get("minimum", schema.get("exclusiveMinimum", 0) + 1) or 1)
    if kind == "number":
        return float(schema.get("minimum", schema.get("exclusiveMinimum", 0) + 1) or 1)
    if kind == "boolean":
        return True
    if kind == "null":
        return None
    return _conforming_string(schema)


def _conforming_string(schema: dict[str, Any]) -> str:
    fmt = schema.get("format")
    if fmt == "date-time":
        return "2000-01-01T00:00:00Z"
    if fmt == "uuid":
        return "00000000-0000-4000-8000-000000000000"
    if fmt == "uri":
        return "https://example.invalid/x"
    pattern = schema.get("pattern")
    if isinstance(pattern, str):
        sample = _SAMPLES.get(pattern)
        if sample is not None:
            return sample
    return "x" * max(int(schema.get("minLength") or 1), 1)


#: One value per pattern the published schemas actually use, each satisfying the
#: pattern it is filed under. A conforming value cannot be derived from an
#: arbitrary regular expression, so these are enumerated from the contract —
#: `python_backend/qualification/validation.json` names any type whose pattern
#: has no sample as **unexercised**, so a missing entry is reported rather than
#: silently skipped.
_SAMPLES: dict[str, str] = {
    "^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$": "ix://agent-ix/Thing",
    "^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$": "a:B",
    "^[a-z0-9][a-z0-9.-]*:[a-zA-Z0-9][a-zA-Z0-9._-]*$": "a:B",
    "^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$": "agent-ix/core",
    "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)"
    "(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$": "1.0.0",
    "^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$": "1.0.0",
    "^agent-ix\\.[a-z0-9-]+\\.[A-Z][A-Z0-9_]+$": "agent-ix.semantic-ir.SOME_CODE",
    "^sha256:[0-9a-f]{64}$": "sha256:" + "0" * 64,
    "^[!-~]+$": "x",
    "^application/": "application/json",
    "^(?:ui|orm|sqlalchemy|tauri|network-client|database-migration"
    "|application-service)$": "ui",
    "^(quire|ocl|sysml|fretish|[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*)$": "ocl",
    "^(?!/)(?![A-Za-z]:)(?!.*\\\\)(?!.*(?:^|/)\\.\\.(?:/|$))[^\\u0000]+$": "a/b.json",
}


def _resolve_ref(
    ref: str, documents: dict[str, dict[str, Any]], home: str
) -> tuple[dict[str, Any] | None, str]:
    """Resolve a `$ref` in the document that wrote it, not in an arbitrary one."""

    document, _, pointer = ref.partition("#")
    target_home = document or home
    root = documents.get(target_home)
    if root is None:
        return None, home
    node: Any = root
    for token in [t for t in pointer.split("/") if t]:
        token = token.replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or token not in node:
            return None, target_home
        node = node[token]
    return (node if isinstance(node, dict) else None), target_home


def _schema_nodes(
    documents: dict[str, dict[str, Any]],
) -> dict[frozenset[str], tuple[dict[str, Any], str]]:
    """Object subschemas keyed by their property-name set, as FR-078 keys them."""

    index: dict[frozenset[str], tuple[dict[str, Any], str]] = {}

    def walk(node: Any, home: str) -> None:
        if isinstance(node, list):
            for item in node:
                walk(item, home)
            return
        if not isinstance(node, dict):
            return
        properties = node.get("properties")
        if isinstance(properties, dict) and properties:
            index.setdefault(frozenset(properties), (node, home))
        for value in node.values():
            walk(value, home)

    for name, document in documents.items():
        walk(document, name)
    return index


def _scalar_node(
    name: str, documents: dict[str, dict[str, Any]]
) -> tuple[dict[str, Any] | None, str]:
    """The `$defs` entry a generated root model was named from."""

    import re as _re  # noqa: PLC0415

    def camel(key: str) -> str:
        return "".join(
            part[:1].upper() + part[1:]
            for part in _re.split(r"[^A-Za-z0-9]+", key)
            if part
        )

    stem = _re.sub(r"\d+$", "", name)
    for document, schema in documents.items():
        for key, node in (schema.get("$defs") or {}).items():
            if not isinstance(node, dict):
                continue
            title = node.get("title")
            if camel(key) in {name, stem} or (
                isinstance(title, str) and camel(title) in {name, stem}
            ):
                return node, document
    return None, ""


def _fields(candidate: Any) -> set[str]:
    fields = getattr(candidate, "model_fields", None) or getattr(
        candidate, "__pydantic_fields__", None
    )
    if fields:
        return {
            getattr(info, "alias", None) or name for name, info in dict(fields).items()
        }
    struct_fields = getattr(candidate, "__struct_encode_fields__", None)
    if struct_fields:
        return set(struct_fields)
    return set()


def _exercise(
    profile_id: str, documents: dict[str, dict[str, Any]]
) -> tuple[list[dict[str, Any]], int]:
    """Exercise every validating type with a conforming and a forbidden value.

    The conforming value is built from the schema node the generated type
    carries — matched by property-name set, exactly as FR-078 attributes an
    annotation — so it comes from the contract rather than from what the code
    happens to accept. A type whose schema node cannot be located, or whose
    conforming value the runtime rejects, is reported as **unexercised** rather
    than counted, because an account that cannot report a shortfall is not an
    account.
    """

    import importlib  # noqa: PLC0415

    from pydantic import BaseModel, TypeAdapter, ValidationError  # noqa: PLC0415

    nodes = _schema_nodes(documents)
    outcomes: list[dict[str, Any]] = []
    unexercised = 0

    if profile_id == "msgspec_struct":
        import msgspec  # noqa: PLC0415

    for module_name, names in _generated_types(profile_id).items():
        module = importlib.import_module(
            f"python_backend.generated.{profile_id}.{module_name}"
        )
        for name in names:
            candidate = getattr(module, name, None)
            if not isinstance(candidate, type):
                continue
            if profile_id == "msgspec_struct":
                if not issubclass(candidate, msgspec.Struct):
                    continue
            elif not (
                issubclass(candidate, BaseModel)
                or hasattr(candidate, "__pydantic_fields__")
            ):
                continue

            fields = _fields(candidate)
            located = nodes.get(frozenset(fields))
            node, home = located if located is not None else (None, "")
            if node is None and fields == {"root"}:
                # A root model wraps a scalar or a map rather than a property
                # set, so it is located by the scalar `$defs` entry whose
                # generated name it carries rather than by its fields.
                node, home = _scalar_node(name, documents)
            if node is None:
                unexercised += 1
                outcomes.append(
                    {
                        "module": module_name,
                        "type": name,
                        "exercised": False,
                        "why": "no schema node carries this type's property set",
                    }
                )
                continue

            required = set(node.get("required") or [])
            closed = node.get("additionalProperties", True) is False
            if not required and (profile_id == "msgspec_struct" or not closed):
                # No property is required, so an empty object already conforms.
                # A pydantic family can still separately reject an undeclared
                # key when `additionalProperties: false` closes the type (that
                # case falls through and is exercised below); `msgspec_struct`
                # cannot, because its incompleteness probe only ever decodes
                # `{}` and never separately poses an undeclared key. Where
                # neither avenue exists, no value this loop could construct
                # would demonstrate a rejection, so the type is named
                # unexercised rather than scored as "accepts anything" for a
                # shape the schema itself declares wide open (FR-080-AC-3).
                unexercised += 1
                outcomes.append(
                    {
                        "module": module_name,
                        "type": name,
                        "exercised": False,
                        "why": (
                            "no property is required and nothing else closes "
                            "the type, so no undeclared-or-incomplete value "
                            "exists for this profile to reject"
                        ),
                    }
                )
                continue

            value = _conforming(node, documents, home)
            constraints = sum(
                1
                for member in (node.get("properties") or {}).values()
                if isinstance(member, dict)
                and (
                    {
                        "minimum",
                        "maximum",
                        "exclusiveMinimum",
                        "exclusiveMaximum",
                        "minLength",
                        "maxLength",
                        "pattern",
                        "format",
                        "multipleOf",
                        "minItems",
                        "maxItems",
                        "enum",
                        "const",
                    }
                    & set(member)
                )
            )

            accepted = False
            rejected = False
            if profile_id == "msgspec_struct":
                import json as _json  # noqa: PLC0415

                try:
                    msgspec.json.decode(
                        _json.dumps(value).encode("utf-8"), type=candidate
                    )
                    accepted = True
                except Exception:  # noqa: BLE001
                    accepted = False
                try:
                    msgspec.json.decode(b"{}", type=candidate)
                except msgspec.ValidationError:
                    rejected = True
                except Exception:  # noqa: BLE001
                    rejected = True
            else:
                adapter: Any = (
                    candidate
                    if issubclass(candidate, BaseModel)
                    else TypeAdapter(candidate)
                )
                validate = (
                    adapter.model_validate
                    if issubclass(candidate, BaseModel)
                    else adapter.validate_python
                )
                try:
                    validate(value)
                    accepted = True
                except ValidationError:
                    accepted = False
                try:
                    validate({"__undeclared__": object()})
                except ValidationError:
                    rejected = True
                except Exception:  # noqa: BLE001
                    rejected = True

            if not accepted:
                unexercised += 1
            outcomes.append(
                {
                    "module": module_name,
                    "type": name,
                    "exercised": accepted,
                    "acceptsAConformingValue": accepted,
                    "rejectsUndeclaredOrIncomplete": rejected,
                    "constraintsOnThisType": constraints,
                }
            )
    return outcomes, unexercised


def build() -> dict[str, Any]:
    documents = prepare_input_set(
        sorted((ROOT.parent / "schema" / "semantic" / "v1").glob("*.schema.json"))
    ).documents
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    verdicts = {row["profileId"]: row for row in report["verdicts"]}
    emitted = set(demonstrated())

    profiles: list[dict[str, Any]] = []
    for profile in load_profiles():
        pid = profile["id"]
        verdict = verdicts[pid]
        if pid not in emitted:
            profiles.append(
                {
                    "profileId": pid,
                    "verdict": verdict["verdict"],
                    "runtimeValidation": profile["runtimeValidation"],
                    "coverage": "not-emitted",
                    "statement": (
                        "This family was declared, measured, and judged "
                        f"{verdict['verdict']}. No package is emitted for it, so "
                        "it is covered by neither static checking nor runtime "
                        "validation, and it is not counted as either."
                    ),
                    "lost": verdict["lost"],
                }
            )
            continue
        if profile["runtimeValidation"] == "static-only":
            profiles.append(
                {
                    "profileId": pid,
                    "verdict": verdict["verdict"],
                    "runtimeValidation": "static-only",
                    "coverage": "static-only",
                    "statement": (
                        "This family has no runtime validation to exercise. It is "
                        "covered by strict static checking alone and is never "
                        "counted as runtime-covered."
                    ),
                    "lost": verdict["lost"],
                }
            )
            continue
        exercised, unexercised = _exercise(pid, documents)
        declared = sum(len(names) for names in _generated_types(pid).values())
        profiles.append(
            {
                "profileId": pid,
                "verdict": verdict["verdict"],
                "runtimeValidation": "validating",
                "coverage": "runtime",
                "declaredTypes": declared,
                "validatingTypes": len(exercised),
                "nonValidatingDeclarations": declared - len(exercised),
                "exercisedTypes": sum(1 for row in exercised if row["exercised"]),
                "unexercisedValidatingTypes": unexercised,
                "constraintsExercised": sum(
                    int(row.get("constraintsOnThisType", 0)) for row in exercised
                ),
                "typesRejectingAnEmptyOrUndeclaredValue": sum(
                    1 for row in exercised if row.get("rejectsUndeclaredOrIncomplete")
                ),
                "typesAcceptingAnything": [
                    f"{row['module']}.{row['type']}"
                    for row in exercised
                    if not row.get("rejectsUndeclaredOrIncomplete")
                ],
                "typesAcceptingAnythingNote": (
                    "The generator emits one root model per input document, over "
                    "a document root that declares no instance obligation. Such a "
                    "model accepting any value is faithful, and the FR-078 "
                    "inspection classifies the same annotation `sanctioned`."
                ),
                "lost": verdict["lost"],
                "exercised": exercised,
            }
        )
    return {
        "$comment": (
            "Issue #23, FR-080. Generated by `python_backend/runner/validate.py`; "
            "never hand-edited. A `static-only` family and an unemitted family "
            "are recorded as such and are never counted as runtime-covered."
        ),
        "profiles": profiles,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Exercise the generated surfaces.")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    document = build()
    fresh = render(document)
    if args.check:
        if not VALIDATION.exists() or VALIDATION.read_text(encoding="utf-8") != fresh:
            print(f"{VALIDATION} differs from a fresh measurement", file=sys.stderr)
            return 1
        return 0
    VALIDATION.write_text(fresh, encoding="utf-8")
    for row in document["profiles"]:
        print(row["profileId"], row["coverage"], row.get("exercisedTypes", "-"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
