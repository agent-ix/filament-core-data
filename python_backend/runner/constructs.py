"""The construct module of a generated package (FR-079, FR-142).

The generator reads a JSON Schema document's instance shape and drops every
`x-agent-ix-*` annotation, so a contract 2.0.0 construct's members reach no
generated class. This module renders them into one more module of the same
package, `constructs.py`, read from the same documents the generator read:
there is still one lowering, the `json-schema` target's (FR-136).

A construct kind is module data: nothing here names one. What a type becomes
is read from the members its schema carries, which its construct declaration
decided:

- a states member: the `<Name>State` enum the generator renders from the
  schema's `$defs`, beside the type's class;
- a type with no instance (its schema is `{"not": {}}`) carrying operations:
  a `typing.Protocol` whose methods are its operations, typed by the generated
  classes of their parameter and return types;
- every other member: a module-level constant keyed by the generated class
  name, since Python states none of them in a class; the kind is rendered by
  its name.

`refine` also completes the generated classes themselves, before this module
is rendered:

- a type carrying identity fields compares and hashes by them: `__eq__` and
  `__hash__` over their canonical JSON form, and each identity field is
  read-only once constructed;
- a `readOnly` type (a construct declaring an occurrence field) is frozen:
  `ConfigDict(frozen=True)` on a pydantic model and `@dataclass(frozen=True)`
  on a dataclass, and unhashable (`__hash__ = None`);
- an abstract type is an `abc.ABC` whose abstract properties are its fields,
  and every subtype registers with it, so `isinstance` holds and the abstract
  class does not construct.

A shape either step cannot state is refused with `ConstructError`, never
approximated: a generated module named `constructs.py` in any case, a type
holding a value of an abstract type (a `reference` to one holds an identity
and is allowed), a name that is not a Python identifier, and a class or identity
field the generated source does not declare.

A type of an interface or namespace construct has no instance, and its schema
admits no value (`{"not": {}}`), so it never reaches the generator:
`instance_documents` leaves it out, and this module is the whole of its
rendering.

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

IDENTITY_FIELDS = "x-agent-ix-identity-fields"

OPERATIONS = "x-agent-ix-operations"

ABSTRACT = "x-agent-ix-abstract"

SUPERTYPES = "x-agent-ix-supertypes"


class ConstructError(ValueError):
    """A construct the generated package cannot state as its model declares it."""


def _class_name(title: str) -> str:
    """The class name the generator derives from a title: its words, capitalised.

    `Order Repository` and `order-repository` both become `OrderRepository`.
    """

    words = re.split(r"[^0-9A-Za-z]+", title)
    name = "".join(word[:1].upper() + word[1:] for word in words if word)
    if not name.isidentifier() or keyword.iskeyword(name):
        msg = f"the type {title!r} derives no Python class name"
        raise ConstructError(msg)
    return name


def _module_name(document: str) -> str:
    """The module name the generator derives from a document file name."""

    return re.sub(r"[^0-9A-Za-z]+", "_", document.removesuffix(".json")).strip("_")


def _kind(document: dict[str, Any]) -> str | None:
    """The kind's name: a core kind, or a construct kind's `name`."""

    kind = document.get("x-agent-ix-kind")
    if isinstance(kind, dict):
        kind = kind.get("name")
    return kind if isinstance(kind, str) else None


def _instanceless(document: dict[str, Any]) -> bool:
    """Whether the schema admits no value: a type with no instance."""

    return document.get("not") == {}


def instance_documents(
    documents: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """The documents the generator renders a class from: every one with an instance."""

    return {
        name: document
        for name, document in documents.items()
        if not (_kind(document) is not None and _instanceless(document))
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

    A class is named by the document's `title` in class case, except where the
    generator renames it so it does not shadow a name its module imports —
    `UUID` becomes `UUIDModel` — so the name is read from the generated module
    itself. A repository and a domain have no module; each is named by its
    title in class case.
    """

    def __init__(
        self, documents: dict[str, dict[str, Any]], files: dict[str, str]
    ) -> None:
        self.by_identity: dict[str, tuple[str, str]] = {}
        self.title: dict[str, str] = {}
        self.module: dict[str, str] = {}
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
            module = _module_name(name)
            self.module[identity] = name
            self.title[identity] = _class_name(title)
            source = files.get(f"{module}.py")
            if source is None:
                continue
            declared = [_declared_name(node) for node in ast.parse(source).body]
            for chosen in (self.title[identity], f"{self.title[identity]}Model"):
                if chosen in declared:
                    self.by_identity[identity] = (module, chosen)
                    self.title[identity] = chosen
                    break
        self.imported: set[tuple[str, str]] = set()

    def name(self, identity: str) -> str:
        return self.title.get(identity, identity)

    def of(self, document: dict[str, Any]) -> str:
        """The generated class name of a document's type: every table's key."""

        return self.name(document["x-agent-ix-semantic-id"])

    def field(self, identity: str) -> str:
        return self.field_names.get(identity, identity)

    def annotation(self, identity: str) -> str:
        native = {
            "ix://quire/native/UUID": "UUID",
            "ix://quire/native/Boolean": "bool",
            "ix://quire/native/Integer": "int",
            "ix://quire/native/Decimal": "Decimal",
            "ix://quire/native/String": "str",
            "ix://quire/native/Timestamp": "datetime",
            "ix://quire/native/Duration": "timedelta",
            "ix://quire/native/Bytes": "bytes",
            "ix://quire/native/JsonObject": "dict[str, object]",
        }.get(identity)
        if native is not None:
            return native
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
    if any(path.lower() == MODULE for path in files):
        msg = (
            f"a generated module is named {MODULE}, the module that carries the"
            " construct metadata; rename the type it is generated from"
        )
        raise ConstructError(msg)

    classes = _Classes(documents, files)

    def rows(member: str, render_value: Any) -> list[tuple[str, str]]:
        found = []
        for document in constructs.values():
            value = document.get(member)
            if value is not None:
                found.append((classes.of(document), render_value(value)))
        return found

    def names(value: list[str]) -> str:
        return _literal(tuple(map(classes.name, value)))

    def strings(value: list[str]) -> str:
        return _literal(tuple(value))

    body: list[str] = []
    body += _mapping(
        "TYPE_KIND",
        "dict[str, str]",
        [
            (classes.of(document), _literal(_kind(document)))
            for document in constructs.values()
        ],
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
        rows(IDENTITY_FIELDS, strings),
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
            (classes.of(document), "True")
            for document in constructs.values()
            if document.get("x-agent-ix-equality") == "value"
        ],
        "The value objects: two instances are equal when every field is equal.",
    )
    body += _mapping(
        "IMMUTABLE",
        "dict[str, bool]",
        [
            (classes.of(document), "True")
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
            subsets.append(
                (classes.of(document), "{" + ", ".join(declared_subsets) + "}")
            )
        declared_redefines = [
            f"{field!r}: {classes.field(node['x-agent-ix-redefines'])!r}"
            for field, node in properties
            if isinstance(node.get("x-agent-ix-redefines"), str)
        ]
        if declared_redefines:
            redefines.append(
                (classes.of(document), "{" + ", ".join(declared_redefines) + "}")
            )
        for operation in document.get(OPERATIONS) or []:
            key = f"{classes.of(document)}.{operation['name']}"
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
                f"{member!r}: {_literal(tuple(map(_clause, bound)))}"
                for member in ("pre", "post")
                if (
                    bound := [
                        item
                        for item in operation.get(member) or []
                        if isinstance(item, dict)
                    ]
                )
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
        "dict[str, tuple[str, tuple[str, ...]]]",
        [
            (
                population["displayName"],
                _literal(
                    (
                        population["extent"],
                        tuple(classes.name(member) for member in population["members"]),
                    )
                ),
            )
            for population in populations
        ],
        "Each named population's extent (closed or open) and its member types.",
    )

    for document in constructs.values():
        if not (_instanceless(document) and OPERATIONS in document):
            continue
        body.append("")
        body.append(f"class {classes.of(document)}(Protocol):")
        persisted = ", ".join(
            f"`{classes.name(one)}`"
            for one in document.get("x-agent-ix-persists") or []
        )
        body.append(
            f'    """Persists {persisted}; an interface holding no state of its own."""'
        )
        for operation in document.get(OPERATIONS) or []:
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
        "from datetime import datetime, timedelta",
        "from decimal import Decimal",
        "from uuid import UUID",
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


def _refs(node: Any) -> list[str]:
    """Every `$ref` under a schema node, in document order."""

    if isinstance(node, dict):
        found = [node["$ref"]] if isinstance(node.get("$ref"), str) else []
        for value in node.values():
            found += _refs(value)
        return found
    if isinstance(node, list):
        return [ref for value in node for ref in _refs(value)]
    return []


def _class_of(source: str, name: str) -> ast.ClassDef:
    for node in ast.parse(source).body:
        if isinstance(node, ast.ClassDef) and node.name == name:
            return node
    msg = f"the generated source declares no class {name}"
    raise ConstructError(msg)


def _fields_of(node: ast.ClassDef) -> list[ast.AnnAssign]:
    return [
        one
        for one in node.body
        if isinstance(one, ast.AnnAssign) and isinstance(one.target, ast.Name)
    ]


def _replace_lines(source: str, start: int, end: int, text: list[str]) -> str:
    """`source` with its 1-based lines `start..end` replaced by `text`."""

    lines = source.split("\n")
    return "\n".join([*lines[: start - 1], *text, *lines[end:]])


def _import_after_pydantic(source: str, statement: str) -> str:
    """`source` importing `statement` after its last absolute `pydantic` import."""

    if statement in source.split("\n"):
        return source
    last = max(
        (
            node.end_lineno or node.lineno
            for node in ast.parse(source).body
            if isinstance(node, ast.ImportFrom)
            and node.level == 0
            and (node.module or "").split(".")[0] == "pydantic"
        ),
        default=None,
    )
    if last is None:
        msg = "the generated source imports nothing from pydantic"
        raise ConstructError(msg)
    lines = source.split("\n")
    return "\n".join([*lines[:last], statement, *lines[last:]])


def _import_standard(source: str, statement: str) -> str:
    """`source` importing the standard-library `statement` after `__future__`."""

    future = next(
        (
            node.end_lineno or node.lineno
            for node in ast.parse(source).body
            if isinstance(node, ast.ImportFrom) and node.module == "__future__"
        ),
        None,
    )
    if future is None:
        msg = "the generated source has no `from __future__` import to follow"
        raise ConstructError(msg)
    lines = source.split("\n")
    return "\n".join([*lines[:future], "", statement, *lines[future:]])


def _import_last(source: str, statement: str) -> str:
    """`source` importing the relative `statement` in sorted order.

    It goes before the first relative import that sorts after it, or after the
    last import when none does, so the block stays sorted as generated.
    """

    if statement in source.split("\n"):
        return source
    imports = [
        node
        for node in ast.parse(source).body
        if isinstance(node, ast.Import | ast.ImportFrom)
    ]
    if not imports:
        msg = "the generated source imports nothing to place an import beside"
        raise ConstructError(msg)
    later = next(
        (
            node
            for node in imports
            if isinstance(node, ast.ImportFrom)
            and node.level > 0
            and ast.unparse(node) > statement
        ),
        None,
    )
    lines = source.split("\n")
    if later is not None:
        at = later.lineno - 1
    else:
        at = max(node.end_lineno or node.lineno for node in imports)
    return "\n".join([*lines[:at], statement, *lines[at:]])


def _drop_unused_imports(source: str) -> str:
    """`source` without the names its `from` imports bring in and nothing reads."""

    tree = ast.parse(source)
    used = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    lines = source.split("\n")
    for node in reversed(tree.body):
        if not isinstance(node, ast.ImportFrom) or node.module == "__future__":
            continue
        kept = [alias for alias in node.names if (alias.asname or alias.name) in used]
        if len(kept) == len(node.names):
            continue
        replacement = (
            [
                "from "
                + "." * node.level
                + (node.module or "")
                + " import "
                + ", ".join(
                    alias.name + (f" as {alias.asname}" if alias.asname else "")
                    for alias in kept
                )
            ]
            if kept
            else []
        )
        lines[node.lineno - 1 : node.end_lineno or node.lineno] = replacement
    return re.sub(r"\n{3,}(?=from |import )", "\n\n", "\n".join(lines))


def _profile(node: ast.ClassDef) -> str:
    """`dataclass` or `pydantic`, read from how the generator declared the class."""

    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Name) and target.id == "dataclass":
            return "dataclass"
    if any(
        isinstance(base, ast.Name) and base.id == "BaseModel" for base in node.bases
    ):
        return "pydantic"
    msg = f"the generated class {node.name} is neither a pydantic model nor a dataclass"
    raise ConstructError(msg)


