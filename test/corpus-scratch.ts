import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { snapshotPaths } from "./generation-scratch";

/** Independent checkout/index/refs; existing Git objects are shared read-only. */
export function withCorpusScratch<T>(
	source: string,
	run: (scratch: string) => T,
): T {
	const inputs = [
		"conformance",
		"src",
		"schema",
		"crates",
		"Cargo.toml",
		"Cargo.lock",
		"rust-toolchain.toml",
	];
	const before = snapshotPaths(source, inputs);
	const git = (cwd: string, ...args: string[]) =>
		execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	const head = git(source, "rev-parse", "HEAD").trim();
	const predecessor = git(source, "rev-parse", "origin/main").trim();
	const scratch = mkdtempSync(join(tmpdir(), "corpus-isolation-"));
	try {
		git(
			source,
			"clone",
			"--quiet",
			"--shared",
			"--no-checkout",
			source,
			scratch,
		);
		git(scratch, "checkout", "--quiet", "--detach", head);
		// Clone's origin/main may mean the source's local main, not its upstream.
		git(scratch, "update-ref", "refs/remotes/origin/main", predecessor);
		expect(git(scratch, "rev-parse", "origin/main").trim()).toBe(predecessor);
		expect(snapshotPaths(scratch, inputs)).toEqual(before);
		symlinkSync(
			join(source, "node_modules"),
			join(scratch, "node_modules"),
			"dir",
		);
		return run(scratch);
	} finally {
		try {
			expect(snapshotPaths(source, inputs)).toEqual(before);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}
}

/** Real corpus entrypoints, including their coverage writer, run only in scratch. */
export function runCorpusCommand(scratch: string, entrypoint: string) {
	return spawnSync(process.execPath, [entrypoint], {
		cwd: scratch,
		encoding: "utf8",
		maxBuffer: 128 * 1024 * 1024,
		env: { ...process.env, CARGO_TARGET_DIR: join(scratch, "cargo-target") },
	});
}
