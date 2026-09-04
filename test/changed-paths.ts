import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The paths a branch changed, as every changed-path gate in this repository
 * asks for it.
 *
 * Seven test files had a copy of this, and every copy had the same two defects.
 *
 * The first is rename detection: `git diff --name-only <base>...HEAD` scores a
 * move as a rename and hides the deletion, so a gate watching for a file to
 * disappear never sees it. Issue #27's Task-067 paid for that lesson;
 * `--no-renames` is not optional.
 *
 * The second is `git status`. It reports a *racily clean* file — one written and
 * restored inside the index's timestamp resolution — as modified, and
 * `test/semantic-core.test.ts` does exactly that to prove its own `--check`
 * gate. The result was three unrelated gates failing at random (issue #49). Two
 * files worked around it with a hand-maintained list of the paths a test is
 * known to touch, which only holds while the list is current. Comparing content
 * against the merge base is the discriminating check instead: a working-tree
 * entry whose bytes match the base is not a change, whatever the stat cache
 * says, and an entry the base does not carry at all still counts.
 *
 * One case the content check cannot cover is a file another suite is part way
 * through rewriting: `test/schema.test.ts` and `test/semantic-core.test.ts`
 * regenerate committed artefacts in place, so a gate can read one mid-write.
 * `REGENERATED_IN_PLACE` names those artefacts, as the two hand-maintained
 * copies of this helper already did. It is a mitigation, not a fix — the fix is
 * for those tests to regenerate into a scratch directory, which issue #49 owns
 * — and the committed branch diff below still catches any retained mutation.
 */
export const REGENERATED_IN_PLACE: ReadonlySet<string> = new Set([
	"agent_ix_core_data/core_data.py",
	"src/generated.ts",
	"packages/semantic-core/generated/json-schema/EnumValue.json",
	// Written and deleted inside TC-346's declaration-drift probe. A changed-path
	// gate running in a parallel worker can observe it mid-run, which is the same
	// issue #49 defect as the three above and has the same mitigation until that
	// ticket moves these artefacts into a scratch directory.
	"test/declaration-drift-probe.ts",
]);

/** The commits a change sits between. Both endpoints are history facts. */
export interface ChangeRange {
	/** The commit the change replaced. */
	readonly base: string;
	/** The commit that introduced the change. */
	readonly tip: string;
	/**
	 * True when every sentinel resolves to one commit, which is what a squash
	 * merge produces. It is the signal that separates "this change is still in
	 * flight, and every commit after `tip` is its own" from "this change is one
	 * landed commit, and everything after it belongs to a later ticket".
	 */
	readonly squashed: boolean;
}

/**
 * The commit range a change occupies, located from history through files it
 * created.
 *
 * `changedPathsFrom(root, "origin/main")` answers "what has this branch changed"
 * only while the branch is unmerged. After the squash merge `origin/main` *is*
 * the branch content, the range empties, `matchesBase` finds every working file
 * identical to the base, and the helper returns `[]`. Every caller below loops
 * over that set asserting a prohibition — "no changed path is under `schema/`" —
 * so an empty set satisfies all of them vacuously. The gate does not go red. It
 * goes quiet, which is worse, because a green suite is then evidence of nothing.
 *
 * Pinning only the *base* to history and leaving the far end at `HEAD` closes
 * the quiet direction and opens the loud one. Issue #19 shipped that form and
 * issue #20 measured what it does before it could take the trunk red: the range
 * from issue #19's baseline to the merged trunk was 236 paths with 0 prohibited
 * hits, and the same range measured to the issue #20 branch was 406 paths with
 * 139 — `conformance/**` and `tests/`, which NFR-016 permits for issue #20 and
 * NFR-021 prohibits for issue #19. Both requirements are right about their own
 * ticket. The range is what is wrong: "everything since my baseline" annexes
 * every later ticket's work and then fails the earlier ticket for it.
 *
 * That is the fourth face of one defect. A merged change's path set is a fixed
 * historical fact, and encoding it as a live computation against a moving ref
 * makes it either empty (quiet) or growing (red, and pointed at the wrong
 * ticket). So both ends are resolved from history here:
 *
 * - `base` is the parent of the *earliest* commit that added any sentinel — the
 *   branch point while the change is unmerged, the squash commit's parent after;
 * - `tip` is the *latest* commit that added any sentinel — the branch head while
 *   the change is unmerged, the squash commit itself after.
 *
 * Pass sentinels created by the change's first and last commits. With a single
 * sentinel the range collapses to that one commit, which is exactly right for a
 * squash merge and too narrow for a live multi-commit branch.
 *
 * Throws when no sentinel is in history, because a range that cannot be located
 * is not a reason to assert less: if the change is reverted its sentinels leave
 * history and the gate fails loudly rather than passing vacuously.
 */
export function changeRange(
	root: string,
	sentinels: string | readonly string[],
): ChangeRange {
	const paths = typeof sentinels === "string" ? [sentinels] : sentinels;
	const adding = [
		...new Set(
			paths
				.map((path) =>
					execFileSync(
						"git",
						["log", "--diff-filter=A", "--format=%H", "-1", "--", path],
						{ cwd: root, encoding: "utf8" },
					).trim(),
				)
				.filter((commit) => commit.length > 0),
		),
	];
	if (adding.length === 0) {
		throw new Error(
			`no commit in history adds any of ${paths.join(", ")}: the range for this gate cannot be located, so it cannot assert`,
		);
	}
	const isAncestor = (a: string, b: string): boolean => {
		try {
			execFileSync("git", ["merge-base", "--is-ancestor", a, b], {
				cwd: root,
				stdio: "ignore",
			});
			return true;
		} catch {
			return false;
		}
	};
	const earliest = adding.reduce((best, commit) =>
		isAncestor(commit, best) ? commit : best,
	);
	const latest = adding.reduce((best, commit) =>
		isAncestor(best, commit) ? commit : best,
	);
	const base = execFileSync("git", ["rev-parse", `${earliest}^`], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	return { base, tip: latest, squashed: earliest === latest };
}

/**
 * The paths a change made: its own commit range, plus the uncommitted work in
 * the tree that the change still owns.
 *
 * The committed half is `base..tip`, both endpoints history facts, so it cannot
 * empty on merge and cannot accrete afterwards — a later ticket's commits fall
 * outside the range instead of being annexed into it.
 *
 * A frozen range alone would be a constant, and a constant cannot discriminate:
 * dropping a rogue module into `src/compiler/` or editing a byte of `schema/`
 * has to make this gate red, or the gate is decoration. So the working tree is
 * folded in — every entry `git status` reports that is genuinely different from
 * `HEAD` — minus the paths some commit after `tip` has already changed, which
 * belong to that later work and not to this change.
 *
 * The residual is uncommitted work from another ticket sharing this checkout at
 * a path no later commit has touched yet. History cannot attribute that, and the
 * alternative — dropping the working tree — would leave a gate that can never
 * fail. It is a local condition the author created and can see; it reaches
 * neither a clean CI checkout nor the merged trunk.
 */
export function changedPathsOf(
	root: string,
	sentinels: string | readonly string[],
): string[] {
	const { base, tip } = changeRange(root, sentinels);
	const committed = execFileSync(
		"git",
		["diff", "--no-renames", "--name-only", `${base}..${tip}`],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.length > 0);

	const working = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => line.slice(3).trim())
		.filter((path) => path.length > 0)
		.filter((path) => !REGENERATED_IN_PLACE.has(path))
		.filter((path) => !matchesBase(root, "HEAD", path))
		.filter((path) => !changedAfter(root, tip, path));

	return [...new Set([...committed, ...working])];
}

/**
 * A path's bytes *as this change left them*.
 *
 * A gate that reads the working tree and compares it to `changeRange().base`
 * has both defects of a half-pinned range at once: the base is a history fact,
 * the head is whatever is checked out. After the squash merge the head carries
 * every later ticket, so a later ticket's edit to a path this change froze is
 * attributed to this change and fails it for someone else's commit. That is the
 * same shape issue #20 measured on a path *set*, applied to a path's *bytes*.
 *
 * Reading `tip` unconditionally is wrong in the other direction: while the
 * change is in flight `tip` is the last commit that added a sentinel, not the
 * branch head, so every commit the change made after it would be invisible.
 *
 * `squashed` separates the two, and it is a fact about history rather than a
 * guess: while the sentinels sit in different commits the change is unmerged,
 * there are no later tickets in this history, and the working tree is its end
 * state; once they collapse to one commit the change *is* that commit, and
 * everything after it is somebody else's.
 *
 * Throws when the path is absent, because a gate that cannot read the content
 * it compares must fail rather than pass.
 */
export function contentAsChanged(
	root: string,
	sentinels: string | readonly string[],
	path: string,
): Buffer {
	const { tip, squashed } = changeRange(root, sentinels);
	if (squashed) {
		return execFileSync("git", ["show", `${tip}:${path}`], {
			cwd: root,
			maxBuffer: 64 * 1024 * 1024,
		});
	}
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) {
		throw new Error(
			`${path} is absent from the working tree, so this gate cannot read the content it compares`,
		);
	}
	return readFileSync(absolute);
}

