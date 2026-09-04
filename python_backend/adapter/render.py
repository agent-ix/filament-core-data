"""Render JSON the way the repository's pinned formatter writes it.

`make lint` runs `biome format` over every file, and this change commits
generated JSON that is also byte-compared. Rendering it any other way makes the
two gates disagree about whitespace, and the byte comparison then proves nothing
except that nobody ran the formatter.

Biome's rule, at its default width of 80 columns with tab indentation: a
composite value is written on one line when its one-line form fits, and is
expanded otherwise. This implements that rule rather than shelling out, so the
Python writers stay free of a Node subprocess; `make lint` is the gate that
proves the two agree.
"""

from __future__ import annotations

import json
from typing import Any

LINE_WIDTH = 80
#: Biome counts a tab as this many columns when deciding whether a line fits.
TAB_WIDTH = 2


def _inline(value: Any) -> str:
    if isinstance(value, dict):
        if not value:
            return "{}"
        body = ", ".join(
            f"{json.dumps(k, ensure_ascii=False)}: {_inline(v)}"
            for k, v in value.items()
        )
        return "{ " + body + " }"
    if isinstance(value, list):
        if not value:
            return "[]"
        return "[" + ", ".join(_inline(item) for item in value) + "]"
    return json.dumps(value, ensure_ascii=False)


def _fits(depth: int, prefix: int, one_line: str) -> bool:
    """Biome measures the whole line, key prefix included, not just the value."""

    return depth * TAB_WIDTH + prefix + len(one_line) <= LINE_WIDTH


def _render(value: Any, depth: int, prefix: int = 0) -> str:
    indent = "\t" * depth
    inner = "\t" * (depth + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        one_line = _inline(value)
        if _fits(depth, prefix, one_line) and not any(
            isinstance(item, (dict, list)) for item in value.values()
        ):
            return one_line
        rows = []
        for key, item in value.items():
            rendered_key = json.dumps(key, ensure_ascii=False)
            rows.append(
                f"{inner}{rendered_key}: "
                f"{_render(item, depth + 1, len(rendered_key) + 2)}"
            )
        return "{\n" + ",\n".join(rows) + f"\n{indent}}}"
    if isinstance(value, list):
        if not value:
            return "[]"
        one_line = _inline(value)
        if _fits(depth, prefix, one_line):
            return one_line
        rows = [f"{inner}{_render(item, depth + 1)}" for item in value]
        return "[\n" + ",\n".join(rows) + f"\n{indent}]"
    return json.dumps(value, ensure_ascii=False)


def render(document: Any) -> str:
    """The formatter-agreeing serialization of `document`, newline-terminated."""

    return _render(document, 0) + "\n"
