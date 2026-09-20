/** Declarations for the constraint applicability table (FR-029, FR-050). */

export declare const KEYWORD_APPLICABILITY: Readonly<Record<string, string[]>>;
export declare const CONSTRAINT_KEYWORDS: readonly string[];
export declare const EDGE_CATEGORIES: readonly string[];
export declare const CORE_CLAUSE_LANGUAGES: readonly string[];
export declare const NAMESPACED_LANGUAGE: RegExp;

export declare function applies(
	keyword: string,
	kind: string,
	scalar?: string,
): boolean;

export declare function parseEdgeVocabulary(
	source: string,
): Readonly<Record<string, { category: string; inverse: string | undefined }>>;
