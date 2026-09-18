"""The ``python-backend`` conformance adapter (issue #23, FR-132).

The harness starts this file as a process with its working directory at
``conformance/`` and reads one JSON array from standard output carrying one
``conformance/schema/adapter-result.schema.json`` document per corpus case.

It imports nothing under ``conformance/oracle/``. It cannot: it is Python, and
the import surface is an ES module. That is the point rather than an obstacle —
the corpus is an independent yardstick only for as long as the thing it measures
was written independently of it, and a language boundary makes accidental
transcription impossible in a way a lint rule does not.

Cases arrive already materialized, from ``tools/materialize-cases.mjs``. Base
loading and JSON Patch application are mechanical, carry no judgement, and a bug
in either reports as a conformance divergence indistinguishable from a reader
bug. Reading a bundle somebody else assembled keeps this adapter's divergences
attributable to its reader.

Every judgement is this repository's own Python reader,
``tests/semantic_ir_reader.py``: the cross-field diagnostics, the schema layer,
and the normalized bytes.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
REPOSITORY_ROOT = HERE.parents[2]
sys.path.insert(0, str(REPOSITORY_ROOT / "tests"))

import semantic_ir_reader as reader  # noqa: E402

ADAPTER_ID = "python-backend"
ADAPTER_BASE_VERSION = "0.1.0"

#: The module whose decisions this adapter's version tracks.
DECISION_MODULES = ("tests/semantic_ir_reader.py",)

#: The owner recorded on a diagnostic no declaration owns.
ORACLE_OWNER = "ix://agent-ix/filament-core-data/semantic-ir"


def adapter_version() -> str:
    """``<base>+<digest>`` over every decision module's bytes.

    A hand-maintained constant moves when somebody remembers. A digest over the
    module that decides moves whenever that module changes at all, which is
    stronger than FR-070's obligation and needs nobody to remember.
    """
    digest = hashlib.sha256()
    for name in DECISION_MODULES:
        digest.update(name.encode("utf-8"))
        digest.update((REPOSITORY_ROOT / name).read_bytes())
    return f"{ADAPTER_BASE_VERSION}+{digest.hexdigest()[:12]}"


def pointer(prefix: str, dotted: str) -> str:
    """Renders the reader's dotted path as the RFC 6901 pointer the corpus uses."""
    out = prefix
    if dotted:
        for segment in dotted.split("."):
            out += "/" + segment.replace("~", "~0").replace("/", "~1")
    return out


def _node_at(bundle: Any, pointer_text: str) -> list[Any]:
    """The chain of nodes from the bundle root to the addressed node."""
    chain: list[Any] = [bundle]
    node = bundle
    if pointer_text:
        for raw in pointer_text[1:].split("/"):
            token = raw.replace("~1", "/").replace("~0", "~")
            if isinstance(node, list):
                index = int(token) if token.isdigit() else -1
                node = node[index] if 0 <= index < len(node) else None
            elif isinstance(node, dict):
                node = node.get(token)
            else:
                node = None
            chain.append(node)
    return chain


