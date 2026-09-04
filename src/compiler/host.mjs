/**
 * The one host every compiler read, write, and module load passes through
 * (NFR-019, NFR-020).
 *
 * This module exists because the safety and determinism properties this ticket
 * claims are otherwise unobservable. "The compiler reads nothing outside its
 * roots" and "a JavaScript file a package ships is never loaded" cannot be
 * established by reading the source, because the pinned TypeSpec compiler does
 * its own resolution and its own `import()`. They can be established by giving
 * that compiler a `CompilerHost` this module owns: TypeSpec routes `readFile`,
 * `stat`, `realpath`, and `getJsImport` through it, so a refusal here is a
 * refusal in fact rather than an assertion about intent.
 *
 * Directory enumeration is sorted here rather than at each call site, so the
 * host's own iteration order — an ambient input on any real file system — never
 * reaches the emitted document (NFR-019-AC-5).
 */
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	realpathSync,
	renameSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

function toPosix(path) {
	return sep === "/" ? path : path.split(sep).join("/");
}

/** True when `child` is `parent` or lies beneath it. */
function within(parent, child) {
	if (child === parent) return true;
	const rel = relative(parent, child);
	return (
		rel !== "" &&
		!rel.startsWith("..") &&
		!resolve(parent, rel).startsWith("..")
	);
}

export class PathEscapeError extends Error {
	constructor(path) {
		super(`path escapes every declared root: ${path}`);
		this.name = "PathEscapeError";
		this.path = path;
	}
}

export class UntrustedModuleError extends Error {
	constructor(path) {
		super(
			`refusing to load a JavaScript module outside the library root: ${path}`,
		);
		this.name = "UntrustedModuleError";
		this.path = path;
	}
}

/**
 * Creates the injected host.
 *
 * `readRoots` are the directories reads may come from; `moduleRoots` the
 * directories a JavaScript module may be loaded from; `writeTargets` the exact
 * paths the caller named, each of which may also be written through its `.tmp`
 * sibling. `enumerationOrder` lets a test drive the host with a reversed
 * directory listing without touching the file system.
 */
export function createHost(options = {}) {
	const readRoots = (options.readRoots ?? []).map((path) => resolve(path));
	const moduleRoots = (options.moduleRoots ?? []).map((path) => resolve(path));
	const writeTargets = new Set(
		(options.writeTargets ?? []).map((path) => resolve(path)),
	);
	const enumerationOrder = options.enumerationOrder ?? "ascending";
	const record = {
		reads: [],
		refusedReads: [],
		moduleLoads: [],
		refusedModules: [],
		writes: [],
		refusedWrites: [],
		directRead: 0,
	};

	const realOf = (path) => {
		const absolute = resolve(path);
		try {
			return realpathSync(absolute);
		} catch {
			return absolute;
		}
	};

	const allowRead = (path) => {
		const real = realOf(path);
		if (readRoots.length === 0) return real;
		if (readRoots.some((root) => within(root, real))) return real;
		record.refusedReads.push(toPosix(real));
		throw new PathEscapeError(toPosix(real));
	};

	return {
		/** Read a file as bytes; every read is recorded and confined. */
		readBytes(path) {
			const real = allowRead(path);
			record.reads.push(toPosix(real));
			return readFileSync(real);
		},
		/** Read a file as UTF-8 text. */
		readText(path) {
			return this.readBytes(path).toString("utf8");
		},
		/** SHA-256 of a file's bytes, without holding the bytes for the caller. */
		digestFile(path) {
			return `sha256:${createHash("sha256").update(this.readBytes(path)).digest("hex")}`;
		},
		exists(path) {
			try {
				return existsSync(allowRead(path));
			} catch {
				return false;
			}
		},
		isDirectory(path) {
			try {
				return statSync(allowRead(path)).isDirectory();
			} catch {
				return false;
			}
		},
		/**
		 * Directory entries in a declared order. Ascending code-point order is the
		 * default; `descending` exists so a test can prove the emitted document
		 * does not depend on it.
		 */
		readDir(path) {
			const real = allowRead(path);
			const names = readdirSync(real).sort((left, right) =>
				left < right ? -1 : left > right ? 1 : 0,
			);
			return enumerationOrder === "descending" ? names.reverse() : names;
		},
		/** Every file beneath `path`, as root-relative POSIX paths, in code-point order. */
		walk(path, root = path) {
			const out = [];
			const visit = (current) => {
				for (const name of this.readDir(current)) {
					const child = resolve(current, name);
					if (this.isDirectory(child)) visit(child);
					else out.push(toPosix(relative(resolve(root), child)));
				}
			};
			if (this.isDirectory(path)) visit(resolve(path));
			return out.sort((left, right) =>
				left < right ? -1 : left > right ? 1 : 0,
			);
		},
		/** True when a JavaScript module at `path` may be loaded. */
		mayLoadModule(path) {
			const real = realOf(path);
			return moduleRoots.some((root) => within(root, real));
		},
		/** Record and refuse, or record and allow, a module load. */
		noteModuleLoad(path) {
			const real = toPosix(realOf(path));
			if (!this.mayLoadModule(path)) {
				record.refusedModules.push(real);
				throw new UntrustedModuleError(real);
			}
			record.moduleLoads.push(real);
		},
		/**
		 * Writes `bytes` to `path` through a `.tmp` sibling and a rename, so a
		 * failed write cannot leave a half-written document behind. The `.tmp`
		 * sibling is the only path the compiler creates that the caller did not
		 * name (FR-052).
		 */
		writeFile(path, bytes) {
			const absolute = resolve(path);
			if (writeTargets.size > 0 && !writeTargets.has(absolute)) {
				record.refusedWrites.push(toPosix(absolute));
				throw new PathEscapeError(toPosix(absolute));
			}
			const temporary = `${absolute}.tmp`;
			mkdirSync(dirname(absolute), { recursive: true });
			writeFileSync(temporary, bytes);
			renameSync(temporary, absolute);
			record.writes.push(toPosix(absolute), toPosix(temporary));
		},
		/** What the host observed. Tests assert over this rather than over intent. */
		record,
		readRoots,
		moduleRoots,
		/** POSIX path separator, always, whatever the platform reports. */
		toPosix,
	};
}
