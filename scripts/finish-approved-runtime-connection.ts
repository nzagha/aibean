// Continue the existing owner-authorized B after the documented local checker
// correction. No CREATE/ALTER/GRANT, password reset or schema SQL is executed.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { config, parse } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import {
  state,
  verifyRecovery,
  compareTestUsers,
} from "./execute-approved-installation";
import {
  credential,
  installed,
  membership,
  runtimeSmoke,
} from "./execute-approved-runtime-login";

const hash = "3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940";
let client: ReturnType<typeof postgres> | undefined;
let switched = false;
let stage = "read-only-continuation-preflight";
async function main() {
  assert(process.argv.includes(`--approval-b-sha256=${hash}`));
  assert.equal(
    createHash("sha256")
      .update(readFileSync("db/install/runtime-login-proposal.sql"))
      .digest("hex"),
    hash,
  );
  const prior = JSON.parse(
    readFileSync(
      "docs/evidence/supabase-approval-b-runtime-login-blocked-2026-10-09.json",
      "utf8",
    ),
  );
  assert.equal(prior.roleCreationCommitted, true);
  assert.equal(prior.loginEnabled, true);
  assert.equal(prior.applicationConnectionSwitched, false);
  assert.equal(prior.stage, "fresh-authenticated-runtime-verification");
  assert.equal(prior.code, "ERR_ASSERTION");
  const recovery = verifyRecovery();
  config({ path: ".env.local", quiet: true });
  const original = readFileSync(".env.local", "utf8");
  const env = parse(original);
  assert.equal(env.DATABASE_URL, credential({ mode: "read-operator" }));
  assert.equal(process.env.DATABASE_URL, env.DATABASE_URL);
  assert.equal(
    env.NEXT_PUBLIC_SUPABASE_URL,
    "https://yfknxidgphhepdtwazhn.supabase.co",
  );
  const connection = verifiedDatabaseConfig();
  const operatorUrl = new URL(connection.connectionString);
  assert.equal(operatorUrl.hostname, "db.yfknxidgphhepdtwazhn.supabase.co");
  assert.equal(operatorUrl.port || "5432", "5432");
  assert.equal(operatorUrl.username, "postgres");
  let hostnameVerified = false;
  const verify = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (host, cert) => {
    const error = verify(host, cert);
    if (!error) hostnameVerified = true;
    return error;
  };
  client = postgres(connection.connectionString, {
    ...connection.options,
    onnotice: () => {},
    connection: { application_name: "aibean-approved-b-readonly-continuation" },
  });
  const read = () =>
    client!.begin("ISOLATION LEVEL REPEATABLE READ READ ONLY", async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      const q = async (text: string) =>
        JSON.parse(JSON.stringify(await tx.unsafe(text)));
      const observed = await state(q, true);
      compareTestUsers(recovery.reference, observed.data);
      assert.deepEqual(observed.managed.authCounts, [
        { users: 0, identities: 0 },
      ]);
      assert.equal(observed.data.catalog.identity[0].role, "postgres");
      assert.equal(observed.data.catalog.identity[0].database, "postgres");
      return {
        observed,
        app: await installed(q),
        roles: await membership(q, true),
      };
    });
  const before = await read();
  assert(hostnameVerified);
  const runtimeUrl = new URL(env.DATABASE_URL);
  runtimeUrl.username = "aibean_app_login";
  runtimeUrl.password = credential({ mode: "read-runtime" });
  const hosted = await runtimeSmoke(runtimeUrl.toString());
  const after = await read();
  compareTestUsers(before.observed.data, after.observed.data);
  assert.deepEqual(after.observed.managed, before.observed.managed);
  assert.deepEqual(after.app, before.app);
  assert.deepEqual(after.roles, before.roles);
  verifyRecovery();
  console.log(
    "PASS Corrected preservation check, private recovery, A objects/history, login restrictions and new authenticated Drizzle/TLS session",
  );
  stage = "private-application-connection-switch";
  assert.equal(readFileSync(".env.local", "utf8"), original);
  assert.equal(
    (original.match(/^\s*(?:export\s+)?DATABASE_URL\s*=/gm) || []).length,
    1,
  );
  const replacement = original.replace(
    /^\s*(?:export\s+)?DATABASE_URL\s*=.*$/m,
    `DATABASE_URL='${runtimeUrl.toString()}'`,
  );
  const next = parse(replacement);
  assert.equal(next.DATABASE_URL, runtimeUrl.toString());
  const remainingBefore = { ...env };
  delete remainingBefore.DATABASE_URL;
  const remainingAfter = { ...next };
  delete remainingAfter.DATABASE_URL;
  assert.deepEqual(remainingAfter, remainingBefore);
  try {
    writeFileSync(".env.local.approval-b.tmp", replacement, { flag: "wx" });
    renameSync(".env.local.approval-b.tmp", ".env.local");
  } catch (error) {
    try {
      unlinkSync(".env.local.approval-b.tmp");
    } catch {
      /* Retain original environment. */
    }
    throw error;
  }
  switched = true;
  stage = "post-switch-readonly-drizzle";
  const smoke = await runtimeSmoke(
    parse(readFileSync(".env.local", "utf8")).DATABASE_URL,
  );
  const final = await read();
  compareTestUsers(after.observed.data, final.observed.data);
  assert.deepEqual(final.observed.managed, after.observed.managed);
  assert.deepEqual(final.app, after.app);
  assert.deepEqual(final.roles, after.roles);
  console.log(
    "PASS Application URL switched to verified runtime; all other variables/CA unchanged; fresh connection and continuity verified",
  );
  writeFileSync(
    "docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json",
    JSON.stringify(
      {
        approval: "B",
        result: "PASS",
        verifiedAt: new Date().toISOString(),
        project: "yfknxidgphhepdtwazhn",
        database: "postgres",
        sqlSha256: hash,
        hostedLogin: "VERIFIED",
        privileges: "PASS",
        databaseUrlSwitch: "PASS",
        drizzle: "PASS",
        tls: "PASS",
        dataPreservation: "PASS",
        originalProvisioningChecks: prior.checks,
        operatorHostnameVerified: hostnameVerified,
        privateCredentialStorage:
          "Windows CurrentUser DPAPI, private ACLs outside repository/sync folders",
        privatePasswordMethod:
          "Verified-TLS psql non-echo prompts through captured pipes; client-side SCRAM encryption",
        operatorConnectionPreservedSeparately: true,
        environmentVariablesExceptDatabaseUrlUnchanged: true,
        archiveReverified: true,
        testUsersPreserved: 2,
        originalMigrationFilesAndLedgersUnchanged: true,
        observedApplicationTables: 14,
        applicationTablesWithRls: 14,
        expectedForeignKeys: 18,
        drizzleLedgerEntries: 2,
        securityLedgerEntries: 1,
        authUsers: 0,
        applicationUsers: 0,
        identityMappings: 0,
        approvalCExecuted: false,
        authActivated: false,
        persistentTestRecordsInserted: false,
        preservationCheckerCorrection:
          "Normalize only the exact already-approved runtime public USAGE grant on both snapshots; reject all other ACL differences. Initial stop was a local checker false positive, not database drift.",
        continuationNoDatabaseWrites: true,
        hosted,
        postSwitchConnectionVerified: smoke.hostnameVerified,
        postSwitchManagedAndApplicationMetadataUnchanged: true,
        limitations: [
          "No hosted write-path fixtures; privilege metadata and actual denied read statements verified",
          "Shared server runtime relies on visitor ownership/capability checks",
          "Scoped encrypted archive covers pre-install TestUsers only; off-device key/recovery remains unverified",
          "MCP OAuth unavailable; existing direct trusted TLS used",
          "Supabase Auth website activation/provider end-user sessions remain separate",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  prior.resolution =
    "Resolved local ACL comparator false positive under original Approval B; continuation reverified existing login and switched configuration without repeating database writes.";
  writeFileSync(
    "docs/evidence/supabase-approval-b-runtime-login-blocked-2026-10-09.json",
    JSON.stringify(prior, null, 2) + "\n",
  );
  console.log(
    "Approval B database/login/configuration PASS; application and repository validation follows.",
  );
}
main()
  .catch(() => {
    console.error(
      JSON.stringify({
        approvalB: "BLOCKED",
        stage,
        applicationConnectionSwitched: switched,
        automaticReconciliation: false,
        details: "redacted",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client?.end({ timeout: 5 });
  });
