// Explicit owner Approval B only; never called by application startup or CI.
// No schema installation, TestUsers changes, Auth activation or test writes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { config, parse } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as query } from "drizzle-orm";
import { tools, reviews, vendorAccess } from "../src/lib/db/schema";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { runtimeDatabaseConfig } from "../src/lib/db/runtime-config";
import {
  state,
  compareTestUsers,
  verifyRecovery,
} from "./execute-approved-installation";

const project = "yfknxidgphhepdtwazhn";
const approvedHash =
  "3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940";
const sha = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
type Client = ReturnType<typeof postgres>;
type Query = (text: string) => Promise<Record<string, unknown>[]>;
const makeQ =
  (tx: { unsafe: (text: string) => PromiseLike<unknown> }): Query =>
  async (text) =>
    JSON.parse(JSON.stringify(await tx.unsafe(text)));
const evidenceA = JSON.parse(
  readFileSync(
    "docs/evidence/supabase-approval-a-installation-2026-10-09.json",
    "utf8",
  ),
);
let stage = "configuration";
let created = false;
let loginEnabled = false;
let switched = false;
let operator: Client | undefined;
let runtime: Client | undefined;
const checks: string[] = [];
const good = (text: string) => {
  checks.push(text);
  console.log(`PASS ${text}`);
};
const minimalEnv = () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
    "ProgramData",
    "ProgramFiles",
    "HOMEDRIVE",
    "HOMEPATH",
  ])
    if (process.env[key]) env[key] = process.env[key];
  return env;
};
export function credential(request: object) {
  assert(
    process.env.AIBEAN_BACKUP_POWERSHELL && process.env.AIBEAN_BACKUP_ROOT,
  );
  const result = spawnSync(
    process.env.AIBEAN_BACKUP_POWERSHELL,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("scripts/private-runtime-credential.ps1"),
      "-Root",
      process.env.AIBEAN_BACKUP_ROOT,
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      env: minimalEnv(),
      maxBuffer: 1024 * 1024,
    },
  );
  assert.equal(result.status, 0);
  assert(!result.error);
  return result.stdout;
}
export async function installed(q: Query) {
  const app = await q(
    "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename<>'TestUsers' ORDER BY tablename",
  );
  assert.deepEqual(app, evidenceA.app);
  const foreignKeys = await q(
    "SELECT n.nspname AS schema_name,c.relname AS table_name,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE k.contype='f' AND n.nspname IN ('public','aibean_private') ORDER BY 1,2,3",
  );
  assert.deepEqual(foreignKeys, evidenceA.foreignKeys);
  const ledger = await q(
    "SELECT hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at",
  );
  assert.deepEqual(ledger, evidenceA.ledger);
  const security = await q(
    "SELECT id,sql_sha256 FROM aibean_private.installations ORDER BY id",
  );
  assert.deepEqual(security, evidenceA.security);
  const policies = await q(
    "SELECT schemaname,tablename,policyname,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','aibean_private') AND tablename<>'TestUsers' ORDER BY 1,2,3",
  );
  assert.deepEqual(policies, evidenceA.policies);
  const group = await q(
    "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='aibean_runtime'",
  );
  assert.deepEqual(group, evidenceA.runtime);
  const forbidden = await q(
    `SELECT c.relname,r.role FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(role) WHERE n.nspname IN ('public','aibean_private','drizzle') AND c.relname NOT IN ('TestUsers','TestUsers_id_seq') AND c.relkind IN ('r','S') AND (CASE WHEN c.relkind='S' THEN has_sequence_privilege(r.role,c.oid,'SELECT,USAGE,UPDATE') ELSE has_table_privilege(r.role,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.role,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') END)`,
  );
  assert.equal(forbidden.length, 0);
  for (const { tablename } of app)
    assert.equal(
      (await q(`SELECT count(*)::int AS count FROM public.${tablename}`))[0]
        .count,
      0,
    );
  assert.equal(
    (
      await q(
        "SELECT count(*)::int AS count FROM aibean_private.user_identities",
      )
    )[0].count,
    0,
  );
  const catalog = await q(
    `SELECT n.nspname,c.relname,c.relkind,c.relowner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'notnull',a.attnotnull,'acl',a.attacl::text,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'[]') AS columns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle','aibean_private') ORDER BY 1,2`,
  );
  return { app, foreignKeys, ledger, security, policies, group, catalog };
}
async function readOperatorState() {
  assert(operator);
  return operator.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      const q = makeQ(tx);
      return { original: await state(q, true), installed: await installed(q) };
    },
  );
}
export async function membership(q: Query, enabled: boolean) {
  const roles = await q(
    "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='aibean_app_login'",
  );
  assert.deepEqual(roles, [
    {
      rolname: "aibean_app_login",
      rolcanlogin: enabled,
      rolinherit: true,
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
    },
  ]);
  const memberships = await q(
    "SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE child.rolname='aibean_app_login' OR parent.rolname='aibean_app_login' ORDER BY 1,2",
  );
  assert.deepEqual(
    memberships.filter((m) => m.child === "aibean_app_login"),
    [
      {
        parent: "aibean_runtime",
        child: "aibean_app_login",
        admin_option: false,
        inherit_option: true,
        set_option: false,
      },
    ],
  );
  // PostgreSQL grants its existing role creator ADMIN, without INHERIT/SET.
  assert(
    memberships
      .filter((m) => m.parent === "aibean_app_login")
      .every(
        (m) =>
          m.child === "postgres" &&
          m.admin_option === true &&
          m.inherit_option === false &&
          m.set_option === false,
      ),
  );
  assert.equal(
    (
      await q(
        "SELECT count(*)::int AS count FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname='aibean_app_login')",
      )
    )[0].count,
    0,
  );
  assert.equal(
    (
      await q(
        "SELECT has_database_privilege('aibean_app_login',current_database(),'CONNECT') AS connect",
      )
    )[0].connect,
    true,
  );
  return { roles, memberships };
}
export async function runtimeSmoke(connectionString: string) {
  const connection = runtimeDatabaseConfig(connectionString);
  let hostnameVerified = false;
  const verify = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (hostname, cert) => {
    const error = verify(hostname, cert);
    if (!error) hostnameVerified = true;
    return error;
  };
  runtime = postgres(connection.connectionString, {
    ...connection.options,
    onnotice: () => {},
    connection: { application_name: "aibean-approved-runtime-b" },
  });
  const orm = drizzle(runtime);
  const detail = await orm.transaction(
    async (tx) => {
      const q: Query = async (text) =>
        JSON.parse(JSON.stringify(await tx.execute(query.raw(text))));
      const [identity] = await q(
        "SELECT current_database() AS database,session_user,current_user,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
      );
      assert.deepEqual(identity, {
        database: "postgres",
        session_user: "aibean_app_login",
        current_user: "aibean_app_login",
        read_only: "on",
        tls: true,
      });
      const role = await membership(q, true);
      const [privileges] = await q(
        "SELECT has_database_privilege(current_user,current_database(),'CREATE') AS database_create,has_schema_privilege(current_user,'public','CREATE') AS public_create,has_schema_privilege(current_user,'aibean_private','CREATE') AS private_create,has_table_privilege(current_user,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relname='users'),'SELECT') AS auth_read,has_table_privilege(current_user,'public.\"TestUsers\"','SELECT') AS testusers_read,has_table_privilege(current_user,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='drizzle' AND c.relname='__drizzle_migrations'),'SELECT') AS ledger_read,has_table_privilege(current_user,'aibean_private.installations','SELECT') AS security_read,has_table_privilege(current_user,'public.users','UPDATE,DELETE,TRUNCATE') AS users_change,has_column_privilege(current_user,'public.users','is_admin','INSERT,UPDATE') AS admin_change,has_column_privilege(current_user,'public.users','is_creator','INSERT,UPDATE') AS creator_change,has_column_privilege(current_user,'public.users','id','INSERT') AS ordinary_user_provision,has_table_privilege(current_user,'public.audit_logs','UPDATE,DELETE,TRUNCATE') AS audit_change,has_table_privilege(current_user,'public.billing_webhook_receipts','UPDATE,DELETE,TRUNCATE') AS billing_history_change,has_table_privilege(current_user,'aibean_private.user_identities','UPDATE,DELETE,TRUNCATE') AS mapping_change",
      );
      assert.equal(privileges.ordinary_user_provision, true);
      assert(
        Object.entries(privileges).every(
          ([key, value]) =>
            key === "ordinary_user_provision" || value === false,
        ),
      );
      const tablePrivileges = [];
      for (const { tablename } of evidenceA.app) {
        assert.equal(
          (await q(`SELECT count(*)::int AS count FROM public.${tablename}`))[0]
            .count,
          0,
        );
        const [p] = await q(
          `SELECT has_table_privilege(current_user,'public.${tablename}','SELECT') AS select,has_table_privilege(current_user,'public.${tablename}','INSERT') AS insert,has_table_privilege(current_user,'public.${tablename}','UPDATE') AS update,has_table_privilege(current_user,'public.${tablename}','DELETE') AS delete,has_table_privilege(current_user,'public.${tablename}','TRUNCATE,REFERENCES,TRIGGER') AS elevated`,
        );
        assert.equal(p.select, true);
        assert.equal(p.elevated, false);
        const appendOnly = ["audit_logs", "billing_webhook_receipts"].includes(
          tablename,
        );
        assert.equal(p.insert, tablename !== "users");
        assert.equal(p.update, !appendOnly && tablename !== "users");
        assert.equal(p.delete, !appendOnly && tablename !== "users");
        tablePrivileges.push({ table: tablename, ...p });
      }
      const [mapping] = await q(
        "SELECT has_table_privilege(current_user,'aibean_private.user_identities','SELECT') AS read,has_table_privilege(current_user,'aibean_private.user_identities','INSERT') AS provision",
      );
      assert.deepEqual(mapping, { read: true, provision: true });
      await tx.select().from(tools).limit(1);
      await tx.select().from(reviews).limit(1);
      await tx.select().from(vendorAccess).limit(1);
      return {
        identity,
        ...role,
        privileges,
        tablePrivileges,
        mapping,
        drizzleCatalogQueriesPassed: true,
      };
    },
    { accessMode: "read only" },
  );
  assert(hostnameVerified);
  const deniedReads = [];
  for (const table of [
    "auth.users",
    'public."TestUsers"',
    "drizzle.__drizzle_migrations",
    "aibean_private.installations",
  ]) {
    let denied = false;
    try {
      await runtime.begin("READ ONLY", async (tx) => {
        await tx.unsafe(`SELECT 1 FROM ${table} WHERE false`);
      });
    } catch (error) {
      denied = (error as { code?: string }).code === "42501";
    }
    assert(denied);
    deniedReads.push(table);
  }
  await runtime.end({ timeout: 5 });
  runtime = undefined;
  return {
    ...detail,
    hostnameVerified,
    deniedReads,
    noPersistentTestWrites: true,
  };
}
async function main() {
  assert(
    process.argv.includes("--preflight-only") ||
      process.argv.includes(`--approval-b-sha256=${approvedHash}`),
  );
  assert.equal(evidenceA.result, "PASS");
  const sqlBytes = readFileSync("db/install/runtime-login-proposal.sql");
  assert.equal(sha(sqlBytes), approvedHash);
  const manifest = JSON.parse(readFileSync("db/install/manifest.json", "utf8"));
  assert.equal(
    sha(readFileSync("db/install/reviewed-installation.sql")),
    manifest.installationSqlSha256,
  );
  for (const entry of manifest.baselineMigrations)
    assert.equal(sha(readFileSync(entry.path)), entry.sha256);
  stage = "recovery-verification";
  const recovery = verifyRecovery();
  good(
    "Encrypted recovery archive verified with private decryption and integrity checks",
  );
  config({ path: ".env.local", quiet: true });
  const originalEnv = readFileSync(".env.local", "utf8");
  const env = parse(originalEnv);
  assert.equal(process.env.DATABASE_URL, env.DATABASE_URL);
  assert.equal(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    `https://${project}.supabase.co`,
  );
  const connection = verifiedDatabaseConfig();
  const url = new URL(connection.connectionString);
  assert.equal(url.hostname, `db.${project}.supabase.co`);
  assert.equal(url.port || "5432", "5432");
  assert.equal(decodeURIComponent(url.username), "postgres");
  let operatorHostnameVerified = false;
  const verify = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (hostname, cert) => {
    const error = verify(hostname, cert);
    if (!error) operatorHostnameVerified = true;
    return error;
  };
  operator = postgres(connection.connectionString, {
    ...connection.options,
    onnotice: () => {},
    connection: { application_name: "aibean-owner-approved-runtime-b" },
  });
  stage = "mandatory-readonly-preflight";
  const before = await readOperatorState();
  assert(operatorHostnameVerified);
  const identity = before.original.data.catalog.identity[0];
  assert.equal(identity.database, "postgres");
  assert.equal(identity.role, "postgres");
  assert.equal(identity.read_only, "on");
  compareTestUsers(recovery.reference, before.original.data);
  assert.deepEqual(before.original.managed.authCounts, [
    { users: 0, identities: 0 },
  ]);
  assert.equal(
    (
      await operator`SELECT count(*)::int AS count FROM pg_roles WHERE rolname='aibean_app_login'`
    )[0].count,
    0,
  );
  const [flags] =
    await operator`SELECT rolcreaterole,rolbypassrls,has_database_privilege(current_database(),'CONNECT') AS connect,current_setting('password_encryption') AS encryption FROM pg_roles WHERE rolname=current_user`;
  assert.equal(flags.rolcreaterole, true);
  assert.equal(flags.rolbypassrls, true);
  assert.equal(flags.connect, true);
  assert.equal(flags.encryption, "scram-sha-256");
  const memberships =
    await operator`SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE parent.rolname='aibean_runtime' OR child.rolname='aibean_runtime' ORDER BY 1,2`;
  assert.deepEqual(
    JSON.parse(JSON.stringify(memberships)),
    evidenceA.memberships,
  );
  good(
    "Exact target, trusted TLS, operator, A objects/history/RLS/grants and two original records verified; runtime login absent",
  );
  if (process.argv.includes("--preflight-only")) {
    console.log("Approval B preflight PASS; no changes performed.");
    return;
  }
  stage = "private-credential-storage";
  assert.equal(
    credential({ mode: "prepare", operatorConnection: env.DATABASE_URL }),
    "OK",
  );
  assert.equal(credential({ mode: "read-operator" }), env.DATABASE_URL);
  const password = credential({ mode: "read-runtime" });
  assert(/^[A-Za-z0-9_-]{64}$/.test(password));
  good(
    "Unique random runtime credential and separate operator connection secured with Windows CurrentUser DPAPI and private ACLs",
  );
  stage = "exact-approved-role-transaction";
  assert.equal(
    sha(readFileSync("db/install/runtime-login-proposal.sql")),
    approvedHash,
  );
  await operator.unsafe(sqlBytes.toString("utf8")).simple();
  created = true;
  await membership(makeQ(operator), false);
  good(
    "Exact B package committed; NOLOGIN restricted membership and inherited CONNECT verified",
  );
  stage = "private-psql-password-provisioning";
  const profile = JSON.parse(
    readFileSync(
      join(process.env.AIBEAN_BACKUP_ROOT!, "preparation.json"),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
  const psqlEnv = {
    ...minimalEnv(),
    PGSSLMODE: "verify-full",
    OSTYPE: "msys", // Verified native prompt fallback to private stdin/stderr.
    PGSSLROOTCERT: process.env.DATABASE_CA_CERT_PATH!,
    PGCONNECT_TIMEOUT: "10",
    PGAPPNAME: "aibean-private-runtime-password",
    PSQL_HISTORY: "NUL",
  };
  // Hidden process has no console. psql's non-echo prompts use the captured pipe.
  // \password performs client-side SCRAM encryption; no raw password SQL.
  const result = spawnSync(
    join(profile.postgresBin, "psql.exe"),
    [
      "-X",
      "-n",
      "-q",
      "-h",
      url.hostname,
      "-p",
      "5432",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-W",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "\\password aibean_app_login",
    ],
    {
      env: psqlEnv,
      input: `${decodeURIComponent(url.password)}\n${password}\n${password}\n`,
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    },
  );
  assert.equal(result.status, 0);
  assert(!result.error);
  assert(
    !result.stdout.includes(password) && !result.stderr.includes(password),
  );
  good(
    "Verified-TLS psql non-echo password workflow completed through private process pipes",
  );
  stage = "enable-exact-runtime-login";
  await operator.unsafe("ALTER ROLE aibean_app_login LOGIN");
  loginEnabled = true;
  await membership(makeQ(operator), true);
  const runtimeUrl = new URL(env.DATABASE_URL);
  runtimeUrl.username = "aibean_app_login";
  runtimeUrl.password = password;
  stage = "fresh-authenticated-runtime-verification";
  const hosted = await runtimeSmoke(runtimeUrl.toString());
  good(
    "New authenticated runtime session passed strict TLS, Drizzle reads, role/grant checks and four actual denied private reads",
  );
  const after = await readOperatorState();
  compareTestUsers(before.original.data, after.original.data);
  assert.deepEqual(after.original.managed, before.original.managed);
  assert.deepEqual(after.installed, before.installed);
  verifyRecovery();
  good(
    "Original TestUsers contents/permissions, all application objects/history and managed metadata preserved",
  );
  stage = "private-application-connection-switch";
  assert.equal(readFileSync(".env.local", "utf8"), originalEnv);
  assert.equal(
    (originalEnv.match(/^\s*(?:export\s+)?DATABASE_URL\s*=/gm) || []).length,
    1,
  );
  const replacement = originalEnv.replace(
    /^\s*(?:export\s+)?DATABASE_URL\s*=.*$/m,
    `DATABASE_URL='${runtimeUrl.toString()}'`,
  );
  const parsedReplacement = parse(replacement);
  assert.equal(parsedReplacement.DATABASE_URL, runtimeUrl.toString());
  const remainingBefore = { ...env };
  delete remainingBefore.DATABASE_URL;
  const remainingAfter = { ...parsedReplacement };
  delete remainingAfter.DATABASE_URL;
  assert.deepEqual(remainingAfter, remainingBefore);
  const temporary = resolve(".env.local.approval-b.tmp");
  try {
    writeFileSync(temporary, replacement, { flag: "wx" });
    renameSync(temporary, ".env.local");
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      /* Preserve the original environment if temporary cleanup fails. */
    }
    throw error;
  }
  switched = true;
  assert.equal(
    parse(readFileSync(".env.local", "utf8")).DATABASE_URL,
    runtimeUrl.toString(),
  );
  const postSwitch = await runtimeSmoke(
    parse(readFileSync(".env.local", "utf8")).DATABASE_URL,
  );
  good(
    "Gitignored application URL switched to runtime only; all other variables/CA unchanged; new Drizzle connection passes",
  );
  writeFileSync(
    "docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json",
    JSON.stringify(
      {
        approval: "B",
        result: "PASS",
        verifiedAt: new Date().toISOString(),
        project,
        database: "postgres",
        sqlSha256: approvedHash,
        hostedLogin: "VERIFIED",
        privileges: "PASS",
        databaseUrlSwitch: "PASS",
        drizzle: "PASS",
        tls: "PASS",
        dataPreservation: "PASS",
        operatorHostnameVerified,
        privateCredentialStorage:
          "Windows CurrentUser DPAPI, private ACLs outside repository/sync folders",
        privatePasswordMethod:
          "psql non-echo password prompts through private pipes; client-side SCRAM",
        operatorConnectionPreservedSeparately: true,
        environmentVariablesExceptDatabaseUrlUnchanged: true,
        archiveReverified: true,
        testUsersPreserved: 2,
        managedMetadataUnchanged: true,
        originalMigrationFilesAndLedgersUnchanged: true,
        authUsers: 0,
        applicationUsers: 0,
        identityMappings: 0,
        approvalCExecuted: false,
        authActivated: false,
        persistentTestRecordsInserted: false,
        hosted,
        postSwitchConnectionVerified: postSwitch.hostnameVerified,
        checks,
        limitations: [
          "No hosted write-path fixtures executed; privilege checks and actual read denials only",
          "Shared runtime RLS relies on server ownership/capability checks",
          "Existing scoped recovery archive covers pre-install TestUsers only; off-device key/recovery remains unverified",
          "MCP OAuth unavailable; direct strict TLS used",
          "Supabase Auth end-user login and provider cutover remain unimplemented",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Approval B hosted login and application configuration PASS; application process/readiness/CI validation follows.",
  );
}
if (process.argv[1]?.endsWith("execute-approved-runtime-login.ts"))
  main()
    .catch(async (error) => {
      if (!created && operator) {
        try {
          await operator.unsafe("ROLLBACK").simple();
        } catch {
          /* Report the failed pre-commit attempt without reconciliation. */
        }
      }
      const code =
        typeof error?.code === "string" && /^[A-Z0-9_]{3,50}$/.test(error.code)
          ? error.code
          : "REDACTED";
      const failure = {
        approvalB: "BLOCKED",
        stage,
        code,
        roleCreationCommitted: created,
        loginEnabled,
        applicationConnectionSwitched: switched,
        automaticReconciliationAttempted: false,
        checks,
      };
      console.error(JSON.stringify(failure));
      writeFileSync(
        "docs/evidence/supabase-approval-b-runtime-login-blocked-2026-10-09.json",
        JSON.stringify(failure, null, 2) + "\n",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await Promise.allSettled([
        operator?.end({ timeout: 5 }),
        runtime?.end({ timeout: 5 }),
      ]);
    });
