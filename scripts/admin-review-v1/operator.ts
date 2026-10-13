// Production transport is fixed to the existing protected operator and TLS target.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../../src/lib/db/tls-config";
import { runtimeDatabaseConfig } from "../../src/lib/db/runtime-config";
import { childEnvironment } from "../execute-expanded-recovery";
import { verifyRecovery } from "../execute-approved-installation";
import {
  project,
  sqlSha256,
  reviewedSql,
  hash,
  assertEndpoint,
  query,
  baseline,
  identity,
  installAdminReview,
  independentPostflight,
  InstallationFailure,
  type Client,
  type Context,
} from "./core";

export const mechanismPath =
  "db/proposals/admin-review-v1-readiness/mechanism.json";
export const mechanismFiles = [
  "scripts/.gitattributes",
  "docs/evidence/.gitattributes",
  "scripts/admin-review-v1/.gitattributes",
  "db/proposals/admin-review-v1-readiness/.gitattributes",
  "scripts/admin-review-v1/core.ts",
  "scripts/admin-review-v1/operator.ts",
  "scripts/admin-review-v1/execute.ts",
  "scripts/admin-review-v1/verify.ts",
  "scripts/admin-review-v1/native-test.ts",
  "scripts/admin-review-v1/prepare.ts",
  "tests/admin-review-installation.test.ts",
  "tests/.gitattributes",
  "db/proposals/admin-review-v1.sql",
  "db/proposals/admin-review-v1.manifest.json",
  "db/proposals/admin-review-v1-readiness/catalog.json",
  "scripts/expanded-recovery-scope.ts",
  "scripts/execute-expanded-recovery.ts",
  "scripts/recovery-diagnostics.ts",
  "scripts/private-expanded-recovery.ps1",
  "scripts/private-backup-crypto.ps1",
  "scripts/private-runtime-credential.ps1",
  "scripts/execute-approved-installation.ts",
  "scripts/execute-scoped-backup.ts",
  "scripts/inspect-public-backup-scope.ts",
  "src/lib/db/tls-config.ts",
  "src/lib/db/connection-config.ts",
  "src/lib/db/runtime-config.ts",
  "src/lib/supabase/config.ts",
  "db/recovery/expanded-recovery-package-v3.json",
  "docs/evidence/supabase-expanded-application-recovery-result.json",
  "docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json",
  "db/install/reviewed-installation.sql",
  "db/install/manifest.json",
  "db/install/identity-and-security.sql",
].sort();
export function inspectMechanism(expected?: string) {
  reviewedSql(sqlSha256);
  const bytes = readFileSync(mechanismPath),
    m = JSON.parse(bytes.toString("utf8"));
  assert.equal(m.packageId, "admin-review-v1-hosted-readiness");
  assert.equal(m.project, project);
  assert.equal(m.database, "postgres");
  assert.equal(m.sqlSha256, sqlSha256);
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
export function protectedRecovery() {
  assert(process.env.AIBEAN_BACKUP_ROOT);
  const root = resolve(process.env.AIBEAN_BACKUP_ROOT);
  const original = verifyRecovery();
  const profile = JSON.parse(
    readFileSync(join(root, "preparation.json"), "utf8").replace(/^\uFEFF/, ""),
  );
  const part = relative(root, resolve(profile.backups));
  assert(part && !part.startsWith("..") && !isAbsolute(part));
  assert.equal(profile.sourceProject, project);
  assert.equal(profile.database, "postgres");
  assert.equal(bridge(root, { mode: "check" }), "OK");
  const evidence = JSON.parse(
    readFileSync(
      "docs/evidence/supabase-expanded-application-recovery-result.json",
      "utf8",
    ),
  );
  assert.equal(evidence.recoveryGate, "PASS");
  assert.equal(
    evidence.packageSha256,
    "00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469",
  );
  assert.equal(evidence.project, project);
  assert.equal(evidence.database, "postgres");
  assert.equal(evidence.sourceAndRestoredPrivateIntegrityMatch, true);
  const receipts = readdirSync(profile.backups).filter((n) =>
    /^expanded-receipt-[a-z0-9-]+\.json$/.test(n),
  );
  assert.equal(receipts.length, 1);
  const receipt = JSON.parse(
    readFileSync(join(profile.backups, receipts[0]), "utf8"),
  );
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.sourceProject, project);
  assert.equal(receipt.sourceDatabase, "postgres");
  assert.equal(receipt.packageSha256, evidence.packageSha256);
  for (const [key, pattern, expected] of [
    [
      "archiveName",
      /^expanded-application-[a-z0-9-]+\.cms$/,
      evidence.encryptedArchiveSha256,
    ],
    [
      "metadataName",
      /^expanded-metadata-[a-z0-9-]+\.cms$/,
      evidence.encryptedMetadataSha256,
    ],
  ] as const) {
    assert(pattern.test(receipt[key]));
    assert.equal(
      hash(readFileSync(join(profile.backups, receipt[key]))),
      expected,
    );
  }
  const archive = Buffer.from(
    bridge(root, { mode: "decrypt", name: receipt.archiveName }),
    "base64",
  );
  try {
    assert.equal(hash(archive), evidence.archiveSha256);
    assert.equal(hash(archive), receipt.archiveSha256);
  } finally {
    archive.fill(0);
  }
  const bytes = Buffer.from(
    bridge(root, { mode: "decrypt", name: receipt.metadataName }),
    "base64",
  );
  try {
    const m = JSON.parse(bytes.toString("utf8"));
    assert.equal(m.sourceProject, project);
    assert.equal(m.sourceDatabase, "postgres");
    assert.equal(m.packageSha256, evidence.packageSha256);
    assert.equal(m.archiveSha256, evidence.archiveSha256);
    assert.equal(
      m.capture.originalTestUsersDigest,
      original.reference.dataDigest,
    );
    return m.capture;
  } finally {
    bytes.fill(0);
  }
}
function transport() {
  const envHash = hash(readFileSync(".env.local"));
  config({ path: ".env.local", quiet: true });
  assert(process.env.AIBEAN_BACKUP_ROOT);
  const url = bridge(
    resolve(process.env.AIBEAN_BACKUP_ROOT),
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
        application_name: "aibean-admin-review-operator",
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
        application_name: "aibean-admin-review-verifier",
        default_transaction_read_only: true,
        statement_timeout: 15000,
        timezone: "UTC",
      },
    });
    connections.push(client);
    return client;
  };
  const current = operator();
  const ctx: Context = {
    operator: current,
    hostnameVerified: () => verified,
    independent: operator,
    runtime,
    recovery: async () => {
      const reference = protectedRecovery();
      return current.begin(
        "ISOLATION LEVEL REPEATABLE READ READ ONLY",
        async (tx) => {
          const q = query(tx);
          await identity(q, verified);
          const now = await baseline(q);
          for (const key of [
            "catalog",
            "counts",
            "sequenceState",
            "ledgers",
            "security",
            "content",
            "originalTestUsersDigest",
          ] as const)
            assert.deepEqual(
              now[key],
              reference[key],
              "Encrypted recovery continuity differs",
            );
          return now;
        },
      );
    },
  };
  return {
    ctx,
    envUnchanged: () => hash(readFileSync(".env.local")) === envHash,
    close: async () => {
      await Promise.allSettled(connections.map((c) => c.end({ timeout: 5 })));
    },
  };
}
export async function operatorCommand(mode: "execute" | "verify") {
  let stage = "offline-gate";
  let commitAcknowledged = false;
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
    const output = `docs/evidence/admin-review-v1-hosted-${mode}-result.json`;
    // An existing execution receipt/failure is an operator review boundary, never auto-retry.
    if (mode === "execute")
      assert(
        !existsSync(output),
        "Existing execution evidence; stop for review",
      );
    stage = "protected-connection";
    t = transport();
    stage = "package-operation";
    const result =
      mode === "execute"
        ? await installAdminReview(t.ctx, authorized!)
        : {
            status: "PASS",
            package: "admin-review-v1",
            readOnly: true,
            verified: await independentPostflight(
              t.ctx,
              await t.ctx.recovery(),
            ),
          };
    commitAcknowledged = mode === "execute";
    stage = "final-preservation";
    inspectMechanism(mechanism);
    protectedRecovery();
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
      (e instanceof InstallationFailure || commitAcknowledged)
    ) {
      const output = "docs/evidence/admin-review-v1-hosted-execute-result.json";
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
