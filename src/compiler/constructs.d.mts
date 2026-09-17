export type Presence = "required" | "optional" | "forbidden";
export interface ConstructDeclaration {
	identity: string;
	shape: string;
	members: Map<string, Presence>;
	references: Map<string, readonly string[]>;
	rules: readonly string[];
	meaning: string;
}
export declare const CONSTRUCT_VOCABULARY: {
	identities: readonly string[];
	shapes: readonly string[];
	presences: readonly string[];
	members: readonly {
		name: string;
		default: Presence;
		referenceItems?: readonly string[];
	}[];
	rules: readonly { name: string; member: string; presence: Presence }[];
};
export declare const CORE_KINDS: readonly string[];
export declare const SHAPE_RENDERINGS: Readonly<Record<string, string>>;
export declare const IDENTITY_EQUALITIES: Readonly<
	Record<string, string | undefined>
>;
export declare function constructFeatures(prefix?: string): string[];
export declare function isConstructKind(kind: unknown): boolean;
export declare function kindName(kind: unknown): string;
export declare function kindLabel(kind: unknown): string;
export declare function readDeclaration(value: unknown):
	| {
			declaration: ConstructDeclaration;
			pointer?: undefined;
			message?: undefined;
	  }
	| { declaration?: undefined; pointer: string; message: string };
export declare function presenceOf(
	declaration: ConstructDeclaration,
	member: string,
): Presence | undefined;
export declare function rolesOf(
	declaration: ConstructDeclaration,
	member: string,
): readonly string[] | undefined;
export declare function constructOnlyMembers(): string[];
export declare function referenceEntries(
	type: unknown,
	typeAt: string,
	member: string,
): [string, string][];
export declare function constructTable(
	ir: unknown,
): Map<string, ConstructDeclaration>;
export declare function bindConstructs(
	ir: unknown,
): Map<string, ConstructDeclaration>;
export declare function declarationOf(
	node: unknown,
): ConstructDeclaration | undefined;
export declare function adoptDeclaration<T>(target: T, source: unknown): T;
export declare function renderingOf(node: unknown): string | undefined;
export declare function isRecordShaped(node: unknown): boolean;
export declare function isEnumerationShaped(node: unknown): boolean;
export declare function isInstanceless(node: unknown): boolean;
export declare function equalityOf(
	node: unknown,
): "identity" | "value" | undefined;
export declare function admits(node: unknown, member: string): boolean;
export declare function typeIndex(ir: unknown): Map<string, any>;
export declare function effectiveFields(
	type: unknown,
	byIdentity: Map<string, any>,
): any[];
export declare function abstractAncestors(
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
	pre?: { language: string; text: string }[];
	post?: { language: string; text: string }[];
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
