# SPDX-License-Identifier: AGPL-3.0-or-later
"""@agent-ix/semantic-core documentation figures, rendered by the docs-figures skill.

Regenerate from this package directory with the agent-ix/dev-tools skill:

    python3 -m pip install fonttools
    python3 <dev-tools>/skills/docs-figures/scripts/render.py docs/images/figures.py

Only the inventory column chart is defined here; the hero figure is defined in
docs/images/figures.json and rendered by `make figures` (the columns composite is not yet
supported by ixd-figures).

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


FIGURES = [inventory]
