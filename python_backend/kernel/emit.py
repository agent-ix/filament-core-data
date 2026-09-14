"""The kernel Python emit driver (FR-087).

This orchestrates a measured route; it does not build a second one. The issue
#23 pipeline — the pinned MIT `datamodel-code-generator` `0.76.0`, the
immutable profiles, the closed refusal register, the sandboxed runner, the
`enforce`-mode inspection and the byte-compared emitter — is reached by import
and edited nowhere. Exactly one component is new: the pure reference
localization of `python_backend/kernel/localize.py`, which rewrites the *input*
so the existing guard admits it unmodified.

The pipeline, in order, because the order is the property:

    read the committed documents
      -> localize_bundle          (input rewrite, recorded)
      -> prepare_documents        (FR-074 closure rewrite, recorded)
      -> assert_schema_safe       (inside `generate`, unmodified, unassisted)
      -> assert_argv_safe         (inside `generate`)
      -> generate                 (sandboxed subprocess)
      -> inspect_generated(enforce)
      -> write

Localization runs before preparation and therefore before the guard-facing
input, so what the guard inspects is what the generator receives.

Where a layout rule of `python_backend/runner/emit.py` is reachable only as a
module-private function, it is re-derived here from the same public helpers —
`collisions`, `digest` — and `tests/test_semantic_kernel.py` asserts the two
produce identical `__init__.py` text and an identical content fingerprint for
one file map. A duplicated rule with no equality gate is how two emitters start
disagreeing.

Nothing here publishes. Publication passes `agent-ix/quoin#290`, a human
sign-off that has not moved, and the issue #23 safety gate.
"""

from __future__ import annotations

import argparse
import ast
import json
import shutil
import sys
from pathlib import Path
from typing import Any

from python_backend import ROOT
from python_backend.adapter.jcs import digest
from python_backend.adapter.prepare import Prepared, prepare_documents
from python_backend.adapter.profiles import profile_by_id
from python_backend.adapter.render import render
from python_backend.kernel.localize import Localized, localize_bundle
from python_backend.runner.emit import UPSTREAM_ATTRIBUTION, collisions, demonstrated
from python_backend.runner.generate import generate
from python_backend.runner.inspect_source import inspect_generated
from python_backend.runner.qualify import NOT_QUALIFIED, REPORT
from python_backend.runner.toolchain import toolchain

REPOSITORY = ROOT.parent
SCHEMAS = REPOSITORY / "packages/semantic-core/generated/json-schema"
CORE_TOOLCHAIN = REPOSITORY / "packages/semantic-core/generated/toolchain.json"
CORE_MANIFEST = REPOSITORY / "packages/semantic-core/package.json"
PACKAGES = REPOSITORY / "packages/semantic-kernel/python"
EXAMPLES = REPOSITORY / "packages/semantic-kernel/examples/python"

PUBLICATION_GATE = "agent-ix/quoin#290"

#: No kernel document uses `uniqueItems`. The `constraints-array-unique` loss
#: all three demonstrated families carry is therefore not exercised by this
#: input set — a property of the bundle, never a repair of the family.
UNIQUE_ITEMS_NOTE = (
    "No document of this bundle uses `uniqueItems`, so the "
    "`constraints-array-unique` loss recorded for this family is not exercised "
    "by this input set. That is a property of the bundle, not a repair of the "
    "family: the family still loses the construct wherever an input uses it. "
    "`UniqueConstraint.json` declares a kernel constraint *keyword* as data and "
    "is unaffected."
)

#: FR-087 finding F1, `agent-ix/filament-core-data#79`. Every family renders
#: FR-029's `format` keyword as a `StrEnum` member that shadows `str.format`,
#: which `mypy --strict` rejects. Recorded, never silenced: the input is
#: correct, the shadowing is real, and each available silencing would trade a
#: measured fact for a green gate.
STRENUM_SHADOW = {
    "id": "F1",
    "issue": "agent-ix/filament-core-data#79",
    "summary": (
        "`ConstraintKeyword.format` is a `StrEnum` member that shadows "
        "`str.format`, so `mypy --strict` reports one error at "
        "`ConstraintKeyword.py:20`. FR-029's keyword vocabulary is closed and "
        "owned by `#35`; the pinned generator renders a member name verbatim."
    ),
    "types": ["ConstraintKeyword"],
}

