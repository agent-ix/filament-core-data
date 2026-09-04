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


class GitFailedError(RuntimeError):
    """A git command failed. Never silently an empty result.

    `check=False` with an ignored return code turns "git errored" into "nothing
    changed", which is the quietest way for a freeze gate to stop asserting.
    """


def _git(repo: pathlib.Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        msg = f"git {' '.join(args)} failed: {completed.stderr.strip()}"
        raise GitFailedError(msg)
    return completed.stdout.strip()


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


def change_range(
    repo: pathlib.Path, sentinels: list[str], owned: str = "python_backend/"
) -> tuple[str, str]:
    """`(base, tip)` for the change that created `sentinels`.

    `base` is the parent of the earliest commit that added a sentinel — the
    branch point while the change is unmedged, the squash commit's parent after.

    `tip` is the latest commit that touched `owned`, the tree this change is the
    owner of. A tip pinned to a *file* goes stale the moment the change adds
    another commit, and every gate reading the range then judges a prefix of the
    change while reporting on all of it. A tip pinned to the change's own tree
    cannot: it moves with the change, it survives the squash merge, and a later
    ticket's commit is outside it unless that commit edits this backend — in
    which case judging it against this backend's permitted paths is right, not
    wrong.
    """

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
    base = _git(repo, "rev-parse", f"{earliest}^")
    owning = _git(repo, "log", "--format=%H", "-1", "--", owned)
    if not owning:
        return base, latest
    # Keep whichever is later, so the range always covers the sentinels.
    return base, (owning if _is_ancestor(repo, latest, owning) else latest)


class StaleSentinelError(RuntimeError):
    """A commit after the range's tip touched a path the change owns.

    A tip pinned to history is correct and it goes stale: once the change adds
    another commit, the range stops at the old tip and every freeze gate reading
    it judges a prefix of the change while reporting on all of it. Detecting
    that is the difference between a narrow gate and a quiet one — the same
    lesson `conformance/`'s TC-639 records.
    """


def changed_paths(
    repo: pathlib.Path,
    sentinels: list[str],
    *paths: str,
    owned: str = "python_backend/",
) -> list[str]:
    """The paths this change touched, optionally narrowed to `paths`.

    Raises when a commit after the tip touches `owned`, because that means the
    sentinel list no longer reaches the end of the change and the range this
    returns is a prefix of it.
    """

    base, tip = change_range(repo, sentinels, owned)
    after = _git(repo, "log", "--format=%H", f"{tip}..HEAD", "--", owned)
    if after:
        msg = (
            f"commits after the range tip {tip[:7]} touch {owned!r}: "
            f"{after.splitlines()[:3]}. The range no longer reaches the end of "
            "this change, so every gate reading it judges only a prefix."
        )
        raise StaleSentinelError(msg)
    argv = ["diff", "--no-renames", "--name-only", f"{base}..{tip}"]
    if paths:
        argv += ["--", *paths]
    return [line for line in _git(repo, *argv).splitlines() if line]
