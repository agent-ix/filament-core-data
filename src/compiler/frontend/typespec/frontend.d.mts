/** Declarations for the TypeSpec frontend (FR-046). */
import type { FrontendRequest, FrontendResult } from "../../index.d.mts";

export declare const DECORATOR_LIBRARY: string;
export declare const dialect: "typespec";

export declare function run(request: FrontendRequest): Promise<FrontendResult>;
