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

/**
 * The commit a change replaced, located from history through a file it created.
 *
 * `changedPathsFrom(root, "origin/main")` answers "what has this branch changed"
 * only while the branch is unmerged. After the squash merge `origin/main` *is*
 * the branch content, the range empties, `matchesBase` finds every working file
 * identical to the base, and the helper returns `[]`. Every caller below loops
 * over that set asserting a prohibition — "no changed path is under `schema/`" —
 * so an empty set satisfies all of them vacuously. The gate does not go red. It
 * goes quiet, which is worse, because a green suite is then evidence of nothing.
 *
 * Issue #27 met the first two faces of this (positive assertions about the
 * range, fixed by #47) and issue #19 met the third here. The durable form is the
 * one #47 used for TC-395: pick a file the change created, find the commit that
 * added it, and take that commit's parent. The result is a history fact — fixed
 * after the merge, and gone if the change is ever reverted, at which point the
 * gate fails loudly rather than quietly asserting nothing.
 *
 * Pass several sentinels when the change spans more than one commit: the
 * baseline is the parent of the *earliest* commit that added any of them, which
 * is the branch point while the branch is unmerged and the squash commit's
 * parent afterwards. One sentinel is enough only when the change is one commit;
 * with several, a sentinel created mid-branch would baseline mid-branch and the
 * gate would then compare against a tree the change itself had already touched.
 *
 * Throws when no sentinel is in history, because a baseline that cannot be
 * located is not a reason to assert less.
 */
export function baselineBefore(
	root: string,
	sentinels: string | readonly string[],
): string {
	const paths = typeof sentinels === "string" ? [sentinels] : sentinels;
	const adding = paths
		.map((path) =>
			execFileSync(
				"git",
				["log", "--diff-filter=A", "--format=%H", "-1", "--", path],
				{ cwd: root, encoding: "utf8" },
			).trim(),
		)
		.filter((commit) => commit.length > 0);
	if (adding.length === 0) {
		throw new Error(
			`no commit in history adds any of ${paths.join(", ")}: the baseline for this gate cannot be located, so it cannot assert`,
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
	return execFileSync("git", ["rev-parse", `${earliest}^`], {
		cwd: root,
		encoding: "utf8",
	}).trim();
}

/**
 * The paths a change made, baselined on the commit it replaced.
 *
 * Prefer this over `changedPathsFrom(root, "origin/main")` in any gate that
 * asserts a prohibition: it keeps asserting after the merge.
 */
export function changedPathsSince(
	root: string,
	sentinels: string | readonly string[],
): string[] {
	return changedPathsFrom(root, baselineBefore(root, sentinels));
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
		});
	} catch {
		// The base does not carry it: an addition, and a real change.
		return false;
	}
	return readFileSync(absolute).equals(atBase);
}
