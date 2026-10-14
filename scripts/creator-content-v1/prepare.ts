// Offline seal preparation only; cannot connect to or install a database.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { mechanismFiles, mechanismPath, inspectMechanism } from "./operator";
import { hash, project, sqlSha256, reviewedSql } from "./core";
export function prepareMechanism() {
  reviewedSql(sqlSha256);
  const evidence = JSON.parse(
    readFileSync(
      "docs/evidence/creator-content-v1-native-readiness.json",
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
    packageId: "creator-content-v1-hosted-readiness",
    project,
    database: "postgres",
    sqlSha256,
    sqlPath: "db/proposals/creator-content-v1/reviewed-installation.sql",
    scope: { publicTables: 15, privateLedgers: 1 },
    recoveryManifestSha256:
      "523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb",
    status: "LOCAL_READINESS_ONLY_REQUIRES_NEW_OWNER_AUTHORIZATION",
    files: mechanismFiles.map((path) => ({
      path,
      sha256: hash(readFileSync(path)),
    })),
    nativeEvidence: "docs/evidence/creator-content-v1-native-readiness.json",
  };
  const bytes = JSON.stringify(m, null, 2) + "\n";
  if (existsSync(mechanismPath))
    assert.equal(
      readFileSync(mechanismPath, "utf8"),
      bytes,
      "Refuse resealing changed package",
    );
  else writeFileSync(mechanismPath, bytes, { flag: "wx" });
  return inspectMechanism();
}
if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/creator-content-v1/prepare.ts")
)
  console.log(JSON.stringify(prepareMechanism()));
