/**
 * Package graph resolution (FR-047).
 *
 * The resolver turns a root package and a list of search directories into one
 * ordered graph. Three decisions in here exist because leaving them implicit
 * would make the emitted IR depend on the host:
 *
 *   - among candidates satisfying a constraint, the highest version wins, and a
 *     tie is broken by the caller's *declared* search-path order, not by which
 *     directory the file system happened to list first;
 *   - a cycle is reported once per depth-first back edge, from the least package
 *     identity on it, so two runs entering the graph from different packages
 *     produce the same message;
 *   - every path is resolved to its real path before it is read, so a symlink
 *     out of a search root is a refusal rather than a resolution.
 */
import { resolve } from "node:path";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
} from "../diagnostics.mjs";
import { canonicalize, digest } from "./canonical.mjs";
import { contentDigest, schemaBytes } from "./lock.mjs";
import { readDocument } from "./manifest.mjs";

const SEMVER =
	/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/** Parsed semantic version, or `undefined` when the string is not one. */
export function parseVersion(value) {
	const match = SEMVER.exec(String(value));
	if (!match) return undefined;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ?? "",
	};
}

/**
 * Semantic-version precedence (SemVer 2.0.0 §11).
 *
 * A prerelease sorts below its release, and prerelease identifiers compare
 * field by field: numeric ones numerically, so `alpha.2` precedes `alpha.10`,
 * which a string comparison gets backwards; a numeric identifier ranks below an
 * alphanumeric one; and a shorter prefix ranks below a longer one.
 */
export function compareVersions(left, right) {
	for (const part of ["major", "minor", "patch"]) {
		if (left[part] !== right[part]) return left[part] - right[part];
	}
	if (left.prerelease === right.prerelease) return 0;
	if (left.prerelease === "") return 1;
	if (right.prerelease === "") return -1;
	const a = left.prerelease.split(".");
	const b = right.prerelease.split(".");
	for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
		if (a[index] === undefined) return -1;
		if (b[index] === undefined) return 1;
		const numericA = /^\d+$/.test(a[index]);
		const numericB = /^\d+$/.test(b[index]);
		if (numericA && numericB) {
			if (Number(a[index]) !== Number(b[index])) {
				return Number(a[index]) - Number(b[index]);
			}
			continue;
		}
		if (numericA !== numericB) return numericA ? -1 : 1;
		const comparison = byCodePoint(a[index], b[index]);
		if (comparison !== 0) return comparison;
	}
	return 0;
}

/**
 * The two accepted constraint forms, and no others. A range this compiler does
 * not implement is refused rather than approximated, because approximating it
 * would silently change which bytes a compile consumed.
 */
export function parseConstraint(value) {
	const text = String(value);
	if (text.startsWith("^")) {
		const version = parseVersion(text.slice(1));
		return version ? { kind: "caret", version } : undefined;
	}
	const version = parseVersion(text);
	return version ? { kind: "exact", version } : undefined;
}

/** True when `version` satisfies `constraint`. */
export function satisfies(version, constraint) {
	if (constraint.kind === "exact") {
		return compareVersions(version, constraint.version) === 0;
	}
	const base = constraint.version;
	// A caret range admits a prerelease only when the constraint itself names
	// one, and then only of the same release. `^1.2.0` selecting `1.3.0-beta`
	// would resolve a package to something its author has not released.
	if (version.prerelease !== "") {
		if (base.prerelease === "") return false;
		if (
			version.major !== base.major ||
			version.minor !== base.minor ||
			version.patch !== base.patch
		) {
			return false;
		}
	}
	if (compareVersions(version, base) < 0) return false;
	if (base.major > 0) return version.major === base.major;
	if (base.minor > 0)
		return version.major === 0 && version.minor === base.minor;
	return (
		version.major === 0 && version.minor === 0 && version.patch === base.patch
	);
}

function sourceIdentityFor(identity, kind) {
	return `ix://${identity}/source/${kind}`;
}

/**
 * Enumerates candidate packages in the declared search-path order. A directory
 * earlier in the list wins a tie; nothing here depends on enumeration order,
 * which the host has already sorted.
 */
