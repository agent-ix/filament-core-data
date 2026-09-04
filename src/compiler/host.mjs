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
import { dirname, relative, resolve } from "node:path";

/**
 * Always POSIX, whatever the platform reports. A path that carries the host's
 * separator into an emitted document makes two hosts disagree about a byte, and
 * `sourceLocus.path` forbids a backslash outright.
 */
function toPosix(path) {
	return String(path).split(/[\\/]/).join("/");
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
	};

	const realOf = (path) => {
		const absolute = resolve(path);
		try {
			return realpathSync(absolute);
		} catch {
			return absolute;
		}
	};

	if (readRoots.length === 0) {
		// A host with no roots would confine nothing while looking as though it
		// did, which is worse than no host at all.
		throw new TypeError("createHost requires at least one read root");
	}

	const allowRead = (path) => {
		const real = realOf(path);
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
		/** The real path of `path`, following symlinks; the caller's own resolver. */
		realpathOf(path) {
			return realOf(path);
		},
		/** The declared size of `path`, without reading it. */
		sizeOf(path) {
			try {
				return statSync(allowRead(path)).size;
			} catch {
				return undefined;
			}
		},
		/** True when `path` exists. A refused path throws rather than reads false. */
		exists(path) {
			return existsSync(allowRead(path));
		},
		/**
		 * True when `path` is a directory. A path that is simply absent is
		 * `false`; a path the roots refuse is an error the caller must report.
		 * Swallowing the refusal here made `"sourceRoots": ["../../etc"]` compile
		 * with no diagnostic at all and digest the empty set.
		 */
		isDirectory(path) {
			const real = allowRead(path);
			try {
				return statSync(real).isDirectory();
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
			// A symlinked directory that points at an ancestor would make this walk
			// run forever; visiting each real path once bounds it.
			const seen = new Set();
			const visit = (current) => {
				const real = realOf(current);
				if (seen.has(real)) return;
				seen.add(real);
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

const repositories = new Map();

/**
 * A host scoped to one repository root, for callers that read a document off
 * disk with no compile in progress — the IR schema loader, and the tests. A
 * compile always uses the host the CLI constructs and passes down.
 *
 * Keyed by root rather than cached once: a single cached instance would serve
 * whichever root happened to ask first, and a test that then passes a different
 * root would be measuring the first one.
 */
export function repositoryHost(root) {
	const key = resolve(root);
	if (!repositories.has(key)) {
		repositories.set(key, createHost({ readRoots: [key] }));
	}
	return repositories.get(key);
}
