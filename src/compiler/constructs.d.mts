export declare const CONSTRUCT_KINDS: readonly string[];
export declare const RECORD_SHAPED_KINDS: readonly string[];
export declare const INSTANCELESS_KINDS: readonly string[];
export declare const IDENTIFIED_KINDS: readonly string[];
export declare const EDGE_KINDS: readonly string[];
export declare function isRecordShaped(kind: unknown): boolean;
export declare function isEnumerationShaped(kind: unknown): boolean;
export declare function isInstanceless(kind: unknown): boolean;
export declare function typeIndex(ir: unknown): Map<string, any>;
export declare function effectiveFields(
	type: unknown,
	byIdentity: Map<string, any>,
): any[];
export declare function identityFieldNames(
	type: unknown,
	byIdentity?: Map<string, any>,
): string[] | undefined;
export declare function renderingView<T>(ir: T): T;
export interface ConstructTransition {
	identity: string;
	from: string;
	to: string;
	trigger: string;
	guard?: string;
	emits: string[];
}
export interface ConstructStep {
	identity: string;
	name: string;
	stepKind: string;
	consumes: string[];
	emits: string[];
}
export interface OperationContract {
	frame?: { modifies: string[]; creates: string[]; deletes: string[] };
	requires?: { language: string; text: string }[];
	ensures?: { language: string; text: string }[];
}
export interface ConstructFacts {
	kind?: string;
	supertypes?: string[];
	abstract?: true;
	identityFields?: string[];
	owner?: string;
	members?: string[];
	occurrenceField?: string;
	equality?: "value";
	immutable?: true;
	states?: string[];
	transitions?: ConstructTransition[];
	steps?: ConstructStep[];
	persists?: string[];
	vocabulary?: { term: string; doc: string }[];
	subsets?: Record<string, string[]>;
	redefines?: Record<string, string>;
	operationContracts?: Record<string, OperationContract>;
}
export declare function constructOf(
	type: unknown,
	byIdentity?: Map<string, any>,
): ConstructFacts | undefined;
export declare function operationContract(
	operation: unknown,
): OperationContract | undefined;
export declare function populationsOf(ir: unknown): {
	identity: string;
	displayName: string;
	members: { typeRef: string; extent: Record<string, unknown> }[];
}[];
export declare function inheritedNameCollisions(
	ir: unknown,
): { pointer: string; name: string }[];
export declare const UNENFORCED_MEMBERS: readonly {
	member: string;
	issue: string;
}[];
export declare function unenforcedMemberPointers(
	ir: unknown,
): Map<string, string>;
export declare function unenforcedMemberAdvisories(
	ir: unknown,
	backend: string,
): {
	code: string;
	severity: string;
	message: string;
	owner: string;
	blocking: boolean;
}[];
