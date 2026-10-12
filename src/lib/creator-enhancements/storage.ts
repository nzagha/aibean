import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/affiliate-creator-v1/manifest.json";
import { resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import { pricingAvailable } from "../pricing/storage";
import { contentAvailable } from "../content/storage";
import { discoveryAvailable } from "../discovery/storage";
import { inspectFileStorage } from "../resources/storage";
import type { IdentityTransaction } from "../supabase/identity";
export async function enhancementsAvailable(tx: IdentityTransaction) {
  if (
    process.env.AIBEAN_AFFILIATE_CREATOR_WORKFLOWS !== "true" ||
    !(await pricingAvailable(tx)) ||
    !(await contentAvailable(tx)) ||
    !(await discoveryAvailable(tx)) ||
    !(await inspectFileStorage(tx))
  )
    return false;
  const [r] = resultRows<{ ready: boolean }>(
    await tx.execute(
      sql`SELECT to_regclass('aibean_private.affiliate_creator_installations') IS NOT NULL AND (SELECT count(*)=8 AND bool_and(relrowsecurity) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )})) AS ready`,
    ),
  );
  if (!r?.ready) return false;
  const [l] = resultRows<{ hash: string }>(
    await tx.execute(
      sql`SELECT sql_sha256 AS hash FROM aibean_private.affiliate_creator_installations WHERE package_id='affiliate-creator-v1'`,
    ),
  );
  if (l?.hash !== manifest.sqlSha256) return false;
  const [g] = resultRows<{ safe: boolean }>(
    await tx.execute(
      sql`SELECT NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN pg_roles r WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )}) AND r.rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AND NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${sql.join(
        manifest.tables.map((t) => sql`${t}`),
        sql`, `,
      )}) AND a.grantee=0) AS safe`,
    ),
  );
  return g?.safe === true;
}
export async function requireEnhancements(tx: IdentityTransaction) {
  if (!(await enhancementsAvailable(tx)))
    throw new AdminWorkflowError(
      "Affiliate and Creator enhancements await their separately approved database package and enablement.",
    );
}
export async function history(
  tx: IdentityTransaction,
  actor: string,
  kind: "profile" | "campaign" | "affiliate",
  entity: string,
  revision: string,
  snapshot: unknown,
) {
  await tx.execute(
    sql`INSERT INTO public.creator_revision_history(id,kind,entity_id,revision,snapshot,actor_id) VALUES(${crypto.randomUUID()},${kind},${entity},${revision},${JSON.stringify(snapshot)}::jsonb,${actor})`,
  );
}