def _positive(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 1


def _usable_locus(value: Any) -> bool:
    """Whether a node's locus is one a reader could act on.

    A locus the published schema would reject is not a location — it is the
    defect. Carrying it beside a diagnostic would send a reader to line 0 of a
    file, and the one case where that happens is a case about exactly this.
    """
    return (
        isinstance(value, dict)
        and isinstance(value.get("sourceIdentity"), str)
        and isinstance(value.get("path"), str)
        and value["path"] != ""
        and _positive(value.get("startLine"))
        and _positive(value.get("startColumn"))
    )


def _locus_of(node: Any) -> Any:
    if not isinstance(node, dict):
        return None
    origin = node.get("origin")
    if isinstance(origin, dict) and _usable_locus(origin.get("source")):
        return origin["source"]
    if _usable_locus(node.get("sourceSpan")):
        return node["sourceSpan"]
    return None


def render(bundle: Any, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Renders reader rows as diagnostics with the locus and owner beside them.

    ``locus`` is the addressed node's own source locus or the nearest ancestor's;
    ``owner`` is the nearest owning declaration's identity. Both are resolved by
    walking back up the pointer rather than by being carried along with the row,
    so a rule states where the problem is and nothing more.
    """
    out = []
    for row in rows:
        chain = _node_at(bundle, row["pointer"])
        locus = None
        owner = None
        for node in reversed(chain):
            if locus is None:
                found = _locus_of(node)
                if found is not None:
                    locus = json.loads(json.dumps(found))
            if (
                owner is None
                and isinstance(node, dict)
                and isinstance(node.get("identity"), str)
                and node["identity"].startswith("ix://")
            ):
                owner = node["identity"]
            if locus is not None and owner is not None:
                break
        diagnostic: dict[str, Any] = {
            "code": row["code"],
            "severity": "error",
            "message": row["message"],
            "owner": owner or ORACLE_OWNER,
            "blocking": True,
            "causes": [],
            "related": [],
        }
        if locus is not None:
            diagnostic["locus"] = locus
        out.append({"pointer": row["pointer"], "diagnostic": diagnostic})
    return out


def sort_key(entry: dict[str, Any]) -> tuple[str, str]:
    """Diagnostic order: by pointer, then by code, both by code point."""
    return (entry["pointer"], entry["diagnostic"]["code"])


# ------------------------------------------------------------ schema layer ---

PUBLISHED_SCHEMAS = REPOSITORY_ROOT / "schema" / "semantic" / "v1"
CONFORMANCE_SCHEMAS = REPOSITORY_ROOT / "conformance" / "schema"
PUBLISHED_BASE = "https://schemas.agent-ix.org/filament-core-data/v1/"
CONFORMANCE_BASE = "https://schemas.agent-ix.org/filament-core-data/conformance/v1/"

#: The bundle member the contract binds to each published schema file.
MEMBER_SCHEMAS = {
    "ir": "semantic-ir.schema.json",
    "manifest": "package-manifest.schema.json",
    "lock": "package-lock.schema.json",
    "profile": "profile.schema.json",
    "consumerPolicy": "consumer-policy.schema.json",
}
MAPPING_SCHEMA = "mapping.schema.json"

_registry = None


def _schema_registry() -> Any:
    """Every published and conformance schema, resolvable by its own ``$id``."""
    global _registry
    if _registry is None:
        from referencing import Registry, Resource

        resources = []
        for root in (PUBLISHED_SCHEMAS, CONFORMANCE_SCHEMAS):
            for path in sorted(root.glob("*.schema.json")):
                schema = json.loads(path.read_text())
                resources.append((schema["$id"], Resource.from_contents(schema)))
        _registry = Registry().with_resources(resources)
    return _registry


_validators: dict[str, Any] = {}


def _validator(schema_id: str) -> Any:
    from jsonschema import Draft202012Validator

    if schema_id not in _validators:
        registry = _schema_registry()
        schema = registry.get_or_retrieve(schema_id).value.contents
        _validators[schema_id] = Draft202012Validator(schema, registry=registry)
    return _validators[schema_id]


def _instance_pointer(error: Any) -> str:
    out = ""
    for token in error.absolute_path:
        text = str(token).replace("~", "~0").replace("/", "~1")
        out += "/" + text
    return out


def _flatten(errors: list[Any]) -> list[Any]:
    """Every error including those a combinator keeps in its own context.

    A ``oneOf`` reports one error at the guarded node and keeps each branch's
    failures inside it. The deepest failing location is in those branches, so a
    layer that reads only the top level addresses the cascade rather than the
    violation.
    """
    out: list[Any] = []
    for error in errors:
        out.append(error)
        out.extend(_flatten(list(error.context or ())))
    return out


def _collapse(errors: list[Any], prefix: str) -> list[dict[str, str]]:
    """One row per deepest distinct failing location.

    A ``oneOf`` or ``allOf`` cascade reports one violation at several sibling
    locations beneath the node the cascade guards. Where that node itself failed
    and carries more than one reported descendant, it is the violation's
    location and the siblings are its branches — which is what makes "a negative
    case yields exactly one diagnostic" a decidable statement rather than a hope.
    """
    by_path: dict[str, str] = {}
    for error in errors:
        path = prefix + _instance_pointer(error)
        text = f"{error.validator}: {error.message}"
        if path not in by_path or text < by_path[path]:
            by_path[path] = text
    paths = sorted(by_path)
    deepest = [
        path
        for path in paths
        if not any(other != path and other.startswith(path + "/") for other in paths)
    ]
    for ancestor in reversed(paths):
        under = [path for path in deepest if path.startswith(ancestor + "/")]
        if len(under) > 1:
            deepest = [path for path in deepest if path not in under]
            deepest.append(ancestor)
    return [
        {"pointer": path, "message": by_path.get(path, "schema violation")}
        for path in sorted(set(deepest))
    ]


def schema_diagnostics(bundle: Any) -> list[dict[str, str]]:
    """The schema layer's rows over one input bundle, collapsed and ordered.

    When it reports anything the schema layer decided the case, and the
    cross-field rules are not consulted: a document the published schema rejects
    is not a document whose cross-field meaning is worth an opinion.
    """
    if not isinstance(bundle, dict):
        return [{"pointer": "", "message": "type: must be object"}]
    rows: list[dict[str, str]] = []
    envelope = [
        error
        for error in _flatten(
            list(
                _validator(CONFORMANCE_BASE + "input-bundle.schema.json").iter_errors(
                    bundle
                )
            )
        )
        if not error.absolute_path
        or str(list(error.absolute_path)[0]) not in {*MEMBER_SCHEMAS, "mappings"}
    ]
    rows.extend(_collapse(envelope, ""))
    for member, file in MEMBER_SCHEMAS.items():
        if bundle.get(member) is None:
            continue
        rows.extend(
            _collapse(
                _flatten(
                    list(_validator(PUBLISHED_BASE + file).iter_errors(bundle[member]))
                ),
                f"/{member}",
            )
        )
    if isinstance(bundle.get("mappings"), list):
        for index, mapping in enumerate(bundle["mappings"]):
            rows.extend(
                _collapse(
                    _flatten(
                        list(
                            _validator(PUBLISHED_BASE + MAPPING_SCHEMA).iter_errors(
                                mapping
                            )
                        )
                    ),
                    f"/mappings/{index}",
                )
            )
    paths = [row["pointer"] for row in rows]
    return sorted(
        (
            row
            for row in rows
            if not any(
                other != row["pointer"] and other.startswith(row["pointer"] + "/")
                for other in paths
            )
        ),
        key=lambda row: row["pointer"],
    )


# ------------------------------------------------- supplementary rules ------

#: The finite expansion bound the corpus manifest declares.
DEPTH_LIMIT = 256

#: The role a type carries when the package is obliged to account for it.
ENTITY_ROLE = "agent-ix:entity"


def _types_by_identity(ir: Any) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for definition in reader._objects(
        ir.get("types") if isinstance(ir, dict) else None
    ):
        identity = definition.get("identity")
        if isinstance(identity, str) and identity not in out:
            out[identity] = definition
    return out


def _row(code: str, pointer_text: str, message: str) -> dict[str, str]:
    return {
        "code": f"agent-ix.semantic-ir.{code}",
        "pointer": pointer_text,
        "message": message,
    }


def _identity_nodes(node: Any, at: str, out: list[tuple[str, str]]) -> None:
    """Every declared identity in document order, with the pointer that carries it.

    A semantic identity is unique across the whole document rather than within
    the member that declares it, so this walks every node instead of each
    collection separately: a field that reuses a type's identity is the same
    defect as a type that reuses one.
    """
    if isinstance(node, dict):
        identity = node.get("identity")
        if isinstance(identity, str):
            out.append((identity, f"{at}/identity"))
        for key in sorted(node):
            if key != "identity":
                _identity_nodes(node[key], f"{at}/{key}", out)
    elif isinstance(node, list):
        for index, item in enumerate(node):
            _identity_nodes(item, f"{at}/{index}", out)


def _alias_chain(
    types: dict[str, dict[str, Any]], start: str
) -> tuple[str, int, str | None]:
    """Walks an alias chain, returning ``(outcome, hops, terminal)``.

    ``outcome`` is ``cycle`` where the chain closes on itself, ``unresolved``
    where a link names no declared type, ``deep`` where it is longer than the
    declared bound, and ``resolved`` otherwise. An alias that resolves to
    nothing and an alias that resolves to itself are different defects and the
    contract names them separately, so they are not collapsed here.
    """
    seen = {start}
    current = start
    hops = 0
    while True:
        definition = types.get(current)
        if definition is None:
            return ("unresolved", hops, None)
        if definition.get("kind") != "alias":
            return ("deep" if hops > DEPTH_LIMIT else "resolved", hops, current)
        target = definition.get("target")
        if not isinstance(target, str):
            return ("unresolved", hops, None)
        hops += 1
        if target in seen:
            return ("cycle", hops, None)
        seen.add(target)
        current = target


def _back_edges(edges: dict[Any, list[str]]) -> list[Any]:
    """The packages whose own dependency closes a cycle, in declaration order.

    A cycle is one defect however many packages it runs through, and reporting
    it once at the edge that closes it names the dependency a maintainer would
    remove. Reporting it at every package on the ring names the whole ring and
    leaves the reader to work out which link is the mistake.
    """
    state: dict[Any, str] = {}
    closing: list[Any] = []

    def visit(node: Any) -> None:
        state[node] = "open"
        for next_node in edges.get(node, ()):
            if state.get(next_node) == "open":
                if node not in closing:
                    closing.append(node)
            elif next_node not in state and next_node in edges:
                visit(next_node)
        state[node] = "done"

    for node in edges:
        if node not in state:
            visit(node)
    return closing


def supplementary(bundle: Any, ir: Any) -> list[dict[str, str]]:
    """The rules this adapter decides beyond the shared reader's own.

    The shared reader in ``tests/semantic_ir_reader.py`` judges one IR document.
    Half of the contract's cross-field obligations are about the bundle around
    it — the manifest that exports a type, the lock that resolves an import, the
    profile that permits an omission — and a rule about the bundle cannot be
    stated by a function that only sees the document.
    """
    out: list[dict[str, str]] = []
    if not isinstance(ir, dict):
        return out
    types = _types_by_identity(ir)
    definitions = reader._objects(ir.get("types"))

    seen: dict[str, str] = {}
    nodes: list[tuple[str, str]] = []
    _identity_nodes(ir, "/ir", nodes)
    for identity, at in nodes:
        if identity in seen:
            out.append(
                _row(
                    "DUPLICATE_IDENTITY",
                    at,
                    f"identity {identity} is already declared at {seen[identity]}",
                )
            )
        else:
            seen[identity] = at

    for index, definition in enumerate(definitions):
        at = f"/ir/types/{index}"
        kind = definition.get("kind")
        target = definition.get("target")
        if kind == "alias" and isinstance(target, str):
            outcome, hops, _ = _alias_chain(types, definition.get("identity", ""))
            if outcome == "cycle":
                out.append(
                    _row("ALIAS_CYCLE", f"{at}/target", "alias chain closes on itself")
                )
            elif outcome == "unresolved":
                out.append(
                    _row(
                        "UNRESOLVED_TYPE_REF",
                        f"{at}/target",
                        f"alias target does not resolve: {target}",
                    )
                )
            elif outcome == "deep":
                out.append(
                    _row(
                        "DEPTH_LIMIT_EXCEEDED",
                        f"{at}/target",
                        "alias expansion exceeded the declared depth limit"
                        f" of {DEPTH_LIMIT}",
                    )
                )
        elif kind == "reference" and isinstance(target, str) and target not in types:
            out.append(
                _row(
                    "UNRESOLVED_TYPE_REF",
                    f"{at}/target",
                    f"reference target does not resolve: {target}",
                )
            )
        for member in ("items", "values"):
            element = definition.get(member)
            if isinstance(element, str) and element not in types:
                out.append(
                    _row(
                        "UNRESOLVED_ELEMENT_TYPE",
                        f"{at}/{member}",
                        f"element type does not resolve: {element}",
                    )
                )
        for position, variant in enumerate(reader._objects(definition.get("variants"))):
            payload = variant.get("payloadType")
            if isinstance(payload, str) and payload not in types:
                out.append(
                    _row(
                        "UNRESOLVED_VARIANT_PAYLOAD",
                        f"{at}/variants/{position}/payloadType",
                        f"variant payload does not resolve: {payload}",
                    )
                )
        names: dict[str, int] = {}
        for position, field in enumerate(reader._objects(definition.get("fields"))):
            name = field.get("name")
            if isinstance(name, str):
                if name in names:
                    out.append(
                        _row(
                            "DUPLICATE_FIELD_NAME",
                            f"{at}/fields/{position}/name",
                            f"field name {name} is already declared"
                            f" at index {names[name]}",
                        )
                    )
                else:
                    names[name] = position
            # fcd#179: this branch used to raise V1_1_NODE_IN_V1_0 when a
            # 1.1.0-only member reached a 1.0.0 document. Contract 1.0.0 is
            # deleted and 2.0.0 is the only contract this adapter is ever
            # handed, so `version == "1.0.0"` can never be true. Deleted
            # rather than left unreachable.

    for index, occurrence in enumerate(reader._objects(ir.get("occurrences"))):
        definition = occurrence.get("definition")
        if not isinstance(definition, str) or definition not in types:
            out.append(
                _row(
                    "UNRESOLVED_OCCURRENCE_DEFINITION",
                    f"/ir/occurrences/{index}/definition",
                    f"occurrence definition does not resolve: {definition}",
                )
            )

    out.extend(_package_context(bundle, ir, types))
    return out


def _package_context(
    bundle: Any, ir: Any, types: dict[str, dict[str, Any]]
) -> list[dict[str, str]]:
    """The rules about the bundle around the document."""
    out: list[dict[str, str]] = []
    if not isinstance(bundle, dict):
        return out
    manifest = bundle.get("manifest")
    lock = bundle.get("lock")
    profile = bundle.get("profile")
    policy = bundle.get("consumerPolicy")

    for index, extension in enumerate(reader._objects(ir.get("extensions"))):
        if extension.get("required") is not True:
            continue
        if not isinstance(policy, dict) or policy.get("unknownExtensions") != "reject":
            continue
        listed = policy.get("extensions")
        known = isinstance(listed, list) and extension.get("identity") in listed
        if not known:
            out.append(
                _row(
                    "UNKNOWN_REQUIRED_EXTENSION",
                    f"/ir/extensions/{index}/identity",
                    "a required extension the consumer policy does not list",
                )
            )

    resolved = {
        package.get("identity")
        for package in reader._objects(
            lock.get("packages") if isinstance(lock, dict) else None
        )
    }
    if isinstance(manifest, dict):
        for index, imported in enumerate(reader._objects(manifest.get("imports"))):
            if imported.get("packageIdentity") not in resolved:
                out.append(
                    _row(
                        "UNRESOLVED_IMPORT",
                        f"/manifest/imports/{index}/packageIdentity",
                        "the lock resolves no package"
                        f" {imported.get('packageIdentity')}",
                    )
                )

    if isinstance(lock, dict):
        edges = {
            package.get("identity"): [
                dependency
                for dependency in (package.get("dependencies") or [])
                if isinstance(dependency, str)
            ]
            for package in reader._objects(lock.get("packages"))
        }
        positions = {
            package.get("identity"): index
            for index, package in enumerate(reader._objects(lock.get("packages")))
        }
        for identity in _back_edges(edges):
            out.append(
                _row(
                    "PACKAGE_CYCLE",
                    f"/lock/packages/{positions[identity]}/dependencies",
                    f"the lock package graph closes a cycle at {identity}",
                )
            )

    declared = ir.get("package") if isinstance(ir.get("package"), dict) else {}
    stated = bundle.get("manifestDigest")
    if isinstance(stated, str) and declared.get("manifestDigest") != stated:
        out.append(
            _row(
                "STALE_LOCK",
                "/ir/package/manifestDigest",
                "the IR names a manifest digest the bundle's manifest does not carry",
            )
        )

    owned = set(types) | {identity for identity, _ in _all_identities(ir)}
    for index, mapping in enumerate(reader._objects(bundle.get("mappings"))):
        for member in ("sourceType", "targetType"):
            named = mapping.get(member)
            if isinstance(named, str) and named not in owned:
                out.append(
                    _row(
                        "UNKNOWN_MAPPING_TARGET",
                        f"/mappings/{index}/{member}",
                        f"no declaration owns {named}",
                    )
                )

    exported = {
        entry.get("typeIdentity")
        for entry in reader._objects(
            manifest.get("exports") if isinstance(manifest, dict) else None
        )
    }
    omissions = profile.get("allowedOmissions") if isinstance(profile, dict) else None
    permitted = set(omissions) if isinstance(omissions, list) else set()
    if isinstance(manifest, dict):
        for index, definition in enumerate(reader._objects(ir.get("types"))):
            roles = definition.get("roles")
            identity = definition.get("identity")
            if not isinstance(roles, list) or ENTITY_ROLE not in roles:
                continue
            if identity in exported or identity in permitted:
                continue
            out.append(
                _row(
                    "UNDECLARED_LOSS",
                    f"/ir/types/{index}/identity",
                    "an entity the manifest does not export and the profile"
                    " does not omit",
                )
            )
    return out


def _all_identities(ir: Any) -> list[tuple[str, str]]:
    nodes: list[tuple[str, str]] = []
    _identity_nodes(ir, "/ir", nodes)
    return nodes


def _reaches(edges: dict[Any, list[str]], start: Any, goal: Any) -> bool:
    """Whether ``goal`` is reachable from ``start`` along one or more edges."""
    stack = list(edges.get(start, ()))
    seen: set[Any] = set()
    while stack:
        node = stack.pop()
        if node == goal:
            return True
        if node in seen:
            continue
        seen.add(node)
        stack.extend(edges.get(node, ()))
    return False


def _deepen(row: dict[str, str]) -> dict[str, str]:
    """Addresses a relationship defect at the member that carries the defect.

    The shared reader addresses a composite cycle at the relationship, because a
    relationship is the unit it iterates. The cycle is closed by the target the
    relationship names, and a diagnostic is more useful pointing at the value a
    reader would have to change than at the object containing it.
    """
    if row["code"].endswith("COMPOSITE_CYCLE") and not row["pointer"].endswith(
        "/target"
    ):
        return {**row, "pointer": row["pointer"] + "/target"}
    return row


# ------------------------------------------------------- compatibility ------

#: Most restrictive first. A change set is classified by its worst member,
#: because a release is as compatible as its least compatible change.
CLASSIFICATION_ORDER = (
    "invalid",
    "breaking",
    "unknown",
    "conditional",
    "additive",
    "patch",
)

#: The type members a rule below classifies. A difference anywhere else is a
#: change no rule classifies, which is `unknown` rather than `patch`: not
#: knowing whether something breaks is a different answer from knowing it does
#: not.
CLASSIFIED_TYPE_MEMBERS = frozenset(
    {
        "identity",
        "displayName",
        "kind",
        "roles",
        "origin",
        "sourceSpan",
        "scalar",
        "target",
        "items",
        "values",
        "unknownPolicy",
        "fields",
        "variants",
        "relationships",
        "operations",
        "constraints",
    }
)


def _worst(found: list[str]) -> str:
    for classification in CLASSIFICATION_ORDER:
        if classification in found:
            return classification
    return "patch"


def _by_identity(items: Any) -> dict[str, dict[str, Any]]:
    return {
        entry["identity"]: entry
        for entry in reader._objects(items)
        if isinstance(entry.get("identity"), str)
    }


def _lower_bound(field: dict[str, Any]) -> int:
    """The field's multiplicity floor, read from `multiplicity.lower` alone.

    `classify` only reaches a field after both bundles have already passed
    schema validation, and contract 2.0.0 requires `multiplicity` on every
    field independently of `presence` (FR-059, FR-069) — so a field arriving
    here without one is this adapter's own invariant broken, not a document
    to judge leniently. It refuses rather than deriving a bound from
    `presence`, which is the same forbidden derivation under a different name.
    """
    multiplicity = field.get("multiplicity")
    if not isinstance(multiplicity, dict):
        raise ValueError(
            f"field {field.get('identity')!r} reached compatibility "
            "classification without a multiplicity object; contract 2.0.0 "
            "requires one and this adapter never derives it from presence"
        )
    lower = multiplicity.get("lower")
    if not isinstance(lower, int):
        raise ValueError(
            f"field {field.get('identity')!r} has a multiplicity without an "
            "integer lower bound; contract 2.0.0 requires one and this "
            "adapter never derives it from presence"
        )
    return lower


def _preserves_unknown(policy: Any) -> bool:
    """Whether a consumer policy would keep a member it does not know.

    A consumer that rejects what it does not recognise rejects a new optional
    field as surely as a new extension, so an optional addition is only additive
    where a policy exists and does not reject the unknown.
    """
    return isinstance(policy, dict) and policy.get("unknownExtensions") != "reject"


def _resolves_alike(
    before_types: dict[str, dict[str, Any]],
    after_types: dict[str, dict[str, Any]],
    before_ref: Any,
    after_ref: Any,
) -> bool:
    """Whether two type references name the same type once aliases are followed.

    Sameness is the type the chain ends at, not the kind it has. Two references
    to different records both resolve to "a record", and calling that change a
    patch would let a reference be repointed at unrelated data without anyone
    being told.
    """
    if not isinstance(before_ref, str) or not isinstance(after_ref, str):
        return False
    _, _, left = _alias_chain(before_types, before_ref)
    _, _, right = _alias_chain(after_types, after_ref)
    return left is not None and left == right


def _classify_fields(
    before: dict[str, Any],
    after: dict[str, Any],
    before_types: dict[str, dict[str, Any]],
    after_types: dict[str, dict[str, Any]],
    policy: Any,
    found: list[str],
) -> None:
    before_fields = _by_identity(before.get("fields"))
    after_fields = _by_identity(after.get("fields"))
    for identity, field in after_fields.items():
        was = before_fields.get(identity)
        if was is None:
            if _lower_bound(field) >= 1:
                found.append("breaking")
            elif _preserves_unknown(policy):
                found.append("additive")
            else:
                found.append("conditional")
            continue
        if _lower_bound(was) == 0 and _lower_bound(field) >= 1:
            found.append("breaking")
        elif _lower_bound(was) >= 1 and _lower_bound(field) == 0:
            found.append("additive")
        if was.get("unit") != field.get("unit"):
            found.append("breaking")
        if was.get("defaultKind") != field.get("defaultKind"):
            found.append("conditional")
        if was.get("nullable") != field.get("nullable"):
            found.append("breaking")
        if was.get("typeRef") != field.get("typeRef"):
            found.append(
                "patch"
                if _resolves_alike(
                    before_types, after_types, was.get("typeRef"), field.get("typeRef")
                )
                else "breaking"
            )
    for identity in before_fields:
        if identity not in after_fields:
            found.append("breaking")


def classify(before_bundle: Any, after_bundle: Any) -> str:
    """Classifies the move from one bundle to another.

    The contract states the rules and this states them in Python: a required
    addition, a removal, an incompatible meaning or type change, a stable
    identity change and an unknown-policy tightening are breaking; an optional
    addition is additive only where a consumer policy preserves what it does not
    know; and a change the rules do not cover is `unknown`, which prevents a
    compatible promotion rather than being waved through as a patch.
    """
    before = before_bundle.get("ir") if isinstance(before_bundle, dict) else None
    after = after_bundle.get("ir") if isinstance(after_bundle, dict) else None
    if not isinstance(before, dict) or not isinstance(after, dict):
        return "invalid"
    policy = (
        after_bundle.get("consumerPolicy") if isinstance(after_bundle, dict) else None
    )
    found: list[str] = []

    if before.get("contractVersion") != after.get("contractVersion"):
        found.append("conditional")

    before_extensions = _by_identity(before.get("extensions"))
    for identity, extension in _by_identity(after.get("extensions")).items():
        if identity not in before_extensions and extension.get("required") is True:
            found.append("breaking")

    before_types = _types_by_identity(before)
    after_types = _types_by_identity(after)
    for identity, definition in after_types.items():
        was = before_types.get(identity)
        if was is None:
            found.append("additive")
            continue
        if was.get("kind") != definition.get("kind"):
            found.append("breaking")
        for member in ("scalar", "target", "items", "values", "unknownPolicy"):
            if was.get(member) != definition.get(member):
                found.append(
                    "patch"
                    if member == "target"
                    and _resolves_alike(
                        before_types,
                        after_types,
                        was.get(member),
                        definition.get(member),
                    )
                    else "breaking"
                )
        _classify_fields(was, definition, before_types, after_types, policy, found)

        before_variants = _by_identity(was.get("variants"))
        after_variants = _by_identity(definition.get("variants"))
        for variant in after_variants:
            if variant not in before_variants:
                found.append("conditional")
        for variant in before_variants:
            if variant not in after_variants:
                found.append("breaking")

        before_edges = _by_identity(was.get("relationships"))
        after_edges = _by_identity(definition.get("relationships"))
        for edge in after_edges:
            if edge not in before_edges:
                found.append("conditional")
        for edge in before_edges:
            if edge not in after_edges:
                found.append("breaking")

        before_operations = _by_identity(was.get("operations"))
        after_operations = _by_identity(definition.get("operations"))
        for operation, declaration in after_operations.items():
            prior = before_operations.get(operation)
            if prior is None:
                found.append("additive")
            elif reader.canonical(prior.get("params")) != reader.canonical(
                declaration.get("params")
            ) or prior.get("returns") != declaration.get("returns"):
                found.append("breaking")
        for operation in before_operations:
            if operation not in after_operations:
                found.append("breaking")

        before_constraints = _by_identity(was.get("constraints"))
        after_constraints = _by_identity(definition.get("constraints"))
        for constraint, declaration in after_constraints.items():
            prior = before_constraints.get(constraint)
            if prior is None:
                found.append("conditional")
            elif reader.canonical(prior.get("operands")) != reader.canonical(
                declaration.get("operands")
            ):
                found.append("conditional")
        for constraint in before_constraints:
            if constraint not in after_constraints:
                found.append("breaking")

        for member in set(was) | set(definition):
            if member in CLASSIFIED_TYPE_MEMBERS:
                continue
            if reader.canonical(was.get(member)) != reader.canonical(
                definition.get(member)
            ):
                found.append("unknown")

    for identity in before_types:
        if identity not in after_types:
            found.append("breaking")

    return _worst(found)


def answer(case: dict[str, Any], version: str) -> dict[str, Any]:
    """One adapter result for one materialized case."""
    bundle = case["input"]
    ir = bundle.get("ir") if isinstance(bundle, dict) else None
    schema_rows = schema_diagnostics(bundle)
    if schema_rows:
        rows = [
            {
                "code": "agent-ix.semantic-ir.SCHEMA_VIOLATION",
                "pointer": row["pointer"],
                "message": row["message"],
            }
            for row in schema_rows
        ]
    else:
        rows = [
            {
                "code": row["code"],
                "pointer": pointer("/ir", row["path"]),
                "message": row["message"],
            }
            for row in reader.read_semantic_ir(ir, _lock_exports(bundle))
            # The shared reader's identity rule sees types only; this adapter
            # decides identity uniqueness over the whole document instead, and
            # two rules for one obligation would report one defect twice.
            if not row["code"].endswith("DUPLICATE_IDENTITY")
        ]
        rows = [_deepen(row) for row in rows]
        rows.extend(supplementary(bundle, ir))
        rows = list({(row["pointer"], row["code"]): row for row in rows}.values())
    rows.sort(key=lambda row: (row["pointer"], row["code"]))
    result: dict[str, Any] = {
        "adapter": ADAPTER_ID,
        "adapterVersion": version,
        "caseId": case["caseId"],
        "caseDigest": case["caseDigest"],
        "support": "supported",
        "resultState": "invalid" if rows else "success",
        "diagnostics": render(bundle, rows),
        "normalized": reader.normalize(ir),
    }
    if case["kind"] == "compatibility":
        before = case["before"]
        before_invalid = (
            bool(schema_diagnostics(before))
            or bool(
                reader.read_semantic_ir(
                    before.get("ir") if isinstance(before, dict) else None,
                    _lock_exports(before),
                )
            )
            or bool(
                supplementary(
                    before, before.get("ir") if isinstance(before, dict) else None
                )
            )
        )
        result["classification"] = (
            "invalid"
            if before_invalid or result["resultState"] == "invalid"
            else classify(before, bundle)
        )
    return result


def _lock_exports(bundle: Any) -> set[str]:
    """The type identities the package manifest exports, or an empty set."""
    manifest = bundle.get("manifest") if isinstance(bundle, dict) else None
    exports = manifest.get("exports") if isinstance(manifest, dict) else None
    if not isinstance(exports, list):
        return set()
    return {
        entry["typeIdentity"]
        for entry in exports
        if isinstance(entry, dict) and isinstance(entry.get("typeIdentity"), str)
    }


def main() -> int:
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".cases")
    index = json.loads((directory / "index.json").read_text())
    version = adapter_version()
    results = [
        answer(json.loads((directory / row["path"]).read_text()), version)
        for row in index["cases"]
    ]
    sys.stdout.write(json.dumps(results) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
