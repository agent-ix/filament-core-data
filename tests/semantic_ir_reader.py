"""Independent Python reader for semantic IR contract 2.0.0 (issue #93, TC-232).

This is test-only evidence: it is the second reader that FR-020-AC-8 requires,
implemented without reference to the TypeScript reader's code so that the two
can disagree. It validates a document against the published JSON Schema family
with ``jsonschema`` and then applies the cross-field rules of FR-027..FR-030.

Run as a script to print one JSON verdict per golden fixture, schema negative
case, and reader negative case::

    python tests/semantic_ir_reader.py --verdicts

The TypeScript suite compares that output with its own verdicts.
"""

from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_ROOT = ROOT / "schema" / "semantic" / "v1"
FIXTURE_ROOT = ROOT / "fixtures" / "semantic" / "v1"

CATEGORIES = {
    "structural",
    "behavioral",
    "dataflow",
    "dependency",
    "realization",
    "governance",
    "traceability",
}
CORE_LANGUAGES = {"quire", "ocl", "sysml", "fretish"}
NAMESPACED = re.compile(r"^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$")
BOUNDS = {"min", "max", "exclusiveMin", "exclusiveMax"}
TEMPORAL = {"date", "datetime", "duration"}
APPLICABILITY: dict[str, set[str]] = {
    "min": {"integer", "number", *TEMPORAL},
    "max": {"integer", "number", *TEMPORAL},
    "exclusiveMin": {"integer", "number", *TEMPORAL},
    "exclusiveMax": {"integer", "number", *TEMPORAL},
    "minLength": {"string", "bytes"},
    "maxLength": {"string", "bytes"},
    "pattern": {"string"},
    "enumValues": {
        "boolean",
        "integer",
        "number",
        "string",
        "bytes",
        "date",
        "datetime",
        "duration",
        "uuid",
    },
    "nonEmpty": {"string", "bytes", "sequence", "map"},
    "unique": {"sequence"},
    "format": {"string"},
}


# Contract 2.0.0 construct kinds are module data (FR-142): a kind is a core
# string or a `{module, name}` object whose declaration the document's
# `constructs` table carries. A record and any construct kind may carry
# relationships and operations. What a declaration requires of a type of its
# kind is data too, so the schema stage below reads it from the vocabulary.


def _is_edge_kind(kind: Any) -> bool:
    return kind == "record" or isinstance(kind, dict)


def _kind_name(kind: Any) -> str:
    """A core kind, or a construct kind's `name`."""
    if isinstance(kind, dict):
        return str(kind.get("name"))
    return str(kind)


def _diag(code: str, path: str, message: str) -> dict[str, str]:
    return {"code": code, "path": path, "message": message}


def _objects(value: Any) -> list[dict[str, Any]]:
    return (
        [item for item in value if isinstance(item, dict)]
        if isinstance(value, list)
        else []
    )


def resolve_kind(
    types: dict[str, dict[str, Any]], type_ref: Any, seen: set[str] | None = None
) -> tuple[str, str | None] | None:
    seen = seen or set()
    if not isinstance(type_ref, str) or type_ref in seen or type_ref not in types:
        return None
    seen.add(type_ref)
    definition = types[type_ref]
    if definition.get("kind") == "alias":
        return resolve_kind(types, definition.get("target"), seen)
    scalar = definition.get("scalar")
    return (
        _kind_name(definition.get("kind")),
        scalar if isinstance(scalar, str) else None,
    )


def multiplicity_from_presence(presence: Any) -> dict[str, int]:
    return (
        {"lower": 0, "upper": 1} if presence == "optional" else {"lower": 1, "upper": 1}
    )


def _check_multiplicity(
    value: Any, path: str, out: list[dict[str, str]]
) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    lower = value.get("lower")
    upper = value.get("upper")
    if not isinstance(lower, int) or isinstance(lower, bool) or lower < 0:
        out.append(
            _diag(
                "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
                f"{path}.lower",
                "lower must be >= 0",
            )
        )
        return None
    if upper is not None and (
        not isinstance(upper, int) or isinstance(upper, bool) or upper < lower
    ):
        out.append(
            _diag(
                "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
                f"{path}.upper",
                "upper must be >= lower",
            )
        )
        return None
    collection = upper is None or upper > 1
    if not collection and ("ordered" in value or "unique" in value):
        out.append(
            _diag(
                "agent-ix.semantic-ir.FLAGS_ON_NON_COLLECTION",
                path,
                "flags need a collection",
            )
        )
    return value


