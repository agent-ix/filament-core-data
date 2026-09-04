"""Issue #20 — the Python half of the conformance gate (TC-340, NFR-016-AC-3).

The corpus is language-neutral JSON. This suite reads it with the already
pinned `jsonschema` and asserts, in a second language and a second JSON Schema
implementation, the properties that must not depend on the oracle's own
runtime: every case and base validates, every provenance quote still occurs,
every digest recomputes, every diagnostic is a published diagnostic, and every
expected pointer addresses a node the built bundle carries.

It adds no dependency and opens no network connection.
"""

from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import re

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO = pathlib.Path(__file__).resolve().parents[1]
CONF = REPO / "conformance"
PUBLISHED = REPO / "schema" / "semantic" / "v1"


def _read(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


MANIFEST = _read(CONF / "corpus.json")
CASES = [_read(REPO / row["path"]) for row in MANIFEST["cases"]]
BASES = {row["id"]: _read(REPO / row["path"]) for row in MANIFEST["bases"]}
CODES = _read(CONF / "diagnostic-codes.json")
DEFECTS = _read(CONF / "defects.json")
GAPS = _read(CONF / "contract-gaps.json")
REGISTRY = _read(CONF / "adapters" / "registry.json")
THRESHOLDS = _read(CONF / "thresholds.json")


def _store() -> dict:
    store = {}
    for path in sorted(PUBLISHED.glob("*.schema.json")) + sorted(
        (CONF / "schema").glob("*.schema.json")
    ):
        schema = _read(path)
        store[schema["$id"]] = schema
    return store


CONF_BASE = "https://schemas.agent-ix.org/filament-core-data/conformance/v1/"
PUB_BASE = "https://schemas.agent-ix.org/filament-core-data/v1/"

STORE = _store()
REGISTRY_OF_SCHEMAS = Registry().with_resources(
    (schema_id, Resource.from_contents(schema)) for schema_id, schema in STORE.items()
)


def _validator(schema_id: str) -> Draft202012Validator:
    return Draft202012Validator(STORE[schema_id], registry=REGISTRY_OF_SCHEMAS)


def _diagnostic_validator() -> Draft202012Validator:
    common = PUB_BASE + "common.schema.json"
    return Draft202012Validator(
        {"$ref": common + "#/$defs/diagnostic"}, registry=REGISTRY_OF_SCHEMAS
    )


def _digest(path: pathlib.Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _apply(document: dict, ops: list[dict]) -> dict:
    """The corpus patch dialect, read independently of the JavaScript oracle."""

    document = copy.deepcopy(document)

    def parent(path: str):
        tokens = [
            token.replace("~1", "/").replace("~0", "~")
            for token in path.split("/")[1:]
        ]
        last = tokens.pop()
        node = document
        for token in tokens:
            node = node[int(token)] if isinstance(node, list) else node[token]
        return node, last

    def substitute(value, index: int):
        if isinstance(value, str):
            return value.replace("$i", str(index)).replace("$n", str(index + 1))
        if isinstance(value, list):
            return [substitute(item, index) for item in value]
        if isinstance(value, dict):
            return {
                substitute(key, index): substitute(item, index)
                for key, item in value.items()
            }
        return value

    def insert(holder, last, value):
        if isinstance(holder, list):
            holder.append(value) if last == "-" else holder.insert(int(last), value)
        else:
            holder[last] = value

    for op in ops:
        kind = op["op"]
        if kind == "test":
            node = document
            for token in op["path"].split("/")[1:]:
                node = node[int(token)] if isinstance(node, list) else node[token]
            assert node == op["value"], f"test op no longer matches: {op['path']}"
            continue
        if kind == "x-repeat":
            for index in range(op["count"]):
                holder, last = parent(op["path"])
                insert(holder, last, substitute(op["template"], index))
            continue
        holder, last = parent(op["path"])
        if kind == "add":
            insert(holder, last, copy.deepcopy(op["value"]))
        elif kind == "replace":
            if isinstance(holder, list):
                holder[int(last)] = copy.deepcopy(op["value"])
            else:
                holder[last] = copy.deepcopy(op["value"])
        elif kind == "remove":
            if isinstance(holder, list):
                del holder[int(last)]
            else:
                holder.pop(last)
        else:  # pragma: no cover - the case schema closes the vocabulary
            raise AssertionError(f"unsupported op {kind}")
    return document


def _resolve(document, pointer: str):
    node = document
    if pointer == "":
        return node
    for token in pointer.split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        if isinstance(node, list):
            index = int(token)
            if index >= len(node):
                return None
            node = node[index]
        elif isinstance(node, dict):
            if token not in node:
                return None
            node = node[token]
        else:
            return None
    return node


def test_tc340_manifest_validates() -> None:
    """TC-340: the manifest validates under a second JSON Schema implementation."""
    _validator(CONF_BASE + "corpus-manifest.schema.json").validate(MANIFEST)


@pytest.mark.parametrize("entry", CASES, ids=[case["id"] for case in CASES])
def test_tc340_case_validates(entry: dict) -> None:
    """TC-340: every case validates and its expected diagnostics are published ones."""
    _validator(CONF_BASE + "corpus-case.schema.json").validate(entry)
    checker = _diagnostic_validator()
    for expectation in entry["expected"]["diagnostics"]:
        checker.validate(expectation["diagnostic"])


@pytest.mark.parametrize("base_id", sorted(BASES), ids=sorted(BASES))
def test_tc340_base_validates(base_id: str) -> None:
    """TC-340: every base bundle validates against the composed published schemas."""
    _validator(CONF_BASE + "input-bundle.schema.json").validate(BASES[base_id])


def test_tc340_digests_recompute() -> None:
    """TC-283/TC-340: every digest and the corpus digest recompute from disk."""
    for row in MANIFEST["bases"] + MANIFEST["cases"]:
        assert _digest(REPO / row["path"]) == row["digest"], row["path"]
    joined = "".join(
        f"{row['id']}\n{row['digest']}\n"
        for row in MANIFEST["bases"] + MANIFEST["cases"]
    )
    assert (
        "sha256:" + hashlib.sha256(joined.encode("utf-8")).hexdigest()
        == MANIFEST["corpusDigest"]
    )


def test_tc333_provenance_quotes_occur() -> None:
    """TC-333: no case is blessed and every quote still occurs in its artifact."""
    for entry in CASES:
        assert entry["provenance"]["blessedFromRun"] is False, entry["id"]
        for source in entry["derivedFrom"]:
            text = (REPO / source["artifact"]).read_text(encoding="utf-8")
            assert source["quote"] in text, f"{entry['id']} -> {source['artifact']}"


def test_tc340_every_case_builds_and_its_pointers_address_the_bundle() -> None:
    """TC-288/TC-340: each patch applies and each expected pointer has a parent."""
    for entry in CASES:
        bundle = _apply(BASES[entry["base"]], entry["ops"])
        assert "ir" in bundle, entry["id"]
        for expectation in entry["expected"]["diagnostics"]:
            pointer = expectation["pointer"]
            if pointer == "":
                continue
            parent = pointer[: pointer.rfind("/")]
            assert _resolve(bundle, parent) is not None, f"{entry['id']} {pointer}"


def test_tc289_case_ids_are_unique_patterned_and_placed() -> None:
    """TC-289: ids are unique, match the pattern, and sit in their family directory."""
    pattern = re.compile(MANIFEST["caseIdPattern"])
    seen: set[str] = set()
    for row in MANIFEST["cases"]:
        entry = _read(REPO / row["path"])
        assert pattern.match(entry["id"]), entry["id"]
        assert entry["id"] not in seen, entry["id"]
        seen.add(entry["id"])
        prefix = MANIFEST["familyPrefixes"][entry["family"]]
        assert entry["id"].startswith(prefix + "-"), entry["id"]
        assert f"/cases/{entry['family']}/" in row["path"], entry["id"]


def test_tc300_frozen_codes_are_reused_verbatim() -> None:
    """TC-300: the codes reader-cases.json froze are reused, not re-minted."""
    frozen = {
        row["code"]
        for row in _read(REPO / "fixtures/semantic/v1/negative/reader-cases.json")
    }
    registered = {row["code"] for row in CODES["codes"]}
    assert frozen <= registered
    declared_frozen = {
        row["code"] for row in CODES["codes"] if row["provenance"] == "frozen"
    }
    assert declared_frozen == frozen


def test_tc300_every_code_cites_a_clause_that_occurs() -> None:
    """TC-300: every registered code cites text that occurs in a named artifact."""
    for row in CODES["codes"]:
        found = any(
            row["citation"] in (REPO / artifact).read_text(encoding="utf-8")
            for artifact in row["sources"]
        )
        assert found, row["code"]


def test_tc314_every_register_row_carries_four_classes() -> None:
    """TC-314: four case classes per register row, or a justified notApplicable."""
    for row in MANIFEST["constructRegister"]:
        excused = {one["class"] for one in row.get("notApplicable", [])}
        for klass in ("positive", "negative", "boundary", "evolution"):
            if klass in excused:
                continue
            present = any(
                entry["family"] == row["family"] and entry["class"] == klass
                for entry in CASES
            )
            assert present, f"{row['id']} is missing a {klass} case"


def test_tc318_defect_rows_name_a_case_or_a_static_check() -> None:
    """TC-318: a document-expressible defect names its case; the rest name a check."""
    ids = {row["id"] for row in MANIFEST["cases"]}
    for defect in DEFECTS["defects"]:
        if defect["documentExpressible"]:
            assert defect["reproducingCase"] in ids, defect["id"]
        else:
            assert defect["staticCheck"], defect["id"]


def test_tc336_registers_name_their_owner() -> None:
    """TC-336: every contract gap and every adapter slot names its owning issue."""
    assert GAPS["gaps"], "the corpus found no contract gap, which would itself be news"
    for gap in GAPS["gaps"]:
        assert re.search(r"#\d+$", gap["owningIssue"]), gap["id"]
        assert gap["status"] == "open", gap["id"]
    for adapter in REGISTRY["adapters"]:
        assert re.search(r"#\d+$", adapter["owningIssue"]), adapter["id"]


def test_tc325_thresholds_and_registry_agree() -> None:
    """TC-325/TC-330: every registry slot has a proposed threshold row and back."""
    registry_ids = sorted(one["id"] for one in REGISTRY["adapters"])
    threshold_ids = sorted(one["adapter"] for one in THRESHOLDS["thresholds"])
    assert registry_ids == threshold_ids
    for row in THRESHOLDS["thresholds"]:
        assert row["status"] == "proposed", row["adapter"]


def test_tc341_the_corpus_publishes_nothing() -> None:
    """TC-341: package.json names no conformance surface and no dependency."""
    package = _read(REPO / "package.json")
    assert not any("conformance" in key for key in package["exports"])
    assert not any("conformance" in entry for entry in package["files"])
    assert "dependencies" not in package
