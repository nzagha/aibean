import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/admin-review-v1.manifest.json";
import type { IdentityTransaction } from "../supabase/identity";
import { AdminWorkflowError } from "./contracts";
import { resultRows } from "./tool-workflows";

export async function inspectReviewStorage(database: IdentityTransaction) {
  const [inventory] = resultRows<{ complete: boolean }>(
    await database.execute(sql`
    SELECT to_regclass('aibean_private.admin_review_installations') IS NOT NULL
      AND to_regclass('public.creator_applications') IS NOT NULL
      AND to_regclass('public.creator_capability_requests') IS NOT NULL
      AND to_regclass('public.vendor_edit_requests') IS NOT NULL
      AND to_regclass('public.verification_requests') IS NOT NULL
      AND to_regclass('public.claim_disputes') IS NOT NULL AS complete`),
  );
  if (!inventory?.complete) return false;
  const [ledger] = resultRows<{ sql_sha256: string }>(
    await database.execute(
      sql`SELECT sql_sha256 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1'`,
    ),
  );
  if (ledger?.sql_sha256 !== manifest.sqlSha256) return false;
  const [security] = resultRows<{ safe: boolean }>(
    await database.execute(sql`
    SELECT (SELECT count(*)=5 AND bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('creator_applications','creator_capability_requests','vendor_edit_requests','verification_requests','claim_disputes'))
      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r
        WHERE n.nspname='public' AND c.relname IN ('creator_applications','creator_capability_requests','vendor_edit_requests','verification_requests','claim_disputes')
        AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a
        WHERE n.nspname='public' AND c.relname IN ('creator_applications','creator_capability_requests','vendor_edit_requests','verification_requests','claim_disputes') AND a.grantee=0)
      AND NOT has_column_privilege(current_user,'public.users','is_creator','UPDATE')
      AND NOT has_column_privilege(current_user,'public.users','is_admin','UPDATE')
      AND NOT has_column_privilege(current_user,'public.users','is_creator','INSERT')
      AND NOT has_column_privilege(current_user,'public.users','is_admin','INSERT')
      AND NOT has_table_privilege(current_user,'public.creator_capability_requests','UPDATE,DELETE,TRUNCATE')
      AND (SELECT count(*)=3 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) AS safe`),
  );
  return security?.safe === true;
}
export async function requireReviewStorage(database: IdentityTransaction) {
  if (!(await inspectReviewStorage(database)))
    throw new AdminWorkflowError(
      "The reviewed Creator/Vendor database package has not been installed or validated.",
    );
}
export async function reviewWorkflowsAvailable(database: IdentityTransaction) {
  if (process.env.AIBEAN_REVIEW_WORKFLOWS !== "1") return false;
  try {
    return await inspectReviewStorage(database);
  } catch {
    return false;
  }
}

export async function creatorPublishingAllowed(
  database: IdentityTransaction,
  id: string,
  flag: boolean,
) {
  if (!flag) return false;
  const [inventory] = resultRows<{ present: boolean }>(
    await database.execute(
      sql`SELECT to_regclass('public.creator_applications') IS NOT NULL AS present`,
    ),
  );
  if (!inventory?.present) return true;
  if (!(await inspectReviewStorage(database))) return false;
  const [application] = resultRows<{ status: string }>(
    await database.execute(
      sql`SELECT status FROM public.creator_applications WHERE user_id=${id}`,
    ),
  );
  return application?.status !== "suspension_requested";
}
