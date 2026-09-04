/**
 * Type declarations for the Rust/Serde backend's closed diagnostic registry.
 *
 * The sidecar of `diagnostics.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 */

/** One registered diagnostic entry. Frozen; the registry is deeply frozen. */
export interface DiagnosticEntry {
	/** The fully-qualified code, in one of the two declared namespaces. */
	readonly code: string;
	readonly severity: "error" | "warning" | "info";
	readonly blocking: boolean;
	/** The owning identity, which follows the namespace. */
	readonly owner: string;
	/** The rule this code enforces, rendered into the published code table. */
	readonly rule: string;
}

/** One emitted diagnostic, shaped as `common.schema.json#/$defs/diagnostic`. */
export interface Diagnostic {
	readonly code: string;
	readonly severity: string;
	readonly message: string;
	readonly owner: string;
	readonly blocking: boolean;
	readonly causes: Diagnostic[];
	readonly related: unknown[];
	readonly locus?: {
		readonly sourceIdentity: string;
		readonly path: string;
		readonly startLine: number;
		readonly startColumn: number;
		readonly endLine?: number;
		readonly endColumn?: number;
	};
}

export const RUST_BACKEND_CODES: Readonly<Record<string, DiagnosticEntry>>;
export const REGISTERED_ENTRIES: readonly DiagnosticEntry[];
export const MAX_MESSAGE_FRAGMENT: number;

export function fragment(value: unknown): string;
export function diagnostic(
	entry: DiagnosticEntry,
	options?: {
		message?: string;
		locus?: Diagnostic["locus"];
		causes?: Diagnostic[];
		related?: unknown[];
	},
): Diagnostic;
export function sortDiagnostics(list: readonly Diagnostic[]): Diagnostic[];
export function applyDiagnosticLimit(
	list: readonly Diagnostic[],
	max: number,
): Diagnostic[];
export function hasBlocking(list: readonly Diagnostic[]): boolean;
