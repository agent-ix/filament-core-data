# SPDX-License-Identifier: AGPL-3.0-or-later
"""@agent-ix/semantic-core documentation figures, rendered by the docs-figures skill.

Regenerate from this package directory with the agent-ix/dev-tools skill:

    python3 -m pip install fonttools
    python3 <dev-tools>/skills/docs-figures/scripts/render.py docs/images/figures.py

Add --check to confirm the committed SVGs are current. Values are read from this
package: inventory.json, kernel-scalars.json, lowering.json and generated/json-schema/.
"""

import json
from pathlib import Path

from docs_figures import SMALL, TITLE, Figure  # noqa: F401

STYLE = "ix-docs"

ROOT = Path(__file__).resolve().parents[2]

ROLES = [
    ("code", "authored source", "box"),
    ("logic", "processing step", "box"),
    ("model", "checked document / view", "box"),
    ("evidence", "outcome", "box"),
    ("ink", "input", "box"),
]

INVENTORY = json.loads((ROOT / "inventory.json").read_text())
SCALARS = json.loads((ROOT / "kernel-scalars.json").read_text())["scalars"]
LOWERING = json.loads((ROOT / "lowering.json").read_text())["rows"]
GENERATED = sorted((ROOT / "generated" / "json-schema").glob("*.json"))

KINDS = [
    ("models", "models"),
    ("unions", "unions"),
    ("wireUnions", "wire unions"),
    ("enums", "enums"),
    ("scalars", "scalars"),
]


def hero():
    """main.tsp compiles to one JSON Schema document per declaration."""
    n = len(GENERATED)
    f = Figure(
        "hero",
        980,
        190,
        f"main.tsp, the TypeSpec source for the AgentIx.Semantic.Core namespace, compiles with the "
        f"@typespec/json-schema emitter into {n} JSON Schema documents under generated/json-schema/. "
        f"A JSON Schema validator checks a field declaration against FieldDecl.json and answers true "
        f"or false. Three tables ship beside them: inventory.json, kernel-scalars.json "
        f"({len(SCALARS)} scalars) and lowering.json ({len(LOWERING)} rows).",
    )
    cy = 62
    f.box(0, cy - 34, 190, 68, "code", "main.tsp", "AgentIx.Semantic.Core", "declaration grammar")
    f.box(250, cy - 34, 200, 68, "logic", "tsp compile", "@typespec/json-schema", "emitAllModels")
    f.box(510, cy - 34, 220, 68, "model", f"{n} JSON Schemas", "generated/json-schema/", "draft 2020-12")
    f.box(790, cy - 34, 190, 68, "evidence", "true / false", "FieldDecl.json", "checks a field")
    f.line([(190, cy), (247, cy)], "code")
    f.line([(450, cy), (507, cy)], "logic")
    f.note(458, cy - 9, "emits", "logic")
    f.line([(730, cy), (787, cy)], "model", weight=2.4)
    f.note(738, cy - 9, "$ref", "model")
    f.rect(0, 140, 980, 1, "faint", stroke=False, opacity=0.5)
    f.text(0, 176, "ALSO PUBLISHED", "muted", "mono", SMALL)
    f.text(180, 176, f"inventory.json  {sum(len(INVENTORY[k]) for k, _ in KINDS)} declarations", "ink", "mono", SMALL)
    f.text(480, 176, f"kernel-scalars.json  {len(SCALARS)} scalars", "ink", "mono", SMALL)
    f.text(760, 176, f"lowering.json  {len(LOWERING)} rows", "ink", "mono", SMALL)
    return f


def inventory():
    """A column chart: how many declarations of each kind the namespace holds."""
    values = [len(INVENTORY[k]) for k, _ in KINDS]
    total = sum(values)
    f = Figure(
        "inventory",
        720,
        236,
        "The AgentIx.Semantic.Core namespace declares " + ", ".join(
            (f"{v} {label}" if v != 1 else f"{v} {label[:-1]}") for v, (_, label) in zip(values, KINDS)
        ) + f", {total} in all, and each one has a generated JSON Schema document.",
    )
    f.columns(0, 0, 720, 236, values, labels=[label for _, label in KINDS], role="logic", ticks=[0, 10, 20])
    return f


FIGURES = [hero, inventory]
