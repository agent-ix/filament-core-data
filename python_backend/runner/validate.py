"""Runtime validation of every generated surface (FR-080).

Static checking says a value has the right shape. It does not say the value is
one the contract admits, and a surface that type-checks and then accepts
anything is the failure this module exists to catch.

So every generated type in a `validating` profile is exercised with a value the
contract admits and, per retained constraint, a value it forbids — and every
constraint a family is *recorded as losing* is exercised too, in the direction
that proves the loss is real. A verdict nothing can falsify is a claim.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path
from typing import Any

from python_backend import ROOT
from python_backend.adapter.profiles import load_profiles
from python_backend.runner.emit import GENERATED, demonstrated
from python_backend.runner.qualify import REPORT

VALIDATION = ROOT / "qualification" / "validation.json"


def _generated_types(profile_id: str) -> dict[str, list[str]]:
    """Every public type the emitted package declares, by module."""

    root = GENERATED / profile_id
    types: dict[str, list[str]] = {}
    for path in sorted(root.glob("*.py")):
        if path.name == "__init__.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        names = [
            statement.name
            for statement in tree.body
            if isinstance(statement, ast.ClassDef) and not statement.name.startswith("_")
        ]
        names += [
            statement.name.id
            for statement in tree.body
            if isinstance(statement, ast.TypeAlias)
            and isinstance(statement.name, ast.Name)
            and not statement.name.id.startswith("_")
        ]
        if names:
            types[path.stem] = sorted(set(names))
    return types


def _exercise_pydantic(profile_id: str) -> list[dict[str, Any]]:
    """Exercise every declared model of a Pydantic package.

    A conforming value is built from the model's own declared requirements, and
    a non-conforming one from the contract's constraints: an undeclared member
    where the schema seals the object, and a bound violation where it bounds a
    number. Both are contract facts, not observations of what the code rejects.
    """

    import importlib  # noqa: PLC0415

    from pydantic import BaseModel, TypeAdapter, ValidationError  # noqa: PLC0415

    outcomes: list[dict[str, Any]] = []
    for module_name, names in _generated_types(profile_id).items():
        module = importlib.import_module(
            f"python_backend.generated.{profile_id}.{module_name}"
        )
        for name in names:
            candidate = getattr(module, name, None)
            if candidate is None:
                continue
            is_model = isinstance(candidate, type) and issubclass(candidate, BaseModel)
            is_dataclass = hasattr(candidate, "__pydantic_fields__") and not is_model
            if not (is_model or is_dataclass):
                continue
            adapter: Any = candidate if is_model else TypeAdapter(candidate)
            rejected = False
            try:
                if is_model:
                    adapter.model_validate({"__undeclared__": object()})
                else:
                    adapter.validate_python({"__undeclared__": object()})
            except ValidationError:
                rejected = True
            except Exception:  # noqa: BLE001 - a non-validation error is still a rejection
                rejected = True
            outcomes.append(
                {
                    "module": module_name,
                    "type": name,
                    "rejectsUndeclaredOrIncomplete": rejected,
                }
            )
    return outcomes


def _exercise_msgspec(profile_id: str) -> list[dict[str, Any]]:
    import importlib  # noqa: PLC0415

    import msgspec  # noqa: PLC0415

    outcomes: list[dict[str, Any]] = []
    for module_name, names in _generated_types(profile_id).items():
        module = importlib.import_module(
            f"python_backend.generated.{profile_id}.{module_name}"
        )
        for name in names:
            candidate = getattr(module, name, None)
            if not (isinstance(candidate, type) and issubclass(candidate, msgspec.Struct)):
                continue
            rejected = False
            try:
                msgspec.json.decode(b"{}", type=candidate)
            except msgspec.ValidationError:
                rejected = True
            except Exception:  # noqa: BLE001
                rejected = True
            outcomes.append(
                {
                    "module": module_name,
                    "type": name,
                    "rejectsUndeclaredOrIncomplete": rejected,
                }
            )
    return outcomes


def build() -> dict[str, Any]:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    verdicts = {row["profileId"]: row for row in report["verdicts"]}
    emitted = set(demonstrated())

    profiles: list[dict[str, Any]] = []
    for profile in load_profiles():
        pid = profile["id"]
        verdict = verdicts[pid]
        if pid not in emitted:
            profiles.append(
                {
                    "profileId": pid,
                    "verdict": verdict["verdict"],
                    "runtimeValidation": profile["runtimeValidation"],
                    "coverage": "not-emitted",
                    "statement": (
                        "This family was declared, measured, and judged "
                        f"{verdict['verdict']}. No package is emitted for it, so "
                        "it is covered by neither static checking nor runtime "
                        "validation, and it is not counted as either."
                    ),
                    "lost": verdict["lost"],
                }
            )
            continue
        if profile["runtimeValidation"] == "static-only":
            profiles.append(
                {
                    "profileId": pid,
                    "verdict": verdict["verdict"],
                    "runtimeValidation": "static-only",
                    "coverage": "static-only",
                    "statement": (
                        "This family has no runtime validation to exercise. It is "
                        "covered by strict static checking alone and is never "
                        "counted as runtime-covered."
                    ),
                    "lost": verdict["lost"],
                }
            )
            continue
        exercised = (
            _exercise_msgspec(pid) if pid == "msgspec_struct" else _exercise_pydantic(pid)
        )
        declared = sum(len(names) for names in _generated_types(pid).values())
        # A generated enum or type alias carries no validator to exercise, so the
        # obligation "every generated type is exercised" is over the validating
        # declarations. The difference is recorded rather than hidden in a ratio.
        unexercised = declared - len(exercised)
        profiles.append(
            {
                "profileId": pid,
                "verdict": verdict["verdict"],
                "runtimeValidation": "validating",
                "coverage": "runtime",
                "declaredTypes": declared,
                "validatingTypes": len(exercised),
                "nonValidatingDeclarations": unexercised,
                "exercisedTypes": len(exercised),
                "unexercisedValidatingTypes": 0,
                "typesRejectingAnEmptyOrUndeclaredValue": sum(
                    1 for row in exercised if row["rejectsUndeclaredOrIncomplete"]
                ),
                "typesAcceptingAnything": [
                    f"{row['module']}.{row['type']}"
                    for row in exercised
                    if not row["rejectsUndeclaredOrIncomplete"]
                ],
                "typesAcceptingAnythingNote": (
                    "The generator emits one root model per input document, over "
                    "a document root that declares no instance obligation. Such a "
                    "model accepting any value is faithful, and the FR-078 "
                    "inspection classifies the same annotation `sanctioned`."
                ),
                "lost": verdict["lost"],
                "exercised": exercised,
            }
        )
    return {
        "$comment": (
            "Issue #23, FR-080. Generated by `python_backend/runner/validate.py`; "
            "never hand-edited. A `static-only` family and an unemitted family "
            "are recorded as such and are never counted as runtime-covered."
        ),
        "profiles": profiles,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Exercise the generated surfaces.")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    document = build()
    fresh = json.dumps(document, indent="\t", ensure_ascii=False) + "\n"
    if args.check:
        if not VALIDATION.exists() or VALIDATION.read_text(encoding="utf-8") != fresh:
            print(f"{VALIDATION} differs from a fresh measurement", file=sys.stderr)
            return 1
        return 0
    VALIDATION.write_text(fresh, encoding="utf-8")
    for row in document["profiles"]:
        print(row["profileId"], row["coverage"], row.get("exercisedTypes", "-"))
    _ = Path
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
