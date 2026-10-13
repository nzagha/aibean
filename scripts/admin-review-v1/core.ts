// Dedicated package mechanism; no connection, dotenv loading or execution on import.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type postgres from "postgres";
import {
  expandedMetadataPreflight,
  applicationRoleContract,
  recoveryRelations,
  recoveryTables,
  qualifiedRelation,
  type RecoveryQuery,
} from "../expanded-recovery-scope";

export const project = "yfknxidgphhepdtwazhn";
export const sqlPath = "db/proposals/admin-review-v1.sql";
export const sqlSha256 =
  "5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca";
export const catalogPath =
  "db/proposals/admin-review-v1-readiness/catalog.json";
export const reviewTables = [
  "claim_disputes",
  "creator_applications",
  "creator_capability_requests",
  "vendor_edit_requests",
  "verification_requests",
].sort();
export const reviewRelations = [
  ...reviewTables.map((n) => `public.${n}`),
  "aibean_private.admin_review_installations",
].sort();
const names = [...reviewTables, "admin_review_installations"];
export const hash = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
export type Client = ReturnType<typeof postgres>;
export const query =
  (c: { unsafe: (s: string) => PromiseLike<unknown> }): RecoveryQuery =>
  async (s) =>
    JSON.parse(JSON.stringify(await c.unsafe(s)));
export function reviewedSql(approved: string) {
  assert.equal(approved, sqlSha256, "Authorization checksum differs");
  const bytes = readFileSync(sqlPath);
  assert.equal(hash(bytes), sqlSha256, "SQL checksum differs");
  const manifest = JSON.parse(
    readFileSync("db/proposals/admin-review-v1.manifest.json", "utf8"),
  );
  assert.equal(manifest.sqlSha256, sqlSha256);
  assert.equal(manifest.sqlPath, sqlPath);
  return bytes.toString("utf8");
}
export function assertEndpoint(
  host: string,
  port: number,
  database: string,
  role: string,
) {
  assert.equal(host, `db.${project}.supabase.co`);
  assert.equal(port, 5432);
  assert.equal(database, "postgres");
  assert.equal(role, "postgres");
}
export async function identity(q: RecoveryQuery, verified: boolean) {
  const [row] = await q(
    "SELECT current_database() AS database,current_user AS role,session_user AS session_role,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,current_setting('server_version_num')::int AS version",
  );
  assert.equal(row.database, "postgres");
  assert.equal(row.role, "postgres");
  assert.equal(row.session_role, "postgres");
  assert.equal(row.tls, true);
  assert(verified);
  assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
}
export async function inventory(q: RecoveryQuery, installed: boolean) {
  const rows = await q(
    "SELECT n.nspname||'.'||c.relname AS relation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle','aibean_private') AND c.relkind IN ('r','p','S','v','m','f') ORDER BY 1",
  );
  assert.deepEqual(
    rows.map((r) => r.relation).sort(),
    [...recoveryRelations, ...(installed ? reviewRelations : [])].sort(),
    "Unexpected object inventory",
  );
}
const baselineQuery =
  (q: RecoveryQuery): RecoveryQuery =>
  async (s) =>
    (await q(s)).filter(
      (r) =>
        !(
          r.kind !== "routine" &&
          names.includes(
            String(
              r.relation ?? r.object ?? (r.kind === "r" ? r.name : undefined),
            ),
          )
        ),
    );
export async function baseline(q: RecoveryQuery) {
  const metadata = await expandedMetadataPreflight(baselineQuery(q));
  const digests: Record<string, string> = {};
  for (const table of recoveryTables) {
    const [r] = await q(
      `SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS digest FROM ${qualifiedRelation(table)} t`,
    );
    digests[table] = String(r.digest);
  }
  const [old] = await q(
    "SELECT encode(sha256(convert_to(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY id),''),'UTF8')),'hex') AS digest FROM public.\"TestUsers\" t",
  );
  const accounts = await q(
    "SELECT (SELECT count(*)::int FROM auth.users) AS auth_users,(SELECT count(*)::int FROM auth.identities) AS auth_identities",
  );
  assert.deepEqual(accounts, [{ auth_users: 0, auth_identities: 0 }]);
  assert.equal(metadata.counts["public.users"], 0);
  const roles = await applicationRoleContract(q);
  // Managed catalogs only; do not retrieve managed row/function bodies or credentials.
  const managed = await q(
    "SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS digest FROM (SELECT n.nspname,c.relname,c.relkind,c.relowner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname NOT IN ('information_schema','public','drizzle','aibean_private')) t",
  );
  return {
    ...metadata,
    content: digests,
    originalTestUsersDigest: String(old.digest),
    accounts,
    roles,
    managed,
  };
}
export type Baseline = Awaited<ReturnType<typeof baseline>>;
export function compareBaseline(current: Baseline, reference: Baseline) {
  assert.deepEqual(current, reference, "Foundation continuity differs");
}

