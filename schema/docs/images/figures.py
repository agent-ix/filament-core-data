# SPDX-License-Identifier: AGPL-3.0-or-later
"""@agent-ix/semantic-schema documentation figures, rendered by the docs-figures skill.

Regenerate from the schema directory with the agent-ix/dev-tools skill:

    python3 -m pip install fonttools
    python3 <dev-tools>/skills/docs-figures/scripts/render.py docs/images/figures.py

Add --check to confirm the committed SVGs are current. Values are read from
semantic/v1/ in this package.
"""

import json
from pathlib import Path

from docs_figures import SMALL, TITLE, Figure  # noqa: F401

STYLE = "ix-docs"

ROOT = Path(__file__).resolve().parents[2]
V1 = ROOT / "semantic" / "v1"

ROLES = [
    ("code", "authored source", "box"),
    ("logic", "processing step", "box"),
    ("model", "checked document / view", "box"),
    ("evidence", "outcome", "box"),
    ("ink", "input", "box"),
]

SCHEMAS = sorted(V1.glob("*.schema.json"))
MANIFEST = json.loads((V1 / "module-manifest.schema.json").read_text())
REQUIRED = MANIFEST["required"]


def hero():
    """A module manifest is validated against module-manifest.schema.json."""
    n = len(SCHEMAS)
    req = ", ".join(REQUIRED)
    f = Figure(
        "hero",
        980,
        150,
        f"A module manifest JSON document goes to a draft 2020-12 JSON Schema validator loaded with "
        f"module-manifest.schema.json, one of {n} schema documents in semantic/v1/. The validator "
        f"answers true when the document has the required properties {req}, and false with the "
        f"missing property named when it does not.",
    )
    cy = 56
    f.box(0, cy - 34, 220, 68, "ink", "manifest JSON", "name, version", "manifest_version")
    f.box(290, cy - 34, 250, 68, "model", "module-manifest", "semantic/v1/", "module-manifest.schema.json")
    f.box(610, cy - 34, 160, 68, "logic", "validator", "draft 2020-12")
    f.box(840, cy - 34, 140, 68, "evidence", "true / false", "names the gap")
    f.line([(220, cy), (287, cy)], "ink")
    f.line([(540, cy), (607, cy)], "model")
    f.note(548, cy - 9, "loaded", "model")
    f.line([(770, cy), (837, cy)], "logic", weight=2.4)
    f.note(778, cy - 9, "verdict", "logic")
    f.text(0, 140, f"{n} schema documents + construct-vocabulary.json, all in semantic/v1/", "muted", "mono", SMALL)
    return f


FIGURES = [hero]
