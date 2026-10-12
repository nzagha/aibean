import { sql } from "drizzle-orm";
import type { IdentityTransaction } from "../supabase/identity";
import { resultRows } from "../admin/tool-workflows";
import { inspectCommerceStorage } from "../admin/commerce-storage";
import { AdminWorkflowError } from "../admin/contracts";
import manifest from "../../../db/proposals/pricing-v1/manifest.json";
export async function pricingAvailable(tx: IdentityTransaction) {
  if (process.env.AIBEAN_PRICING_WORKFLOWS !== "true") return false;
  if (!(await inspectCommerceStorage(tx))) return false;
  const [inventory] = resultRows<{ ready: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('aibean_private.pricing_installations') IS NOT NULL AND (SELECT count(*)=5 AND bool_and(relrowsecurity) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('pricing_releases','pricing_quotes','membership_bindings','membership_changes','pricing_refunds')) AS ready`,
    ),
  );
  if (!inventory?.ready) return false;
  const [history] = resultRows<{ sql_sha256: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 FROM aibean_private.pricing_installations WHERE package_id='pricing-v1'`,
    ),
  );
  if (history?.sql_sha256 !== manifest.sqlSha256) return false;
  for (const dependency of manifest.dependencies) {
    const [row] = resultRows<{ sql_sha256: string }>(
      await tx.execute(
        sql`SELECT sql_sha256 FROM aibean_private.${sql.identifier(dependency.ledger)} WHERE package_id=${dependency.id}`,
      ),
    );
    if (row?.sql_sha256 !== dependency.sha256) return false;
  }
  const [grants] = resultRows<{ safe: boolean }>(
    await tx.execute(
      sql`SELECT NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN pg_roles r WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('pricing_releases','pricing_quotes','membership_bindings','membership_changes','pricing_refunds') AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AND NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('pricing_releases','pricing_quotes','membership_bindings','membership_changes','pricing_refunds') AND a.grantee=0) AS safe`,
    ),
  );
  return grants?.safe === true;
}
export async function requirePricing(tx: IdentityTransaction) {
  if (!(await pricingAvailable(tx)))
    throw new AdminWorkflowError(
      "Membership configuration awaits its separately reviewed database package and enablement.",
    );
}
export async function entitlementLock(tx: IdentityTransaction, user: string) {
  if (process.env.AIBEAN_PRICING_WORKFLOWS === "true")
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"entitlements:" + user},0))`,
    );
}
