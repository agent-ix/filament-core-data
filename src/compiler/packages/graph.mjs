/** Deterministic, directly inspectable package graph (FR-048). */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Repository root, derived from this module's location. */
export const REPO_ROOT = resolve(here, "..", "..", "..");

/** The contract version the compiler emits. */
export const CONTRACT_IR_VERSION = "2.0.0";

function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/** Source files beneath the manifest's declared roots, in stable path order. */
export function sourceFiles(host, packageRoot, manifest) {
	const files = [];
	for (const sourceRoot of manifest.sourceRoots) {
		const directory = resolve(packageRoot, sourceRoot);
		if (!host.isDirectory(directory)) continue;
		for (const relative of host.walk(directory)) {
			files.push(`${sourceRoot.replace(/\/$/, "")}/${relative}`);
		}
	}
	return [...new Set(files)].sort(byCodePoint);
}

/** The selected graph, without a second lock or a derived content identity. */
export function resolvedPackageGraph(
	resolution,
	contractVersion = CONTRACT_IR_VERSION,
) {
	return {
		rootPackage: resolution.root.identity,
		contractVersion,
		profile: resolution.profile?.name ?? null,
		packages: [...resolution.packages]
			.sort((left, right) => byCodePoint(left.identity, right.identity))
			.map((entry) => ({
				identity: entry.identity,
				version: entry.version,
				imports: [
					...new Set(
						(entry.manifest.imports ?? []).map((item) => item.packageIdentity),
					),
				].sort(byCodePoint),
				exports: [
					...new Set(
						(entry.manifest.exports ?? []).map((item) => item.typeIdentity),
					),
				].sort(byCodePoint),
			})),
	};
}
