import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/creator-files-v1/manifest.json";
import { inspectContentStorage } from "../content/storage";
import { resultRows } from "../admin/tool-workflows";
import type { IdentityTransaction } from "../supabase/identity";
import { AdminWorkflowError } from "../admin/contracts";
export async function inspectFileStorage(tx: IdentityTransaction) {
  if (!(await inspectContentStorage(tx))) return false;
  const [exists] = resultRows<{ ready: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('public.resource_files') IS NOT NULL AND to_regclass('aibean_private.files_installations') IS NOT NULL AS ready`,
    ),
  );
  if (!exists?.ready) return false;
  const [history] = resultRows<{ sql_sha256: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 FROM aibean_private.files_installations WHERE package_id='creator-files-v1'`,
    ),
  );
  if (history?.sql_sha256 !== manifest.sqlSha256) return false;
  const [security] = resultRows<{ safe: boolean }>(
    await tx.execute(
      sql`SELECT c.relrowsecurity AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AND NOT EXISTS(SELECT 1 FROM aclexplode(c.relacl) a WHERE a.grantee=0) AS safe FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='resource_files'`,
    ),
  );
  return security?.safe === true;
}
export async function requireFileStorage(tx: IdentityTransaction) {
  if (!(await inspectFileStorage(tx)))
    throw new AdminWorkflowError(
      "Reviewed resource file storage is not installed and validated.",
    );
}
export async function filesAvailable(tx: IdentityTransaction) {
  if (process.env.AIBEAN_RESOURCE_UPLOADS !== "1") return false;
  try {
    return await inspectFileStorage(tx);
  } catch {
    return false;
  }
}