def _check_field(
    field: dict[str, Any],
    path: str,
    version: str,
    types: dict[str, dict[str, Any]],
    out: list[dict[str, str]],
) -> None:
    resolved = resolve_kind(types, field.get("typeRef"))
    if resolved is None:
        out.append(
            _diag(
                "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
                f"{path}.typeRef",
                "typeRef does not resolve",
            )
        )
    if "multiplicity" not in field:
        # fcd#179: 2.0.0 is the only contract, and its schema requires
        # `multiplicity` on every field, so a document reaching this reader
        # without one is always in violation (no version branch left).
        # Refused, not defaulted: no fallback value is computed for it.
        out.append(
            _diag(
                "agent-ix.semantic-ir.MISSING_MULTIPLICITY",
                f"{path}.multiplicity",
                f"{version} requires multiplicity",
            )
        )
    else:
        _check_multiplicity(field["multiplicity"], f"{path}.multiplicity", out)
    # fcd#179 deleted `PRESENCE_MULTIPLICITY_MISMATCH`, the contract `1.1.0`
    # rule that re-derived `presence` from `multiplicity` and reported a
    # disagreement; contract `2.0.0` authors `presence` independently
    # (FR-106) and enforces no agreement between the two.
    if "unit" in field:
        unit = field["unit"]
        if not isinstance(unit, str) or not unit:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.INVALID_UNIT",
                    f"{path}.unit",
                    "unit must be a non-empty symbol",
                )
            )
        elif resolved is not None and resolved[0] != "scalar":
            out.append(
                _diag(
                    "agent-ix.semantic-ir.UNIT_ON_NON_SCALAR",
                    f"{path}.unit",
                    "unit needs a scalar",
                )
            )


def _check_constraint(
    constraint: dict[str, Any],
    path: str,
    types: dict[str, dict[str, Any]],
    out: list[dict[str, str]],
) -> None:
    keyword = str(constraint.get("keyword"))
    allowed = APPLICABILITY.get(keyword)
    if allowed is None:
        out.append(
            _diag(
                "agent-ix.semantic-ir.UNKNOWN_CONSTRAINT_KEYWORD",
                f"{path}.keyword",
                f"unknown keyword {keyword}",
            )
        )
        return
    resolved = resolve_kind(types, constraint.get("appliesTo"))
    if resolved is None:
        out.append(
            _diag(
                "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
                f"{path}.appliesTo",
                "appliesTo does not resolve",
            )
        )
        return
    kind, scalar = resolved
    subject = scalar if kind == "scalar" and scalar else kind
    if subject not in allowed:
        out.append(
            _diag(
                "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE",
                path,
                f"{keyword} does not apply to {subject}",
            )
        )
    operands = (
        constraint.get("operands")
        if isinstance(constraint.get("operands"), dict)
        else {}
    )
    if keyword == "pattern":
        # Python's ``re`` stands in for ecma-262 here; the dialects differ on
        # some constructs, so a disagreement with the TypeScript reader on a
        # pattern case is a real finding, not noise (SR-035 FND-122).
        try:
            re.compile(str(operands.get("regex")))
        except re.error as error:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.INVALID_PATTERN",
                    f"{path}.operands.regex",
                    str(error),
                )
            )
    if keyword in BOUNDS and kind == "scalar":
        numeric = scalar in {"integer", "number"}
        value = operands.get("value")
        ok = (
            (isinstance(value, (int, float)) and not isinstance(value, bool))
            if numeric
            else isinstance(value, str)
        )
        if not ok:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.INVALID_OPERAND",
                    f"{path}.operands.value",
                    "operand type does not match the scalar",
                )
            )


