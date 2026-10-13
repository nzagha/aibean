// Offline versioned manifest preparation only. Never opens private profiles or databases.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  inspectRecoveryPackage,
  recoveryManifestPath,
  requiredRecoveryFiles,
} from "./execute";
import { recoverySha, recoveryRelations } from "./scope";
export function prepareManifest() {
  const nativeFile = "docs/evidence/application-recovery-v4b-native.json";
  if (process.argv.includes("--validated")) {
    const e = JSON.parse(readFileSync(nativeFile, "utf8"));
    assert.equal(e.result, "PASS_SYNTHETIC_EXACT_EXECUTOR");
    assert.equal(e.hostedConnections, 0);
    for (const f of e.codeHashes)
      assert.equal(recoverySha(readFileSync(f.path)), f.sha256);
  }
  const m = {
    packageId: "aibean-application-recovery-v4b",
    targetProject: "yfknxidgphhepdtwazhn",
    database: "postgres",
    scope: recoveryRelations,
    limits: {
      tables: 29,
      sequences: 2,
      archiveBytes: 4194304,
      totalSelectedRecords: 10000,
      authUsers: 0,
      applicationUsers: 0,
      identityMappings: 0,
      reviewRecords: 0,
      testUsers: 2,
    },
    files: requiredRecoveryFiles.map((path) => ({
      path,
      sha256: recoverySha(readFileSync(path)),
    })),
    namespace: "ApplicationRecoveryV4b",
    receiptVersion: 5,
    localTargetDisposition: "STOP_AND_RETAIN_NO_DELETE",
    nativeEvidence: nativeFile,
    status: "LOCAL_PACKAGE_REQUIRES_SEPARATE_EXACT_HASH_HOSTED_AUTHORIZATION",
  };
  writeFileSync(recoveryManifestPath, JSON.stringify(m, null, 2) + "\n");
  return inspectRecoveryPackage();
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/recovery-v4b/prepare.ts"))
  console.log(
    JSON.stringify({
      packageSha256: prepareManifest().packageSha256,
      hostedExecution: false,
    }),
  );
