"""The repository's `agent-ix-conformance-jcs-v1` canonical form (FR-073).

Object keys ordered by code point, no insignificant whitespace, array order
preserved. This is *not* the contract's `RFC8785-JCS-with-identity-sorted-sets-v1`
fingerprint form, which `conformance/contract-gaps.json` GAP-004 records as named
but undefined.

The conformance corpus has its own implementation of the same form in
`conformance/oracle/json.mjs`. That path is prohibited to this change and is
JavaScript besides, so this is a second implementation of a stated form rather
than a copy of an implementation.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value: Any) -> str:
    return "sha256:" + hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def digest_bytes(payload: bytes) -> str:
    return "sha256:" + hashlib.sha256(payload).hexdigest()
