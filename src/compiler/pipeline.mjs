/**
 * `compilePackage`: the five-phase orchestration behind the `compile` verb
 * (FR-052).
 *
 * The phase order is stated here and asserted by a test.
 *
 * A blocking diagnostic in any phase stops the next one. Returning a document
 * assembled from half a resolution would be worse than returning none.
 */
import {
	applyDiagnosticLimit,
	DEFAULT_LIMITS,
	hasBlocking,
} from "./diagnostics.mjs";
import { runFrontend } from "./frontend/seam.mjs";
import { validateIrDocument } from "./ir/schema.mjs";
import { resolvedPackageGraph } from "./packages/lock.mjs";
import { resolvePackageGraph } from "./packages/resolve.mjs";

/** The phases, in the order `compilePackage` runs them. */
export const PHASES = Object.freeze([
	"resolve",
	"graph",
	"frontend",
	"validate",
	"assemble",
]);

/**
 * Compiles one package.
 *
 * `request` is `{ host, packageRoot, searchPath, profileName, dialect,
 * entrypoint, limits, onPhase }`. Returns
 * `{ ir, packageGraph, diagnostics, state, phases }`, where `state` is a `resultState`
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
		limits = DEFAULT_LIMITS,
		// The injected extraction producer (ADR-0006). Passed through rather than
		// reached for, exactly as the generation seam passes `format` through to a
		// backend: no module in this path may start a process, and the dialect
		// that needs one receives the capability from whoever called the compile.
		lift,
		moduleRoots = [],
		onPhase = () => {},
	} = request;
	const diagnostics = [];
	const phases = [];
	// Every return sorts and then truncates: which defects survive a busy compile
	// must not depend on the order analysis happened to find them.
	const report = () => applyDiagnosticLimit(diagnostics, limits.maxDiagnostics);
	const stop = (state) => ({
		ir: null,
		packageGraph: undefined,
		diagnostics: report(),
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

	phases.push("graph");
	onPhase("graph");
	const packageGraph = resolvedPackageGraph(resolution);

	resolution.packageBlock = {
		identity: resolution.root.identity,
		version: resolution.root.version,
		mappingVersions: resolution.mappings.map((mapping) => mapping.version),
		profileVersions: resolution.profiles.map((profile) => profile.version),
	};

	phases.push("frontend");
	onPhase("frontend");
	const result = await runFrontend({
		dialect,
		resolution,
		entrypoint,
		limits,
		host,
		lift,
		moduleRoots,
	});
	diagnostics.push(...result.diagnostics);
	if (hasBlocking(diagnostics)) return stop("invalid");

	// The frontend validates its own output, and this phase validates it again
	// against the published schema — deliberately, because the seam admits
	// frontends this repository did not write and a phase that only names itself
	// is not a gate.
	phases.push("validate");
	onPhase("validate");
	diagnostics.push(...validateIrDocument(result.ir, { host }));
	if (hasBlocking(diagnostics)) return stop("invalid");

	phases.push("assemble");
	onPhase("assemble");
	return {
		ir: result.ir,
		packageGraph,
		resolution,
		diagnostics: report(),
		state: diagnostics.length > 0 ? "partial" : "success",
		phases,
	};
}
