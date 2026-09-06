import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect } from "vitest";

/** Snapshot names and SHA-256 of file bytes, including additions/deletions in copied trees. */
export function snapshotPaths(root: string, paths: readonly string[]) {
	const files = new Map<string, string>();
	const visit = (path: string): void => {
		const absolute = resolve(root, path);
		if (statSync(absolute).isDirectory()) {
			for (const name of readdirSync(absolute).sort()) visit(join(path, name));
		} else
			files.set(
				path,
				createHash("sha256").update(readFileSync(absolute)).digest("hex"),
			);
	};
	for (const path of paths) visit(path);
	return files;
}

/** Only dependencies are linked; generators, inputs, and mutable outputs are copies. */
export function withGenerationScratch(
	source: string,
	paths: readonly string[],
	run: (scratch: string) => void,
): void {
	const before = snapshotPaths(source, paths);
	const scratch = mkdtempSync(join(tmpdir(), "generation-isolation-"));
	try {
		for (const path of paths)
			cpSync(resolve(source, path), resolve(scratch, path), {
				recursive: true,
				dereference: true,
			});
		symlinkSync(
			resolve(source, "node_modules"),
			join(scratch, "node_modules"),
			"dir",
		);
		run(scratch);
	} finally {
		try {
			// This runs before cleanup, including when the check or child failed.
			// No source restoration can conceal an interrupted mutation.
			expect(snapshotPaths(source, paths)).toEqual(before);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}
}

/** Leave a demonstrably interrupted mutation behind, entirely inside scratch. */
export function interruptScratchMutation(scratch: string, path: string): void {
	const target = resolve(scratch, path);
	expect(target.startsWith(`${scratch}/`)).toBe(true);
	const before = readFileSync(target, "utf8");
	const child = spawnSync(
		process.execPath,
		[
			"--input-type=module",
			"--eval",
			'import { appendFileSync } from "node:fs"; appendFileSync(process.argv[1], " "); process.kill(process.pid, "SIGKILL");',
			target,
		],
		{ cwd: scratch, encoding: "utf8" },
	);
	expect(child.error).toBeUndefined();
	expect(child.signal).toBe("SIGKILL");
	expect(child.status).toBeNull();
	expect(readFileSync(target, "utf8")).toBe(`${before} `);
}
