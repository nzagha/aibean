// Owner-operated Approval A only. Not called by application startup or CI.
// No runtime login, credentials provisioning, TestUsers grants, seeds or Auth switch.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { snapshot } from "./execute-scoped-backup";

type Query = (text: string) => Promise<Record<string, unknown>[]>;
const project = "yfknxidgphhepdtwazhn";
const approvedHash =
  "72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c";
const validationHash =
  "61466aa36b8a3cf252396580fed0b086fa3d1a51a7c83b850365abeca7120771";
const securityHash =
  "eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a";
const tables = [
  "taxonomy",
  "users",
  "tools",
  "saved_tools",
  "stacks",
  "stack_tools",
  "tool_reviews",
  "vendor_access",
  "claim_requests",
  "orders",
  "featured_placements",
  "billing_webhook_receipts",
  "audit_logs",
  "rate_limits",
].sort();
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const canonical = (rows: Record<string, unknown>[]) =>
  rows.map((row) => JSON.stringify(row)).sort();
let stage = "configuration";
let attempted = false;
let committed = false;
let client: ReturnType<typeof postgres> | undefined;
const checks: string[] = [];
let rollbackVerified: boolean | null = null;
let before: Awaited<ReturnType<typeof state>> | undefined;
const good = (name: string) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};

