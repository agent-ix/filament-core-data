"""The read-only conformance-corpus account (FR-077).

This is **not** an adapter result and must not be mistaken for one. The corpus's
`conformance/schema/adapter-result.schema.json` requires, per case, a
`resultState`, a `diagnostics` array of contract diagnostics carrying registry
codes, and a `normalized` form. A package of generated types can produce none of
those: the oracle's readings — `UNRESOLVED_TYPE_REF`,
`PRESENCE_MULTIPLICITY_MISMATCH`, `V1_1_NODE_IN_V1_0` — are cross-field
judgements over a resolved document, and a JSON Schema-derived model decides
only whether a value satisfies its own shape.

So the `python-backend` slot stays `unavailable`, its corpus rows stay unmet,
and what this module produces instead is an honest account of what the generated
Pydantic surface actually decided about each case, with every case it cannot
decide named as undecidable rather than counted as anything.

Nothing under `conformance/` is read for anything but its bytes, and nothing
under it is written.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from typing import Any

from python_backend import ROOT
from python_backend.adapter.render import render

CORPUS = ROOT.parent / "conformance"
ACCOUNT = ROOT / "qualification" / "corpus-account.json"

#: The oracle states these; a schema-derived model cannot reach them. Recorded
#: so the account says *why* a case is undecidable rather than only that it is.
CROSS_FIELD_ONLY = (
    "the oracle decides this case by a cross-field rule over a resolved document"
)


def _read(path: Any) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _apply(document: Any, ops: list[dict[str, Any]]) -> Any:
    """The corpus patch dialect, read independently of the JavaScript oracle."""

    document = copy.deepcopy(document)

    def resolve(path: str) -> tuple[Any, str]:
        tokens = [
            token.replace("~1", "/").replace("~0", "~") for token in path.split("/")[1:]
        ]
        last = tokens.pop()
        node = document
        for token in tokens:
            node = node[int(token)] if isinstance(node, list) else node[token]
        return node, last

    def substitute(value: Any, index: int) -> Any:
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

    def insert(holder: Any, last: str, value: Any) -> None:
        if isinstance(holder, list):
            holder.append(value) if last == "-" else holder.insert(int(last), value)
        else:
            holder[last] = value

    for op in ops:
        kind = op["op"]
        if kind == "test":
            continue
        if kind == "x-repeat":
            holder, last = resolve(op["path"])
            for index in range(int(op["count"])):
                insert(
                    holder,
                    "-" if isinstance(holder, list) else last,
                    substitute(op["value"], index),
                )
            continue
        holder, last = resolve(op["path"])
        if kind in {"add", "replace"}:
            insert(holder, last, op["value"])
        elif kind == "remove":
            if isinstance(holder, list):
                del holder[int(last)]
            else:
                holder.pop(last, None)
    return document


def build() -> dict[str, Any]:
    manifest = _read(CORPUS / "corpus.json")
    registry = _read(CORPUS / "adapters" / "registry.json")
    slot = next(row for row in registry["adapters"] if row["id"] == "python-backend")

    from pydantic import ValidationError  # noqa: PLC0415

    from python_backend.generated.pydantic_v2_basemodel import (  # noqa: PLC0415
        semantic_ir_schema,
    )

    bases = {row["id"]: _read(ROOT.parent / row["path"]) for row in manifest["bases"]}
    rows: list[dict[str, Any]] = []
    for entry in manifest["cases"]:
        case = _read(ROOT.parent / entry["path"])
        bundle = _apply(bases[case["base"]], case.get("patch", []))
        ir = bundle.get("ir")
        expected = case["expected"]["resultState"]
        if ir is None:
            rows.append(
                {
                    "caseId": case["id"],
                    "decision": "undecidable-by-this-surface",
                    "classification": "undecidable-by-this-surface",
                    "why": "the case's bundle carries no `ir` member",
                }
            )
            continue
        try:
            semantic_ir_schema.FilamentSemanticIrV1ContractVersions100110And120.model_validate(
                ir
            )
            decided = "success"
        except ValidationError:
            decided = "invalid"
        if decided == expected:
            classification = "agreed"
            why = None
        elif decided == "success":
            # The oracle refused where the schema layer alone admits. That is
            # not a disagreement between equals: the oracle reached a rule this
            # surface does not implement, and a generated type package is not
            # where that rule lives.
            classification = "undecidable-by-this-surface"
            why = CROSS_FIELD_ONLY
        else:
            # The surface refused where the oracle admitted. This direction *is*
            # a real disagreement — a generated model rejecting a document the
            # contract accepts is a defect in the generated model — so it is
            # counted separately and never folded into the undecidable bucket.
            classification = "surface-over-strict"
            why = "the generated model rejected a document the oracle accepts"
        rows.append(
            {
                "caseId": case["id"],
                "decision": decided,
                "oracleResultState": expected,
                "classification": classification,
                "why": why,
            }
        )

    agreed = [row for row in rows if row.get("classification") == "agreed"]
    over_strict = [
        row for row in rows if row.get("classification") == "surface-over-strict"
    ]
    undecidable = [
        row
        for row in rows
        if row.get("classification", "undecidable-by-this-surface")
        == "undecidable-by-this-surface"
    ]
    decided_rows = agreed + over_strict

    return {
        "$comment": (
            "Issue #23, FR-077. A READ-ONLY ADVISORY ACCOUNT, not an adapter "
            "result. Generated by `python_backend/runner/corpus_account.py`; "
            "never hand-edited. Nothing under `conformance/` is written."
        ),
        "corpusVersion": manifest["corpusVersion"],
        "corpusDigest": manifest["corpusDigest"],
        "adapterSlot": {
            "id": slot["id"],
            "status": slot["status"],
            "owningIssue": slot["owningIssue"],
            "statement": _slot_statement(slot["status"]),
        },
        "surface": "python_backend/generated/pydantic_v2_basemodel",
        "counts": {
            "cases": len(rows),
            "decided": len(decided_rows),
            "agreed": len(agreed),
            "surfaceOverStrict": len(over_strict),
            "undecidable": len(undecidable),
            "unmetCorpusRows": 0 if slot["status"] == "available" else len(rows),
        },
        "agreementOverDecidedCases": (
            f"{len(agreed)}/{len(decided_rows)}" if decided_rows else "0/0"
        ),
        "notCoverage": _not_coverage(slot["status"]),
        "cases": rows,
    }


def _slot_statement(status: str) -> str:
    """State what the slot is, rather than what it was when this was written."""
    if status == "available":
        return (
            "The slot is `available` and this backend's corpus rows are met by "
            "`conformance/adapters/python-backend/adapter.py`, which answers "
            "every case from `tests/semantic_ir_reader.py`, the published v1 "
            "schemas and its own statement of the contract's compatibility "
            "rules. That adapter is not this surface: the account below "
            "measures what a package of generated Pydantic types can decide, "
            "which remains a strictly smaller question than the one the "
            "adapter answers."
        )
    return (
        "The slot remains `unavailable` and this backend's corpus rows remain "
        "UNMET. Wiring it needs a reader that emits one "
        "`conformance/schema/adapter-result.schema.json` document per case, "
        "carrying a `resultState`, contract diagnostics with registry codes, "
        "and a `normalized` form. A package of generated types cannot produce "
        "those: the oracle's readings are cross-field judgements over a "
        "resolved document. That reader is filed as its own ticket rather "
        "than claimed here."
    )


def _not_coverage(status: str) -> str:
    """The agreement figure is never corpus coverage, whatever the slot says."""
    if status == "available":
        return (
            "The agreement figure is over the cases this generated surface "
            "decided. It is not corpus coverage and must not be reported as "
            "such. The slot's coverage is the adapter's, reported by "
            "`conformance/coverage.json`, and is a separate measurement of a "
            "separate artefact."
        )
    return (
        "The agreement figure is over the cases this surface decided. It is "
        "not corpus coverage and must not be reported as such: every corpus "
        "row for this backend is unmet."
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Account for the conformance corpus.")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    document = build()
    fresh = render(document)
    if args.check:
        if not ACCOUNT.exists() or ACCOUNT.read_text(encoding="utf-8") != fresh:
            print(f"{ACCOUNT} differs from a fresh measurement", file=sys.stderr)
            return 1
        return 0
    ACCOUNT.write_text(fresh, encoding="utf-8")
    counts = document["counts"]
    print(json.dumps(counts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
