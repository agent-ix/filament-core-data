/**
 * The package lock and the v1 fingerprint (FR-048).
 *
 * Every digest here is defined by its *byte set*, not by its name. That is the
 * whole point: `package-lock.schema.json` names `schema-bytes`,
 * `resolved-packages` and the rest as fingerprint inputs, and two
 * implementations that agree on those words can still disagree on the bytes.
 * The functions below say exactly which files, in which order, with which
 * digest, so a second implementation can be checked rather than trusted.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../diagnostics.mjs";
import { locateJsonPointer } from "../json-locus.mjs";
import { canonicalize, digest } from "./canonical.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** The repository root, derived from this module's own location, never from `cwd`. */
export const REPO_ROOT = resolve(here, "..", "..", "..");

/**
 * The contract version the compiler emits and stamps into the fingerprint
 * (fcd#179: the Semantic IR contract 1.0.0 and 1.1.0 no longer exist; 2.0.0
 * is the only contract FR-046's lowering produces).
 */
export const CONTRACT_IR_VERSION = "2.0.0";

export const CANONICALIZATION = Object.freeze({
	algorithm: "RFC8785-JCS-with-identity-sorted-sets-v1",
	digest: "sha256",
	included: [
		"schema-bytes",
		"manifest",
		"mappings",
		"profiles",
		"resolved-packages",
		"compiler-contract-version",
	],
	excluded: [
		"object-order",
		"set-order",
		"source-path",
		"working-directory",
		"timestamp",
		"hostname",
		"locale",
	],
});

function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/**
 * The published schema bytes: every `*.schema.json` under `schema/semantic/v1/`,
 * as `[filename, digest]` pairs in ascending code-point order of filename.
 *
 * Naming the file set matters. "the schema bytes" could mean the IR schema
 * alone, this directory, or the whole `schema/` tree, and a fingerprint that
 * depends on which reading you take is not a fingerprint.
 */
export function schemaBytes(host, root = REPO_ROOT) {
	const directory = resolve(root, "schema/semantic/v1");
	if (!host.isDirectory(directory)) {
		throw new TypeError(
			`the compiler reads its own published schemas: ${directory} must be a declared read root`,
		);
	}
	return host
		.walk(directory)
		.filter((name) => name.endsWith(".schema.json"))
		.sort(byCodePoint)
		.map((name) => [name, host.digestFile(resolve(directory, name))]);
}

/**
 * The files a package's `contentDigest` is taken over: everything beneath each
 * entry of its manifest's `sourceRoots`, in ascending code-point order of the
 * package-root-relative POSIX path. A file beneath the package root but outside
 * `sourceRoots` is not a source file and changes nothing.
 */
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

/** `digest(canonicalize([[path, digest(bytes)], …]))` over `sourceFiles`. */
export function contentDigest(host, packageRoot, manifest) {
	const entries = sourceFiles(host, packageRoot, manifest).map((path) => [
		path,
		host.digestFile(resolve(packageRoot, path)),
	]);
	return digest(canonicalize(entries));
}

/**
 * The v1 fingerprint: SHA-256 over the canonical form of the six included
 * inputs, in the order `CANONICALIZATION.included` names them. No excluded
 * input appears — there is no path, no timestamp, no hostname and no locale in
 * the tuple, which is why the value is the same on two hosts.
 */
export function fingerprint(resolution) {
	const tuple = [
		resolution.schemaBytes,
		resolution.root.manifestDigest,
		[...resolution.mappings]
			.map((mapping) => [mapping.identity, mapping.digest])
			.sort((left, right) => byCodePoint(left[0], right[0])),
		[...resolution.profiles]
			.map((profile) => [profile.name, profile.digest])
			.sort((left, right) => byCodePoint(left[0], right[0])),
		[...resolution.packages]
			.map((entry) => [
				entry.identity,
				entry.version,
				entry.contentDigest,
				// Every resolved package's *manifest*, not only the root's: an
				// imported package can change its exports or its own imports without
				// changing a source byte, and that is a change to what was compiled.
				entry.manifestDigest ?? null,
			])
			.sort((left, right) => byCodePoint(left[0], right[0])),
		CONTRACT_IR_VERSION,
	];
	return digest(canonicalize(tuple));
}

