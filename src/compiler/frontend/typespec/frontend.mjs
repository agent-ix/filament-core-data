/**
 * The `typespec` frontend (FR-046).
 *
 * It compiles a package's entrypoint through the confined host, translates the
 * TypeSpec compiler's own diagnostics into registry codes, runs the lowering,
 * validates the result against the published schema, and returns a
 * `FrontendResult`. It never throws for a defect in a compiled input: an input
 * defect is a diagnostic, and only a defect in the *calling program* is an
 * exception.
 */
import { compile } from "@typespec/compiler";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
	hasBlocking,
	sortDiagnostics,
} from "../../diagnostics.mjs";
import { readContractIr } from "../../ir/reader.mjs";
import { validateIrDocument } from "../../ir/schema.mjs";
import { MODULE_REFUSAL, READ_REFUSAL, restrictedHost } from "./host.mjs";
import { lowerProgram } from "./lower.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** The absolute path of the decorator library the frontend injects. */
export const DECORATOR_LIBRARY = resolve(here, "lib", "main.tsp");

/**
 * The toolchain's own installation, the only other place a module may load from.
 *
 * Resolved through `createRequire` rather than `import.meta.resolve`, because
 * the test runner's module transform does not provide the latter and a host
 * whose module allow-list silently collapses would be worse than no host.
 */
function toolchainRoot() {
	return dirname(
		createRequire(import.meta.url).resolve("@typespec/compiler/package.json"),
	);
}

export const dialect = "typespec";

/**
 * Runs the frontend over a `FrontendRequest`.
 *
 * `request` is `{ resolution, entrypoint, limits, host }` from the seam.
 */
export async function run(request) {
	const { resolution, limits = DEFAULT_LIMITS } = request;
	const packageRoot = resolution.root.packageRoot;
	const entrypoint = resolve(packageRoot, request.entrypoint ?? "main.tsp");
	const diagnostics = [];

	const searchRoots = [
		packageRoot,
		...resolution.packages.map((entry) => entry.packageRoot),
	].filter(Boolean);
	const host = restrictedHost({
		readRoots: [...new Set([...searchRoots, here, toolchainRoot()])],
		moduleRoots: [resolve(here, "lib"), toolchainRoot()],
	});

	let program;
	try {
		program = await compile(host, entrypoint, {
			noEmit: true,
			additionalImports: [DECORATOR_LIBRARY],
		});
	} catch (error) {
		return {
			ir: null,
			diagnostics: [
				diagnostic(
					String(error?.message).includes(MODULE_REFUSAL)
						? DIAGNOSTIC_CODES.UNTRUSTED_MODULE
						: DIAGNOSTIC_CODES.PATH_ESCAPE,
					{ message: fragment(String(error?.message ?? error)) },
				),
			],
		};
	}

	for (const entry of program.diagnostics) {
		if (entry.severity !== "error") continue;
		// The TypeSpec compiler catches a host refusal and re-reports it as its
		// own `js-error`. Recognising the phrase is what keeps a refusal reported
		// as a refusal rather than as "your package does not compile".
		const refusal = entry.message?.includes(MODULE_REFUSAL)
			? DIAGNOSTIC_CODES.UNTRUSTED_MODULE
			: entry.message?.includes(READ_REFUSAL)
				? DIAGNOSTIC_CODES.PATH_ESCAPE
				: undefined;
		const location = entry.target?.file
			? entry.target
			: (entry.target?.node ?? undefined);
		const file = location?.file?.path;
		const relativePath =
			file && file.startsWith(`${packageRoot}/`)
				? file
						.slice(packageRoot.length + 1)
						.split(/[\\/]/)
						.join("/")
				: undefined;
		const position =
			relativePath && typeof location.pos === "number"
				? location.file.getLineAndCharacterOfPosition(location.pos)
				: undefined;
		diagnostics.push(
			diagnostic(refusal ?? DIAGNOSTIC_CODES.TYPESPEC_COMPILE_ERROR, {
				message: refusal
					? fragment(entry.message)
					: `${entry.code}: ${fragment(entry.message)}`,
				...(position
					? {
							locus: {
								sourceIdentity: resolution.root.sourceIdentity,
								path: relativePath,
								startLine: position.line + 1,
								startColumn: position.character + 1,
							},
						}
					: {}),
			}),
		);
	}
	if (diagnostics.length > 0) {
		return { ir: null, diagnostics: sortDiagnostics(diagnostics) };
	}

	const lowered = lowerProgram({
		program,
		packageIdentity: resolution.root.identity,
		packageRoot,
		sourceIdentity: resolution.root.sourceIdentity,
		packageVersion: resolution.root.version,
		sourceDigest: resolution.root.contentDigest,
		packageBlock: resolution.packageBlock,
		importedExports: resolution.importedExports,
		limits,
	});
	diagnostics.push(...lowered.diagnostics);

	if (hasBlocking(diagnostics)) {
		return { ir: null, diagnostics: sortDiagnostics(diagnostics) };
	}

	// The frontend validates its own output. A document that fails the published
	// schema is a compiler defect, and emitting it would put an invalid artefact
	// in front of every downstream golden.
	diagnostics.push(...validateIrDocument(lowered.ir, { host: request.host }));
	diagnostics.push(
		...readContractIr(lowered.ir, {
			importedExports: resolution.importedExports,
			limits,
		}),
	);
	const sorted = sortDiagnostics(diagnostics);
	return { ir: hasBlocking(sorted) ? null : lowered.ir, diagnostics: sorted };
}
