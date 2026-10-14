// Local source-overlay change proposal only; not hosted installation authority.
import assert from "node:assert/strict";
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { accountOverlays } from "./overlays";
const path = "db/proposals/local-qa-auth-v2/change-proposal.json";
const sha = (body: string | Buffer) =>
  createHash("sha256").update(body).digest("hex");
const canonical = (body: string) => body.replaceAll("\r\n", "\n");
const originalPath = "db/proposals/creator-content-v1-readiness/mechanism.json";
const original = JSON.parse(readFileSync(originalPath, "utf8"));
assert.equal(
  sha(readFileSync(originalPath)),
  "731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220",
);
for (const file of original.files)
  assert.equal(sha(readFileSync(file.path)), file.sha256);
function walk(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = root + "/" + entry.name;
    return entry.isDirectory() ? walk(child) : [child];
  });
}
const files = [
  ...walk("src/lib/local-qa-auth"),
  ...walk("scripts/local-website-qa/account-v2"),
  ...["auth-page", "mailbox", "security"].map(
    (name) => "src/components/local-qa-" + name + ".tsx",
  ),
  "scripts/local-website-qa/open-test-access.ps1",
  "scripts/local-website-qa/start-account-testing.ps1",
  "scripts/local-website-qa/rotate-test-credentials.ps1",
  "scripts/local-website-qa/start.ps1",
  "scripts/local-website-qa/start.ts",
  "scripts/local-website-qa/stop.ps1",
  "tests/local-qa-auth-v2.test.ts",
]
  .sort()
  .map((file) => ({
    path: file,
    canonicalLfSha256: sha(canonical(readFileSync(file, "utf8"))),
  }));
const overlays = Object.entries(accountOverlays())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([file, body]) => ({
    path: file,
    originalSha256: existsSync(file) ? sha(readFileSync(file)) : null,
    frozenDependency: original.files.some(
      (dependency: { path: string }) => dependency.path === file,
    ),
    generatedCanonicalLfSha256: sha(canonical(body)),
  }));
const expected = {
  version: "local-qa-auth-v2",
  scope: "DEVELOPMENT_SNAPSHOT_ONLY",
  hostedInstallationAuthorized: false,
  productionSourceReplaced: false,
  originalMechanism: {
    path: originalPath,
    sha256: sha(readFileSync(originalPath)),
    verifiedDependencies: original.files.length,
  },
  hashing:
    "New source and generated overlays use canonical LF SHA-256; original frozen dependencies retain exact byte checksums.",
  files,
  overlays,
  validation: [
    "161 automated tests",
    "27 HTTP/native PostgreSQL checks",
    "isolated production build",
    "actual overlay type-check",
    "separate browser record",
  ],
  limitations: [
    "No hosted Supabase Auth verification",
    "Eight-hour default local lease",
    "Finite local TLS certificate validity",
    "Four-persona rotation is explicit and was not performed",
  ],
};
if (process.argv[2] === "--seal") {
  assert(
    !existsSync(path),
    "Existing versioned proposal must not be overwritten",
  );
  mkdirSync(join("db", "proposals", "local-qa-auth-v2"), { recursive: true });
  writeFileSync(path, JSON.stringify(expected, null, 2) + "\n");
} else {
  assert.deepEqual(process.argv.slice(2), ["--verify"]);
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), expected);
}
console.log(
  JSON.stringify({
    status: "PASS",
    proposalSha256: sha(readFileSync(path)),
    dependencies: files.length,
    frozenDependenciesPreserved: original.files.length,
    overlays: overlays.length,
  }),
);