def _check_type(
    definition: dict[str, Any],
    path: str,
    version: str,
    types: dict[str, dict[str, Any]],
    exports: set[str],
    out: list[dict[str, str]],
) -> None:
    is_record = _is_edge_kind(definition.get("kind"))
    for index, field in enumerate(_objects(definition.get("fields"))):
        _check_field(field, f"{path}.fields.{index}", version, types, out)
    for index, constraint in enumerate(_objects(definition.get("constraints"))):
        _check_constraint(constraint, f"{path}.constraints.{index}", types, out)
    if not is_record and ("relationships" in definition or "operations" in definition):
        out.append(
            _diag(
                "agent-ix.semantic-ir.NODES_ON_NON_RECORD",
                path,
                "relationships/operations need a record",
            )
        )
    clause_ids: set[str] = set()
    for index, clause in enumerate(_objects(definition.get("clauses"))):
        clause_id = str(clause.get("clauseId"))
        if clause_id in clause_ids:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.DUPLICATE_CLAUSE_ID",
                    f"{path}.clauses.{index}.clauseId",
                    "duplicate clauseId",
                )
            )
        clause_ids.add(clause_id)
        language = str(clause.get("language"))
        if language not in CORE_LANGUAGES and not NAMESPACED.match(language):
            out.append(
                _diag(
                    "agent-ix.semantic-ir.UNKNOWN_CLAUSE_LANGUAGE",
                    f"{path}.clauses.{index}.language",
                    "bare unknown language",
                )
            )
        origin = clause.get("origin")
        if (
            isinstance(origin, dict)
            and "source" in origin
            and clause.get("sourceSpan") is None
        ):
            out.append(
                _diag(
                    "agent-ix.semantic-ir.MISSING_SOURCE_SPAN",
                    f"{path}.clauses.{index}.sourceSpan",
                    "source clause needs a span",
                )
            )
    for index, relationship in enumerate(_objects(definition.get("relationships"))):
        target = str(relationship.get("target"))
        if target not in types and target not in exports:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET",
                    f"{path}.relationships.{index}.target",
                    "target does not resolve",
                )
            )
        if str(relationship.get("category")) not in CATEGORIES:
            out.append(
                _diag(
                    "agent-ix.semantic-ir.UNKNOWN_EDGE_CATEGORY",
                    f"{path}.relationships.{index}.category",
                    "category outside FR-040",
                )
            )
        _check_multiplicity(
            relationship.get("multiplicity"),
            f"{path}.relationships.{index}.multiplicity",
            out,
        )
    for index, operation in enumerate(_objects(definition.get("operations"))):
        names: set[str] = set()
        for param_index, param in enumerate(_objects(operation.get("params"))):
            name = str(param.get("name"))
            if name in names:
                out.append(
                    _diag(
                        "agent-ix.semantic-ir.DUPLICATE_PARAM",
                        f"{path}.operations.{index}.params.{param_index}.name",
                        "duplicate param",
                    )
                )
            names.add(name)
            _check_field(
                param,
                f"{path}.operations.{index}.params.{param_index}",
                version,
                types,
                out,
            )
        returns = operation.get("returns")
        if isinstance(returns, dict):
            if resolve_kind(types, returns.get("typeRef")) is None:
                out.append(
                    _diag(
                        "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
                        f"{path}.operations.{index}.returns.typeRef",
                        "returns does not resolve",
                    )
                )
            _check_multiplicity(
                returns.get("multiplicity"),
                f"{path}.operations.{index}.returns.multiplicity",
                out,
            )
        # FR-141: `quire` is the one checked clause language; an inline clause
        # in any other admitted language is carried unchecked (an advisory).
        for side in ("pre", "post"):
            bound = operation.get(side) if isinstance(operation.get(side), list) else []
            for clause_index, clause in enumerate(bound):
                if isinstance(clause, dict) and clause.get("language") != "quire":
                    out.append(
                        _diag(
                            "agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED",
                            f"{path}.operations.{index}.{side}.{clause_index}.language",
                            "carried unchecked",
                        )
                    )
        for side in ("pre", "post"):
            refs = operation.get(side) if isinstance(operation.get(side), list) else []
            for ref_index, ref in enumerate(refs):
                if not isinstance(ref, dict) and str(ref) not in clause_ids:
                    out.append(
                        _diag(
                            "agent-ix.semantic-ir.DANGLING_CLAUSE_REF",
                            f"{path}.operations.{index}.{side}.{ref_index}",
                            "absent clauseId",
                        )
                    )
    for label in ("relationships", "operations", "clauses"):
        identities: set[str] = set()
        for index, entry in enumerate(_objects(definition.get(label))):
            identity = str(entry.get("identity"))
            if identity in identities:
                out.append(
                    _diag(
                        "agent-ix.semantic-ir.DUPLICATE_IDENTITY",
                        f"{path}.{label}.{index}.identity",
                        "duplicate identity",
                    )
                )
            identities.add(identity)


