/**
 * The generation backend seam and target registry (FR-063).
 *
 * One seam, so a backend is chosen by the `target` value the contract already
 * declares rather than by whichever call site reached for it. It is the output
 * half of the pattern `src/compiler/frontend/seam.mjs` establishes for the
 * input half, and it keeps the same two rules:
 *
 *   - a defect in a *submitted request document* is a diagnostic and never an
 *     exception, while a defect in the *calling program* — a target outside the
 *     closed vocabulary — throws, because nothing a package supplies should be
 *     able to crash the compiler;
 *   - a target with no implementation is *registered* rather than absent, so
 *     the compiler says "that is a target this repository has not built yet,
 *     and here is the ticket that owns it" instead of "that is not a target".
 *
 * The seam writes no file. `generateTarget` returns a file map and an
 * `output-manifest.schema.json` document; placing those bytes on disk is the
 * caller's, which is what lets a package layout change without editing a
 * backend (FR-063, FR-042-CON-2).
 *
 * It imports nothing under `src/compiler/frontend/`, so no frontend can
 * influence what a backend emits, and neither `backends/typescript.mjs` nor
 * `backends/rust.mjs`, which consume the frozen FR-041 prototype IR and are a
 * different contract entirely.
 */
import {
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
	hasBlocking,
	sortDiagnostics,
} from "../diagnostics.mjs";
import {
	errorMessage,
	errorPointer,
	schemaValidators,
} from "../schema-validate.mjs";
import { rustBackend } from "./rust-serde/backend.mjs";
import { BACKEND_TARGETS } from "./targets.mjs";
import {
	canonicalize,
	digestOf,
	fingerprintIrForTarget,
} from "./typescript-v1/canonical.mjs";
import { typescriptBackend } from "./typescript-v1/index.mjs";

export { BACKEND_TARGETS };

/** The media type a generated path carries, by extension. */
const MEDIA_TYPES = Object.freeze({
	".ts": "text/typescript",
	".mts": "text/typescript",
	".json": "application/json",
	".md": "text/markdown",
});

const DEFAULT_MEDIA_TYPE = "text/plain";

/**
 * A target the contract declares and this repository has not implemented.
 *
 * `owner` is not decoration: `output-manifest.schema.json` demands at least one
 * diagnostic for an `unavailable` state, and a diagnostic that says only "not
 * implemented" sends the reader looking for the ticket. Following the
 * `frontend/spec-bundle/frontend.mjs` precedent, the registration carries it.
 */
function declaredUnimplemented(target, owner) {
	return { target, owner, backend: null, implemented: false };
}

/**
 * The registry: one entry per declared target, implemented or not.
 *
 * A later ticket registers its own backend by replacing its entry here, and
 * `isBackendImplemented` reads the entry rather than a restated list, so no
 * assertion in this file names which targets happen to be unimplemented today.
 */
const REGISTRY = new Map([
	[
		"typescript",
		{
			target: "typescript",
			owner: typescriptBackend.owningIssue,
			backend: typescriptBackend,
			implemented: true,
		},
	],
	[
		"rust",
		{
			target: "rust",
			owner: rustBackend.owningIssue,
			backend: rustBackend,
			implemented: true,
		},
	],
	[
		"python-pydantic-v2",
		declaredUnimplemented(
			"python-pydantic-v2",
			"agent-ix/filament-core-data#23",
		),
	],
	[
		"python-dataclass",
		declaredUnimplemented("python-dataclass", "agent-ix/filament-core-data#23"),
	],
	[
		"json-schema",
		declaredUnimplemented(
			"json-schema",
			"the upstream @typespec/json-schema emitter (ADR-0005)",
		),
	],
]);

/**
 * Selects a backend by target.
 *
 * Throws for a value outside the vocabulary: that is the calling program naming
 * something the contract does not define, which no submitted document can
 * cause (FR-063-CON-3).
 *
 * `registry` is a test seam, and it is load-bearing rather than a convenience.
 * Two of this requirement's criteria cannot be checked against the committed
 * registry without encoding a fact that a sibling ticket falsifies: asserting
 * "`rust` returns unavailable" is an assertion about issue #21's *absence*, and
 * it goes red the moment #21 registers its backend, on a branch that did
 * nothing wrong. Exercising the arm over a synthetic registration instead
 * asserts the mechanism, which stays true whatever the siblings implement
 * (FR-063-AC-3, FR-063-AC-7).
 */
