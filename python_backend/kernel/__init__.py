"""The kernel Python target (issue #11, FR-087).

Everything FR-087 adds on the Python side lives here. The issue #23 route —
the pinned generator, the immutable profiles, the closed refusal register, the
sandboxed runner, the enforcing inspection and the byte-compared emitter — is
reached by import and is not edited, forked or vendored.

This subpackage sits under `python_backend/` so the repository's existing
`mypy`, `ruff` and `black` configuration already reaches it; `pyproject.toml`
needs no edit, which is what FR-087-CON-8 requires.
"""

from __future__ import annotations
