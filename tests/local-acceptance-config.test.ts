import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, X509Certificate } from "node:crypto";
import { localAcceptanceConfig } from "../src/lib/db/local-acceptance-config";
test("synthetic runtime refuses production, expiry, privileged/hosted/wrong database targets and changed trust", () => {
  assert.equal(localAcceptanceConfig({}), null);
  const ca = readFileSync("tests/fixtures/product-acceptance-ca.crt", "utf8");
  const now = Date.parse(new X509Certificate(ca).validFrom) + 60_000;
  const workspace = realpathSync(
    mkdtempSync(join(tmpdir(), "aibean-profile-test-")),
  );
  const run = "1".repeat(32),
    root = join(workspace, "test-results", "product-acceptance-" + run);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "fixture-ca.crt"), ca);
  const connectionString =
    "postgresql://aibean_app_login:" +
    "a".repeat(64) +
    "@127.0.0.1:45123/postgres";
  const manifest = {
    run,
    database: "postgres",
    username: "aibean_app_login",
    expiresAt: now + 3600_000,
    connectionString,
    caSha256: createHash("sha256").update(ca).digest("hex"),
  };
  const save = (change: Record<string, unknown> = {}) =>
    writeFileSync(
      join(root, "runtime.json"),
      JSON.stringify({ ...manifest, ...change }),
    );
  const env = {
    NODE_ENV: "development",
    AIBEAN_LOCAL_ACCEPTANCE_RUN: run,
    DATABASE_URL: connectionString,
  };
  save();
  assert.equal(
    localAcceptanceConfig(env, workspace, now)?.options.ssl.rejectUnauthorized,
    true,
  );
  for (const NODE_ENV of ["production", "test", undefined])
    assert.throws(() =>
      localAcceptanceConfig({ ...env, NODE_ENV }, workspace, now),
    );
  for (const change of [
    { expiresAt: now },
    { expiresAt: now + 3 * 3600_000 },
    { username: "postgres" },
    { database: "other" },
    { run: "2".repeat(32) },
    { caSha256: "0".repeat(64) },
  ]) {
    save(change);
    assert.throws(() => localAcceptanceConfig(env, workspace, now));
  }
  for (const bad of [
    connectionString.replace(
      "127.0.0.1",
      "db.yfknxidgphhepdtwazhn.supabase.co",
    ),
    connectionString.replace("127.0.0.1", "192.168.1.2"),
    connectionString.replace("45123", "5432"),
    connectionString.replace("/postgres", "/other"),
    connectionString.replace("aibean_app_login", "postgres"),
    connectionString + "?sslmode=disable",
  ]) {
    save({ connectionString: bad });
    assert.throws(() =>
      localAcceptanceConfig({ ...env, DATABASE_URL: bad }, workspace, now),
    );
  }
  save();
  assert.throws(() =>
    localAcceptanceConfig(
      { ...env, DATABASE_URL: "mismatched" },
      workspace,
      now,
    ),
  );
  writeFileSync(join(root, "fixture-ca.crt"), ca + "tampered");
  assert.throws(() => localAcceptanceConfig(env, workspace, now));
  writeFileSync(join(root, "fixture-ca.crt"), ca);
  const redirectedRun = "2".repeat(32);
  const redirectedRoot = join(
    workspace,
    "test-results",
    "product-acceptance-" + redirectedRun,
  );
  save({ run: redirectedRun });
  symlinkSync(root, redirectedRoot, "junction");
  assert.throws(() =>
    localAcceptanceConfig(
      { ...env, AIBEAN_LOCAL_ACCEPTANCE_RUN: redirectedRun },
      workspace,
      now,
    ),
  );
});
