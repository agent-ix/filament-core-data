"""Batch the independent Python reader's native verdicts for the OP vector gate."""

from __future__ import annotations

import json
import sys
from typing import Any

from semantic_ir_reader import _schema_validator, read_semantic_ir


def schema_paths(error: Any) -> list[str]:
    """Retain paths from nested schema alternatives, including required-member loci."""
    if error.context:
        return [path for child in error.context for path in schema_paths(child)]
    parts = list(error.absolute_path)
    schema = list(error.absolute_schema_path)
    # Boolean-false properties retain the containing instance path in
    # jsonschema; the published schema identifies the refused member.
    if error.schema is False and len(schema) >= 2 and schema[-2] == "properties":
        parts.append(schema[-1])
    # Missing option.inner is located at the definition in the Rust mapping.
    # Other missing members keep their own distinct locus rather than being
    # hidden by an ancestor error for the expected violation.
    if error.validator == "required":
        missing = [name for name in error.validator_value if name not in error.instance]
        return [
            "/"
            + "/".join(
                str(part)
                for part in (
                    parts
                    if name == "inner" and error.instance.get("kind") == "option"
                    else [*parts, name]
                )
            )
            for name in missing
        ]
    return ["/" + "/".join(str(part) for part in parts)]


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
