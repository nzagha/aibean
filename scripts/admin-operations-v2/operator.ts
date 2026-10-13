// Production transport is fixed to the existing protected operator and TLS target.
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../../src/lib/db/tls-config";
import { runtimeDatabaseConfig } from "../../src/lib/db/runtime-config";
import {
  protectedRecovery,
  inspectMechanism as inspectPredecessor,
  mechanismFiles as predecessorFiles,
} from "../admin-review-v1/operator";
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
  installOperations,
  independentPostflight,
  InstallationFailure,
  type Client,
  type Context,
} from "./core";

export const mechanismPath =
  "db/proposals/admin-operations-v2-readiness/mechanism.json";
import { importedDependencies } from "./dependency-inventory";
export const mechanismFiles = [
  ...new Set([
    ...predecessorFiles,
    ...importedDependencies,
    "scripts/admin-operations-v2/dependency-inventory.ts",
    "package.json",
    "package-lock.json",
    "db/install/runtime-login-proposal.sql",
    "db/install/testusers-security-proposal.sql",
    "db/proposals/admin-review-v1-readiness/mechanism.json",
    "db/proposals/admin-operations-v2/0000_admin_operations.sql",
    "db/proposals/admin-operations-v2/manifest.json",
    "db/proposals/admin-operations-v2-readiness/.gitattributes",
    "db/proposals/admin-operations-v2-readiness/catalog.json",
    "scripts/admin-operations-v2/.gitattributes",
    ...["core", "operator", "execute", "verify", "prepare", "native-test"].map(
      (n) => `scripts/admin-operations-v2/${n}.ts`,
    ),
    "tests/admin-operations-installation.test.ts",
    "docs/evidence/admin-review-v1-hosted-execute-result.json",
    "docs/evidence/admin-review-v1-hosted-verify-result.json",
  ]),
].sort();
export function inspectMechanism(expected?: string) {
  reviewedSql(sqlSha256);
  inspectPredecessor(
    "96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b",
  );
  for (const mode of ["execute", "verify"]) {
    const receipt = JSON.parse(
      readFileSync(
        `docs/evidence/admin-review-v1-hosted-${mode}-result.json`,
        "utf8",
      ),
    );
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.project, project);
    assert.equal(receipt.database, "postgres");
    assert.equal(
      receipt.mechanismSha256,
      "96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b",
    );
    if (mode === "execute") {
      assert.equal(receipt.commitAcknowledged, true);
      assert.equal(
        receipt.sqlSha256,
        "5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca",
      );
    } else assert.equal(receipt.readOnly, true);
  }
  const bytes = readFileSync(mechanismPath),
    m = JSON.parse(bytes.toString("utf8"));
  assert.equal(m.packageId, "admin-operations-v2-hosted-readiness");
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
              now.foundation[key],
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
    const output = `docs/evidence/admin-operations-v2-hosted-${mode}-result.json`;
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
        ? await installOperations(t.ctx, authorized!)
        : {
            status: "PASS",
            package: "admin-operations-v2",
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
      const output =
        "docs/evidence/admin-operations-v2-hosted-execute-result.json";
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