export async function reviewCatalog(q: RecoveryQuery) {
  const predicate =
    "n.nspname||'.'||c.relname IN (" +
    reviewRelations.map((n) => `'${n}'`).join(",") +
    ")";
  return {
    relations: await q(
      `SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${predicate} ORDER BY 1,2`,
    ),
    columns: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE ${predicate} AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
    ),
    constraints: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition,k.convalidated AS validated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${predicate} ORDER BY 1,2,3`,
    ),
    indexes: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,ic.relname AS name,pg_get_indexdef(i.indexrelid) AS definition,i.indisvalid AS valid,i.indisready AS ready FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class ic ON ic.oid=i.indexrelid WHERE ${predicate} ORDER BY 1,2,3`,
    ),
    policies: await q(
      `SELECT p.schemaname AS schema,p.tablename AS relation,p.policyname AS name,p.permissive,p.roles::text,p.cmd,p.qual,p.with_check FROM pg_policies p WHERE p.schemaname||'.'||p.tablename IN (${reviewRelations.map((n) => `'${n}'`).join(",")}) ORDER BY 1,2,3`,
    ),
    acl: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE ${predicate} ORDER BY 1,2,3,4`,
    ),
    columnAcl: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,t.attname,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable FROM pg_attribute t JOIN pg_class c ON c.oid=t.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE ${predicate} ORDER BY 1,2,3,4,5`,
    ),
    triggers: await q(
      `SELECT n.nspname AS schema,c.relname AS relation,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${predicate} AND NOT t.tgisinternal ORDER BY 1,2,3`,
    ),
  };
}
export async function effectivePermissions(q: RecoveryQuery, role: string) {
  assert(
    [
      "anon",
      "authenticated",
      "service_role",
      "aibean_app_login",
      "aibean_runtime",
    ].includes(role),
  );
  const rows = [];
  for (const relation of reviewRelations) {
    for (const privilege of [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
      "REFERENCES",
      "TRIGGER",
      "MAINTAIN",
    ]) {
      const [r] = await q(
        `SELECT has_table_privilege('${role}','${relation}','${privilege}') AS table_access,${["SELECT", "INSERT", "UPDATE", "REFERENCES"].includes(privilege) ? `has_any_column_privilege('${role}','${relation}','${privilege}')` : "false"} AS column_access`,
      );
      const runtime = role.startsWith("aibean_");
      const expected =
        runtime &&
        (privilege === "SELECT" ||
          (privilege === "INSERT" && relation.startsWith("public.")) ||
          (privilege === "UPDATE" &&
            relation.startsWith("public.") &&
            !relation.endsWith("creator_capability_requests")));
      assert.equal(
        r.table_access,
        expected,
        "Effective table privilege differs",
      );
      assert.equal(
        r.column_access,
        ["SELECT", "INSERT", "UPDATE", "REFERENCES"].includes(privilege) &&
          expected,
        "Effective column privilege differs",
      );
      rows.push({ relation, privilege, allowed: expected });
    }
  }
  return rows;
}
export async function verifyStructure(q: RecoveryQuery) {
  await inventory(q, true);
  const catalog = await reviewCatalog(q),
    expected = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.deepEqual(catalog, expected, "Installed catalog differs");
  assert.deepEqual(
    await q(
      "SELECT package_id,sql_sha256 FROM aibean_private.admin_review_installations ORDER BY package_id",
    ),
    [{ package_id: "admin-review-v1", sql_sha256: sqlSha256 }],
  );
  for (const role of [
    "anon",
    "authenticated",
    "service_role",
    "aibean_runtime",
    "aibean_app_login",
  ])
    await effectivePermissions(q, role);
  await applicationRoleContract(q);
  return {
    tables: 6,
    publicTables: 5,
    rls: 6,
    foreignKeys: catalog.constraints.filter((r) => r.type === "f").length,
    indexes: catalog.indexes.length,
    constraints: catalog.constraints.length,
    policies: catalog.policies.length,
  };
}
export type Context = {
  operator: Client;
  hostnameVerified: () => boolean;
  recovery: () => Promise<Baseline>;
  independent: () => Client;
  runtime: () => Client;
  beforeSql?: () => Promise<void>;
};
export class InstallationFailure extends Error {
  constructor(readonly evidence: Record<string, unknown>) {
    super("Admin review installation stopped; protected details withheld");
  }
}
export function safeCode(e: unknown) {
  const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
  return [
    "42501",
    "P0001",
    "42P07",
    "55P03",
    "57014",
    "40001",
    "23505",
    "08006",
    "08001",
  ].includes(code)
    ? code
    : "REDACTED";
}
export function mayVerifyRollback(e: unknown) {
  // Connection-class errors never prove whether COMMIT reached the server.
  return [
    "42501",
    "P0001",
    "42P07",
    "55P03",
    "57014",
    "40001",
    "23505",
  ].includes(safeCode(e));
}
export async function independentPostflight(ctx: Context, reference: Baseline) {
  const clients = [ctx.independent(), ctx.independent(), ctx.runtime()];
  try {
    const pids = await Promise.all(
      clients.map((c) => c`SELECT pg_backend_pid() AS pid`),
    );
    assert.equal(new Set(pids.map((r) => r[0].pid)).size, 3);
    const result = await clients[0].begin(
      "ISOLATION LEVEL REPEATABLE READ READ ONLY",
      async (tx) => {
        await identity(query(tx), ctx.hostnameVerified());
        compareBaseline(await baseline(query(tx)), reference);
        return verifyStructure(query(tx));
      },
    );
    await clients[1].begin(
      "ISOLATION LEVEL REPEATABLE READ READ ONLY",
      async (tx) => {
        for (const role of ["anon", "authenticated", "service_role"])
          await effectivePermissions(query(tx), role);
      },
    );
    await clients[2].begin("READ ONLY", async (tx) => {
      const q = query(tx);
      const [r] = await q(
        "SELECT current_user AS role,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
      );
      assert.deepEqual(r, { role: "aibean_app_login", tls: true });
      await effectivePermissions(q, "aibean_app_login");
      for (const table of reviewTables)
        await q(`SELECT id FROM public.${table} LIMIT 0`);
      await q(
        "SELECT package_id FROM aibean_private.admin_review_installations LIMIT 0",
      );
    });
    return {
      ...result,
      independentSessions: 3,
      baselinePreserved: true,
      effectiveRoleColumnGrants: true,
    };
  } finally {
    await Promise.allSettled(clients.map((c) => c.end({ timeout: 5 })));
  }
}
export async function installAdminReview(ctx: Context, approved: string) {
  let stage = "package",
    attempted = false,
    committed = false,
    rollback: "NOT_NEEDED" | "VERIFIED" | "UNVERIFIED" = "NOT_NEEDED";
  let pinned: Awaited<ReturnType<Client["reserve"]>> | undefined,
    reference: Baseline | undefined;
  try {
    const sql = reviewedSql(approved);
    stage = "recovery";
    reference = await ctx.recovery();
    stage = "preflight";
    pinned = await ctx.operator.reserve();
    await reservedReadOnly(pinned, async (q) => {
      await identity(q, ctx.hostnameVerified());
      await inventory(q, false);
      compareBaseline(await baseline(q), reference!);
    });
    await ctx.beforeSql?.(); // Test-only code hook; never exposed through CLI/environment.
    stage = "exact-transaction";
    await pinned`SELECT set_config('aibean.review_install_sha256',${sqlSha256},false)`;
    // All statements are one simple-query message; PostgreSQL stops at first error.
    // The reviewed file contains its sole bounded BEGIN/COMMIT; bytes are unaltered.
    attempted = true;
    await pinned.unsafe(sql).simple();
    committed = true;
    pinned.release();
    pinned = undefined;
    stage = "independent-postflight";
    const verified = await independentPostflight(ctx, reference);
    return {
      status: "PASS",
      package: "admin-review-v1",
      sqlSha256,
      attempted,
      commitAcknowledged: true,
      rollback,
      verified,
      hostedAuthActivated: false,
      automaticRetry: false,
    };
  } catch (error) {
    if (attempted && !committed && pinned && mayVerifyRollback(error)) {
      try {
        await pinned.unsafe("ROLLBACK").simple();
        await reservedReadOnly(pinned, async (q) => {
          compareBaseline(await baseline(q), reference!);
          const present = await q(
            "SELECT to_regclass('aibean_private.admin_review_installations') IS NOT NULL AS present",
          );
          if (present[0].present) await verifyStructure(q);
          else await inventory(q, false);
        });
        rollback = "VERIFIED";
      } catch {
        rollback = "UNVERIFIED";
      }
    } else if (attempted && !committed) rollback = "UNVERIFIED";
    throw new InstallationFailure({
      status: "FAIL",
      stage,
      sqlState: safeCode(error),
      attempted,
      commitAcknowledged: committed,
      rollback,
      decision: committed
        ? "REVIEW_FORWARD_FIX_OR_RECOVERY"
        : attempted && rollback === "UNVERIFIED"
          ? "REVIEW_UNKNOWN_COMMIT_STATE"
          : "STOP_NO_RETRY",
      automaticRetry: false,
    });
  } finally {
    pinned?.release();
  }
}
// postgres.js reserved connections expose queries/release, not begin() at runtime.
// Explicit transaction controls keep every check on the reserved verified socket.
async function reservedReadOnly<T>(
  pinned: Awaited<ReturnType<Client["reserve"]>>,
  work: (q: RecoveryQuery) => Promise<T>,
) {
  await pinned
    .unsafe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    .simple();
  try {
    const result = await work(query(pinned));
    await pinned.unsafe("COMMIT").simple();
    return result;
  } catch (e) {
    await pinned.unsafe("ROLLBACK").simple();
    throw e;
  }
}