function discoverCandidates(host, searchPath, limits, diagnostics) {
	const candidates = new Map();
	const rejected = [];
	for (const [order, directory] of searchPath.entries()) {
		const root = resolve(directory);
		if (!host.isDirectory(root)) continue;
		for (const name of host.readDir(root)) {
			const packageRoot = resolve(root, name);
			// A search-directory entry whose real path is outside the root — a
			// symlink out of the tree — is refused and reported, not skipped and
			// not allowed to abort the whole resolution.
			try {
				if (!host.isDirectory(packageRoot)) continue;
			} catch (error) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.PATH_ESCAPE, {
						message: `${fragment(name)} in a declared search directory resolves outside it: ${fragment(error?.message ?? String(error))}`,
					}),
				);
				continue;
			}
			const manifestPath = resolve(packageRoot, "package-manifest.json");
			let present = false;
			try {
				present = host.exists(manifestPath);
			} catch {
				continue;
			}
			if (!present) continue;
			const read = readDocument(host, {
				host,
				absolutePath: manifestPath,
				packageRoot,
				schemaName: "package-manifest.schema.json",
				entry: DIAGNOSTIC_CODES.INVALID_MANIFEST,
				sourceIdentity: (value) =>
					sourceIdentityFor(
						value?.package?.identity ?? "agent-ix/unresolved",
						"manifest",
					),
				limits,
			});
			if (!read.value) {
				// A candidate this compile never imports is not this compile's
				// problem: its defects are collected and reported only if it is
				// selected. Failing a build on an unrelated package in a shared
				// search directory would make one bad package block every other.
				rejected.push({ packageRoot, diagnostics: read.diagnostics });
				continue;
			}
			const identity = read.value.package.identity;
			const version = parseVersion(read.value.package.version);
			if (!version) continue;
			const key = `${identity}@${read.value.package.version}`;
			const entry = {
				identity,
				version,
				versionText: read.value.package.version,
				order,
				packageRoot,
				manifest: read.value,
				manifestText: read.text,
				manifestDigest: read.digest,
				locate: read.locate,
				manifestPath: read.path,
			};
			const existing = candidates.get(key);
			if (!existing) {
				candidates.set(key, entry);
				continue;
			}
			let existingDigest;
			let currentDigest;
			try {
				existingDigest = contentDigest(
					host,
					existing.packageRoot,
					existing.manifest,
				);
				currentDigest = contentDigest(host, packageRoot, read.value);
			} catch {
				// A candidate whose sources cannot be read is reported when it is
				// selected, at the manifest that declared the root; comparing two
				// digests one of which does not exist would report the wrong defect.
				continue;
			}
			if (existingDigest !== currentDigest) {
				// Sorted, so the message does not depend on which directory the host
				// happened to enumerate first.
				const [first, second] = [existingDigest, currentDigest].sort(
					byCodePoint,
				);
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.DIGEST_CONFLICT, {
						message: `${fragment(key)} resolves to two different content digests: ${first} and ${second}`,
						locus: existing.locate("/package"),
						related: [read.locate("/package")],
					}),
				);
			}
		}
	}
	return { candidates, rejected };
}

/** Groups candidates by identity, highest version first, declared order breaking ties. */
function byIdentity(candidates) {
	const grouped = new Map();
	for (const entry of candidates.values()) {
		const list = grouped.get(entry.identity) ?? [];
		list.push(entry);
		grouped.set(entry.identity, list);
	}
	for (const list of grouped.values()) {
		list.sort((left, right) => {
			const version = compareVersions(right.version, left.version);
			if (version !== 0) return version;
			return left.order - right.order;
		});
	}
	return grouped;
}

/**
 * Reports one `PACKAGE_CYCLE` per depth-first back edge, naming the loci from
 * the least package identity on the cycle so the message does not depend on
 * where the traversal started.
 */
