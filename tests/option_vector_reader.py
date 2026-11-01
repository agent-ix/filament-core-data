"""Batch the independent Python reader's native verdicts for the OP vector gate."""

from __future__ import annotations

import json
import sys
from typing import Any

from semantic_ir_reader import _schema_validator, read_semantic_ir


def schema_paths(error: Any) -> list[str]:
    """Retain paths from nested schema alternatives, including required-member loci."""
    parts = list(error.absolute_path)
    schema = list(error.absolute_schema_path)
    # jsonschema's boolean-false subschema reports its containing object's
    # instance path; the schema property identifies the refused member.
    if error.schema is False and len(schema) >= 2 and schema[-2] == "properties":
        parts.append(schema[-1])
    paths = ["/" + "/".join(str(part) for part in parts)]
    for child in error.context:
        paths.extend(schema_paths(child))
    return paths


def main() -> None:
    """Return schema paths and independent cross-field findings for each document."""
    validator = _schema_validator()
    verdicts = []
    for document in json.load(sys.stdin):
        errors = list(validator.iter_errors(document))
        verdicts.append(
            {
                "schemaPaths": [
                    path for error in errors for path in schema_paths(error)
                ],
                "diagnostics": [] if errors else read_semantic_ir(document),
            }
        )
    print(json.dumps(verdicts))


if __name__ == "__main__":
    main()
