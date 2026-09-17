"""The construct module of a generated package (FR-079, FR-142).

The generator reads a JSON Schema document's instance shape and drops every
`x-agent-ix-*` annotation, so a contract 1.2.0 construct's members reach no
generated class. This module renders them into one more module of the same
package, `constructs.py`, read from the same documents the generator read:
there is still one lowering, the `json-schema` target's (FR-136).

What each construct becomes:

- a `state_machine`'s states: the `<Name>State` enum the generator renders from
  the schema's `$defs`, beside the machine's class;
- a `repository`: a `typing.Protocol` whose methods are its operations, typed
  by the generated classes of their parameter and return types;
- every other member: a module-level constant keyed by the generated class
  name, since Python states none of them in a class.

A `repository` and a `domain` have no instance, and their schema admits no
value (`{"not": {}}`), so they never reach the generator: `instance_documents`
leaves them out, and this module is the whole of their rendering.

Pure: the same documents render the same bytes, and nothing is imported, read
or written.
"""

from __future__ import annotations

import ast
import keyword
import re
from typing import Any

MODULE = "constructs.py"

SUBSETS = "x-agent-ix-subsets"

INSTANCELESS_KINDS: frozenset[str] = frozenset({"repository", "domain"})


def _module_name(document: str) -> str:
    """The module name the generator derives from a document file name."""

    return re.sub(r"[^0-9A-Za-z]+", "_", document.removesuffix(".json")).strip("_")


def _kind(document: dict[str, Any]) -> str | None:
    kind = document.get("x-agent-ix-kind")
    return kind if isinstance(kind, str) else None