function detectCycles(edges, diagnostics) {
	const state = new Map();
	const stack = [];
	const reported = new Set();
	const visit = (node) => {
		state.set(node, "open");
		stack.push(node);
		for (const edge of edges.get(node) ?? []) {
			if (state.get(edge.target) === "open") {
				const start = stack.indexOf(edge.target);
				const cycle = stack.slice(start);
				const least = cycle.reduce((best, item) =>
					byCodePoint(item, best) < 0 ? item : best,
				);
				const offset = cycle.indexOf(least);
				const rotated = [...cycle.slice(offset), ...cycle.slice(0, offset)];
				const key = rotated.join(" -> ");
				if (reported.has(key)) continue;
				reported.add(key);
				const loci = rotated.map((from) => {
					const next = rotated[(rotated.indexOf(from) + 1) % rotated.length];
					return (edges.get(from) ?? []).find((item) => item.target === next)
						?.locus;
				});
				const present = loci.filter(Boolean);
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.PACKAGE_CYCLE, {
						message: `package import cycle: ${fragment(`${key} -> ${least}`)}`,
						locus: present[0],
						related: present.slice(1),
					}),
				);
			} else if (!state.has(edge.target)) {
				visit(edge.target);
			}
		}
		stack.pop();
		state.set(node, "done");
	};
	for (const node of [...edges.keys()].sort(byCodePoint)) {
		if (!state.has(node)) visit(node);
	}
}

/**
 * Resolves the graph.
 *
 * `request` is `{ host, packageRoot, searchPath, profileName, limits }`.
 */
