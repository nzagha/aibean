// Additive local observer inventory, never installation or export authority.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
const canonicalHash = (p: string) =>
  sha(readFileSync(p, "utf8").replaceAll("\r\n", "\n"));
const predecessors = [
  {
    path: "db/proposals/creator-content-v1-readiness/mechanism.json",
    sha256: "731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220",
  },
  {
    path: "db/proposals/local-qa-auth-v2/change-proposal.json",
    sha256: "4949fa4056c93785e788c813676cc53c030a32f2dafaf7443ef2dfcfd29aebe5",
  },
  {
    path: "db/proposals/local-qa-auth-v2/desktop-access-v1.json",
    sha256: "f79f8a578a6e7408084f4cd3217d927d541e98c1ff3ac84681099b563b0aa0ee",
  },
];
for (const p of predecessors)
  assert.equal(sha(readFileSync(p.path)), p.sha256, "Historical seal changed");
const creator = JSON.parse(readFileSync(predecessors[0].path, "utf8"));
assert.equal(creator.files.length, 170);
for (const p of creator.files)
  assert.equal(
    sha(readFileSync(p.path)),
    p.sha256,
    "Frozen Creator dependency changed",
  );
const overlay = JSON.parse(readFileSync(predecessors[1].path, "utf8"));
for (const p of overlay.files)
  assert.equal(
    canonicalHash(p.path),
    p.canonicalLfSha256,
    "Overlay dependency changed",
  );
assert.equal(overlay.files.length, 24);
const desktop = JSON.parse(readFileSync(predecessors[2].path, "utf8"));
for (const p of desktop.files)
  assert.equal(
    canonicalHash(p.path),
    p.canonicalLfSha256,
    "Desktop extension changed",
  );
assert.equal(
  sha(
    readFileSync("db/proposals/creator-content-v1/reviewed-installation.sql"),
  ),
  "ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d",
);
const directory = "scripts/local-website-qa/phase2";
const paths = [
  ...readdirSync(directory).map((p) => directory + "/" + p),
  "tests/local-ui-phase2.test.ts",
].sort();
const inventory = {
  version: "local-ui-acceptance-phase2-v1",
  scope: "LOCAL_SYNTHETIC_OBSERVERS_AND_TESTS_ONLY",
  hostedOperationsAuthorized: false,
  predecessors,
  files: paths.map((path) => ({
    path,
    previousSha256: null,
    canonicalLfSha256: canonicalHash(path),
  })),
};
const manifest = "db/proposals/local-ui-acceptance-phase2-v1.json";
assert(
  ["--write", "--verify"].includes(process.argv[2]) &&
    process.argv.length === 3,
);
if (process.argv[2] === "--write")
  writeFileSync(manifest, JSON.stringify(inventory, null, 2) + "\n");
else
  assert.deepEqual(
    JSON.parse(readFileSync(manifest, "utf8")),
    inventory,
    "Local observer inventory changed",
  );
const result = {
  status: "PASS",
  capturedAt: new Date().toISOString(),
  creatorDependencies: 170,
  overlayDependencies: 24,
  desktopExtension: true,
  observerDependencies: paths.length,
  observerInventorySha256: sha(readFileSync(manifest)),
  historicalSealsUnchanged: true,
  hostedConnections: 0,
};
writeFileSync(
  "docs/evidence/local-ui-phase2-seals.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