function privateBridge(root: string, request: object) {
  assert(process.env.AIBEAN_BACKUP_POWERSHELL && process.platform === "win32");
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
  const result = spawnSync(
    process.env.AIBEAN_BACKUP_POWERSHELL,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("scripts/private-backup-crypto.ps1"),
      "-Root",
      root,
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
      env,
    },
  );
  assert.equal(result.status, 0);
  assert(!result.error);
  return result.stdout;
}
function verifyRecovery() {
  assert(process.env.AIBEAN_BACKUP_ROOT);
  const root = resolve(process.env.AIBEAN_BACKUP_ROOT);
  assert.equal(privateBridge(root, { mode: "check" }), "OK");
  const profile = JSON.parse(
    readFileSync(join(root, "preparation.json"), "utf8").replace(/^\uFEFF/, ""),
  );
  assert.equal(resolve(profile.root), root);
  assert.equal(profile.sourceProject, project);
  const part = relative(root, resolve(profile.backups));
  assert(part && !part.startsWith("..") && !isAbsolute(part));
  const receipts = readdirSync(profile.backups).filter((name) =>
    /^public-receipt-[a-z0-9-]+\.json$/.test(name),
  );
  assert.equal(receipts.length, 1);
  const receipt = JSON.parse(
    readFileSync(join(profile.backups, receipts[0]), "utf8"),
  );
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.sourceProject, project);
  assert(/^public-before-install-[a-z0-9-]+\.cms$/.test(receipt.archiveName));
  assert(/^public-metadata-[a-z0-9-]+\.cms$/.test(receipt.metadataName));
  const evidence = JSON.parse(
    readFileSync(
      "docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json",
      "utf8",
    ),
  );
  assert.equal(evidence.recoveryGate, "PASS");
  assert.equal(receipt.archiveSha256, evidence.archiveSha256);
  assert.equal(receipt.ciphertextSha256, evidence.encryptedArchiveSha256);
  assert.equal(
    sha(readFileSync(join(profile.backups, receipt.archiveName))),
    evidence.encryptedArchiveSha256,
  );
  assert.equal(
    sha(readFileSync(join(profile.backups, receipt.metadataName))),
    evidence.encryptedMetadataSha256,
  );
  const archive = Buffer.from(
    privateBridge(root, { mode: "decrypt", name: receipt.archiveName }),
    "base64",
  );
  assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
  assert.equal(sha(archive), evidence.archiveSha256);
  archive.fill(0);
  const metadata = JSON.parse(
    Buffer.from(
      privateBridge(root, { mode: "decrypt", name: receipt.metadataName }),
      "base64",
    ).toString("utf8"),
  );
  assert.equal(metadata.sourceProject, project);
  assert.equal(metadata.sourceDatabase, "postgres");
  assert.equal(metadata.archiveSha256, evidence.archiveSha256);
  return {
    reference: metadata.snapshot,
    archiveSha256: evidence.archiveSha256,
    ciphertextSha256: evidence.encryptedArchiveSha256,
  };
}
function compareTestUsers(
  a: Awaited<ReturnType<typeof snapshot>>,
  b: Awaited<ReturnType<typeof snapshot>>,
) {
  for (const key of [
    "metadata",
    "details",
    "sequence",
    "sequenceState",
    "permission",
    "dataDigest",
  ] as const)
    assert.deepEqual(b[key], a[key]);
  const addedRuntimeUsage = b.acl.filter(
    (row) => row.kind === "schema" && row.grantee === "aibean_runtime",
  );
  if (addedRuntimeUsage.length)
    assert.deepEqual(addedRuntimeUsage, [
      {
        kind: "schema",
        object: "public",
        column: "",
        grantee: "aibean_runtime",
        grantor: "pg_database_owner",
        privilege_type: "USAGE",
        is_grantable: false,
      },
    ]);
  assert.deepEqual(
    canonical(b.acl.filter((row) => !addedRuntimeUsage.includes(row))),
    canonical(a.acl),
  );
  assert.deepEqual(
    b.catalog.schemaAcl.map((row) => row.owner),
    a.catalog.schemaAcl.map((row) => row.owner),
  );
  assert.deepEqual(b.catalog.databaseAcl, a.catalog.databaseAcl);
  assert.deepEqual(b.catalog.defaults, a.catalog.defaults);
}
async function testUsersState(q: Query, installed: boolean) {
  if (!installed) return snapshot(q);
  // Project only the original table/sequence from the expanded public catalog.
  // All added application objects are independently checked by postflight.
  const filtered: Query = async (text) =>
    (await q(text)).filter((row) => {
      if ("kind" in row && "object" in row)
        return (
          row.kind === "schema" ||
          String(row.kind).startsWith("default-") ||
          ["TestUsers", "TestUsers_id_seq"].includes(String(row.object))
        );
      if ("relname" in row)
        return ["TestUsers", "TestUsers_id_seq"].includes(String(row.relname));
      if ("table_name" in row) return row.table_name === "TestUsers";
      if ("tablename" in row) return row.tablename === "TestUsers";
      return true;
    });
  return snapshot(filtered);
}
async function managedState(q: Query) {
  const scope =
    "n.nspname NOT LIKE 'pg_%' AND n.nspname NOT IN ('information_schema','public','drizzle','aibean_private')";
  return {
    schemas: await q(
      `SELECT n.nspname,pg_get_userbyid(n.nspowner) AS owner,n.nspacl::text AS acl FROM pg_namespace n WHERE ${scope} ORDER BY n.nspname`,
    ),
    relations: await q(
      `SELECT n.nspname,c.relname,c.relkind,c.relowner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,c.relreplident,c.relpersistence FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${scope} ORDER BY 1,2`,
    ),
    columns: await q(
      `SELECT n.nspname,c.relname,a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${scope} AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,3`,
    ),
    constraints: await q(
      `SELECT n.nspname,c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${scope} ORDER BY 1,2,3`,
    ),
    policies: await q(
      `SELECT p.schemaname,p.tablename,p.policyname,p.roles::text,p.cmd,p.qual,p.with_check FROM pg_policies p WHERE p.schemaname NOT LIKE 'pg_%' AND p.schemaname NOT IN ('information_schema','public','drizzle','aibean_private') ORDER BY 1,2,3`,
    ),
    routines: await q(
      `SELECT n.nspname,p.oid,p.proname,p.proowner,p.proacl::text,p.prosecdef,p.provolatile,p.prokind,p.prolang,p.prorettype,p.proargtypes::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ${scope} ORDER BY 1,2`,
    ),
    // Mapping's authorized Auth FK creates two internal RI triggers on auth.users.
    // Exclude only those referencing that exact new mapping constraint.
    triggers: await q(
      `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,t.tgfoid,t.tgtype,t.tgconstraint FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${scope} AND NOT (t.tgisinternal AND t.tgconstraint IN (SELECT k.oid FROM pg_constraint k WHERE k.conrelid=to_regclass('aibean_private.user_identities') AND k.confrelid='auth.users'::regclass)) ORDER BY 1,2,3`,
    ),
    extensions: await q(
      "SELECT extname,extowner,extnamespace,extrelocatable,extversion FROM pg_extension ORDER BY extname",
    ),
    roles: await q(
      "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname NOT IN ('aibean_runtime','aibean_app_login') ORDER BY rolname",
    ),
    memberships: await q(
      "SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE parent.rolname NOT IN ('aibean_runtime','aibean_app_login') AND child.rolname NOT IN ('aibean_runtime','aibean_app_login') ORDER BY 1,2",
    ),
    authCounts: await q(
      "SELECT (SELECT count(*)::int FROM auth.users) AS users,(SELECT count(*)::int FROM auth.identities) AS identities",
    ),
    defaultAcl: await q(
      "SELECT n.nspname,pg_get_userbyid(d.defaclrole) AS owner,d.defaclobjtype,d.defaclacl::text FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname NOT IN ('drizzle','aibean_private') ORDER BY 1,2,3",
    ),
  };
}
async function state(q: Query, installed = false) {
  const data = await testUsersState(q, installed);
  const managed = await managedState(q);
  const installation = await q(
    "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS drizzle,to_regclass('aibean_private.installations')::text AS security,to_regclass('aibean_private.user_identities')::text AS mapping,to_regclass('supabase_migrations.schema_migrations')::text AS supabase,(SELECT count(*)::int FROM pg_roles WHERE rolname IN ('aibean_runtime','aibean_app_login')) AS roles",
  );
  return { data, managed, installation };
}
const makeQ =
  (db: { unsafe: (text: string) => PromiseLike<unknown> }): Query =>
  async (text) =>
    JSON.parse(JSON.stringify(await db.unsafe(text)));
