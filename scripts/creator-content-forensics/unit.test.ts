import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  diagnostic,
  changedComponents,
  assertSyntheticCheckpoint,
  queryOperation,
} from "./safe-diagnostics";
test("Forensic diagnostics retain safe identifiers without error bodies or record hashes", () => {
  const error = Object.assign(
    new Error("private-password private-record private-path"),
    {
      code: "ERR_ASSERTION",
      actual: { secret: "private-record" },
      stack: "private-secret\n at compareBaseline (private-path:1:1)",
    },
  );
  const result = diagnostic("BASELINE_READ", error);
  assert.equal(result.assertionId, "BASELINE_COMPARISON");
  assert.equal(result.safeCode, "ERR_ASSERTION");
  assert(!JSON.stringify(result).includes("private"));
  assert.equal(
    diagnostic("QUERY", { code: "secret-password" }).safeCode,
    "REDACTED",
  );
  assert.equal(
    diagnostic("QUERY", { code: "57014" }).category,
    "POSTGRES_SQLSTATE",
  );
  assert.equal(
    diagnostic("CONNECT", { code: "CONNECT_TIMEOUT" }).category,
    "TRANSPORT_OR_DRIVER",
  );
  assert.equal(
    diagnostic("private-password", { code: "ERR_ASSERTION" }).operation,
    "UNKNOWN_OPERATION",
  );
  assert.equal(
    diagnostic("RUNTIME_IDENTITY", { code: "ERR_ASSERTION" }).assertionId,
    "RUNTIME_ROLE_TLS_ASSERTION",
  );
});
test("Reference comparison exposes component names only and respects checkpoint boundary", () => {
  const a = {
    foundation: {
      foundation: {
        managed: [{ digest: "private-one" }],
        content: { hidden: "private-one" },
      },
    },
  };
  const b = structuredClone(a);
  b.foundation.foundation.managed[0].digest = "private-two";
  assert.deepEqual(changedComponents(a, b), ["foundation.foundation.managed"]);
  assertSyntheticCheckpoint(a, b);
  b.foundation.foundation.content.hidden = "private-two";
  assert.throws(() => assertSyntheticCheckpoint(a, b));
  assert(!JSON.stringify(changedComponents(a, b)).includes("private"));
});
test("Query observations use fixed operation identifiers, never SQL text", () => {
  assert.equal(
    queryOperation("SELECT has_table_privilege('secret','private','SELECT')"),
    "EFFECTIVE_GRANTS",
  );
  assert.equal(
    queryOperation("SELECT pg_backend_pid() AS pid"),
    "SESSION_PID_PROBE",
  );
  assert.equal(
    queryOperation("private unknown SQL with a password"),
    "OTHER_REVIEWED_QUERY",
  );
});
test("Local forensic package pins new observers and leaves all 170 frozen dependencies unchanged", () => {
  const sha = (b: string | Buffer) =>
    createHash("sha256").update(b).digest("hex");
  const manifest = JSON.parse(
    readFileSync(
      "scripts/creator-content-forensics/diagnostic-package-v1.json",
      "utf8",
    ),
  );
  assert.equal(manifest.hostedExecutionAuthorized, false);
  assert.equal(manifest.files.length, 8);
  for (const f of manifest.files)
    assert.equal(
      sha(readFileSync(f.path, "utf8").replaceAll("\r\n", "\n")),
      f.sha256,
    );
  const bytes = readFileSync(
    "db/proposals/creator-content-v1-readiness/mechanism.json",
  );
  assert.equal(
    sha(bytes),
    "731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220",
  );
  const mechanism = JSON.parse(bytes.toString("utf8"));
  assert.equal(mechanism.files.length, 170);
  for (const f of mechanism.files)
    assert.equal(sha(readFileSync(f.path)), f.sha256);
});