def _abstract(source: str, name: str, bases: list[str]) -> str:
    """The generated class `name` as an `abc.ABC` of abstract field properties."""

    node = _class_of(source, name)
    start = min([node.lineno, *(one.lineno for one in node.decorator_list)])
    properties: list[str] = []
    for field in _fields_of(node):
        annotation = field.annotation
        if (
            isinstance(annotation, ast.Subscript)
            and isinstance(annotation.value, ast.Name)
            and annotation.value.id == "Annotated"
            and isinstance(annotation.slice, ast.Tuple)
        ):
            annotation = annotation.slice.elts[0]
        target = field.target
        if not isinstance(target, ast.Name):
            continue
        properties += [
            "",
            "    @property",
            "    @abstractmethod",
            f"    def {target.id}(self) -> {ast.unparse(annotation)}: ...",
        ]
    rendered = [
        f"class {name}({', '.join([*bases, 'ABC'])}):",
        f'    """No value is a `{name}` except as an instance of a subtype.',
        "",
        "    Each abstract property is a field every subtype carries.",
        '    """',
        *properties,
    ]
    source = _replace_lines(source, start, node.end_lineno or node.lineno, rendered)
    source = _import_standard(source, "from abc import ABC, abstractmethod")
    return _drop_unused_imports(source)


