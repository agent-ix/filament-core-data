import type { CompilerFileHost } from "../host.d.mts";

/** Repository root derived from this module's location. */
export declare const REPO_ROOT: string;
/** The emitted Semantic IR contract version. */
export declare const CONTRACT_IR_VERSION: "2.0.0";
/** Source paths under the declared roots, in stable order. */
export declare function sourceFiles(host: CompilerFileHost, packageRoot: string, manifest: { sourceRoots: string[] }): string[];
/** Selected package identities, versions, imports, and exports. */
export declare function resolvedPackageGraph(resolution: {
  root: { identity: string };
  profile?: { name: string };
  packages: Array<{
    identity: string;
    version: string;
    manifest: { imports?: Array<{ packageIdentity: string }>; exports?: Array<{ typeIdentity: string }> };
  }>;
}): {
  rootPackage: string;
  contractVersion: "2.0.0";
  profile: string | null;
  packages: Array<{ identity: string; version: string; imports: string[]; exports: string[] }>;
};