#: FR-087 finding F2, `agent-ix/filament-core-data#125`. `msgspec` refuses four
#: kernel types at decoder-construction time. Neither union shape occurs in the
#: thirteen published documents the issue #23 qualification probed, so neither
#: is a `python_backend/qualification/gaps.json` row and neither may be made
#: into one from here (FR-087-CON-4, FR-087-CON-7).
MSGSPEC_UNION_LOSS = {
    "id": "F2",
    "issue": "agent-ix/filament-core-data#125",
    "summary": (
        "`msgspec` cannot construct a decoder for four of the thirty kernel "
        "types. `TypeRef.target` is a union of a pattern-constrained string and "
        "a string enum, which `msgspec` refuses as two str-like members; "
        "`FieldDecl` and `OperationDecl` reach it; and `ConstraintDecl` is "
        "eleven untagged structs, because the generator does not carry the "
        "schema's stated `keyword` discriminator into a `tag_field`."
    ),
    "types": ["ConstraintDecl", "FieldDecl", "OperationDecl", "TypeRef"],
}

#: Measured findings by family. A family's list is what its README and its
#: `PROVENANCE.json` both state; nothing here is derived from a clock or a host.
FINDINGS: dict[str, list[dict[str, Any]]] = {
    "pydantic_v2_basemodel": [STRENUM_SHADOW],
    "pydantic_v2_dataclass": [STRENUM_SHADOW],
    "msgspec_struct": [STRENUM_SHADOW, MSGSPEC_UNION_LOSS],
}


class KernelEmitError(RuntimeError):
    """A kernel package cannot be built or written."""


def documents() -> dict[str, dict[str, Any]]:
    """The committed kernel bundle, by document filename."""

    return {
        path.name: json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(SCHEMAS.glob("*.json"))
    }


def bundle_identity() -> dict[str, str]:
    """The exact bundle a package was generated from.

    The base encodes the `@agent-ix/semantic-core` version, and the digest is
    the emitter's own over the ordered document set, so a package traces to one
    bundle rather than to a directory that happened to hold those bytes.
    """

    core = json.loads(CORE_TOOLCHAIN.read_text(encoding="utf-8"))
    manifest = json.loads(CORE_MANIFEST.read_text(encoding="utf-8"))
    return {
        "base": core["base"],
        "digest": core["digest"],
        "semanticCoreVersion": manifest["version"],
    }


def localized() -> Localized:
    return localize_bundle(documents(), bundle_identity()["base"])


def prepared() -> tuple[Localized, Prepared]:
    record = localized()
    return record, prepare_documents(record.documents)


def public_symbols(source: str) -> list[str]:
    """Top-level type names a generated module declares.

    Re-derived from the same grammar `python_backend/runner/emit.py` reads,
    because its own reader is module-private. The equality gate over one file
    map is what keeps the two readings the same reading.
    """

    tree = ast.parse(source)
    names: list[str] = []
    for statement in tree.body:
        if isinstance(statement, ast.ClassDef) and not statement.name.startswith("_"):
            names.append(statement.name)
        elif isinstance(statement, ast.TypeAlias) and isinstance(
            statement.name, ast.Name
        ):
            if not statement.name.id.startswith("_"):
                names.append(statement.name.id)
        elif isinstance(statement, ast.AnnAssign) and isinstance(
            statement.target, ast.Name
        ):
            if not statement.target.id.startswith("_"):
                names.append(statement.target.id)
    return names


