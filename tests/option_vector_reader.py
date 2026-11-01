"""Batch the independent Python reader's native verdicts for the OP vector gate."""

from __future__ import annotations

import json
import sys
from typing import Any

from semantic_ir_reader import _schema_validator, read_semantic_ir


def schema_at(root: Any, path: list[Any]) -> Any:
    """Follow the published schema's local refs along a validator schema path."""
    schema = root
    for part in path:
        while isinstance(schema, dict) and "$ref" in schema:
            reference = schema["$ref"]
            if not reference.startswith("#/"):
                raise ValueError(
                    f"unexpected non-local false-property ref: {reference}"
                )
            schema = root
            for token in reference[2:].split("/"):
                schema = schema[token.replace("~1", "/").replace("~0", "~")]
        schema = schema[part]
    return schema


def schema_findings(error: Any, document: Any, root: Any) -> list[tuple[str, bool]]:
    """Retain all original schema findings and recover false-property locations.

    jsonschema omits the property name from a Boolean-false error's instance
    and schema paths. Identify every matching forbidden property from the
    published schema and the containing instance, never from a vector's answer.
    Equal values can identify several properties; all remain findings.
    """
    if error.context:
        return [
            finding
            for child in error.context
            for finding in schema_findings(child, document, root)
        ]
    parts = list(error.absolute_path)
    schema_path = list(error.absolute_schema_path)
    pointer = "/" + "/".join(str(part) for part in parts)
    if error.schema is False:
        properties = schema_at(root, schema_path)
        owner = document
        for part in parts:
            owner = owner[part]
        if not isinstance(properties, dict) or not isinstance(owner, dict):
            raise ValueError("false property has no containing schema/instance object")
        matches = [
            (f"{pointer}/{name}", True)
            for name, schema in properties.items()
            if schema is False and name in owner and owner[name] == error.instance
        ]
        if not matches:
            raise ValueError("false property cannot be located in its published schema")
        return matches
    if error.validator == "required":
        missing = [name for name in error.validator_value if name not in error.instance]
        return [
            (
                (
                    pointer
                    if name == "inner" and error.instance.get("kind") == "option"
                    else f"{pointer}/{name}"
                ),
                False,
            )
            for name in missing
        ]
    return [(pointer, False)]


def main() -> None:
    """Return schema findings and independent cross-field diagnostics per document."""
    validator = _schema_validator()
    verdicts = []
    for document in json.load(sys.stdin):
        errors = list(validator.iter_errors(document))
        findings = [
            finding
            for error in errors
            for finding in schema_findings(error, document, validator.schema)
        ]
        verdicts.append(
            {
                "schemaPaths": [path for path, _ in findings],
                "forbiddenPaths": [path for path, forbidden in findings if forbidden],
                "diagnostics": [] if errors else read_semantic_ir(document),
            }
        )
    print(json.dumps(verdicts))


if __name__ == "__main__":
    main()