def _identity_equality(source: str, name: str, fields: list[str]) -> str:
    """The generated class `name` comparing and hashing by its identity fields."""

    node = _class_of(source, name)
    declared = {
        field.target.id
        for field in _fields_of(node)
        if isinstance(field.target, ast.Name)
    }
    for field in fields:
        if field not in declared:
            msg = f"the identity field {field} of {name} is no attribute of its class"
            raise ConstructError(msg)
    own = (
        "("
        + ", ".join(f"self.{field}" for field in fields)
        + ("," if len(fields) == 1 else "")
        + ")"
    )
    other = own.replace("self.", "other.")
    listed = ", ".join(f"`{field}`" for field in fields)
    names = _literal(tuple(fields))
    rendered = [
        "",
        "    def __setattr__(self, name: str, value: object) -> None:",
        f'        """Identity fields ({listed}) are read-only once constructed."""',
        f"        if name in {names} and name in self.__dict__:",
        "            msg = (",
        f'                f"{{name}} is an identity field of {name}"',
        '                " and is read-only once constructed"',
        "            )",
        "            raise AttributeError(msg)",
        "        super().__setattr__(name, value)",
        "",
        "    def __delattr__(self, name: str) -> None:",
        f'        """Identity fields ({listed}) are never deleted."""',
        f"        if name in {names}:",
        f'            msg = f"{{name}} is an identity field of {name}"',
        '            msg += " and is never deleted"',
        "            raise AttributeError(msg)",
        "        super().__delattr__(name)",
        "",
        "    def __eq__(self, other: object) -> bool:",
        f'        """One instance when every identity field is equal: {listed}."""',
        f"        if not isinstance(other, {name}):",
        "            return NotImplemented",
        f"        return to_json({own}) == to_json({other})",
        "",
        "    def __hash__(self) -> int:",
        '        """The identity fields\' hash, so equal instances hash equal."""',
        f"        return hash(to_json({own}))",
    ]
    end = node.end_lineno or node.lineno
    source = _replace_lines(source, end + 1, end, rendered)
    return _import_after_pydantic(source, "from pydantic_core import to_json")


