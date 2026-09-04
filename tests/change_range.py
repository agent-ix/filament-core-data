"""The commit range a change occupies, both ends resolved from history.

The Python mirror of `test/changed-paths.ts`'s `changeRange`, and it exists for
the same reason. A gate that asks "did this change touch a frozen path?" is
asking about a fixed historical fact, and computing it against a moving
`origin/main` gives the wrong answer twice: the range empties once the change
merges, so the gate stops asserting; and before that it accretes every later
commit, so the gate fails this ticket for another ticket's work.

The third verification state caught three gates in this suite doing the second
thing — an unrelated sibling's `conformance/README.md` was attributed to issue
#23 — which is precisely what a branch-green number cannot see.

Both ends come from the commits that added sentinel files: the parent of the
earliest is the base, the latest is the tip. If no sentinel is in history the
range cannot be located, and this raises rather than returning an empty range,
because a gate that cannot locate its range must fail loudly rather than assert
over nothing.
"""

from __future__ import annotations

import pathlib
import subprocess


class RangeNotLocatedError(RuntimeError):
    """No sentinel is in history, so this gate cannot assert."""


def _git(repo: pathlib.Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    ).stdout.strip()


def _is_ancestor(repo: pathlib.Path, older: str, newer: str) -> bool:
    return (
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", older, newer],
            cwd=repo,
            capture_output=True,
            check=False,
        ).returncode
        == 0
    )


def change_range(repo: pathlib.Path, sentinels: list[str]) -> tuple[str, str]:
    """`(base, tip)` for the change that created `sentinels`."""

    adding = []
    for path in sentinels:
        commit = _git(repo, "log", "--diff-filter=A", "--format=%H", "-1", "--", path)
        if commit:
            adding.append(commit)
    adding = list(dict.fromkeys(adding))
    if not adding:
        msg = (
            f"no commit in history adds any of {', '.join(sentinels)}: the range "
            "for this gate cannot be located, so it cannot assert"
        )
        raise RangeNotLocatedError(msg)

    earliest = adding[0]
    latest = adding[0]
    for commit in adding[1:]:
        if _is_ancestor(repo, commit, earliest):
            earliest = commit
        if _is_ancestor(repo, latest, commit):
            latest = commit
    return _git(repo, "rev-parse", f"{earliest}^"), latest


def changed_paths(repo: pathlib.Path, sentinels: list[str], *paths: str) -> list[str]:
    """The paths this change touched, optionally narrowed to `paths`."""

    base, tip = change_range(repo, sentinels)
    argv = ["diff", "--no-renames", "--name-only", f"{base}..{tip}"]
    if paths:
        argv += ["--", *paths]
    return [line for line in _git(repo, *argv).splitlines() if line]
