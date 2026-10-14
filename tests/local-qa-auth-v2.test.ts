import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  emailInput,
  passwordInput,
  digest,
} from "../src/lib/local-qa-auth/core";
import { qaDatabaseConfig } from "../src/lib/local-qa-auth/config";
import { accountOverlays } from "../scripts/local-website-qa/account-v2/overlays";
test("Local QA input requires matching approved passwords and synthetic email", () => {
  assert.equal(
    emailInput("  PERSON@LOCAL-AIBEAN.INVALID "),
    "person@local-aibean.invalid",
  );
  for (const email of [
    "not-email",
    "person@example.com",
    "person@local-aibean.invalid\n@evil.invalid",
  ])
    assert.throws(() => emailInput(email));
  assert.doesNotThrow(() =>
    passwordInput("Strong9!Password", "Strong9!Password"),
  );
  for (const password of [
    "short1!",
    "lowercase9!",
    "NoNumbers!",
    "NoSpecial123",
  ])
    assert.throws(() => passwordInput(password, password));
  assert.throws(() => passwordInput("Strong9!Password", "Different9!Password"));
});
test("Versioned local QA proposal binds its canonical source and generated overlays", () => {
  const proposal = JSON.parse(
    readFileSync("db/proposals/local-qa-auth-v2/change-proposal.json", "utf8"),
  );
  assert.equal(proposal.hostedInstallationAuthorized, false);
  assert.equal(proposal.productionSourceReplaced, false);
  const sha = (body: string) =>
    createHash("sha256").update(body.replaceAll("\r\n", "\n")).digest("hex");
  for (const file of proposal.files)
    assert.equal(sha(readFileSync(file.path, "utf8")), file.canonicalLfSha256);
  const overlays = accountOverlays();
  assert.deepEqual(
    Object.keys(overlays).sort(),
    proposal.overlays.map((o: { path: string }) => o.path).sort(),
  );
  for (const overlay of proposal.overlays)
    assert.equal(
      sha(overlays[overlay.path]),
      overlay.generatedCanonicalLfSha256,
    );
});
test("Local account adapter fails before reading files in production or without explicit QA flag", () => {
  assert.throws(
    () =>
      qaDatabaseConfig({
        NODE_ENV: "production",
        AIBEAN_LOCAL_QA_AUTH: "1",
        AIBEAN_LOCAL_ACCEPTANCE_RUN: "a".repeat(32),
      }),
    /development/,
  );
  assert.throws(
    () =>
      qaDatabaseConfig({
        NODE_ENV: "development",
        AIBEAN_LOCAL_ACCEPTANCE_RUN: "a".repeat(32),
      }),
    /explicitly/,
  );
  assert.throws(
    () =>
      qaDatabaseConfig({
        NODE_ENV: "development",
        AIBEAN_LOCAL_QA_AUTH: "1",
        AIBEAN_LOCAL_ACCEPTANCE_RUN: "../hosted",
      }),
    /development/,
  );
  assert.equal(digest("opaque-token").length, 64);
});
test("Generating local overlays preserves every frozen Creator Content source dependency", () => {
  const mechanism = JSON.parse(
    readFileSync(
      "db/proposals/creator-content-v1-readiness/mechanism.json",
      "utf8",
    ),
  );
  const hash = (path: string) =>
    createHash("sha256").update(readFileSync(path)).digest("hex");
  const before = mechanism.files.map((f: { path: string }) => hash(f.path));
  const overlays = accountOverlays();
  assert(overlays["src/lib/password-auth.ts"].includes("qaAuth().identity"));
  assert(overlays["src/app/account/security/page.tsx"]);
  assert(overlays["src/app/local-mailbox/page.tsx"]);
  assert(
    overlays["src/lib/db/local-acceptance-config.ts"].includes(
      "now + 13 * 3600_000",
    ),
  );
  assert.deepEqual(
    mechanism.files.map((f: { path: string }) => hash(f.path)),
    before,
  );
  mechanism.files.forEach((f: { path: string; sha256: string }) =>
    assert.equal(hash(f.path), f.sha256),
  );
});
