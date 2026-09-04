"""Issue #23 — the qualified Python generation route.

The generator is the MIT `datamodel-code-generator`, pinned. This package is
the AGPL-3.0-only surface around it: the declared pins and advisory floor
(FR-072), the immutable target profiles (FR-073), the schema preparation pass
(FR-074), the refusal guards (FR-075), the sandboxed runner (FR-076), the
qualification (FR-077), the generated-source inspection (FR-078), the package
layout (FR-079), and the validation gates (FR-080).

Nothing here is published: the issue #23 safety gate forbids PyPI publication
and backend consumer migration until the release-readiness gates pass.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent

DEPENDENCY_GROUP = "python-backend"

PROVISIONING = "install it with `poetry install --with %s`" % DEPENDENCY_GROUP
