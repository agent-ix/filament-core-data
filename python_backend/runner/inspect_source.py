"""The generated-source inspection (FR-078).

Generated source is the last place a lost constraint is visible, so it is read
rather than run: `ast` only, never an import. Importing a module to check
whether it is safe runs it first.

Two modes, because one check cannot be both the instrument and the gate. In
`report` mode the inspection classifies and counts and never raises, which is
what the qualification measures through — a family that loses object closure
must be *measurable*, not suppressed. In `enforce` mode a `degraded` or
`unattributed` finding refuses the package, which is what the emission path runs
before a byte is written.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Any, Literal

Mode = Literal["report", "enforce"]

#: Everything a generated module is permitted to import. A schema-driven import
#: is the shape both advisories describe, so the list is closed (FR-078-CON-2).
ALLOWED_IMPORT_ROOTS: frozenset[str] = frozenset(
    {
        "__future__",
        "typing",
        "typing_extensions",
        "enum",
        "datetime",
        "decimal",
        "uuid",
        "ipaddress",
        "pathlib",
        "collections",
        "dataclasses",
        "re",
        "pydantic",
        "msgspec",
    }
)

PERMISSIVE_NAMES: frozenset[str] = frozenset({"Any", "object"})

#: The descriptive `x-agent-ix-*` annotations the JSON Schema backend writes on
#: every node (FR-100). An unknown keyword is an annotation under JSON Schema
#: 2020-12 and asserts nothing, and each of these describes the node rather
#: than restricting its values, so a node carrying only these and metadata is
#: typeless. The annotations that carry meaning JSON Schema cannot assert —
#: `x-agent-ix-constraints`, `x-agent-ix-clauses`, `x-agent-ix-relationships`,
#: `x-agent-ix-operations`, `x-agent-ix-reference-target` — stay constraining,
#: so a permissive annotation over them is `degraded` (FR-078-CON-1).
DESCRIPTIVE_ANNOTATIONS: frozenset[str] = frozenset(
    {
        "x-agent-ix-semantic-id",
        "x-agent-ix-origin",
        "x-agent-ix-extensions",
        "x-agent-ix-roles",
        "x-agent-ix-unit",
        "x-agent-ix-occurrences",
        "x-agent-ix-unknown-policy",
    }
)
BARE_CONTAINERS: frozenset[str] = frozenset({"dict", "list", "Dict", "List", "Mapping"})

_VARIANT = re.compile(r"^(?P<stem>.+?)(?P<suffix>\d+)$")


def _module_name(document: str) -> str:
    """The module name the generator derives from a document file name."""

    return re.sub(r"[^0-9A-Za-z]+", "_", document.removesuffix(".json")).strip("_")


class InspectionError(RuntimeError):
    """An enforcing inspection refused the generated package."""


@dataclass(frozen=True)
class Finding:
    module: str
    symbol: str
    attribute: str
    annotation: str
    line: int
    column: int
    pointer: str | None
    classification: Literal["sanctioned", "degraded", "unattributed"]
    variant_of: str | None = None


@dataclass
class InspectionReport:
    findings: list[Finding] = field(default_factory=list)
    variants: dict[str, str] = field(default_factory=dict)

    @property
    def census(self) -> dict[str, int]:
        counts = {"sanctioned": 0, "degraded": 0, "unattributed": 0}
        for finding in self.findings:
            counts[finding.classification] += 1
        return counts


def _unconstrained(node: Any) -> bool:
    """The four schema shapes for which a permissive Python type is faithful."""

    if node is True:
        return True
    if not isinstance(node, dict):
        return False
    # Identity, metadata, and definition keywords place no obligation on an
    # instance: `$defs` is a container for subschemas the document may reference,
    # not an applicator over the value here. A document whose root carries only
    # these constrains nothing, which is exactly what the generator's root model
    # says when it renders `Any`.
    meaningful = {
        key
        for key in node
        if key
        not in {
            "title",
            "description",
            "$comment",
            "default",
            "examples",
            "deprecated",
            "$schema",
            "$id",
            "$anchor",
            "$vocabulary",
            "$defs",
            "definitions",
        }
        and key not in DESCRIPTIVE_ANNOTATIONS
    }
    if not meaningful:
        return True
    if meaningful == {"type"} and node.get("type") == "object":
        return True
    if node.get("type") == "object" and not (
        meaningful
        & {
            "properties",
            "additionalProperties",
            "patternProperties",
            "propertyNames",
            "required",
            "minProperties",
            "maxProperties",
            "unevaluatedProperties",
        }
    ):
        return True
    if _uninhabited(node):
        # An object that admits no member at all: the only conforming value is
        # `{}`. A permissive value type over it is unreachable rather than lost,
        # and the generator carries the emptiness as a length constraint.
        return True
    return False


def _uninhabited(node: Any) -> bool:
    if not isinstance(node, dict) or node.get("type") != "object":
        return False
    if node.get("maxProperties") == 0:
        return True
    properties = node.get("properties")
    closed = node.get("additionalProperties") is False
    return closed and isinstance(properties, dict) and not properties


def _walk_nodes(
    node: Any, document: str, pointer: str, out: list[tuple[str, str, dict[str, Any]]]
) -> None:
    if isinstance(node, list):
        for index, item in enumerate(node):
            _walk_nodes(item, document, f"{pointer}/{index}", out)
        return
    if not isinstance(node, dict):
        return
    if isinstance(node.get("properties"), dict) or pointer == "":
        out.append((document, pointer, node))
    for key, value in node.items():
        _walk_nodes(
            value,
            document,
            f"{pointer}/{key.replace('~', '~0').replace('/', '~1')}",
            out,
        )


def _names_for(pointer: str, node: Any) -> set[str]:
    """The class names the generator could derive for a node.

    From its `title`, and from the last non-index segment of its pointer — a
    `$defs` key, or the property name an inline object was minted from. This is
    corroboration, not attribution: a structural match that no name supports is
    refused rather than guessed at.
    """

    names: set[str] = set()

    def camel(text: str) -> str:
        return "".join(
            part[:1].upper() + part[1:]
            for part in re.split(r"[^A-Za-z0-9]+", text)
            if part
        )

    if isinstance(node, dict) and isinstance(node.get("title"), str):
        names.add(camel(node["title"]))
    segments = [s for s in pointer.split("/") if s and not s.isdigit()]
    inside_items = segments and segments[-1] == "items"
    for segment in reversed(segments):
        if segment in {
            "properties",
            "$defs",
            "definitions",
            "items",
            "allOf",
            "anyOf",
            "oneOf",
            "patternProperties",
            "then",
            "else",
            "if",
            "not",
        }:
            continue
        derived = camel(segment)
        names.add(derived)
        if inside_items and derived.endswith("s"):
            # The generator names an array's item type from the array's own
            # property name, singularised: `profiles` items become `Profile`.
            names.add(derived[:-1])
        break
    return names


def _declared_nodes(
    documents: dict[str, dict[str, Any]],
) -> dict[frozenset[str], list[tuple[str, str, dict[str, Any]]]]:
    """Index every object subschema by the set of property names it declares.

    Attribution is structural rather than by name on purpose. The generator does
    not carry provenance into its output and every option that would is
    prohibited, and its naming is not the schema's: it derives a class name from
    a `title`, a `$defs` key, or a property name, prefixes on collision, appends
    a numeric suffix on duplication, and renames outright where a name would
    shadow its own runtime — `Field` becomes `FieldModel`. Matching a generated
    class to the schema node whose property names it carries survives all of
    that, and a name-based map does not.
    """

    found: list[tuple[str, str, dict[str, Any]]] = []
    for document, schema in documents.items():
        _walk_nodes(schema, document, "", found)
    index: dict[frozenset[str], list[tuple[str, str, dict[str, Any]]]] = {}
    for document, pointer, node in found:
        properties = node.get("properties")
        key = frozenset(properties) if isinstance(properties, dict) else frozenset()
        index.setdefault(key, []).append((document, pointer, node))
    return index


def _strip_literals(node: ast.AST) -> ast.AST:
    """Blank out `Literal[...]` arguments.

    A `Literal['object']` member is a *value*, not a type: walking into it and
    reading `object` as a permissive annotation reported every `const` field in
    the contract as a lost constraint. Found by running the inspection over the
    committed spike bundle, where it flagged `SemanticObject.kind`.
    """

    class Blank(ast.NodeTransformer):
        def visit_Subscript(self, node: ast.Subscript) -> ast.AST:  # noqa: N802
            head = node.value
            name = head.id if isinstance(head, ast.Name) else getattr(head, "attr", "")
            if name == "Literal":
                return ast.Name(id="__literal__", ctx=ast.Load())
            return self.generic_visit(node)

    blanked = Blank().visit(ast.parse(ast.unparse(node), mode="eval").body)
    assert isinstance(blanked, ast.AST)
    return blanked


def _annotation_names(node: ast.AST) -> list[str]:
    names: list[str] = []
    for child in ast.walk(_strip_literals(node)):
        if isinstance(child, ast.Name):
            names.append(child.id)
        elif isinstance(child, ast.Attribute):
            names.append(child.attr)
        elif isinstance(child, ast.Constant) and isinstance(child.value, str):
            try:
                names.extend(
                    _annotation_names(ast.parse(child.value, mode="eval").body)
                )
            except SyntaxError:
                continue
    return names


def _is_permissive(annotation: ast.AST) -> bool:
    if isinstance(annotation, ast.Name) and annotation.id in BARE_CONTAINERS:
        return True
    return any(name in PERMISSIVE_NAMES for name in _annotation_names(annotation))


def inspect_generated(
    files: dict[str, str],
    documents: dict[str, dict[str, Any]],
    mode: Mode = "enforce",
    *,
    classify: Any = None,
) -> InspectionReport:
    """Read every generated module and classify every permissive annotation.

    `classify` is the injected classifier seam. The mutation gate of FR-078-AC-10
    disables the degraded branch through it rather than by editing a committed
    file, so the falsification runs in CI instead of by hand.
    """

    decide = classify if classify is not None else _unconstrained
    index = _declared_nodes(documents)
    report = InspectionReport()

    document_roots = {
        _module_name(name): (name, schema) for name, schema in documents.items()
    }

    def candidates_for(
        node: ast.ClassDef, attribute: str
    ) -> list[tuple[str, str, dict[str, Any]]]:
        names = {
            body.target.id
            for body in node.body
            if isinstance(body, ast.AnnAssign) and isinstance(body.target, ast.Name)
        }
        names.discard("model_config")
        found = list(index.get(frozenset(names)) or [])
        # A structural match is a candidate, not an attribution. The generated
        # class name must corroborate it — through the node's own `title` or the
        # key it was minted from, allowing for the generator's numeric variant
        # suffix — or the finding is left unattributed and `enforce` refuses it.
        # Without this, two unrelated nodes that happen to declare the same
        # property names attribute to each other and a real loss reads as
        # sanctioned.
        stem = _VARIANT.match(node.name)
        candidate_names = {node.name} | ({stem.group("stem")} if stem else set())
        if node.name.endswith("Model"):
            # The generator renames a class that would shadow a name its own
            # runtime exports: the contract's `field` becomes `FieldModel`.
            candidate_names.add(node.name[: -len("Model")])
        corroborated = [
            entry for entry in found if _names_for(entry[1], entry[2]) & candidate_names
        ]
        if corroborated:
            found = corroborated
        elif len(found) >= 1:
            return []
        if len(found) <= 1:
            return found
        # Several schema nodes share this property-name set — the `oneOf`
        # branches of one union. A permissive annotation can only have come from
        # a branch whose node for this attribute declares no properties, because
        # the generator renders a declared-property node as a typed model and
        # never as a bare mapping. Narrowing to those branches is sound rather
        # than heuristic, and it is what separates the empty-operands constraint
        # branch from its five typed siblings.
        narrowed = [
            entry
            for entry in found
            if not (entry[2].get("properties") or {})
            .get(attribute, {})
            .get("properties")
        ]
        return narrowed or found

    for module in sorted(files):
        if not module.endswith(".py"):
            continue
        source = files[module]
        tree = ast.parse(source, filename=module)

        for statement in tree.body:
            if isinstance(statement, (ast.Import, ast.ImportFrom)):
                roots = (
                    [alias.name.split(".")[0] for alias in statement.names]
                    if isinstance(statement, ast.Import)
                    else [(statement.module or "").split(".")[0]]
                )
                for root in roots:
                    sibling = root and any(
                        candidate == f"{root}.py" for candidate in files
                    )
                    relative = (
                        isinstance(statement, ast.ImportFrom) and statement.level > 0
                    )
                    if (
                        root
                        and root not in ALLOWED_IMPORT_ROOTS
                        and not sibling
                        and not relative
                    ):
                        if mode == "enforce":
                            msg = (
                                f"{module}:{statement.lineno}: generated source "
                                f"imports "
                                f"{root!r}, which the allow-list does not carry"
                            )
                            raise InspectionError(msg)
                continue
            if isinstance(
                statement, (ast.ClassDef, ast.AnnAssign, ast.Assign, ast.TypeAlias)
            ):
                continue
            if isinstance(statement, ast.Expr) and isinstance(
                statement.value, ast.Constant
            ):
                continue
            if (
                isinstance(statement, ast.Expr)
                and isinstance(statement.value, ast.Call)
                and isinstance(statement.value.func, ast.Attribute)
                and statement.value.func.attr == "model_rebuild"
            ):
                continue
            if mode == "enforce":
                msg = (
                    f"{module}:{statement.lineno}: module-level "
                    f"{type(statement).__name__} is not one of the permitted forms"
                )
                raise InspectionError(msg)

        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue
            for body in node.body:
                if not isinstance(body, ast.AnnAssign) or body.annotation is None:
                    continue
                if not isinstance(body.target, ast.Name):
                    continue
                if not _is_permissive(body.annotation):
                    continue
                attribute = body.target.id
                classification: Literal["sanctioned", "degraded", "unattributed"] = (
                    "unattributed"
                )
                pointer: str | None = None
                found = candidates_for(node, attribute)
                owner = found[0] if len(found) == 1 else None
                if owner is None and attribute == "root":
                    entry = document_roots.get(module.removesuffix(".py"))
                    if entry is None and len(documents) > 1:
                        # The generator sinks the types of a cross-document
                        # reference cycle into a shared module it owns, and emits
                        # one root model per contributing document there. That
                        # module is not itself a document, so it is attributed to
                        # the input set's roots, which must agree.
                        roots_seen = list(documents.values())
                        if all(
                            decide(root) == decide(roots_seen[0]) for root in roots_seen
                        ):
                            entry = (sorted(documents)[0], roots_seen[0])
                    if entry is not None:
                        owner = (entry[0], "", entry[1])
                if owner is not None:
                    document, node_pointer, schema = owner
                    properties = schema.get("properties")
                    target = (
                        properties.get(attribute)
                        if isinstance(properties, dict) and attribute in properties
                        else (schema if attribute == "root" else None)
                    )
                    if target is not None:
                        classification = "sanctioned" if decide(target) else "degraded"
                        pointer = (
                            f"{document}#{node_pointer}"
                            if target is schema
                            else f"{document}#{node_pointer}/properties/{attribute}"
                        )
                match = _VARIANT.match(node.name)
                report.findings.append(
                    Finding(
                        module=module,
                        symbol=node.name,
                        attribute=attribute,
                        annotation=ast.unparse(body.annotation),
                        line=body.lineno,
                        column=body.col_offset,
                        pointer=pointer,
                        classification=classification,
                        variant_of=match.group("stem") if match else None,
                    )
                )
                if match:
                    report.variants[node.name] = match.group("stem")

    report.findings.sort(key=lambda f: (f.module, f.line, f.column))

    if mode == "enforce":
        bad = [f for f in report.findings if f.classification != "sanctioned"]
        if bad:
            first = bad[0]
            msg = (
                f"{first.module}:{first.line}: {first.symbol}.{first.attribute} is "
                f"annotated `{first.annotation}` and is classified "
                f"{first.classification}"
                + (f"; the schema constrains {first.pointer}" if first.pointer else "")
            )
            raise InspectionError(msg)
    return report