def _frozen(source: str, name: str) -> str:
    """The generated class `name` frozen and declared unhashable.

    An event records one occurrence: it is frozen in its own profile's form,
    and `__hash__ = None` states that it has no identity to hash by.
    """

    node = _class_of(source, name)
    end = node.end_lineno or node.lineno
    source = _replace_lines(
        source,
        end + 1,
        end,
        [
            "",
            "    #: An occurrence has no identity to hash by.",
            "    __hash__ = None  # type: ignore[assignment]",
        ],
    )
    node = _class_of(source, name)
    if _profile(node) == "dataclass":
        for decorator in node.decorator_list:
            target = decorator.func if isinstance(decorator, ast.Call) else decorator
            if isinstance(target, ast.Name) and target.id == "dataclass":
                keywords = (
                    [ast.unparse(one) for one in decorator.keywords]
                    if isinstance(decorator, ast.Call)
                    else []
                )
                return _replace_lines(
                    source,
                    decorator.lineno,
                    decorator.end_lineno or decorator.lineno,
                    [f"@dataclass({', '.join(['frozen=True', *keywords])})"],
                )
    for statement in node.body:
        if (
            isinstance(statement, ast.Assign)
            and [ast.unparse(one) for one in statement.targets] == ["model_config"]
            and isinstance(statement.value, ast.Call)
        ):
            keywords = [ast.unparse(one) for one in statement.value.keywords]
            return _replace_lines(
                source,
                statement.lineno,
                statement.end_lineno or statement.lineno,
                [
                    "    model_config = ConfigDict("
                    + ", ".join([*keywords, "frozen=True"])
                    + ")"
                ],
            )
    first = node.body[0]
    source = _replace_lines(
        source,
        first.lineno,
        first.lineno - 1,
        ["    model_config = ConfigDict(frozen=True)"],
    )
    return _import_after_pydantic(source, "from pydantic import ConfigDict")


