import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/creator-content-v1/manifest.json";
import { inspectCommerceStorage } from "../admin/commerce-storage";
import { resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import type { IdentityTransaction } from "../supabase/identity";
export async function inspectContentStorage(tx: IdentityTransaction) {
  if (!(await inspectCommerceStorage(tx))) return false;
  const [inventory] = resultRows<{ complete: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('aibean_private.content_installations') IS NOT NULL AND (SELECT count(*)=15 AND bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )})) AS complete`,
    ),
  );
  if (!inventory?.complete) return false;
  const [ledger] = resultRows<{ sql_sha256: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 FROM aibean_private.content_installations WHERE package_id='creator-content-v1'`,
    ),
  );
  if (ledger?.sql_sha256 !== manifest.sqlSha256) return false;
  const [security] = resultRows<{ safe: boolean }>(
    await tx.execute(
      sql`SELECT NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r WHERE n.nspname='public' AND c.relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )}) AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname='public' AND c.relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )}) AND a.grantee=0) AS safe`,
    ),
  );
  return security?.safe === true;
}
export async function requireContentStorage(tx: IdentityTransaction) {
  if (!(await inspectContentStorage(tx)))
    throw new AdminWorkflowError(
      "Reviewed Creator/User content storage is not installed and validated.",
    );
}
export async function contentAvailable(tx: IdentityTransaction) {
  if (process.env.AIBEAN_CONTENT_WORKFLOWS !== "1") return false;
  try {
    return await inspectContentStorage(tx);
  } catch {
    return false;
  }
}