def module_exports(files: dict[str, str]) -> dict[str, list[str]]:
    exports: dict[str, list[str]] = {}
    for name, source in sorted(files.items()):
        if not name.endswith(".py") or name == "__init__.py":
            continue
        exports[name[:-3]] = public_symbols(source)
    return exports


def init_module(
    exports: dict[str, list[str]], driver: str = "python_backend.kernel.emit"
) -> str:
    """The package `__init__.py`, byte-identical to what FR-079 produces.

    `driver` names the module that regenerates the tree, and is the only thing
    that differs between this rendering and the route's own. The AC-17 gate
    calls this with the route's driver name and compares bytes, so the two
    layout rules cannot drift while the prose hides it.

    The name-collision rule is the imported `collisions`, unchanged: a name two
    modules each declare is excluded from `__all__`, stays reachable as
    `<module>.<Name>`, and is recorded in `PROVENANCE.json` and the README; a
    name one module declares twice raises, because one would shadow the other.
    """

    for module, names in exports.items():
        duplicates = {name for name in names if names.count(name) > 1}
        if duplicates:
            msg = (
                f"module {module!r} declares {sorted(duplicates)} more than once; "
                "one would shadow the other"
            )
            raise KernelEmitError(msg)

    shared = collisions(exports)
    lines = [
        '"""Generated package. Do not edit: regenerate with',
        f"`poetry run python -m {driver}`.",
        "",
        "`__all__` carries every type name exactly one module declares. Names",
        "several modules declare are different types that happen to share a",
        "local name; they are reachable as `<module>.<Name>` and are listed in",
        '`PROVENANCE.json` under `nameCollisions`."""',
        "",
    ]
    for module in sorted(exports):
        names = sorted(name for name in set(exports[module]) if name not in shared)
        if names:
            lines.append(f"from .{module} import {', '.join(names)}")
    lines.append("")
    lines.append("__all__ = [")
    everything = sorted(
        {name for names in exports.values() for name in names} - set(shared)
    )
    lines.extend(f'    "{name}",' for name in everything)
    lines.append("]")
    lines.append("")
    return "\n".join(lines)


def content_fingerprint(files: dict[str, str]) -> str:
    return digest(
        {name: files[name] for name in sorted(files) if name != "PROVENANCE.json"}
    )


def _verdict(profile_id: str) -> dict[str, Any]:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    return next(row for row in report["verdicts"] if row["profileId"] == profile_id)


