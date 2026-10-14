// Production transport is fixed to the existing protected operator and TLS target.
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../../src/lib/db/tls-config";
import { runtimeDatabaseConfig } from "../../src/lib/db/runtime-config";
import { inspectMechanism as inspectPredecessor } from "../admin-operations-v2/operator";
import { requiredRecoveryFiles } from "../recovery-v4b/execute";
import { inspectCheckpoint, verifyCheckpointContinuity } from "./checkpoint";
import { withoutContent } from "./core";
import { childEnvironment } from "../execute-expanded-recovery";
import { resolve } from "node:path";
import {
  project,
  sqlSha256,
  reviewedSql,
  hash,
  assertEndpoint,
  query,
  baseline,
  identity,
  installContent,
  independentPostflight,
  InstallationFailure,
  type Client,
  type Context,
} from "./core";

export const mechanismPath =
  "db/proposals/creator-content-v1-readiness/mechanism.json";
import { localDependencies } from "./dependency-inventory";
export const mechanismFiles = [
  ...new Set([
    ...requiredRecoveryFiles,
    ...localDependencies([
      "scripts/creator-content-v1/operator.ts",
      "scripts/creator-content-v1/native-test.ts",
      "scripts/creator-content-v1/prepare.ts",
      "scripts/creator-content-v1/unit.test.ts",
    ]),
    "db/recovery/application-recovery-v4b.json",
    "docs/evidence/application-recovery-v4b-hosted-result.json",
    "docs/evidence/admin-operations-v2-hosted-execute-result.json",
    "docs/evidence/admin-operations-v2-hosted-verify-result.json",
    "db/proposals/creator-content-v1/reviewed-installation.sql",
    "db/proposals/creator-content-v1/manifest.json",
    ...JSON.parse(
      readFileSync("db/proposals/creator-content-v1/manifest.json", "utf8"),
    ).migrations.map((m: { path: string }) => m.path),
    "src/lib/db/content-schema.ts",
    "db/proposals/creator-content-v1-readiness/.gitattributes",
    "db/proposals/creator-content-v1-readiness/catalog.json",
    "scripts/creator-content-v1/.gitattributes",
    ...[
      "core",
      "operator",
      "checkpoint",
      "execute",
      "verify",
      "prepare",
      "native-test",
      "unit.test",
    ].map((n) => `scripts/creator-content-v1/${n}.ts`),
    "docs/evidence/creator-content-v1-native-readiness.json",
  ]),
].sort();
export function inspectMechanism(expected?: string) {
  reviewedSql(sqlSha256);
  inspectPredecessor(
    "31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2",
  );
  for (const mode of ["execute", "verify"]) {
    const receipt = JSON.parse(
      readFileSync(
        `docs/evidence/admin-operations-v2-hosted-${mode}-result.json`,
        "utf8",
      ),
    );
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.project, project);
    assert.equal(receipt.database, "postgres");
    assert.equal(
      receipt.mechanismSha256,
      "31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2",
    );
    if (mode === "execute") {
      assert.equal(receipt.commitAcknowledged, true);
      assert.equal(
        receipt.sqlSha256,
        "1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39",
      );
    } else assert.equal(receipt.readOnly, true);
  }
  const bytes = readFileSync(mechanismPath),
    m = JSON.parse(bytes.toString("utf8"));
  assert.equal(m.packageId, "creator-content-v1-hosted-readiness");
  assert.equal(m.project, project);
  assert.equal(m.database, "postgres");
  assert.equal(m.sqlSha256, sqlSha256);
  assert.equal(
    m.recoveryManifestSha256,
    "523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb",
  );
  if (expected)
    assert.equal(hash(bytes), expected, "Mechanism checksum differs");
  assert.deepEqual(
    m.files.map((f: { path: string }) => f.path).sort(),
    mechanismFiles,
  );
  for (const f of m.files)
    assert.equal(
      hash(readFileSync(f.path)),
      f.sha256,
      "Dependency checksum differs",
    );
  return {
    status: "READY_FOR_REVIEW",
    sqlSha256,
    mechanismSha256: hash(bytes),
    dependencies: m.files.length,
    hostedExecution: false,
  };
}
function bridge(
  root: string,
  request: object,
  file = "scripts/private-backup-crypto.ps1",
) {
  assert(process.platform === "win32");
  assert(process.env.AIBEAN_BACKUP_POWERSHELL);
  const r = spawnSync(
    process.env.AIBEAN_BACKUP_POWERSHELL,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve(file),
      "-Root",
      root,
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
      env: childEnvironment(),
    },
  );
  assert.equal(r.status, 0);
  assert(!r.error);
  return r.stdout;
}
function transport() {
  const envHash = hash(readFileSync(".env.local"));
  config({ path: ".env.local", quiet: true });
  assert(process.env.AIBEAN_BACKUP_ROOT);
  const url = bridge(
    process.env.AIBEAN_BACKUP_ROOT,
    { mode: "read-operator" },
    "scripts/private-runtime-credential.ps1",
  );
  const c = verifiedDatabaseConfig(url),
    u = new URL(c.connectionString);
  assertEndpoint(
    u.hostname,
    Number(u.port || 5432),
    u.pathname.slice(1),
    decodeURIComponent(u.username),
  );
  let verified = false;
  const check = c.options.ssl.checkServerIdentity!;
  c.options.ssl.checkServerIdentity = (h, p) => {
    const e = check(h, p);
    if (!e) verified = true;
    return e;
  };
  const connections: Client[] = [];
  const operator = () => {
    const client = postgres(c.connectionString, {
      ...c.options,
      max: 1,
      prepare: false,
      onnotice: () => {},
      connection: {
        application_name: "aibean-admin-operations-operator",
        timezone: "UTC",
        statement_timeout: 60000,
        lock_timeout: 5000,
        idle_in_transaction_session_timeout: 60000,
      },
    });
    connections.push(client);
    return client;
  };
  const runtime = () => {
    const r = runtimeDatabaseConfig();
    const client = postgres(r.connectionString, {
      ...r.options,
      max: 1,
      prepare: false,
      onnotice: () => {},
      connection: {
        application_name: "aibean-admin-operations-verifier",
        default_transaction_read_only: true,
        statement_timeout: 15000,
        timezone: "UTC",
      },
    });
    connections.push(client);
    return client;
  };
  const checkpoint = inspectCheckpoint(process.env.AIBEAN_BACKUP_ROOT);
  const current = operator();
  const ctx: Context = {
    operator: current,
    hostnameVerified: () => verified,
    independent: operator,
    runtime,
    recovery: async () => {
      return current.begin(
        "ISOLATION LEVEL REPEATABLE READ READ ONLY",
        async (tx) => {
          const q = query(tx);
          await identity(q, verified);
          const now = await baseline(q);
          await verifyCheckpointContinuity(
            withoutContent(q),
            checkpoint.capture,
          );
          checkpoint.preserved();
          return now;
        },
      );
    },
  };
  return {
    ctx,
    preserved: checkpoint.preserved,
    envUnchanged: () => hash(readFileSync(".env.local")) === envHash,
    close: async () => {
      await Promise.allSettled(connections.map((c) => c.end({ timeout: 5 })));
    },
  };
}
export async function operatorCommand(mode: "execute" | "verify") {
  let stage = "offline-gate";
  let commitAcknowledged = false;
  let reservation: string | undefined;
  let t: ReturnType<typeof transport> | undefined;
  try {
    const args = process.argv.slice(2);
    if (args.length === 0 || (args.length === 1 && args[0] === "--inspect")) {
      console.log(JSON.stringify(inspectMechanism()));
      return;
    }
    const authorized = args
      .find((a) => a.startsWith("--execute-approved="))
      ?.slice("--execute-approved=".length);
    const mechanism = args
      .find((a) => a.startsWith("--mechanism-sha256="))
      ?.slice("--mechanism-sha256=".length);
    assert(mechanism && /^[a-f0-9]{64}$/.test(mechanism));
    assert.deepEqual(
      args.slice().sort(),
      (mode === "execute"
        ? [`--execute-approved=${sqlSha256}`, `--mechanism-sha256=${mechanism}`]
        : ["--verify-readonly", `--mechanism-sha256=${mechanism}`]
      ).sort(),
    );
    if (mode === "execute") assert.equal(authorized, sqlSha256);
    inspectMechanism(mechanism);
    assert.equal(
      spawnSync("git", ["branch", "--show-current"], {
        encoding: "utf8",
        windowsHide: true,
      }).stdout.trim(),
      "codex/supabase-foundation",
    );
    const output = `docs/evidence/creator-content-v1-hosted-${mode}-result.json`;
    // An existing execution receipt/failure is an operator review boundary, never auto-retry.
    if (mode === "execute")
      assert(
        !existsSync(output),
        "Existing execution evidence; stop for review",
      );
    if (mode === "execute") {
      reservation = "docs/evidence/creator-content-v1-hosted-attempt.json";
      writeFileSync(
        reservation,
        JSON.stringify({
          status: "ATTEMPT_RESERVED",
          mechanismSha256: mechanism,
          sqlSha256,
          automaticRetry: false,
        }) + "\n",
        { flag: "wx" },
      );
    }
    stage = "protected-connection";
    t = transport();
    stage = "package-operation";
    const result =
      mode === "execute"
        ? await installContent(t.ctx, authorized!)
        : {
            status: "PASS",
            package: "creator-content-v1",
            readOnly: true,
            verified: await independentPostflight(
              t.ctx,
              await t.ctx.recovery(),
            ),
          };
    commitAcknowledged = mode === "execute";
    stage = "final-preservation";
    inspectMechanism(mechanism);
    t.preserved();
    assert(t.envUnchanged());
    const evidence = {
      ...result,
      mechanismSha256: mechanism,
      project,
      database: "postgres",
      verifiedAt: new Date().toISOString(),
      privateEnvironmentUnchanged: true,
    };
    writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n", {
      flag: mode === "execute" ? "wx" : "w",
    });
    console.log(JSON.stringify(evidence));
  } catch (e) {
    const result =
      e instanceof InstallationFailure
        ? e.evidence
        : {
            status: "FAIL",
            stage,
            details: "Protected details withheld; stop for operator review",
            commitAcknowledged,
            decision: commitAcknowledged
              ? "REVIEW_FORWARD_FIX_OR_RECOVERY"
              : "STOP_NO_RETRY",
            automaticRetry: false,
          };
    if (
      mode === "execute" &&
      (reservation || e instanceof InstallationFailure || commitAcknowledged)
    ) {
      const output =
        "docs/evidence/creator-content-v1-hosted-execute-result.json";
      if (!existsSync(output))
        writeFileSync(output, JSON.stringify(result, null, 2) + "\n", {
          flag: "wx",
        });
    }
    console.error(JSON.stringify(result));
    process.exitCode = 1;
  } finally {
    await t?.close();
  }
}
