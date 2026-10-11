import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "../supabase/identity";
import { checkAdmin, resultRows } from "./tool-workflows";
import { commerceAvailable, requireCommerceStorage } from "./commerce-storage";
import { adminFilters, type AdminParams } from "./queries";
import type {
  CommerceProduct,
  CommercePayment,
  Subscription,
} from "./commerce-contracts";
export type SubmissionRow = {
  id: string;
  user_id: string;
  status: string;
  proposed: Record<string, unknown>;
  review_reason: string | null;
  tool_id: string | null;
  revision: string;
  paid: boolean;
};
export async function readCommercialAdmin(
  database: IdentityDatabase,
  actor: string,
  kind: "payments" | "subscriptions" | "submissions",
  params: AdminParams,
) {
  const filters = adminFilters(params);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    if (!(await commerceAvailable(tx)))
      return {
        ready: false,
        rows: [] as Record<string, unknown>[],
        total: 0,
        filters,
        products: [] as CommerceProduct[],
      };
    const products = resultRows<CommerceProduct>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.billing_products ORDER BY id`,
      ),
    );
    const table = sql.identifier(
      kind === "payments"
        ? "billing_transactions"
        : kind === "subscriptions"
          ? "commerce_subscriptions"
          : "tool_submissions",
    );
    const from =
      kind === "payments"
        ? sql`FROM (SELECT id,user_id,kind,subject_id,amount,currency,status,stripe_session_id,created_at,updated_at FROM public.billing_transactions UNION ALL SELECT o.id,o.user_id,'claim',o.claim_id,o.amount,o.currency,o.status,o.stripe_session_id,c.created_at,c.created_at FROM public.orders o JOIN public.claim_requests c ON c.id=o.claim_id UNION ALL SELECT id,user_id,'featured',tool_id,amount,currency,CASE WHEN paid_at IS NOT NULL THEN 'paid' ELSE status END,stripe_session_id,created_at,created_at FROM public.featured_placements) r`
        : sql`FROM public.${table} r`;
    const where = sql`WHERE (${filters.status || null}::text IS NULL OR r.status=${filters.status || null}) AND (r.id ILIKE ${"%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%"} OR r.user_id ILIKE ${"%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%"})`;
    const rows = resultRows<Record<string, unknown>>(
      await tx.execute(
        sql`SELECT r.*,r.updated_at::text AS revision,r.created_at::text AS created_at ${kind === "submissions" ? sql`,EXISTS(SELECT 1 FROM public.billing_transactions p WHERE p.kind='submission' AND p.subject_id=r.id AND p.user_id=r.user_id AND p.status='paid') AS paid` : sql``} ${from} ${where} ORDER BY r.created_at DESC,r.id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [total] = resultRows<{ n: number }>(
      await tx.execute(sql`SELECT count(*)::int AS n ${from} ${where}`),
    );
    return { ready: true, rows, total: total.n, filters, products };
  });
}
export async function readOwnCommerce(
  database: IdentityDatabase,
  user: string,
) {
  return database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    const payments = resultRows<CommercePayment>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision,created_at::text FROM public.billing_transactions WHERE user_id=${user} ORDER BY public.billing_transactions.created_at DESC,id LIMIT 50`,
      ),
    );
    const subscriptions = resultRows<Subscription>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision,ends_at::text FROM public.commerce_subscriptions WHERE user_id=${user} ORDER BY created_at DESC,id LIMIT 50`,
      ),
    );
    const submissions = resultRows<SubmissionRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.tool_submissions WHERE user_id=${user} ORDER BY created_at DESC,id LIMIT 50`,
      ),
    );
    const products = resultRows<CommerceProduct>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.billing_products WHERE active=true ORDER BY id`,
      ),
    );
    return { payments, subscriptions, submissions, products };
  });
}
