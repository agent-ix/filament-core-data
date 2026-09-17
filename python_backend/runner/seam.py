"""The backend seam's entry point into this generator (issue #23).

`src/compiler/backends/seam.mjs` registered `python-pydantic-v2` and
`python-dataclass` as declared-unimplemented targets owned by issue #23. They
were not unimplemented: this tree generates both packages today. What was
missing is a way for the JavaScript seam to reach a Python program.

ADR-0006 settles how. The effect is injected rather than reached for: one
module outside the compiler's pure set starts the child process, and the
backend receives the producer as an argument without knowing a process is
involved, exactly as `src/compiler/backends/format.mjs` already holds the
formatter's spawn. This module is the other side of that wire.

The protocol is one JSON document in on stdin and one JSON document out on
stdout, because a file map is the seam's currency and neither side should have
to agree on a directory layout to exchange one:

    in   {"profileId": str, "documents": {name: <JSON Schema document>},
          "index"?: <the json-schema target's index.json>}
    out  {"files": {path: text}}

Nothing here is published, and nothing here writes into the repository. The
caller receives bytes and decides where they land, which is the seam's rule
(FR-063) and not a convention this module invents.

A failure exits non-zero with a diagnostic on stderr. It never emits a partial
file map: a package that half-generated is one a consumer would import.
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from typing import Any

from python_backend.adapter.prepare import prepare_input_set
from python_backend.runner.emit import build_from


class RequestError(RuntimeError):
    """The request document is not one this entry point can act on."""


def _request(text: str) -> tuple[str, dict[str, Any], dict[str, Any] | None]:
    """Read the request, refusing rather than defaulting on every member."""

    try:
        loaded = json.loads(text)
    except json.JSONDecodeError as error:
        msg = f"the request is not JSON: {error}"
        raise RequestError(msg) from error
    if not isinstance(loaded, dict):
        msg = "the request is not a JSON object"
        raise RequestError(msg)

    profile_id = loaded.get("profileId")
    if not isinstance(profile_id, str) or not profile_id:
        msg = "the request names no profileId"
        raise RequestError(msg)

    documents = loaded.get("documents")
    if not isinstance(documents, dict) or not documents:
        msg = "the request carries no documents"
        raise RequestError(msg)
    for name, document in documents.items():
        if not isinstance(name, str) or "/" in name or name in {"", ".", ".."}:
            msg = f"document name is not a plain file name: {name!r}"
            raise RequestError(msg)
        if not isinstance(document, dict):
            msg = f"document {name} is not a JSON object"
            raise RequestError(msg)
    index = loaded.get("index")
    if index is not None and not isinstance(index, dict):
        msg = "the request's index is not a JSON object"
        raise RequestError(msg)
    return profile_id, documents, index


def files_for(
    profile_id: str, documents: dict[str, Any], index: dict[str, Any] | None = None
) -> dict[str, str]:
    """The generated package for one profile over one set of schema documents.

    The documents are written to a scratch directory and prepared by the same
    `prepare_input_set` the committed packages use, rather than by a second
    preparation written for this path. A `$ref` that resolved for the committed
    package therefore resolves here, and a preparation defect cannot present as
    a seam defect.
    """

    scratch = Path(tempfile.mkdtemp(prefix="agent-ix-python-seam-"))
    try:
        paths = []
        for name, document in sorted(documents.items()):
            path = scratch / name
            path.write_text(
                json.dumps(document, sort_keys=True, ensure_ascii=False),
                encoding="utf-8",
            )
            paths.append(path)
        return build_from(prepare_input_set(paths), profile_id, index)
    finally:
        for path in sorted(scratch.rglob("*"), reverse=True):
            path.unlink() if path.is_file() else path.rmdir()
        scratch.rmdir()


def main(argv: list[str] | None = None) -> int:
    del argv
    try:
        profile_id, documents, index = _request(sys.stdin.read())
        files = files_for(profile_id, documents, index)
    except Exception as error:  # noqa: BLE001 - the boundary reports, never raises
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    json.dump({"files": files}, sys.stdout, sort_keys=True, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