def _readme(
    profile: dict[str, Any],
    verdict: dict[str, Any],
    shared: dict[str, list[str]],
    identity: dict[str, str],
) -> str:
    lost = verdict["lost"] or ["nothing measured as lost"]
    lines = [
        f"# Kernel Python package: `{profile['id']}`",
        "",
        f"Output family: `{profile['outputModelType']}`.",
        f"Runtime validation: {profile['runtimeValidation']}.",
        f"Qualification verdict: **{verdict['verdict']}**.",
        "",
        "Generated from the semantic kernel bundle",
        f"`{identity['base']}` (`@agent-ix/semantic-core` "
        f"{identity['semanticCoreVersion']}, digest `{identity['digest']}`)",
        "through `python_backend/kernel/emit.py`, by the pinned",
        "`datamodel-code-generator`. Do not edit by hand: the tree is",
        "regenerated and byte-compared.",
        "",
        "## What this package does not carry",
        "",
    ]
    lines.extend(f"- `{name}`" for name in lost)
    lines.extend(
        [
            "",
            "Each is recorded in `python_backend/qualification/gaps.json` with a",
            "severity and a disposition. A construct measured as lost and absent",
            "from that register fails the qualification gate. A family generated",
            "for the kernel does not become a better family.",
            "",
            UNIQUE_ITEMS_NOTE,
            "",
        ]
    )
    if shared:
        lines.extend(
            [
                "## Names this package does not re-export at the top level",
                "",
                "These names are declared by more than one module and are" " different",
                "types. They are reachable as `<module>.<Name>` and are excluded"
                " from",
                "`__all__` rather than silently shadowed.",
                "",
            ]
        )
        lines.extend(
            f"- `{name}` — {', '.join(modules)}"
            for name, modules in sorted(shared.items())
        )
        lines.append("")
    if verdict["conditions"]:
        lines.extend(["## Conditions this verdict depends on", ""])
        lines.extend(
            f"- {row['condition']} ({row['grounding']})"
            for row in verdict["conditions"]
        )
        lines.append("")
    lines.extend(["## Findings measured over this bundle", ""])
    for finding in FINDINGS[profile["id"]]:
        lines.extend(
            [
                f"### {finding['id']} — `{finding['issue']}`",
                "",
                finding["summary"],
                "",
                "Affected types: "
                + ", ".join(f"`{name}`" for name in finding["types"])
                + ".",
                "",
            ]
        )
    lines.extend(
        [
            "These are recorded, not repaired. Each names the issue that owns" " the",
            "decision; none is silenced by a checker override, a generator"
            " option, a",
            "profile revision, or an edit to the qualification register.",
            "",
            "## How the kernel bundle reaches this generator",
            "",
            "The bundle `$ref`s by absolute `$id`, which"
            " `python_backend/adapter/guard.py`",
            "refuses with `PY-REF-010` — correctly: an absolute-URI reference"
            " does make",
            "the generator a fetcher of caller-chosen content. The repair is in" " the",
            "input, never in the register:"
            " `python_backend/kernel/localize.py` rewrites",
            "each base-prefixed `$ref` to its bare sibling filename and drops the"
            " root",
            "`$id`, and the unmodified guard then admits the result. Every rewrite"
            " is",
            "recorded by document and JSON pointer in `PROVENANCE.json` under",
            "`localization`.",
            "",
            "The same pass restores each document's `title` from its filename." " The",
            "official `@typespec/json-schema` emitter states a model's identity"
            " as its",
            "absolute `$id` and emits no `title`, and the generator derives a" " class",
            "name from a `title` or a `$defs` key and from nothing else. The"
            " restored",
            "name is recovered rather than invented: it is the identity the `$id`" "",
            "encodes and the name the Rust, TypeScript, and JSON Schema kernel"
            " targets",
            "already carry.",
            "",
            "## Licence",
            "",
            "The generated source is AGPL-3.0-only, like the rest of this",
            "repository. The generator is MIT and is attributed in",
            "`PROVENANCE.json`.",
            "",
            "This package is not published. Publication passes",
            f"`{PUBLICATION_GATE}` and the issue #23 safety gate, and reaches no",
            "distribution manifest.",
            "",
        ]
    )
    return "\n".join(lines)


def build(profile_id: str) -> dict[str, str]:
    """One kernel package, from the committed bundle, as a file map."""

    profile = profile_by_id(profile_id)
    verdict = _verdict(profile_id)
    if verdict["verdict"] == NOT_QUALIFIED:
        msg = (
            f"{profile_id} is judged {NOT_QUALIFIED}; its absence is recorded in "
            "NOT-QUALIFIED.md and no package is emitted for it"
        )
        raise KernelEmitError(msg)

    localization, input_set = prepared()
    result = generate(
        input_set,
        profile_id,
        inspect=lambda files, docs: inspect_generated(files, docs, "enforce"),
    )

    files = dict(result.files)
    exports = module_exports(files)
    shared = collisions(exports)
    identity = bundle_identity()
    files["__init__.py"] = init_module(exports)
    files["README.md"] = _readme(profile, verdict, shared, identity)

    provenance = {
        "$comment": "Issue #11, FR-087. Regenerated, never hand-edited.",
        "source": {
            "documents": sorted(input_set.documents),
            "inputDigest": result.input_digest,
            "bundle": identity,
            "localization": localization.localization,
            "preparation": result.preparation,
        },
        "profile": {"id": profile_id, "digest": result.profile_digest},
        "toolchainFingerprint": result.toolchain_fingerprint,
        "generator": {
            "distribution": toolchain()["generator"]["distribution"],
            "version": toolchain()["generator"]["version"],
            "license": "MIT",
            "attribution": UPSTREAM_ATTRIBUTION,
        },
        "generatedSourceLicense": "AGPL-3.0-only",
        "nameCollisions": shared,
        "published": False,
        "publicationGate": PUBLICATION_GATE,
        "findings": FINDINGS[profile_id],
        "contentFingerprint": content_fingerprint(files),
    }
    files["PROVENANCE.json"] = render(provenance)
    return files