def _check_composite_cycles(
    types: dict[str, dict[str, Any]], out: list[dict[str, str]]
) -> None:
    order = list(types.keys())
    edges: dict[str, list[tuple[str, str]]] = {}
    for index, identity in enumerate(order):
        edges[identity] = [
            (
                str(relationship.get("target")),
                f"types.{index}.relationships.{rel_index}",
            )
            for rel_index, relationship in enumerate(
                _objects(types[identity].get("relationships"))
            )
            if relationship.get("composite") is True
        ]
    state: dict[str, str] = {}

    def visit(node: str) -> None:
        state[node] = "open"
        for target, path in edges.get(node, []):
            status = state.get(target)
            if status == "open":
                out.append(
                    _diag(
                        "agent-ix.semantic-ir.COMPOSITE_CYCLE",
                        path,
                        f"composite cycle at {target}",
                    )
                )
            elif status is None and target in edges:
                visit(target)
        state[node] = "done"

    for node in order:
        if node not in state:
            visit(node)


def read_semantic_ir(
    document: Any, lock_exports: set[str] | None = None
) -> list[dict[str, str]]:
    """Return the cross-field diagnostics; schema validity is checked separately."""
    out: list[dict[str, str]] = []
    if not isinstance(document, dict):
        return [_diag("agent-ix.semantic-ir.INVALID_DOCUMENT", "", "not an object")]
    version = str(document.get("contractVersion"))
    types = {
        str(definition.get("identity")): definition
        for definition in _objects(document.get("types"))
    }
    exports = set(lock_exports or ())
    for index, definition in enumerate(_objects(document.get("types"))):
        _check_type(definition, f"types.{index}", version, types, exports, out)
    _check_composite_cycles(types, out)
    return out