export function selectBackend(target, registry = REGISTRY) {
	const entry = registry.get(target);
	if (!entry) {
		throw new TypeError(
			`unknown generated target ${JSON.stringify(target)}; the contract declares ${BACKEND_TARGETS.join(", ")}`,
		);
	}
	return {
		target: entry.target,
		owner: entry.owner,
		backend: entry.backend,
		implemented: entry.implemented,
	};
}

/** True when this repository carries an implementation for the target. */
export function isBackendImplemented(target, registry = REGISTRY) {
	return selectBackend(target, registry).implemented;
}

/** Every registered target with its owner, for a gate that reads the registry. */
export function backendRegistrations(registry = REGISTRY) {
	return [...registry.values()].map((entry) => ({
		target: entry.target,
		owner: entry.owner,
		implemented: entry.implemented,
	}));
}

/**
 * Builds a registry for a test: the committed one, with the named entries
 * replaced. Exported so a criterion can be exercised over a synthetic
 * registration rather than over whichever targets happen to be unimplemented
 * on the day the test runs.
 */
export function registryWith(overrides) {
	const registry = new Map(REGISTRY);
	for (const [target, entry] of Object.entries(overrides)) {
		registry.set(target, { target, ...entry });
	}
	return registry;
}

const REQUIRED_BACKEND_MEMBERS = Object.freeze([
	"identity",
	"version",
	"supportedIrVersions",
	"supportedFeatures",
	"generate",
]);

/**
 * The seam's own contract, exercised directly.
 *
 * A backend that breaks it is a defect in the compiler and not in an input, so
 * this throws. `outputRoot` is checked here rather than inside a backend
 * because a backend that could place a file outside the root the caller named
 * is the one failure mode the caller cannot see until the bytes are written.
 */
export function assertBackendContract(backend, generation, outputRoot) {
	for (const member of REQUIRED_BACKEND_MEMBERS) {
		if (backend == null || backend[member] === undefined) {
			throw new TypeError(
				`generation backend is missing the required member ${member}`,
			);
		}
	}
	if (generation === undefined) return backend;
	for (const file of generation.files ?? []) {
		if (!isWithinRoot(file.path, outputRoot)) {
			throw new Error(
				`backend ${backend.identity} named a path outside the request's outputRoot: ${fragment(file.path)}`,
			);
		}
	}
	return backend;
}

/**
 * A generated path is relative to `outputRoot`, so it may not be absolute,
 * drive-lettered, backslashed, or reach a parent. The check is textual because
 * the seam never touches a file system: there is nothing to resolve against.
 */
function isWithinRoot(path) {
	if (typeof path !== "string" || path.length === 0) return false;
	if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
	if (path.includes("\\")) return false;
	return !path
		.split("/")
		.some((segment) => segment === ".." || segment === "" || segment === ".");
}

function mediaTypeFor(path) {
	const dot = path.lastIndexOf(".");
	if (dot < 0) return DEFAULT_MEDIA_TYPE;
	return MEDIA_TYPES[path.slice(dot)] ?? DEFAULT_MEDIA_TYPE;
}

/**
 * The package's own identity, minted from the IR's `owner/name`.
 *
 * `output-manifest.schema.json` requires a non-empty `semanticIdentities` on
 * every `files[]` entry, and `package.json` and `LICENSE` render no type
 * definition. Dropping them from the manifest would contradict
 * `contracts-v1.md`, which requires every emitted file to reconcile, so they
 * carry the package identity instead (FR-063).
 */
function packageIdentityOf(ir) {
	const identity = ir?.package?.identity;
	return typeof identity === "string" && identity.length > 0
		? `ix://${identity}`
		: undefined;
}

/**
 * Assembles a manifest. Every return path of `generateTarget` comes through
 * here, so there is one place the document's shape is decided and one place a
 * schema change would be felt.
 */
function manifest({
	request,
	backendIdentity,
	state,
	files = [],
	diagnostics = [],
}) {
	return {
		contractVersion: "1.0.0",
		requestFingerprint: safeDigest(request),
		backend: backendIdentity,
		state,
		files,
		diagnostics: sortDiagnostics(diagnostics),
		normalizedFingerprint: safeIrFingerprint(request?.ir),
	};
}

const NULL_DIGEST = digestOf("");

/**
 * A request that cannot be canonicalized still needs a fingerprint, because the
 * manifest requires one and the request is exactly the kind of document that
 * arrives malformed. The digest of the empty string is the declared stand-in;
 * it is a constant, so it cannot be mistaken for a real request's fingerprint
 * by anything that compares two manifests.
 */
function safeDigest(request) {
	try {
		return digestOf(canonicalize(request, { sets: true }));
	} catch {
		return NULL_DIGEST;
	}
}