def instance_documents(
    documents: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """The documents the generator renders a class from: every one with an instance."""

    return {
        name: document
        for name, document in documents.items()
        if _kind(document) not in INSTANCELESS_KINDS
    }


def _literal(value: Any) -> str:
    if value is None:
        return "None"
    if isinstance(value, bool):
        return "True" if value else "False"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        return repr(value)
    if isinstance(value, tuple):
        inner = ", ".join(_literal(item) for item in value)
        return f"({inner},)" if len(value) == 1 else f"({inner})"
    msg = f"no literal for {value!r}"
    raise TypeError(msg)


def _clause(clause: dict[str, Any]) -> tuple[str, str]:
    """An inline clause as (language, text)."""

    return (clause["language"], clause["text"])


def _identifier(text: str) -> str:
    name = re.sub(r"[^0-9A-Za-z_]+", "_", text)
    if not name or name[0].isdigit():
        name = f"_{name}"
    return f"{name}_" if keyword.iskeyword(name) else name


def _declared_name(node: ast.stmt) -> str | None:
    """The name a module statement declares a type under: a class or a type alias.

    The dataclass profile renders a scalar as `type UUIDModel = Annotated[...]`
    rather than as a class, and a construct member refers to it all the same.
    """

    if isinstance(node, ast.ClassDef | ast.TypeAlias):
        return node.name if isinstance(node, ast.ClassDef) else node.name.id
    return None


def _snake(name: str) -> str:
    """A method name in Python's own case: `findById` becomes `find_by_id`."""

    return re.sub(r"(?<=[0-9a-z])(?=[A-Z])", "_", name).lower()


class _Classes:
    """The generated class and module of every document, by semantic identity.

    A class is named by the document's `title`, except where the generator
    renames it so it does not shadow a name its module imports — `UUID` becomes
    `UUIDModel` — so the name is read from the generated module itself.
    """

    def __init__(
        self, documents: dict[str, dict[str, Any]], files: dict[str, str]
    ) -> None:
        self.by_identity: dict[str, tuple[str, str]] = {}
        self.title: dict[str, str] = {}
        self.field_names: dict[str, str] = {}
        for name, document in sorted(documents.items()):
            identity = document.get("x-agent-ix-semantic-id")
            title = document.get("title")
            for field, node in (document.get("properties") or {}).items():
                field_identity = node.get("x-agent-ix-semantic-id")
                if isinstance(field_identity, str):
                    self.field_names[field_identity] = field
            if not (isinstance(identity, str) and isinstance(title, str)):
                continue
            self.title[identity] = title
            module = _module_name(name)
            source = files.get(f"{module}.py")
            if source is None:
                continue
            declared = [_declared_name(node) for node in ast.parse(source).body]
            chosen = title if title in declared else f"{title}Model"
            if chosen in declared:
                self.by_identity[identity] = (module, chosen)
        self.imported: set[tuple[str, str]] = set()

    def name(self, identity: str) -> str:
        return self.title.get(identity, identity)

    def field(self, identity: str) -> str:
        return self.field_names.get(identity, identity)

    def annotation(self, identity: str) -> str:
        found = self.by_identity.get(identity)
        if found is None:
            msg = f"no generated class for {identity}"
            raise KeyError(msg)
        self.imported.add(found)
        return found[1]


def _typed(classes: _Classes, node: dict[str, Any]) -> str:
    """The Python annotation of a parameter or return by its field axes."""

    rendered = classes.annotation(node["typeRef"])
    multiplicity = node.get("multiplicity") or {}
    upper = multiplicity.get("upper")
    optional = node.get("presence") == "optional" or (
        upper == 1 and multiplicity.get("lower") == 0
    )
    if upper is None or upper > 1:
        rendered = f"list[{rendered}]"
        optional = node.get("presence") == "optional"
    if node.get("nullable") is True or optional:
        rendered = f"{rendered} | None"
    return rendered


def _mapping(
    name: str, annotation: str, rows: list[tuple[str, str]], doc: str
) -> list[str]:
    if not rows:
        return [f"#: {doc}", f"{name}: {annotation} = {{}}", ""]
    lines = [f"#: {doc}", f"{name}: {annotation} = {{"]
    lines.extend(f"    {key!r}: {value}," for key, value in sorted(rows))
    lines.append("}")
    lines.append("")
    return lines


def render(
    documents: dict[str, dict[str, Any]],
    index: dict[str, Any] | None,
    files: dict[str, str],
) -> str | None:
    """The construct module over `documents`, or `None` when none carries a construct.

    `files` is the generated package, from which a referenced class's name is
    read.
    """

    constructs = {
        name: document
        for name, document in sorted(documents.items())
        if _kind(document) is not None
    }
    populations = (index or {}).get("x-agent-ix-populations") or []
    if not constructs and not populations:
        return None

    classes = _Classes(documents, files)

    def rows(member: str, render_value: Any) -> list[tuple[str, str]]:
        found = []
        for document in constructs.values():
            value = document.get(member)
            if value is not None:
                found.append((document["title"], render_value(value)))
        return found

    def names(value: list[str]) -> str:
        return _literal(tuple(map(classes.name, value)))

    def strings(value: list[str]) -> str:
        return _literal(tuple(value))

    body: list[str] = []
    body += _mapping(
        "TYPE_KIND",
        "dict[str, str]",
        rows("x-agent-ix-kind", _literal),
        "The construct kind of each generated type.",
    )
    body += _mapping(
        "SUPERTYPES",
        "dict[str, tuple[str, ...]]",
        rows("x-agent-ix-supertypes", names),
        "The types each type specializes; its class carries their fields.",
    )
    body += _mapping(
        "ABSTRACT",
        "dict[str, bool]",
        rows("x-agent-ix-abstract", _literal),
        "The types that have no direct instances.",
    )
    body += _mapping(
        "IDENTITY_FIELDS",
        "dict[str, tuple[str, ...]]",
        rows("x-agent-ix-identity-fields", strings),
        "The fields that tell a type's instances apart, in declared order.",
    )
    body += _mapping(
        "OWNER",
        "dict[str, str]",
        rows("x-agent-ix-owner", lambda value: _literal(classes.name(value))),
        "The owner whose instance a nested entity's instance exists within.",
    )
    body += _mapping(
        "MEMBERS",
        "dict[str, tuple[str, ...]]",
        rows("x-agent-ix-members", names),
        "The member types of an aggregate root's boundary or a domain's namespace.",
    )
    body += _mapping(
        "OCCURRENCE_FIELD",
        "dict[str, str]",
        rows("x-agent-ix-occurrence-field", _literal),
        "The field recording the instant an event occurred.",
    )
    body += _mapping(
        "VALUE_EQUALITY",
        "dict[str, bool]",
        [
            (document["title"], "True")
            for document in constructs.values()
            if document.get("x-agent-ix-equality") == "value"
        ],
        "The value objects: two instances are equal when every field is equal.",
    )
    body += _mapping(
        "IMMUTABLE",
        "dict[str, bool]",
        [
            (document["title"], "True")
            for document in constructs.values()
            if document.get("readOnly") is True
        ],
        "The events: an instance records one occurrence and does not change.",
    )
    body += _mapping(
        "TRANSITIONS",
        "dict[str, tuple[tuple[str, str, str, str | None, tuple[str, ...]], ...]]",
        rows(
            "x-agent-ix-transitions",
            lambda value: _literal(
                tuple(
                    (
                        one["from"],
                        one["to"],
                        one["trigger"],
                        one.get("guard"),
                        tuple(classes.name(event) for event in one["emits"]),
                    )
                    for one in value
                )
            ),
        ),
        "Each transition as (from, to, trigger operation, guard clause id,"
        " emitted events).",
    )
    body += _mapping(
        "STEPS",
        "dict[str, tuple[tuple[str, str, tuple[str, ...], tuple[str, ...]], ...]]",
        rows(
            "x-agent-ix-steps",
            lambda value: _literal(
                tuple(
                    (
                        one["name"],
                        one["stepKind"],
                        tuple(classes.name(event) for event in one["consumes"]),
                        tuple(classes.name(event) for event in one["emits"]),
                    )
                    for one in value
                )
            ),
        ),
        "A process's ordered steps as (name, step kind, consumed events,"
        " emitted events).",
    )
    body += _mapping(
        "PERSISTS",
        "dict[str, tuple[str, ...]]",
        rows("x-agent-ix-persists", names),
        "The types a repository persists.",
    )
    body += _mapping(
        "VOCABULARY",
        "dict[str, tuple[tuple[str, str], ...]]",
        rows(
            "x-agent-ix-vocabulary",
            lambda value: _literal(tuple((one["term"], one["doc"]) for one in value)),
        ),
        "A domain's vocabulary as (term, doc).",
    )

    subsets: list[tuple[str, str]] = []
    redefines: list[tuple[str, str]] = []
    frames: list[tuple[str, str]] = []
    clauses: list[tuple[str, str]] = []
    for document in constructs.values():
        properties = sorted((document.get("properties") or {}).items())
        declared_subsets = [
            f"{field!r}: {_literal(tuple(map(classes.field, node[SUBSETS])))}"
            for field, node in properties
            if node.get(SUBSETS)
        ]
        if declared_subsets:
            subsets.append((document["title"], "{" + ", ".join(declared_subsets) + "}"))
        declared_redefines = [
            f"{field!r}: {classes.field(node['x-agent-ix-redefines'])!r}"
            for field, node in properties
            if isinstance(node.get("x-agent-ix-redefines"), str)
        ]
        if declared_redefines:
            redefines.append(
                (document["title"], "{" + ", ".join(declared_redefines) + "}")
            )
        for operation in document.get("x-agent-ix-operations") or []:
            key = f"{document['title']}.{operation['name']}"
            frame = operation.get("frame")
            if isinstance(frame, dict):
                frames.append(
                    (
                        key,
                        "{"
                        + ", ".join(
                            f"{member!r}: {_literal(tuple(frame.get(member) or []))}"
                            for member in ("modifies", "creates", "deletes")
                        )
                        + "}",
                    )
                )
            inline = [
                f"{member!r}: {_literal(tuple(map(_clause, operation[member])))}"
                for member in ("requires", "ensures")
                if operation.get(member)
            ]
            if inline:
                clauses.append((key, "{" + ", ".join(inline) + "}"))
    body += _mapping(
        "FIELD_SUBSETS",
        "dict[str, dict[str, tuple[str, ...]]]",
        subsets,
        "The inherited fields whose values include each field's values.",
    )
    body += _mapping(
        "FIELD_REDEFINES",
        "dict[str, dict[str, str]]",
        redefines,
        "The inherited field each field narrows in its place.",
    )
    body += _mapping(
        "OPERATION_FRAMES",
        "dict[str, dict[str, tuple[str, ...]]]",
        frames,
        "The feature paths each operation modifies, creates and deletes.",
    )
    body += _mapping(
        "OPERATION_CLAUSES",
        "dict[str, dict[str, tuple[tuple[str, str], ...]]]",
        clauses,
        "Each operation's inline pre- and postconditions as (language, text).",
    )
    body += _mapping(
        "POPULATIONS",
        "dict[str, tuple[tuple[str, int, int | None], ...]]",
        [
            (
                population["displayName"],
                _literal(
                    tuple(
                        (
                            classes.name(member["typeRef"]),
                            int(member["extent"].get("lower", 0)),
                            member["extent"].get("upper"),
                        )
                        for member in population["members"]
                    )
                ),
            )
            for population in populations
        ],
        "Each named population's member types as (type, lower, upper extent).",
    )

    for document in constructs.values():
        if _kind(document) != "repository":
            continue
        body.append("")
        body.append(f"class {document['title']}(Protocol):")
        persisted = ", ".join(
            f"`{classes.name(one)}`"
            for one in document.get("x-agent-ix-persists") or []
        )
        body.append(
            f'    """Persists {persisted}; an interface holding no state of its own."""'
        )
        for operation in document.get("x-agent-ix-operations") or []:
            params = ", ".join(
                f"{_identifier(param['name'])}: {_typed(classes, param)}"
                for param in operation.get("params") or []
            )
            returns = (
                _typed(classes, operation["returns"])
                if isinstance(operation.get("returns"), dict)
                else "None"
            )
            head = f"self, {params}" if params else "self"
            body.append("")
            method = _identifier(_snake(operation["name"]))
            body.append(f"    def {method}({head}) -> {returns}: ...")
        body.append("")
        body.append("")

    lines = [
        '"""Construct metadata of the generated types (FR-079, FR-142).',
        "",
        "Rendered from the `x-agent-ix-*` construct annotations of the JSON Schema",
        "documents this package was generated from. Do not edit: regenerate through",
        'the backend seam."""',
        "",
        "from __future__ import annotations",
        "",
    ]
    if any(line.endswith("(Protocol):") for line in body):
        lines.extend(["from typing import Protocol", ""])
    if classes.imported:
        lines.extend(
            f"from .{module} import {name}" for module, name in sorted(classes.imported)
        )
        lines.append("")
    while body and body[-1] == "":
        body.pop()
    return "\n".join([*lines, *body, ""])