async function readState(installed = false) {
  assert(client);
  return client.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      return state(makeQ(tx), installed);
    },
  );
}
async function preflight(reference: Awaited<ReturnType<typeof snapshot>>) {
  stage = "independent-readonly-preflight";
  const observed = await readState();
  compareTestUsers(reference, observed.data);
  assert.deepEqual(
    observed.data.catalog.necessaryRoles,
    reference.catalog.necessaryRoles,
  );
  assert.deepEqual(
    observed.data.catalog.relevantMemberships,
    reference.catalog.relevantMemberships,
  );
  assert.equal(observed.data.catalog.identity[0].database, "postgres");
  assert.equal(observed.data.catalog.identity[0].role, "postgres");
  assert.equal(observed.data.catalog.identity[0].read_only, "on");
  assert.equal(observed.data.catalog.identity[0].tls, true);
  assert.equal(observed.data.catalog.identity[0].server_version, "17.6");
  assert.equal(observed.data.catalog.applicationTables.length, 14);
  assert(
    observed.data.catalog.applicationTables.every(
      (row) => row.relation === null,
    ),
  );
  assert(
    Object.values(observed.installation[0]).every(
      (value) => value === null || value === 0,
    ),
  );
  assert(
    !observed.data.catalog.schemas.some((row) =>
      ["drizzle", "aibean_private"].includes(String(row.nspname)),
    ),
  );
  assert.deepEqual(observed.managed.authCounts, [{ users: 0, identities: 0 }]);
  const operator =
    await client!`SELECT session_user,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,has_database_privilege(current_database(),'CREATE') AS database_create,has_schema_privilege('public','CREATE') AS public_create,has_schema_privilege('auth','USAGE') AS auth_usage,has_table_privilege('auth.users','REFERENCES') AS auth_references FROM pg_roles WHERE rolname=current_user`;
  assert.deepEqual(JSON.parse(JSON.stringify(operator)), [
    {
      session_user: "postgres",
      rolsuper: false,
      rolbypassrls: true,
      rolcreatedb: true,
      rolcreaterole: true,
      rolreplication: true,
      database_create: true,
      public_create: true,
      auth_usage: true,
      auth_references: true,
    },
  ]);
  good(
    "Exact project/database/operator and verified TLS; all prerequisites and original private contents match recovery",
  );
  return observed;
}
async function postflight(validation: string) {
  assert(client && before);
  stage = "reviewed-readonly-validation";
  await client.unsafe(validation).simple();
  good(
    "Unchanged validation-read-only.sql executed in its own read-only transaction",
  );
  stage = "postinstall-independent-assertions";
  const after = await readState(true);
  compareTestUsers(before.data, after.data);
  assert.deepEqual(after.managed, before.managed);
  assert.equal(after.installation[0].supabase, before.installation[0].supabase);
  const detail = await client.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      const q = makeQ(tx);
      const app = await q(
        "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename<>'TestUsers' ORDER BY tablename",
      );
      assert.deepEqual(
        app.map((row) => row.tablename),
        tables,
      );
      assert(app.every((row) => row.rowsecurity === true));
      const foreignKeys = await q(
        "SELECT n.nspname AS schema_name,c.relname AS table_name,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE k.contype='f' AND n.nspname IN ('public','aibean_private') ORDER BY 1,2,3",
      );
      assert.equal(foreignKeys.length, 18);
      const expectedForeignKeys = [
        ...readFileSync(
          "db/install/reviewed-installation.sql",
          "utf8",
        ).matchAll(/ADD CONSTRAINT "([^"]+)" FOREIGN KEY/g),
      ].map((match) => match[1]);
      expectedForeignKeys.push(
        "user_identities_auth_user_id_fkey",
        "user_identities_user_id_fkey",
      );
      assert.deepEqual(
        foreignKeys.map((row) => row.conname).sort(),
        expectedForeignKeys.sort(),
      );
      const mappingConstraints = await q(
        "SELECT contype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='aibean_private.user_identities'::regclass ORDER BY contype,conname",
      );
      assert.deepEqual(mappingConstraints.map((row) => row.contype).sort(), [
        "f",
        "f",
        "p",
        "u",
      ]);
      assert(
        mappingConstraints
          .filter((row) => row.contype === "f")
          .every((row) =>
            String(row.definition).includes(
              "ON UPDATE RESTRICT ON DELETE RESTRICT",
            ),
          ),
      );
      const baseline = JSON.parse(
        readFileSync("db/install/manifest.json", "utf8"),
      ).baselineMigrations;
      const ledger = await q(
        "SELECT hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at",
      );
      assert.deepEqual(
        ledger,
        baseline.map((entry: { sha256: string; createdAt: number }) => ({
          hash: entry.sha256,
          created_at: String(entry.createdAt),
        })),
      );
      const security = await q(
        "SELECT id,sql_sha256 FROM aibean_private.installations ORDER BY id",
      );
      assert.deepEqual(security, [
        { id: "aibean-foundation-v1", sql_sha256: securityHash },
      ]);
      const mapping = await q(
        "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='aibean_private' AND table_name='user_identities' ORDER BY ordinal_position",
      );
      assert.deepEqual(mapping, [
        { column_name: "auth_user_id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "user_id", data_type: "text", is_nullable: "NO" },
        {
          column_name: "created_at",
          data_type: "timestamp with time zone",
          is_nullable: "NO",
        },
      ]);
      const privateRls = await q(
        "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='aibean_private' ORDER BY tablename",
      );
      assert.equal(privateRls.length, 2);
      assert(privateRls.every((row) => row.rowsecurity));
      const policies = await q(
        "SELECT schemaname,tablename,policyname,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','aibean_private') AND tablename<>'TestUsers' ORDER BY 1,2,3",
      );
      assert.equal(policies.length, 16);
      assert(policies.every((row) => row.roles === "{aibean_runtime}"));
      assert.deepEqual(
        policies
          .filter((row) => row.schemaname === "public")
          .map((row) => row.tablename),
        tables,
      );
      assert(
        policies
          .filter((row) => row.schemaname === "public")
          .every(
            (row) =>
              row.policyname === "runtime_service" &&
              row.cmd === "ALL" &&
              row.qual === "true" &&
              row.with_check === "true",
          ),
      );
      const forbidden = await q(
        `SELECT c.relname,r.role FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(role) WHERE n.nspname IN ('public','aibean_private','drizzle') AND c.relname NOT IN ('TestUsers','TestUsers_id_seq') AND c.relkind IN ('r','S') AND (CASE WHEN c.relkind='S' THEN has_sequence_privilege(r.role,c.oid,'SELECT,USAGE,UPDATE') ELSE has_table_privilege(r.role,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.role,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') END)`,
      );
      assert.equal(forbidden.length, 0);
      const publicGrants = await q(
        "SELECT count(*)::int AS count FROM information_schema.table_privileges WHERE table_schema IN ('public','aibean_private','drizzle') AND table_name<>'TestUsers' AND grantee='PUBLIC'",
      );
      assert.equal(publicGrants[0].count, 0);
      const runtime = await q(
        "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname IN ('aibean_runtime','aibean_app_login') ORDER BY rolname",
      );
      assert.deepEqual(runtime, [
        {
          rolname: "aibean_runtime",
          rolcanlogin: false,
          rolsuper: false,
          rolbypassrls: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolreplication: false,
        },
      ]);
      const memberships = await q(
        "SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE parent.rolname='aibean_runtime' OR child.rolname='aibean_runtime' ORDER BY 1,2",
      );
      assert(!memberships.some((row) => row.child === "aibean_runtime"));
      assert(memberships.every((row) => row.child === "postgres"));
      const runtimeRestrictions = await q(
        "SELECT has_database_privilege('aibean_runtime',current_database(),'CREATE') AS database_create,has_schema_privilege('aibean_runtime','public','CREATE') AS public_create,has_schema_privilege('aibean_runtime','aibean_private','CREATE') AS private_create,has_table_privilege('aibean_runtime','auth.users','SELECT') AS auth_read,has_table_privilege('aibean_runtime','public.\"TestUsers\"','SELECT') AS testusers_read,has_table_privilege('aibean_runtime','drizzle.__drizzle_migrations','SELECT') AS ledger_read,has_table_privilege('aibean_runtime','aibean_private.installations','SELECT') AS security_read,has_table_privilege('aibean_runtime','public.users','UPDATE,DELETE,TRUNCATE') AS users_change,has_column_privilege('aibean_runtime','public.users','is_admin','INSERT,UPDATE') AS admin_change,has_column_privilege('aibean_runtime','public.users','is_creator','INSERT,UPDATE') AS creator_change,has_column_privilege('aibean_runtime','public.users','id','INSERT') AS ordinary_user_provision,has_table_privilege('aibean_runtime','public.audit_logs','UPDATE,DELETE,TRUNCATE') AS audit_change,has_table_privilege('aibean_runtime','aibean_private.user_identities','UPDATE,DELETE,TRUNCATE') AS mapping_change",
      );
      assert.equal(runtimeRestrictions[0].ordinary_user_provision, true);
      assert(
        Object.entries(runtimeRestrictions[0]).every(
          ([key, value]) =>
            key === "ordinary_user_provision" || value === false,
        ),
      );
      const counts = [];
      for (const name of tables) {
        const count = (
          await q(`SELECT count(*)::int AS count FROM public.${name}`)
        )[0].count;
        assert.equal(count, 0);
        counts.push({ table: name, count });
      }
      assert.equal(
        (
          await q(
            "SELECT count(*)::int AS count FROM aibean_private.user_identities",
          )
        )[0].count,
        0,
      );
      const managedReferenceTriggers = await q(
        "SELECT count(*)::int AS count FROM pg_trigger t JOIN pg_constraint k ON k.oid=t.tgconstraint WHERE t.tgisinternal AND t.tgrelid='auth.users'::regclass AND k.conrelid='aibean_private.user_identities'::regclass AND k.confrelid='auth.users'::regclass",
      );
      assert.equal(managedReferenceTriggers[0].count, 2);
      return {
        app,
        foreignKeys,
        ledger,
        security,
        mapping,
        mappingConstraints,
        policies,
        privateRls,
        runtime,
        memberships,
        runtimeRestrictions,
        counts,
        authorizedManagedReferenceInternalTriggers: 2,
      };
    },
  );
  good(
    "Fourteen RLS tables, eighteen FKs, exact ledgers/mapping, restricted NOLOGIN group and denied direct client grants",
  );
  good(
    "Original two records/permissions and managed metadata preserved; Auth/application/mapping counts remain zero",
  );
  return detail;
}
async function main() {
  assert(
    process.argv.includes("--preflight-only") ||
      process.argv.includes(`--approval-a-sha256=${approvedHash}`),
  );
  const sqlBytes = readFileSync("db/install/reviewed-installation.sql");
  assert.equal(sha(sqlBytes), approvedHash);
  const validationBytes = readFileSync("db/install/validation-read-only.sql");
  assert.equal(sha(validationBytes), validationHash);
  const manifest = JSON.parse(readFileSync("db/install/manifest.json", "utf8"));
  assert.equal(manifest.installationSqlSha256, approvedHash);
  assert.equal(manifest.securitySqlSha256, securityHash);
  assert.equal(
    sha(readFileSync("db/install/identity-and-security.sql")),
    securityHash,
  );
  for (const entry of manifest.baselineMigrations)
    assert.equal(sha(readFileSync(entry.path)), entry.sha256);
  stage = "private-recovery-reverification";
  const recovery = verifyRecovery();
  good(
    "Retained private encrypted archive/metadata, certificate ACLs, decryption and trusted hashes verified",
  );
  config({ path: ".env.local", quiet: true });
  const environmentHash = sha(readFileSync(".env.local"));
  const verified = verifiedDatabaseConfig();
  const url = new URL(verified.connectionString);
  assert.equal(url.hostname, `db.${project}.supabase.co`);
  assert.equal(url.port || "5432", "5432");
  assert.equal(decodeURIComponent(url.username), "postgres");
  assert.equal(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    `https://${project}.supabase.co`,
  );
  client = postgres(verified.connectionString, {
    ...verified.options,
    onnotice: () => {},
    connection: {
      application_name: "aibean-owner-approved-installation-a",
      timezone: "UTC",
    },
  });
  before = await preflight(recovery.reference);
  if (process.argv.includes("--preflight-only")) {
    console.log("Approval A preflight PASS; installation not attempted.");
    return;
  }
  // Memory-held bytes were hashed; no generation, transaction splitting,
  // substitutions, migrations API or additional hosted installation SQL.
  assert.equal(
    sha(readFileSync("db/install/reviewed-installation.sql")),
    approvedHash,
  );
  stage = "exact-approved-atomic-installation";
  attempted = true;
  await client.unsafe(sqlBytes.toString("utf8")).simple();
  committed = true;
  good("Exact approved bounded atomic SQL transaction committed");
  const detail = await postflight(validationBytes.toString("utf8"));
  assert.equal(sha(readFileSync(".env.local")), environmentHash);
  verifyRecovery();
  good(
    "Encrypted recovery artifacts remain verifiable; private connection/environment unchanged",
  );
  const evidence = {
    approval: "A",
    result: "PASS",
    verifiedAt: new Date().toISOString(),
    sourceProject: project,
    database: "postgres",
    operator: "postgres",
    serverVersion: before.data.catalog.identity[0].server_version,
    tlsCaAndHostnameVerified: true,
    installationSqlSha256: approvedHash,
    validationSqlSha256: validationHash,
    securitySqlSha256: securityHash,
    exactAtomicPackageExecuted: true,
    sourcePreflightReadOnly: true,
    postflightReadOnly: true,
    recoveryArchiveSha256: recovery.archiveSha256,
    encryptedRecoveryArchiveSha256: recovery.ciphertextSha256,
    backupReverifiedBeforeAndAfter: true,
    testUsersBefore: 2,
    testUsersAfter: 2,
    privateTestUsersContentMatched: true,
    testUsersDefinitionsSequenceRlsAndGrantsUnchanged: true,
    managedMetadataUnchangedApartFromAuthorizedMappingRiTriggers: true,
    publicSchemaRuntimeUsageAddedAsApproved: true,
    managedRoutineBodiesAndManagedDataExported: false,
    originalBaselineMigrationsUnchanged: true,
    authUsers: 0,
    authIdentities: 0,
    mappingRows: 0,
    privateConnectionUnchanged: true,
    approvalBExecuted: false,
    approvalCExecuted: false,
    authActivated: false,
    seedsInserted: false,
    checks,
    ...detail,
    limitations: [
      "Runtime group is not an authenticated application login; B remains pending",
      "Shared runtime RLS relies on server visitor ownership/capability checks",
      "Managed metadata compared; unrelated platform row contents not exported or independently hashed",
      "Supabase MCP OAuth unavailable; direct verified TLS PostgreSQL used",
      "Independent-device key and off-device recovery remain unverified",
    ],
  };
  writeFileSync(
    "docs/evidence/supabase-approval-a-installation-2026-10-09.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      approvalA: "PASS",
      applicationTables: 14,
      applicationRlsTables: 14,
      foreignKeys: 18,
      baselineLedgerEntries: 2,
      securityLedgerEntries: 1,
      testUsersPreserved: 2,
      authUsers: 0,
      appUsers: 0,
      runtimeLoginCreated: false,
    }),
  );
}
main()
  .catch(async (error) => {
    if (attempted && !committed && client) {
      try {
        await client.unsafe("ROLLBACK").simple();
        const observed = await readState();
        assert(before);
        compareTestUsers(before.data, observed.data);
        assert.deepEqual(observed.managed, before.managed);
        assert.deepEqual(observed.installation, before.installation);
        rollbackVerified = true;
      } catch {
        rollbackVerified = false;
      }
    }
    const code =
      typeof error?.code === "string" && /^[A-Z0-9_]{3,50}$/.test(error.code)
        ? error.code
        : "REDACTED";
    const failure = {
      approvalA: "FAIL",
      stage,
      code,
      attempted,
      commitAcknowledged: committed,
      rollbackVerified,
      automaticRemediationAttempted: false,
      checks,
    };
    if (attempted)
      writeFileSync(
        "docs/evidence/supabase-approval-a-installation-failure-2026-10-09.json",
        JSON.stringify(failure, null, 2) + "\n",
      );
    console.error(JSON.stringify(failure));
    process.exitCode = 1;
  })
  .finally(async () => {
    await client?.end({ timeout: 5 });
  });
