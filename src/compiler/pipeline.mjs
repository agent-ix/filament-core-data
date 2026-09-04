/**
 * `compilePackage`: the five-phase orchestration behind the `compile` verb
 * (FR-052).
 *
 * The phase order is stated here, in one place, and asserted by a test that
 * records which phases ran. Ordering matters for a reason that is easy to lose:
 * the lock is built and verified *before* the frontend runs, so a compile
 * against a stale lock reports the staleness rather than producing a document
 * whose `lockDigest` names inputs it did not use.
 *
 * A blocking diagnostic in any phase stops the next one. Returning a document
 * assembled from half a resolution would be worse than returning none.
 */
import { resolve } from "node:path";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	hasBlocking,
	sortDiagnostics,
} from "./diagnostics.mjs";
import { runFrontend } from "./frontend/seam.mjs";
import { digest } from "./packages/canonical.mjs";
import { buildLock, serializeLock, verifyLock } from "./packages/lock.mjs";
import { readDocument } from "./packages/manifest.mjs";
import { resolvePackageGraph } from "./packages/resolve.mjs";

/** The phases, in the order `compilePackage` runs them. */
export const PHASES = Object.freeze([
	"resolve",
	"lock",
	"frontend",
	"validate",
	"assemble",
]);

/**
 * Compiles one package.
 *
 * `request` is `{ host, packageRoot, searchPath, profileName, dialect,
 * entrypoint, lockPath, limits, onPhase }`. Returns
 * `{ ir, lock, diagnostics, state, phases }`, where `state` is a `resultState`
 * of `common.schema.json` and `ir` is `null` whenever any diagnostic blocks.
 */
export async function compilePackage(request) {
	const {
		host,
		packageRoot,
		searchPath = [],
		profileName,
		dialect = "typespec",
		entrypoint = "main.tsp",
		lockPath,
		limits = DEFAULT_LIMITS,
		onPhase = () => {},
	} = request;
	const diagnostics = [];
	const phases = [];
	const stop = (state) => ({
		ir: null,
		lock: undefined,
		diagnostics: sortDiagnostics(diagnostics),
		state,
		phases,
	});

	phases.push("resolve");
	onPhase("resolve");
	const resolution = resolvePackageGraph({
		host,
		packageRoot,
		searchPath,
		profileName,
		limits,
	});
	diagnostics.push(...(resolution.diagnostics ?? []));
	if (!resolution.root || hasBlocking(diagnostics)) return stop("invalid");

	phases.push("lock");
	onPhase("lock");
	const lock = buildLock(resolution);
	const lockBytes = serializeLock(lock);
	let lockDigest = digest(lockBytes);
	if (lockPath) {
		const read = readDocument(host, {
			host,
			absolutePath: resolve(lockPath),
			packageRoot,
			schemaName: "package-lock.schema.json",
			entry: DIAGNOSTIC_CODES.STALE_LOCK,
			sourceIdentity: `ix://${resolution.root.identity}/source/lock`,
			limits,
		});
		if (!read.value) {
			diagnostics.push(...read.diagnostics);
			return stop("invalid");
		}
		diagnostics.push(
			...verifyLock(read.value, read.text, read.path, resolution),
		);
		lockDigest = read.digest;
		if (hasBlocking(diagnostics)) return stop("invalid");
	}

	resolution.packageBlock = {
		identity: resolution.root.identity,
		version: resolution.root.version,
		manifestDigest: resolution.root.manifestDigest,
		mappingVersions: resolution.mappings.map((mapping) => mapping.version),
		profileVersions: resolution.profiles.map((profile) => profile.version),
		lockDigest,
	};

	phases.push("frontend");
	onPhase("frontend");
	const result = await runFrontend({
		dialect,
		resolution,
		entrypoint,
		limits,
		host,
	});
	diagnostics.push(...result.diagnostics);
	if (hasBlocking(diagnostics)) return stop("invalid");

	// The frontend already validated its own output; naming the phase keeps the
	// order observable and leaves room for a frontend that does not.
	phases.push("validate");
	onPhase("validate");

	phases.push("assemble");
	onPhase("assemble");
	return {
		ir: result.ir,
		lock,
		lockBytes,
		resolution,
		diagnostics: sortDiagnostics(diagnostics),
		state: diagnostics.length > 0 ? "partial" : "success",
		phases,
	};
}
