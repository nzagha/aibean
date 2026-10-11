import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/admin-operations-v2/manifest.json";
import { inspectReviewStorage } from "./review-storage";
import { resultRows } from "./tool-workflows";
import { AdminWorkflowError } from "./contracts";
import type { IdentityTransaction } from "../supabase/identity";
export async function inspectCommerceStorage(tx: IdentityTransaction) {
  if (!(await inspectReviewStorage(tx))) return false;
  const [inventory] = resultRows<{ complete: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('aibean_private.admin_operations_installations') IS NOT NULL AND to_regclass('public.billing_products') IS NOT NULL AND to_regclass('public.billing_transactions') IS NOT NULL AND to_regclass('public.tool_submissions') IS NOT NULL AND to_regclass('public.commerce_subscriptions') IS NOT NULL AS complete`,
    ),
  );
  if (!inventory?.complete) return false;
  const [ledger] = resultRows<{ sql_sha256: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2'`,
    ),
  );
  if (ledger?.sql_sha256 !== manifest.sqlSha256) return false;
  const [security] = resultRows<{ safe: boolean }>(
    await tx.execute(sql`SELECT
    (SELECT count(*)=4 AND bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('billing_products','billing_transactions','tool_submissions','commerce_subscriptions'))
    AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r WHERE n.nspname='public' AND c.relname IN ('billing_products','billing_transactions','tool_submissions','commerce_subscriptions') AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
    AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname='public' AND c.relname IN ('billing_products','billing_transactions','tool_submissions','commerce_subscriptions') AND a.grantee=0) AS safe`),
  );
  return security?.safe === true;
}
export async function requireCommerceStorage(tx: IdentityTransaction) {
  if (!(await inspectCommerceStorage(tx)))
    throw new AdminWorkflowError(
      "The reviewed commercial database package is not installed and validated.",
    );
}
export async function commerceAvailable(tx: IdentityTransaction) {
  if (process.env.AIBEAN_COMMERCE_WORKFLOWS !== "1") return false;
  try {
    return await inspectCommerceStorage(tx);
  } catch {
    return false;
  }
}
