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
]);

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