def _integral_floats(value: Any) -> Any:
    """ES6/RFC 8785 number form: an integral float serializes without ``.0``."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        return [_integral_floats(item) for item in value]
    if isinstance(value, dict):
        return {key: _integral_floats(item) for key, item in value.items()}
    return value


def canonical(value: Any) -> str:
    return json.dumps(
        _integral_floats(value),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def normalize(document: Any) -> str:
    """Normalized bytes materialize `nullable` as a literal boolean on every
    field and operation parameter, unconditionally on contractVersion.
    `multiplicity` and `presence` are schema-required and independently
    authored; neither is ever derived from the other here."""
    if not isinstance(document, dict):
        return canonical(document)
    copy_ = copy.deepcopy(document)

    def materialize(field: dict[str, Any]) -> None:
        field["nullable"] = field.get("nullable") is True

    for definition in _objects(copy_.get("types")):
        for field in _objects(definition.get("fields")):
            materialize(field)
        for operation in _objects(definition.get("operations")):
            for param in _objects(operation.get("params")):
                materialize(param)
    return canonical(copy_)


def _schema_validator() -> Any:
    from jsonschema import Draft202012Validator
    from referencing import Registry, Resource

    resources = []
    for path in sorted(SCHEMA_ROOT.glob("*.schema.json")):
        schema = json.loads(path.read_text())
        resources.append((schema["$id"], Resource.from_contents(schema)))
    registry = Registry().with_resources(resources)
    ir = json.loads((SCHEMA_ROOT / "semantic-ir.schema.json").read_text())
    return Draft202012Validator(ir, registry=registry)


VOCABULARY = json.loads((SCHEMA_ROOT / "construct-vocabulary.json").read_text())
MEMBER_DEFAULTS = {
    member["name"]: member["default"] for member in VOCABULARY["members"]
}
# A rule that states a cardinality: the member it names holds at least one item.
NON_EMPTY_RULES = {"min_clauses": "clauses", "min_operations": "operations"}


def construct_findings(document: Any) -> list[str]:
    """The schema-stage requirements a 2.0.0 construct declaration places on types.

    A type of a construct kind must name a `constructs` entry, carry each member
    the declaration requires, carry none it forbids, and hold at least one item
    in a member a cardinality rule names; a type of a core kind carries no
    construct member; every declaration is used by some type.
    """
    if not isinstance(document, dict) or document.get("contractVersion") != "2.0.0":
        return []
    out: list[str] = []
    entries = [
        (entry.get("kind"), entry.get("construct") or {})
        for entry in _objects(document.get("constructs"))
    ]
    used: set[int] = set()
    for index, definition in enumerate(_objects(document.get("types"))):
        at = f"types.{index}"
        kind = definition.get("kind")
        if not isinstance(kind, dict):
            for name, default in MEMBER_DEFAULTS.items():
                if default == "forbidden" and name in definition:
                    out.append(f"{at}.{name}: carried by a construct kind only")
            continue
        found = next(
            (
                position
                for position, (declared, _) in enumerate(entries)
                if isinstance(declared, dict)
                and (declared.get("module"), declared.get("name"))
                == (kind.get("module"), kind.get("name"))
            ),
            None,
        )
        if found is None:
            out.append(f"{at}.kind: names no constructs entry")
            continue
        used.add(found)
        declaration = entries[found][1]
        presences = declaration.get("members") or {}
        for name, default in MEMBER_DEFAULTS.items():
            presence = presences.get(name, default)
            if presence == "required" and name not in definition:
                out.append(f"{at}: requires {name}")
            elif presence == "forbidden" and name in definition:
                out.append(f"{at}.{name}: forbidden")
        for rule in declaration.get("rules") or []:
            name = NON_EMPTY_RULES.get(rule)
            if name is not None and definition.get(name) == []:
                out.append(f"{at}.{name}: declares at least one")
        if definition.get("identityFields") == []:
            out.append(f"{at}.identityFields: names at least one field")
    for position, (declared, _) in enumerate(entries):
        if isinstance(declared, dict) and position not in used:
            out.append(f"constructs.{position}.kind: no type is of that kind")
    return out


def schema_valid(validator: Any, document: Any) -> bool:
    return validator.is_valid(document) and not construct_findings(document)


def _set_at(value: Any, path: str, replacement: Any) -> None:
    parts = path.split(".")
    cursor = value
    for part in parts[:-1]:
        cursor = cursor[int(part)] if isinstance(cursor, list) else cursor[part]
    last = parts[-1]
    if isinstance(cursor, list):
        cursor[int(last)] = replacement
    else:
        cursor[last] = replacement


def _remove_at(value: Any, path: str) -> None:
    parts = path.split(".")
    cursor = value
    for part in parts[:-1]:
        cursor = cursor[int(part)] if isinstance(cursor, list) else cursor[part]
    last = parts[-1]
    if isinstance(cursor, list):
        del cursor[int(last)]
    else:
        del cursor[last]


def verdicts() -> list[dict[str, Any]]:
    """One verdict per golden fixture, schema negative case, and reader case."""
    validator = _schema_validator()
    results: list[dict[str, Any]] = []
    for name in sorted(
        path.name for path in (FIXTURE_ROOT / "positive").glob("semantic-ir*.json")
    ):
        document = json.loads((FIXTURE_ROOT / "positive" / name).read_text())
        results.append(
            {
                "id": f"positive/{name}",
                "schemaValid": schema_valid(validator, document),
                "diagnostics": sorted(d["code"] for d in read_semantic_ir(document)),
                "normalized": normalize(document),
            }
        )
    for case in json.loads((FIXTURE_ROOT / "negative" / "cases.json").read_text()):
        if case.get("schema") != "semantic-ir.schema.json":
            continue
        document = json.loads((FIXTURE_ROOT / case["base"]).read_text())
        if "set" in case:
            _set_at(document, case["set"]["path"], case["set"]["value"])
        if "remove" in case:
            _remove_at(document, case["remove"])
        results.append(
            {
                "id": f"negative/{case['id']}",
                "schemaValid": schema_valid(validator, document),
            }
        )
    for case in json.loads(
        (FIXTURE_ROOT / "negative" / "reader-cases.json").read_text()
    ):
        document = json.loads((FIXTURE_ROOT / case["base"]).read_text())
        _set_at(document, case["set"]["path"], case["set"]["value"])
        if "also" in case:
            _set_at(document, case["also"]["path"], case["also"]["value"])
        hits = [d for d in read_semantic_ir(document) if d["code"] == case["code"]]
        results.append(
            {
                "id": f"reader/{case['id']}",
                "code": case["code"],
                "hit": bool(hits),
                "path": hits[0]["path"] if hits else None,
            }
        )
    return results


def _cli_read(argv: list[str]) -> int:
    """``--read <file> [--export <identity> ...]``: print diagnostics as JSON."""
    path = argv[argv.index("--read") + 1]
    exports = {argv[i + 1] for i, arg in enumerate(argv) if arg == "--export"}
    document = json.loads(Path(path).read_text())
    validator = _schema_validator()
    result = {
        "schemaValid": schema_valid(validator, document),
        "diagnostics": read_semantic_ir(document, exports),
    }
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    if "--read" in sys.argv:
        sys.exit(_cli_read(sys.argv))
    if "--verdicts" in sys.argv:
        print(json.dumps(verdicts(), indent=None, sort_keys=True))
    else:
        print(__doc__)
