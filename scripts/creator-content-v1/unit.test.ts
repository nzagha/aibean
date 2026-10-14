import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { inspectMechanism } from "./operator";
import { verifyReceipt, recoveryHash } from "./checkpoint";
import {
  assertEndpoint,
  reviewedSql,
  sqlSha256,
  safeCode,
  mayVerifyRollback,
  installContent,
  InstallationFailure,
  type Context,
} from "./core";
test("Creator Content authorizes only frozen package and exact hosted endpoint", () => {
  assert(reviewedSql(sqlSha256).startsWith("-- PROPOSAL ONLY"));
  assert.throws(() => reviewedSql("0".repeat(64)));
  assertEndpoint(
    "db.yfknxidgphhepdtwazhn.supabase.co",
    5432,
    "postgres",
    "postgres",
  );
  for (const a of [
    ["127.0.0.1", 5432, "postgres", "postgres"],
    ["db.other.supabase.co", 5432, "postgres", "postgres"],
    ["db.yfknxidgphhepdtwazhn.supabase.co", 6543, "postgres", "postgres"],
    ["db.yfknxidgphhepdtwazhn.supabase.co", 5432, "other", "postgres"],
    [
      "db.yfknxidgphhepdtwazhn.supabase.co",
      5432,
      "postgres",
      "aibean_app_login",
    ],
  ] as const)
    assert.throws(() => assertEndpoint(a[0], a[1], a[2], a[3]));
});
test("Recovery failure and wrong package stop before a connection or SQL attempt", async () => {
  let touched = 0;
  const ctx = {
    operator: {
      reserve: () => {
        touched++;
        throw Error("secret");
      },
    },
    recovery: () => {
      throw Error("private-record-body");
    },
  } as unknown as Context;
  for (const approved of ["0".repeat(64), sqlSha256])
    await assert.rejects(installContent(ctx, approved), (e: unknown) => {
      assert(e instanceof InstallationFailure);
      assert.equal(e.evidence.attempted, false);
      assert(!JSON.stringify(e.evidence).includes("private-record-body"));
      return true;
    });
  assert.equal(touched, 0);
});
test("Installation diagnostics exclude private messages and arbitrary codes", () => {
  assert.equal(mayVerifyRollback({ code: "08006" }), false);
  assert.equal(mayVerifyRollback({ code: "08001" }), false);
  assert.equal(mayVerifyRollback({ code: "P0001" }), true);
  assert.equal(safeCode({ code: "42501", message: "protected" }), "42501");
  assert.equal(
    safeCode({ code: "private-password", message: "protected" }),
    "REDACTED",
  );
});
test("Dedicated CLI rejects unapproved or mixed commands before private setup", () => {
  for (const [file, args] of [
    ["execute.ts", ["--execute-approved=" + "0".repeat(64)]],
    [
      "verify.ts",
      [
        "--execute-approved=" + sqlSha256,
        "--mechanism-sha256=" + "0".repeat(64),
      ],
    ],
  ] as const) {
    const r = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/creator-content-v1/" + file,
        ...args,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(r.status, 1);
    const result = JSON.parse(r.stderr.trim());
    assert.equal(result.stage, "offline-gate");
    assert.equal(result.commitAcknowledged, false);
  }
});
test("Offline mechanism validates exact dependency set and rejects a foreign seal", () => {
  assert.equal(inspectMechanism().hostedExecution, false);
  assert.throws(() => inspectMechanism("0".repeat(64)));
});
test("Checkpoint receipt must bind the actual successful v4b archive and stopped target", () => {
  const evidence = {
    recoveryGate: "PASS",
    packageSha256: recoveryHash,
    project: "yfknxidgphhepdtwazhn",
    database: "postgres",
    selectedTables: 29,
    selectedSequences: 2,
    archiveEntries: 239,
    archiveSha256: "a".repeat(64),
    encryptedArchiveSha256: "b".repeat(64),
    encryptedMetadataSha256: "c".repeat(64),
  };
  const receipt = {
    version: 5,
    namespace: "v4b",
    status: "PASS",
    packageSha256: recoveryHash,
    sourceProject: evidence.project,
    sourceDatabase: "postgres",
    targetStoppedRetained: true,
    archiveSha256: evidence.archiveSha256,
    ciphertextSha256: evidence.encryptedArchiveSha256,
    metadataCiphertextSha256: evidence.encryptedMetadataSha256,
    archiveName: "v4b-application-synthetic.cms",
    metadataName: "v4b-metadata-synthetic.cms",
  };
  verifyReceipt(receipt, evidence);
  for (const change of [
    { version: 4 },
    { status: "FAIL" },
    { targetStoppedRetained: false },
    { sourceProject: "other" },
    { archiveSha256: "0".repeat(64) },
    { archiveName: "../private.cms" },
  ])
    assert.throws(() => verifyReceipt({ ...receipt, ...change }, evidence));
});
