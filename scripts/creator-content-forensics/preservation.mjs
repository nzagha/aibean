// Offline public-source preservation checks. No dotenv, provider or private profiles.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const sourceCommit = "b66cf738f59e163326be3a66bc5d693fa86f21f0";
const mechanismPath =
  "db/proposals/creator-content-v1-readiness/mechanism.json";
const mechanismSha256 =
  "731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220";
assert.equal(sha(readFileSync(mechanismPath)), mechanismSha256);
const mechanism = JSON.parse(readFileSync(mechanismPath, "utf8"));
assert.equal(mechanism.files.length, 170);
for (const f of mechanism.files)
  assert.equal(sha(readFileSync(f.path)), f.sha256);
const files = [
  "docs/CREATOR_CONTENT_V1_HOSTED_INSTALLATION_RESULT.md",
  "docs/CREATOR_CONTENT_V1_HOSTED_INSTALLATION_READINESS.md",
  ...[
    "authorization-9-acceptance",
    "authorization-9-execution",
    "hosted-execute-result",
    "hosted-verify-result",
    "authorization-9-readonly-catalog-diagnostic",
    "authorization-9-runtime-diagnostic",
    "hosted-attempt",
    "authorization-9-preflight",
    "authorization-9-separate-verification",
    "hosted-ci",
  ].map((n) => `docs/evidence/creator-content-v1-${n}.json`),
];
const originalReceipts = files.map((path) => {
  const bytes = readFileSync(path);
  const original = execFileSync("git", ["show", `${sourceCommit}:${path}`], {
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    sha(bytes),
    sha(original),
    "Original source/evidence bytes differ",
  );
  return { path, sha256: sha(bytes), unchanged: true };
});
// Inspect only the uniquely named public synthetic test namespace created by this
// task. Historical private recovery directories are never opened or enumerated.
const testRoot = resolve("test-results");
let freshTargets = 0;
for (const name of readdirSync(testRoot))
  if (name.startsWith("creator-postflight-forensics-native-")) {
    const dir = join(testRoot, name);
    for (const target of readdirSync(dir, { withFileTypes: true }).filter((d) =>
      d.isDirectory(),
    )) {
      const path = join(dir, target.name);
      assert(existsSync(join(path, "PG_VERSION")));
      assert(
        !existsSync(join(path, "postmaster.pid")),
        "New synthetic target still running",
      );
      freshTargets++;
    }
  }
const result = {
  status: "PASS",
  capturedAt: new Date().toISOString(),
  sourceCommit,
  originalMechanismSha256: mechanismSha256,
  frozenDependencyCount: 170,
  frozenDependenciesUnchanged: true,
  originalReceipts,
  taskOwnedFreshTargetsStoppedAndRetained: freshTargets,
  privateArtifactsAccessed: false,
  hostedConnections: 0,
};
writeFileSync(
  "docs/evidence/creator-content-v1-postflight-preservation.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: "PASS",
    frozenDependencies: 170,
    originalDocuments: files.length,
    freshTargetsStoppedAndRetained: freshTargets,
  }),
);
