/**
 * The confined TypeSpec `CompilerHost` (FR-046, NFR-020).
 *
 * TypeSpec resolves imports and loads decorator JavaScript itself, so "the
 * compiler reads nothing outside its roots" and "a package's own `.mjs` is never
 * loaded" cannot be established by inspecting this repository's source. They can
 * be established by handing the TypeSpec compiler a host: it routes `readFile`,
 * `stat`, `realpath` and `getJsImport` through whatever it is given, so a
 * refusal here is a refusal in fact.
 *
 * The decorator library reaches a compiled package through `additionalImports`
 * at an absolute path, which is why `moduleRoots` can be as narrow as the
 * library directory plus the pinned toolchain's own installation: a package
 * never has a legitimate reason to import JavaScript.
 */
import { NodeHost } from "@typespec/compiler";
import { relative, resolve } from "node:path";

function within(parent, child) {
	if (child === parent) return true;
	const rel = relative(parent, child);
	return rel !== "" && !rel.startsWith("..");
}

/**
 * Wraps `NodeHost`, recording and confining every read and module load.
 *
 * `readRoots` are the directories a file may be read from; `moduleRoots` the
 * directories a JavaScript module may be loaded from. `record` collects what
 * happened, so a test asserts over observations rather than over intent.
 */
export function restrictedHost(options) {
	const readRoots = options.readRoots.map((path) => resolve(path));
	const moduleRoots = options.moduleRoots.map((path) => resolve(path));
	const record = {
		reads: [],
		refusedReads: [],
		moduleLoads: [],
		refusedModules: [],
	};

	const real = (path) => {
		try {
			return NodeHost.realpathSync
				? NodeHost.realpathSync(path)
				: resolve(path);
		} catch {
			return resolve(path);
		}
	};

	const allowedRead = (path) => {
		const absolute = resolve(path);
		return readRoots.some((root) => within(root, absolute));
	};

	const host = {
		...NodeHost,
		async readFile(path) {
			if (!allowedRead(path)) {
				record.refusedReads.push(path);
				throw new Error(`read outside the declared roots: ${path}`);
			}
			record.reads.push(path);
			return NodeHost.readFile(path);
		},
		async readDir(path) {
			if (!allowedRead(path)) {
				record.refusedReads.push(path);
				throw new Error(`read outside the declared roots: ${path}`);
			}
			const names = await NodeHost.readDir(path);
			return [...names].sort((left, right) =>
				left < right ? -1 : left > right ? 1 : 0,
			);
		},
		async stat(path) {
			if (!allowedRead(path)) {
				record.refusedReads.push(path);
				throw Object.assign(
					new Error(`stat outside the declared roots: ${path}`),
					{
						code: "ENOENT",
					},
				);
			}
			return NodeHost.stat(path);
		},
		async realpath(path) {
			return NodeHost.realpath(path);
		},
		async getJsImport(path) {
			const absolute = real(path);
			if (!moduleRoots.some((root) => within(root, absolute))) {
				record.refusedModules.push(absolute);
				throw new Error(
					`refusing to load a JavaScript module outside the library root: ${absolute}`,
				);
			}
			record.moduleLoads.push(absolute);
			return NodeHost.getJsImport(path);
		},
		/** The compiler emits nothing through this host; writing is the CLI's job. */
		async writeFile() {
			throw new Error("the frontend host does not write");
		},
		async mkdirp() {
			throw new Error("the frontend host does not write");
		},
	};
	host.record = record;
	host.readRoots = readRoots;
	host.moduleRoots = moduleRoots;
	return host;
}
