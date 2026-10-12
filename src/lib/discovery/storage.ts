import { sql } from "drizzle-orm";
import { contentAvailable, requireContentStorage } from "../content/storage";
import { resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import type { IdentityTransaction } from "../supabase/identity";
import manifest from "../../../db/proposals/discovery-v1/manifest.json";
export async function discoveryAvailable(tx: IdentityTransaction) {
  if (
    process.env.AIBEAN_DISCOVERY_WORKFLOWS !== "true" ||
    !(await contentAvailable(tx))
  )
    return false;
  const [inventory] = resultRows<{ ready: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('aibean_private.discovery_installations') IS NOT NULL AND (SELECT count(*)=4 AND bool_and(relrowsecurity) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('saved_comparisons','comparison_tools','account_follows','analytics_events')) AS ready`,
    ),
  );
  if (!inventory?.ready) return false;
  const [ledger] = resultRows<{ hash: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 AS hash FROM aibean_private.discovery_installations WHERE package_id='discovery-v1'`,
    ),
  );
  if (ledger?.hash !== manifest.sqlSha256) return false;
  const [grants] = resultRows<{ safe: boolean }>(
    await tx.execute(
      sql`SELECT NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN pg_roles r WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('saved_comparisons','comparison_tools','account_follows','analytics_events') AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AND NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('saved_comparisons','comparison_tools','account_follows','analytics_events') AND a.grantee=0) AS safe`,
    ),
  );
  return grants?.safe === true;
}
export async function requireDiscovery(tx: IdentityTransaction) {
  await requireContentStorage(tx);
  if (!(await discoveryAvailable(tx)))
    throw new AdminWorkflowError(
      "Account discovery awaits its separately reviewed database package and enablement.",
    );
}