/** True when a commit after `tip` changed `path`: later work, not this change. */
function changedAfter(root: string, tip: string, path: string): boolean {
	return (
		execFileSync(
			"git",
			["log", "--format=%H", "-1", `${tip}..HEAD`, "--", path],
			{ cwd: root, encoding: "utf8" },
		).trim().length > 0
	);
}

export function changedPathsFrom(root: string, base: string): string[] {
	const committed = execFileSync(
		"git",
		["diff", "--no-renames", "--name-only", `${base}...HEAD`],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.length > 0);

	const working = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => line.slice(3).trim())
		.filter((path) => path.length > 0)
		.filter((path) => !REGENERATED_IN_PLACE.has(path))
		.filter((path) => !matchesBase(root, base, path));

	return [...new Set([...committed, ...working])];
}

/** True when the working-tree file at `path` is byte-identical to `base`'s. */
function matchesBase(root: string, base: string, path: string): boolean {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) return false;
	let atBase: Buffer;
	try {
		atBase = execFileSync("git", ["show", `${base}:${path}`], {
			cwd: root,
			maxBuffer: 64 * 1024 * 1024,
			// An addition is the expected case, not an error worth printing.
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		// The base does not carry it: an addition, and a real change.
		return false;
	}
	return readFileSync(absolute).equals(atBase);
}

/**
 * The paths a change's own commits touched, as the union of their per-commit
 * name lists over `--first-parent --no-merges`.
 *
 * This is the fifth face of the merge-degrading defect, and it is the one
 * `changedPathsOf` above does not cover. That helper takes a *tree* diff over
 * `base..tip`, which is exact for a branch whose history is linear over the
 * trunk and wrong for one that merged the trunk inside its own range: the diff
 * then carries every path the trunk moved as though this change had moved it.
 * `test/conformance-corpus.test.ts` measured it — 456 paths, 74 of them the
 * trunk's, against a true change set of 182 — and worked around it with a
 * private copy of the loop below. This is that copy, promoted, so the next gate
 * does not have to rediscover it.
 *
 * Both endpoints still come from history through `changeRange`, so the range
 * neither empties on merge nor accretes afterwards. `--first-parent` keeps a
 * merged branch's own commits and drops the side it merged; `--no-merges` drops
 * the merge commits themselves, whose name lists are the combined trees.
 *
 * The preferred fix is still not to merge the trunk into a branch at all — a
 * rebase leaves nothing for this to filter — and NFR-023 requires that. This
 * exists because "we rebased" is a claim and the union is a measurement.
 */
export function changedPathsUnion(
	root: string,
	sentinels: string | readonly string[],
): string[] {
	const { base, tip } = changeRange(root, sentinels);
	const committed = execFileSync(
		"git",
		[
			"log",
			"--first-parent",
			"--no-merges",
			"--no-renames",
			"--format=",
			"--name-only",
			`${base}..${tip}`,
		],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const working = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => line.slice(3).trim())
		.filter((path) => path.length > 0)
		.filter((path) => !REGENERATED_IN_PLACE.has(path))
		.filter((path) => !matchesBase(root, "HEAD", path))
		.filter((path) => !changedAfter(root, tip, path));

	return [...new Set([...committed, ...working])].sort();
}

/** Merge commits inside a change's own range. NFR-023 requires none. */
export function mergeCommitsIn(
	root: string,
	sentinels: string | readonly string[],
): string[] {
	const { base, tip } = changeRange(root, sentinels);
	return execFileSync(
		"git",
		["log", "--merges", "--format=%H", `${base}..${tip}`],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}
