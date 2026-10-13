// Offline seal preparation only; cannot connect to or install a database.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mechanismFiles, mechanismPath, inspectMechanism } from "./operator";
import { hash, project, sqlSha256, reviewedSql } from "./core";
export function prepareMechanism() {
  reviewedSql(sqlSha256);
  const evidence = JSON.parse(
    readFileSync(
      "docs/evidence/admin-operations-v2-native-readiness.json",
      "utf8",
    ),
  );
  assert.equal(evidence.status, "PASS");
  assert.equal(evidence.hostedConnections, 0);
  assert.equal(evidence.sqlSha256, sqlSha256);
  for (const f of evidence.codeHashes)
    assert.equal(
      hash(readFileSync(f.path)),
      f.sha256,
      "Native-tested source changed",
    );
  const m = {
    packageId: "admin-operations-v2-hosted-readiness",
    project,
    database: "postgres",
    sqlSha256,
    sqlPath: "db/proposals/admin-operations-v2/0000_admin_operations.sql",
    scope: { publicTables: 4, privateLedgers: 1 },
    recoveryManifestSha256:
      "00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469",
    status: "LOCAL_READINESS_ONLY_REQUIRES_NEW_OWNER_AUTHORIZATION",
    files: mechanismFiles.map((path) => ({
      path,
      sha256: hash(readFileSync(path)),
    })),
    nativeEvidence: "docs/evidence/admin-operations-v2-native-readiness.json",
  };
  writeFileSync(mechanismPath, JSON.stringify(m, null, 2) + "\n");
  return inspectMechanism();
}
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/admin-operations-v2/prepare.ts")
)
  console.log(JSON.stringify(prepareMechanism()));