export function resolvePackageGraph(request) {
	const {
		host,
		packageRoot,
		searchPath = [],
		profileName,
		limits = DEFAULT_LIMITS,
	} = request;
	const diagnostics = [];

	const rootRead = readDocument(host, {
		host,
		absolutePath: resolve(packageRoot, "package-manifest.json"),
		packageRoot,
		schemaName: "package-manifest.schema.json",
		entry: DIAGNOSTIC_CODES.INVALID_MANIFEST,
		sourceIdentity: (value) =>
			sourceIdentityFor(
				value?.package?.identity ?? "agent-ix/unresolved",
				"manifest",
			),
		limits,
	});
	if (!rootRead.value) {
		return { diagnostics: [...diagnostics, ...rootRead.diagnostics] };
	}
	const rootIdentity = rootRead.value.package.identity;
	const rootLocus = (pointer) => rootRead.locate(pointer);

	const { candidates, rejected } = discoverCandidates(
		host,
		searchPath,
		limits,
		diagnostics,
	);
	const grouped = byIdentity(candidates);

	// The root is always in the graph, whether or not a search directory also
	// offers it; a package compiles against the tree the caller pointed at.
	const rootEntry = {
		identity: rootIdentity,
		version: parseVersion(rootRead.value.package.version),
		versionText: rootRead.value.package.version,
		order: -1,
		packageRoot: resolve(packageRoot),
		manifest: rootRead.value,
		manifestText: rootRead.text,
		manifestDigest: rootRead.digest,
		locate: rootRead.locate,
		manifestPath: rootRead.path,
	};

	const selected = new Map([[rootIdentity, rootEntry]]);
	const constraints = new Map();

	/** The highest candidate satisfying every constraint recorded so far. */
	const select = (identity, offered) => {
		const applicable = constraints.get(identity) ?? [];
		const matching = offered.filter((candidate) =>
			applicable.every((item) => satisfies(candidate.version, item.constraint)),
		);
		return matching[0];
	};
	const edges = new Map();
	const queue = [rootEntry];
	while (queue.length > 0) {
		if (selected.size > limits.maxNodes) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.LIMIT_MAX_NODES, {
					message: `package graph exceeds the maxNodes limit of ${limits.maxNodes}`,
					locus: rootLocus("/package"),
				}),
			);
			break;
		}
		const current = queue.shift();
		const outgoing = [];
		edges.set(current.identity, outgoing);
		for (const [index, entry] of (current.manifest.imports ?? []).entries()) {
			const locus = current.locate(`/imports/${index}`);
			const constraint = parseConstraint(entry.versionConstraint);
			if (!constraint) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.UNSUPPORTED_VERSION_CONSTRAINT, {
						message: `${fragment(entry.versionConstraint)} is neither an exact version nor a caret range; this compiler implements no other form`,
						locus: current.locate(`/imports/${index}/versionConstraint`),
					}),
				);
				continue;
			}
			const list = constraints.get(entry.packageIdentity) ?? [];
			list.push({ constraint, locus, from: current.identity, entry });
			constraints.set(entry.packageIdentity, list);
			outgoing.push({ target: entry.packageIdentity, locus });

			const offered = grouped.get(entry.packageIdentity) ?? [];
			if (offered.length === 0) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.IMPORT_NOT_FOUND, {
						message: `no search directory supplies ${fragment(entry.packageIdentity)}`,
						locus,
						// A rejected candidate is the likely reason: nesting it says
						// which package could not be read rather than only that none
						// was found.
						causes: rejected.flatMap((item) => item.diagnostics),
					}),
				);
				continue;
			}
			const matching = offered.filter((candidate) =>
				satisfies(candidate.version, constraint),
			);
			if (matching.length === 0) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.IMPORT_VERSION_UNSATISFIED, {
						message: `${fragment(entry.packageIdentity)} ${fragment(entry.versionConstraint)} is satisfied by none of ${fragment(offered.map((item) => item.versionText).join(", "))}`,
						locus,
					}),
				);
				continue;
			}
			// The selection is against *every* constraint gathered so far, not the
			// first one seen. Choosing on the first and reporting a conflict later
			// makes the resolved version depend on the order the manifests were
			// walked, which is the ordering independence FR-047 promises.
			const chosen = select(entry.packageIdentity, offered);
			if (!chosen) continue;
			const previous = selected.get(entry.packageIdentity);
			if (!previous) {
				selected.set(entry.packageIdentity, chosen);
				queue.push(chosen);
			} else if (previous.versionText !== chosen.versionText) {
				selected.set(entry.packageIdentity, chosen);
				queue.push(chosen);
			}
		}
	}

	// Every constraint on one identity must be satisfied by the single selected
	// version; two manifests asking for incompatible versions is a conflict, not
	// a silent pick.
	for (const [identity, list] of [...constraints].sort((left, right) =>
		byCodePoint(left[0], right[0]),
	)) {
		const chosen = selected.get(identity);
		if (!chosen) continue;
		const unsatisfied = list.filter(
			(item) => !satisfies(chosen.version, item.constraint),
		);
		if (unsatisfied.length === 0) continue;
		const ordered = [...list].sort((left, right) =>
			byCodePoint(left.from, right.from),
		);
		diagnostics.push(
			diagnostic(DIAGNOSTIC_CODES.IMPORT_VERSION_CONFLICT, {
				message: `no single version of ${fragment(identity)} satisfies every constraint on it: ${fragment(ordered.map((item) => item.entry.versionConstraint).join(", "))}`,
				locus: ordered[0].locus,
				related: ordered.slice(1).map((item) => item.locus),
			}),
		);
	}

	detectCycles(edges, diagnostics);

	// Exports: declared, public, and unique across the whole graph.
	const exportsByIdentity = new Map();
	for (const entry of [...selected.values()].sort((left, right) =>
		byCodePoint(left.identity, right.identity),
	)) {
		const seen = new Set();
		const seenIdentities = new Set();
		for (const [index, item] of (entry.manifest.exports ?? []).entries()) {
			// Both keys matter: two names for one identity is as much a duplicate
			// as two entries under one name, and only the second was caught.
			if (seenIdentities.has(item.typeIdentity)) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.DUPLICATE_EXPORT, {
						message: `${fragment(entry.identity)} exports ${fragment(item.typeIdentity)} under two names`,
						locus: entry.locate(`/exports/${index}`),
					}),
				);
			}
			seenIdentities.add(item.typeIdentity);
			if (seen.has(item.name)) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.DUPLICATE_EXPORT, {
						message: `${fragment(entry.identity)} exports ${fragment(item.name)} twice`,
						locus: entry.locate(`/exports/${index}`),
					}),
				);
			}
			seen.add(item.name);
			const previous = exportsByIdentity.get(item.typeIdentity);
			if (previous) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.DUPLICATE_EXPORT, {
						message: `${fragment(item.typeIdentity)} is exported by both ${fragment(previous.owner)} and ${fragment(entry.identity)}`,
						locus: entry.locate(`/exports/${index}`),
						related: [previous.locus],
					}),
				);
				continue;
			}
			exportsByIdentity.set(item.typeIdentity, {
				owner: entry.identity,
				visibility: item.visibility,
				name: item.name,
				locus: entry.locate(`/exports/${index}`),
			});
		}
	}

	for (const entry of [...selected.values()].sort((left, right) =>
		byCodePoint(left.identity, right.identity),
	)) {
		for (const [index, item] of (entry.manifest.imports ?? []).entries()) {
			const target = selected.get(item.packageIdentity);
			if (!target) continue;
			const declared = new Map(
				(target.manifest.exports ?? []).map((value) => [value.name, value]),
			);
			for (const name of item.exports ?? []) {
				const exported = declared.get(name);
				if (!exported) {
					diagnostics.push(
						diagnostic(DIAGNOSTIC_CODES.IMPORT_EXPORT_MISSING, {
							message: `${fragment(item.packageIdentity)} declares no export named ${fragment(name)}`,
							locus: entry.locate(`/imports/${index}/exports`),
						}),
					);
					continue;
				}
				if (exported.visibility === "private") {
					diagnostics.push(
						diagnostic(DIAGNOSTIC_CODES.IMPORT_EXPORT_PRIVATE, {
							message: `${fragment(item.packageIdentity)} declares ${fragment(name)} private`,
							locus: entry.locate(`/imports/${index}/exports`),
						}),
					);
				}
			}
			const offered = new Set(
				(target.manifest.profiles ?? []).flatMap(
					(profile) => profile.options?.capabilities ?? [],
				),
			);
			for (const capability of item.capabilities ?? []) {
				if (offered.has(capability)) continue;
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.IMPORT_CAPABILITY_MISSING, {
						message: `no profile of ${fragment(item.packageIdentity)} declares the capability ${fragment(capability)}`,
						locus: entry.locate(`/imports/${index}/capabilities`),
					}),
				);
			}
		}
	}

	// Profile, its mappings, and its targets.
	const declaredProfiles = rootRead.value.profiles ?? [];
	let profile;
	if (profileName === undefined) {
		if (declaredProfiles.length === 1) profile = declaredProfiles[0];
		else if (declaredProfiles.length > 1) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.AMBIGUOUS_PROFILE, {
					message: `the manifest declares ${declaredProfiles.length} profiles (${fragment(declaredProfiles.map((item) => item.name).join(", "))}); name one with --profile`,
					locus: rootLocus("/profiles"),
				}),
			);
		}
	} else {
		profile = declaredProfiles.find((item) => item.name === profileName);
		if (!profile) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.UNKNOWN_PROFILE, {
					message: `the manifest declares no profile named ${fragment(profileName)}; it declares ${fragment(declaredProfiles.map((item) => item.name).join(", ") || "none")}`,
					locus: rootLocus("/profiles"),
				}),
			);
		}
	}

	const mappings = [];
	const profiles = [];
	if (profile) {
		const index = declaredProfiles.indexOf(profile);
		// The manifest's `profiles[]` entry is the *build* profile; the
		// representation profile that `profile.schema.json` describes is a
		// separate document, and the manifest carries no path for it. The
		// convention this compiler implements is `profiles/<name>.json` beside the
		// manifest. Where a package declares none, the build profile's own
		// declaration is what the fingerprint covers.
		const profileDocumentPath = resolve(
			packageRoot,
			"profiles",
			`${profile.name}.json`,
		);
		let profileDigest = digest(canonicalize(profile));
		let profileDocument;
		if (host.exists(profileDocumentPath)) {
			const read = readDocument(host, {
				host,
				absolutePath: profileDocumentPath,
				packageRoot,
				schemaName: "profile.schema.json",
				entry: DIAGNOSTIC_CODES.INVALID_PROFILE,
				sourceIdentity: sourceIdentityFor(rootIdentity, "profile"),
				limits,
			});
			if (read.value) {
				profileDigest = read.digest;
				profileDocument = read.value;
			} else {
				diagnostics.push(...read.diagnostics);
			}
		}
		profiles.push({
			name: profile.name,
			version: profile.version,
			digest: profileDigest,
			declaration: profile,
			document: profileDocument,
		});
		const known = new Set(rootRead.value.mappings ?? []);
		const targets = new Set(rootRead.value.targets ?? []);
		for (const [position, identity] of (profile.mappings ?? []).entries()) {
			if (!known.has(identity)) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.UNKNOWN_MAPPING, {
						message: `profile ${fragment(profile.name)} selects ${fragment(identity)}, which the manifest's mappings do not contain`,
						locus: rootLocus(`/profiles/${index}/mappings/${position}`),
					}),
				);
				continue;
			}
			const tail = identity.slice(identity.lastIndexOf("/") + 1);
			const documentPath = resolve(packageRoot, "mappings", `${tail}.json`);
			if (!host.exists(documentPath)) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.UNKNOWN_MAPPING, {
						message: `profile ${fragment(profile.name)} selects ${fragment(identity)}, whose document is absent at mappings/${fragment(tail)}.json`,
						locus: rootLocus(`/profiles/${index}/mappings/${position}`),
					}),
				);
				continue;
			}
			const read = readDocument(host, {
				host,
				absolutePath: documentPath,
				packageRoot,
				schemaName: "mapping.schema.json",
				entry: DIAGNOSTIC_CODES.INVALID_MAPPING,
				sourceIdentity: sourceIdentityFor(rootIdentity, "mapping"),
				limits,
			});
			if (!read.value) {
				diagnostics.push(...read.diagnostics);
				continue;
			}
			mappings.push({
				identity,
				version: read.value.version,
				digest: read.digest,
				document: read.value,
				locate: read.locate,
			});
			if (
				profile.compatibilityPosture === "strict" &&
				read.value.transformation?.preservation === "declared-lossy"
			) {
				diagnostics.push(
					diagnostic(DIAGNOSTIC_CODES.UNDECLARED_LOSS, {
						message: `profile ${fragment(profile.name)} is strict, but mapping ${fragment(identity)} declares lossy preservation`,
						locus: read.locate("/transformation/preservation"),
					}),
				);
			}
		}
		for (const [position, target] of (profile.targets ?? []).entries()) {
			if (targets.has(target)) continue;
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.UNKNOWN_TARGET, {
					message: `profile ${fragment(profile.name)} selects the target ${fragment(target)}, which the manifest does not declare`,
					locus: rootLocus(`/profiles/${index}/targets/${position}`),
				}),
			);
		}
	}

	/**
	 * A source root the declared roots refuse, or a document too deep to
	 * canonicalise, is a diagnostic at the manifest that declared it — never a
	 * package that quietly digests nothing.
	 */
	const digestOf = (entry) => {
		try {
			return contentDigest(host, entry.packageRoot, entry.manifest);
		} catch (error) {
			diagnostics.push(
				diagnostic(
					error?.name === "CanonicalLimitError"
						? DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH
						: DIAGNOSTIC_CODES.PATH_ESCAPE,
					{
						message: `${fragment(entry.identity)}: ${fragment(error?.message ?? String(error))}`,
						locus: entry.locate("/sourceRoots"),
					},
				),
			);
			return undefined;
		}
	};

	const packages = [...selected.values()]
		.sort((left, right) => byCodePoint(left.identity, right.identity))
		.map((entry) => ({
			identity: entry.identity,
			version: entry.versionText,
			contentDigest: digestOf(entry),
			sourceIdentity: sourceIdentityFor(entry.identity, "typespec"),
			dependencies: [
				...new Set(
					(entry.manifest.imports ?? []).map((item) => item.packageIdentity),
				),
			].sort(byCodePoint),
			packageRoot: entry.packageRoot,
			// Every resolved package's manifest is an input the fingerprint covers.
			// Carrying only the root's would let an imported package change its
			// exports, its imports or its profiles without moving the fingerprint.
			manifest: entry.manifest,
			manifestDigest: entry.manifestDigest,
			manifestPath: entry.manifestPath,
		}));

	const root = packages.find((entry) => entry.identity === rootIdentity);

	return {
		root: {
			...root,
			identity: rootIdentity,
			packageRoot: resolve(packageRoot),
			manifest: rootRead.value,
			manifestDigest: rootRead.digest,
			locate: rootRead.locate,
		},
		packages,
		profile,
		profiles,
		mappings,
		exportsByIdentity,
		importedExports: new Set(
			[...exportsByIdentity]
				.filter(([, value]) => value.owner !== rootIdentity)
				.map(([identity]) => identity),
		),
		schemaBytes: schemaBytes(host),
		diagnostics,
	};
}