/** Builds the lock document for a resolved graph. */
export function buildLock(resolution) {
	return {
		contractVersion: "1.0.0",
		rootPackage: resolution.root.identity,
		fingerprint: fingerprint(resolution),
		canonicalization: {
			algorithm: CANONICALIZATION.algorithm,
			digest: CANONICALIZATION.digest,
			included: [...CANONICALIZATION.included],
			excluded: [...CANONICALIZATION.excluded],
		},
		packages: [...resolution.packages]
			.sort((left, right) => byCodePoint(left.identity, right.identity))
			.map((entry) => ({
				identity: entry.identity,
				version: entry.version,
				contentDigest: entry.contentDigest,
				sourceIdentity: entry.sourceIdentity,
				dependencies: [...entry.dependencies].sort(byCodePoint),
			})),
	};
}

/** The serialised form a lock is written and digested as. */
export function serializeLock(lock) {
	return `${JSON.stringify(lock, null, "\t")}\n`;
}

/**
 * Verifies a supplied lock against a resolved graph.
 *
 * Verification never rewrites the lock: writing one is an explicit command, and
 * a gate that repairs what it is checking is not a gate.
 */
export function verifyLock(lock, lockText, lockPath, resolution) {
	const diagnostics = [];
	const at = (pointer) => ({
		sourceIdentity: `ix://${resolution.root.identity}/source/lock`,
		path: lockPath,
		...(() => {
			const position = locateJsonPointer(lockText, pointer, "key");
			return { startLine: position.line, startColumn: position.column };
		})(),
	});

	const declared = lock.canonicalization ?? {};
	const expected = CANONICALIZATION;
	const sameVocabulary =
		declared.algorithm === expected.algorithm &&
		declared.digest === expected.digest &&
		canonicalize([...(declared.included ?? [])].sort(byCodePoint)) ===
			canonicalize([...expected.included].sort(byCodePoint)) &&
		canonicalize([...(declared.excluded ?? [])].sort(byCodePoint)) ===
			canonicalize([...expected.excluded].sort(byCodePoint));
	if (!sameVocabulary) {
		diagnostics.push(
			diagnostic(DIAGNOSTIC_CODES.UNSUPPORTED_CANONICALIZATION, {
				message: `lock declares canonicalization ${fragment(declared.algorithm ?? "(absent)")}; this compiler implements ${expected.algorithm}`,
				locus: at("/canonicalization"),
			}),
		);
		return diagnostics;
	}

	const computed = fingerprint(resolution);
	if (lock.fingerprint !== computed) {
		diagnostics.push(
			diagnostic(DIAGNOSTIC_CODES.STALE_LOCK, {
				message: `lock fingerprint ${fragment(lock.fingerprint)} does not match the computed fingerprint ${computed}`,
				locus: at("/fingerprint"),
			}),
		);
	}

	const resolved = new Map(
		resolution.packages.map((entry) => [entry.identity, entry]),
	);
	const locked = new Map();
	for (const [index, entry] of (lock.packages ?? []).entries()) {
		locked.set(entry.identity, { entry, index });
	}
	for (const [identity, { entry, index }] of locked) {
		const match = resolved.get(identity);
		if (!match) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.LOCK_GRAPH_MISMATCH, {
					message: `lock names ${fragment(identity)}, which the graph does not resolve`,
					locus: at(`/packages/${index}`),
				}),
			);
			continue;
		}
		if (match.contentDigest !== entry.contentDigest) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.STALE_LOCK_PACKAGE, {
					message: `${fragment(identity)} resolves to ${match.contentDigest}; the lock records ${fragment(entry.contentDigest)}`,
					locus: at(`/packages/${index}`),
				}),
			);
		}
	}
	for (const identity of resolved.keys()) {
		if (locked.has(identity)) continue;
		diagnostics.push(
			diagnostic(DIAGNOSTIC_CODES.LOCK_GRAPH_MISMATCH, {
				message: `the graph resolves ${fragment(identity)}, which the lock omits`,
				locus: at("/packages"),
			}),
		);
	}
	return diagnostics;
}
