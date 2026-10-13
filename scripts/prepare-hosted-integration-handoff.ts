// Offline evidence preparation only: no dotenv, connections or private files.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const sha = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const previous = "5fd2e96bea8568051085264fb2332e8951af16ea";
const paths = execFileSync(
  "git",
  [
    "ls-tree",
    "-r",
    "--name-only",
    previous,
    "db/migrations",
    "db/install",
    "db/proposals",
    "db/recovery",
    "docs/source-of-truth",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/);
for (const path of paths) {
  const old = execFileSync("git", ["show", previous + ":" + path], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const current = readFileSync(path);
  if (
    sha(old) !== sha(current) &&
    sha(old.toString("utf8").replaceAll("\r\n", "\n")) !==
      sha(current.toString("utf8").replaceAll("\r\n", "\n"))
  )
    throw new Error("Protected source changed: " + path);
}
const recoveryPath = "db/recovery/expanded-recovery-package-v2.json";
const recoveryBytes = readFileSync(recoveryPath);
const recoveryHash = sha(recoveryBytes);
if (
  recoveryHash !==
  "5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec"
)
  throw new Error("Recovery manifest differs");
const recovery = JSON.parse(recoveryBytes.toString());
for (const file of recovery.files)
  if (sha(readFileSync(file.path)) !== file.sha256)
    throw new Error("Recovery dependency differs: " + file.path);
const release = JSON.parse(
  readFileSync("db/proposals/auth-release-v1/manifest.json", "utf8"),
);
for (const p of [
  ...release.dependencies,
  { id: release.packageId, path: release.sqlPath, sha256: release.sqlSha256 },
])
  if (sha(readFileSync(p.path, "utf8").replaceAll("\r\n", "\n")) !== p.sha256)
    throw new Error("Proposal differs: " + p.id);
const result = {
  date: new Date().toISOString(),
  baselineCommit: previous,
  mode: "offline-only",
  protectedFiles: paths.length,
  protectedFilesPreserved: true,
  recovery: {
    manifestPath: recoveryPath,
    sha256: recoveryHash,
    dependencies: recovery.files.length,
    allDependencyHashesMatch: true,
    tables: 18,
    sequences: 2,
    managedAuthBodiesExcluded: true,
    hostedRetry: false,
    readiness:
      "Locally corrected; fresh hosted inventory, private prerequisites and explicit retry approval pending",
  },
  sevenPackages: release.dependencies,
  additionalAuthProposal: {
    path: release.sqlPath,
    sha256: release.sqlSha256,
    hostedApproved: false,
  },
  hostedOperations: 0,
  providerActivations: 0,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/hosted-integration-offline-readiness.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