def not_qualified_note() -> str:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    rows = [row for row in report["verdicts"] if row["verdict"] == NOT_QUALIFIED]
    lines = [
        "# Families with no emitted kernel package",
        "",
        "These families were declared, measured, and judged. The absence of a",
        "package is a recorded decision, not an omission, and the verdict is",
        "never re-run with an altered probe set in order to emit one.",
        "",
    ]
    for row in rows:
        lines.extend(
            [
                f"## `{row['profileId']}` — {row['verdict']}",
                "",
                f"Output family: `{row['outputModelType']}`.",
                "",
                "Constructs it loses:",
                "",
            ]
        )
        lines.extend(f"- `{name}`" for name in row["lost"])
        lines.append("")
    return "\n".join(lines)


def package_init() -> str:
    return (
        '"""Kernel Python packages, one per demonstrated profile (issue #11,\n'
        "FR-087).\n\n"
        "Regenerate with `poetry run python -m python_backend.kernel.emit`. Not\n"
        f'published: publication passes `{PUBLICATION_GATE}`."""\n'
    )


def _tree(profile_id: str) -> Path:
    return PACKAGES / profile_id


def write_all(root: Path | None = None) -> dict[str, str]:
    """Write every demonstrated kernel package under `root`.

    `root` exists so two generations can be compared in fresh scratch
    directories without either one touching the committed tree.
    """

    target_root = PACKAGES if root is None else root
    fingerprints: dict[str, str] = {}
    if target_root.exists():
        shutil.rmtree(target_root)
    target_root.mkdir(parents=True)
    for profile_id in demonstrated():
        files = build(profile_id)
        target = target_root / profile_id
        target.mkdir(parents=True)
        for name, text in files.items():
            destination = target / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(text, encoding="utf-8")
        fingerprints[profile_id] = content_fingerprint(files)
    (target_root / "NOT-QUALIFIED.md").write_text(
        not_qualified_note(), encoding="utf-8"
    )
    (target_root / "__init__.py").write_text(package_init(), encoding="utf-8")
    return fingerprints


def check() -> int:
    failures: list[str] = []
    for profile_id in demonstrated():
        files = build(profile_id)
        target = _tree(profile_id)
        for name, text in files.items():
            path = target / name
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                failures.append(str(path))
        committed = {
            str(path.relative_to(target))
            for path in sorted(target.rglob("*"))
            if path.is_file() and "__pycache__" not in path.parts
        }
        failures.extend(
            f"{target / name} is not regenerated"
            for name in sorted(committed - set(files))
        )
    note = PACKAGES / "NOT-QUALIFIED.md"
    if not note.exists() or note.read_text(encoding="utf-8") != not_qualified_note():
        failures.append(str(note))
    init = PACKAGES / "__init__.py"
    if not init.exists() or init.read_text(encoding="utf-8") != package_init():
        failures.append(str(init))
    emitted = set(demonstrated())
    for entry in sorted(PACKAGES.iterdir()):
        if entry.is_dir() and entry.name != "__pycache__" and entry.name not in emitted:
            failures.append(f"{entry} is a package for a family with no verdict")
    for failure in failures:
        print(f"{failure} differs from a fresh generation", file=sys.stderr)
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Emit the kernel Python packages (FR-087)."
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    if args.check:
        return check()
    fingerprints = write_all()
    for profile_id, fingerprint in fingerprints.items():
        print(f"{profile_id} {fingerprint}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
