"""Reference localization for the kernel bundle (FR-087).

The kernel bundle `$ref`s exclusively by absolute `$id` — thirty-five
references over thirty documents, every one under the declared package base.
`python_backend/adapter/guard.py` refuses any `$ref` carrying a URI scheme with
`PY-REF-010`, so every kernel document reaches `assert_schema_safe` as a
refusal today.

The refusal is correct. An absolute-URI `$ref` does make the generator a
fetcher of caller-chosen content, and the guard cannot tell one that would be
fetched from one that resolves against a locally supplied `$id`. So the repair
belongs to the *input*, never to the register: this pass rewrites the documents
so the existing guard admits them unmodified, and a guard weakened to admit an
input is the failure FR-087-CON-1 exists to forbid.

Two rules, both recorded per document and per JSON pointer:

- `absolute-ref-to-sibling` — a `$ref` beginning with the declared package base
  becomes the remainder: the bare sibling filename, plus its `#`-fragment if it
  carries one. A `$ref` that does *not* begin with the base is left
  byte-identical, so an unexpected reference reaches the guard and is refused
  there rather than being localized into acceptability.
- `drop-root-id` — the document-root `$id` is deleted, and only that one. The
  localized bundle resolves by relative filename, and a retained absolute `$id`
  would re-establish the base the sibling references were just rewritten away
  from.
- `document-title-from-filename` — the document-root `title` is set to the
  document's own name, and only where the document declares none. The type name
  is not invented: `@typespec/json-schema` states a model's identity as `$id`
  and emits no `title`, so `FieldDecl.json` carries the name `FieldDecl` in its
  filename and its `$id` and nowhere the generator reads. The generator names a
  class from a `title` or a `$defs` key, so without this rule every one of the
  thirty documents mints a class called `Model`, the FR-079 collision rule
  correctly excludes a name thirty modules declare, and `__all__` comes out
  empty — a package with no public surface, reporting a naming failure as a
  thirty-way collision between unrelated types. The recovered name is the same
  identity the kernel's Rust, TypeScript and JSON Schema targets already use.

Only a constraint keyword is sacred: this rule adds an annotation keyword, it
adds it only where the input declares none, it derives it from the input rather
than from a choice, and it records it like every other rewrite. No constraint
keyword is introduced, changed or deleted, and `$schema` and every constraint
keyword stay byte-identical.

Pure: same result on every call, inputs unmutated, no clock, no network, no
filesystem write — the same purity `python_backend/adapter/prepare.py` holds.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any

from python_backend.adapter.prepare import Rewrite

#: Keywords whose values are subschemas or maps of subschemas. Walking these
#: rather than every key is what makes a `properties` entry literally named
#: `$ref` data instead of a reference. The sets restate
#: `python_backend/adapter/prepare.py`'s, which is module-private there and is
#: not edited here (FR-087-CON-7); `tests/test_semantic_kernel.py` asserts the
#: two agree, so the duplication cannot drift silently.
SUBSCHEMA_MAPS = ("properties", "patternProperties", "$defs", "definitions")
SUBSCHEMA_LISTS = ("allOf", "anyOf", "oneOf", "prefixItems")
SUBSCHEMA_VALUES = (
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

REF_RULE = "absolute-ref-to-sibling"
ID_RULE = "drop-root-id"
TITLE_RULE = "document-title-from-filename"


def title_for(name: str) -> str:
    """The type name a kernel document's own filename states."""

    return name.removesuffix(".json")


@dataclass
class Localized:
    """The localized documents and the ordered record of what was rewritten."""

    documents: dict[str, dict[str, Any]]
    rewrites: list[Rewrite] = field(default_factory=list)

    @property
    def localization(self) -> list[dict[str, str]]:
        return [rewrite.as_dict() for rewrite in self.rewrites]


def _escape(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def _localize_ref(value: Any, base: str) -> Any:
    """A base-relative `$ref`, or the value unchanged.

    A local `#`-pointer never begins with the base, so it falls through here
    untouched without needing a case of its own.
    """

    if isinstance(value, str) and value.startswith(base):
        return value[len(base) :]
    return value


def _walk(node: Any, name: str, base: str, pointer: str, out: list[Rewrite]) -> Any:
    if isinstance(node, list):
        return [
            _walk(item, name, base, f"{pointer}/{i}", out)
            for i, item in enumerate(node)
        ]
    if not isinstance(node, dict):
        return node

    result: dict[str, Any] = {}
    for key, value in node.items():
        child_pointer = f"{pointer}/{_escape(key)}"
        if key in SUBSCHEMA_MAPS and isinstance(value, dict):
            result[key] = {
                inner: _walk(sub, name, base, f"{child_pointer}/{_escape(inner)}", out)
                for inner, sub in value.items()
            }
        elif key in SUBSCHEMA_LISTS and isinstance(value, list):
            result[key] = [
                _walk(sub, name, base, f"{child_pointer}/{i}", out)
                for i, sub in enumerate(value)
            ]
        elif key in SUBSCHEMA_VALUES:
            result[key] = _walk(value, name, base, child_pointer, out)
        elif key == "$ref":
            localized = _localize_ref(value, base)
            if localized != value:
                out.append(Rewrite(REF_RULE, name, child_pointer))
            result[key] = localized
        else:
            result[key] = copy.deepcopy(value)
    return result


def localize_document(
    document: dict[str, Any], name: str, base: str
) -> tuple[dict[str, Any], list[Rewrite]]:
    """One document, with its own ordered rewrite record."""

    rewrites: list[Rewrite] = []
    localized = _walk(copy.deepcopy(document), name, base, "", rewrites)
    if "$id" in localized:
        del localized["$id"]
        rewrites.append(Rewrite(ID_RULE, name, "/$id"))
    if "title" not in localized:
        localized["title"] = title_for(name)
        rewrites.append(Rewrite(TITLE_RULE, name, "/title"))
    return localized, rewrites


def localize_bundle(documents: dict[str, dict[str, Any]], base: str) -> Localized:
    """The whole bundle, in document-name order.

    The order is the record's order: a reader comparing two runs compares two
    lists, not two sets.
    """

    localized: dict[str, dict[str, Any]] = {}
    rewrites: list[Rewrite] = []
    for name in sorted(documents):
        document, recorded = localize_document(documents[name], name, base)
        localized[name] = document
        rewrites.extend(recorded)
    return Localized(documents=localized, rewrites=rewrites)