function safeIrFingerprint(ir) {
	try {
		return fingerprintIrForTarget(ir);
	} catch {
		return NULL_DIGEST;
	}
}

/**
 * Runs a generation request through the seam.
 *
 * Never throws for a defect in `request`: a malformed request is `invalid`, an
 * unimplemented target is `unavailable`, an IR contract version the backend
 * does not accept is `unsupported`, and every one of them is an
 * `output-manifest.schema.json`-valid document (FR-063-CON-3).
 *
 * `options.format(text, path)` is the injected formatter of FR-071. Every
 * emitted file's text passes through it *before* its digest is computed, so the
 * digest a manifest records is the digest of the bytes a caller writes. When no
 * formatter is supplied the identity function stands in and nothing is
 * recorded: an unformatted generation is a legitimate caller decision, not a
 * defect.
 */
export function generateTarget(request, options = {}) {
	const format = options.format ?? ((text) => text);

	// `compiler-request.schema.json` carries the backend's identity, version,
	// features and options, and no `target` member — the target is the caller's
	// selection, not the request document's, which is why the CLI spells it
	// `--target`. Naming one outside the closed vocabulary, or naming none, is a
	// defect in the calling program and throws before any document is read.
	const registry = options.registry ?? REGISTRY;
	const entry = selectBackend(options.target, registry);

	const validators = schemaValidators(options.host);
	const errors = validators.errors("compiler-request.schema.json", request);
	if (errors.length > 0) {
		return manifest({
			request,
			backendIdentity: entry.backend?.identity ?? unimplementedIdentity(entry),
			state: "invalid",
			diagnostics: errors.map((error) =>
				diagnostic(DIAGNOSTIC_CODES.INVALID_REQUEST, {
					message: `${errorPointer(error) || "(document root)"}: ${fragment(errorMessage(error))}`,
				}),
			),
		});
	}

	if (!entry.implemented) {
		return manifest({
			request,
			backendIdentity: unimplementedIdentity(entry),
			state: "unavailable",
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.BACKEND_NOT_IMPLEMENTED, {
					message: `the ${fragment(entry.target)} generation backend is not implemented in this repository; it is ${fragment(entry.owner)}`,
				}),
			],
		});
	}

	const backend = entry.backend;
	assertBackendContract(backend);

	const irVersion = request.ir?.contractVersion;
	if (!backend.supportedIrVersions.includes(irVersion)) {
		return manifest({
			request,
			backendIdentity: backend.identity,
			state: "unsupported",
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.UNSUPPORTED_IR_VERSION, {
					message: `backend ${fragment(backend.identity)} does not support contract version ${fragment(irVersion)}; it declares ${backend.supportedIrVersions.join(", ")}`,
				}),
			],
		});
	}

	const generation = backend.generate(request, {
		host: options.host,
		format,
	});
	assertBackendContract(backend, generation, request.outputRoot);

	const diagnostics = generation.diagnostics ?? [];
	const state = generation.state ?? "success";

	// The schema forces zero files for these three, and a backend that returned
	// both would produce a manifest that cannot validate. Reconciling here — and
	// not silently dropping the files — keeps the refusal visible.
	if (
		state === "invalid" ||
		state === "unsupported" ||
		state === "unavailable"
	) {
		return manifest({
			request,
			backendIdentity: backend.identity,
			state,
			diagnostics:
				diagnostics.length > 0
					? diagnostics
					: [
							diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
								message: `backend ${fragment(backend.identity)} reported ${fragment(state)} with no diagnostic; a refusal must name its reason`,
							}),
						],
		});
	}

	const packageIdentity = packageIdentityOf(request.ir);
	const files = (generation.files ?? []).map((file) => {
		const text = format(file.text, file.path);
		const identities =
			file.identities && file.identities.length > 0
				? [...file.identities]
				: packageIdentity
					? [packageIdentity]
					: [];
		return {
			path: file.path,
			digest: digestOf(text),
			mediaType: file.mediaType ?? mediaTypeFor(file.path),
			semanticIdentities: identities,
		};
	});

	return manifest({
		request,
		backendIdentity: backend.identity,
		state: hasBlocking(diagnostics) ? "invalid" : state,
		files: hasBlocking(diagnostics) ? [] : files,
		diagnostics,
	});
}

/**
 * An unimplemented entry has no backend and so no identity of its own, and the
 * manifest requires one. The registry's target is the honest stand-in: it names
 * what was asked for rather than claiming a backend answered.
 */
function unimplementedIdentity(entry) {
	return `ix://agent-ix/filament-core-data/backend/${entry.target}`;
}