def refine(
    documents: dict[str, dict[str, Any]], files: dict[str, str]
) -> dict[str, str]:
    """The generated package with each class completed to its construct.

    Identity equality, frozen events and abstract types, as the module
    docstring states; `files` is not modified.
    """

    refined = dict(files)
    classes = _Classes(documents, files)
    by_name = {f"./{name}": document for name, document in documents.items()}
    abstract = {
        document["x-agent-ix-semantic-id"]
        for document in documents.values()
        if document.get(ABSTRACT) is True
    }

    # A value of an abstract type is an instance of some subtype, which no
    # generated field type states.
    for name, document in sorted(documents.items()):
        for ref in _refs(document.get("properties") or {}):
            held = by_name.get(ref)
            if held is not None and held.get(ABSTRACT) is True:
                msg = (
                    f"{classes.of(document)} holds the abstract type"
                    f" {classes.of(held)}, which has no value of its own"
                )
                raise ConstructError(msg)

    def ancestors(identity: str, seen: frozenset[str] = frozenset()) -> list[str]:
        document = next(
            (
                one
                for one in documents.values()
                if one.get("x-agent-ix-semantic-id") == identity
            ),
            None,
        )
        found: list[str] = []
        for parent in (document or {}).get(SUPERTYPES) or []:
            if parent in seen:
                continue
            found += [parent, *ancestors(parent, seen | {parent})]
        return found

    for name, document in sorted(documents.items()):
        identity = document.get("x-agent-ix-semantic-id")
        if not isinstance(identity, str) or identity not in classes.by_identity:
            continue
        module, class_name = classes.by_identity[identity]
        path = f"{module}.py"
        source = refined[path]
        abstract_parents = sorted(
            {one for one in document.get(SUPERTYPES) or [] if one in abstract}
        )
        if document.get(ABSTRACT) is True:
            source = _abstract(
                source, class_name, [classes.name(one) for one in abstract_parents]
            )
            for parent in abstract_parents:
                parent_module, parent_name = classes.by_identity[parent]
                source = _import_last(
                    source, f"from .{parent_module} import {parent_name}"
                )
            refined[path] = source
            continue
        if _kind(document) is not None:
            fields = document.get(IDENTITY_FIELDS) or []
            if fields:
                source = _identity_equality(source, class_name, list(fields))
        if document.get("readOnly") is True:
            source = _frozen(source, class_name)
        registered = sorted({one for one in ancestors(identity) if one in abstract})
        for parent in registered:
            parent_module, parent_name = classes.by_identity[parent]
            source = _import_last(source, f"from .{parent_module} import {parent_name}")
        if registered:
            source = (
                source.rstrip("\n")
                + "\n\n\n"
                + "".join(
                    f"{classes.name(parent)}.register({class_name})\n"
                    for parent in registered
                )
            )
        refined[path] = source
    return refined
