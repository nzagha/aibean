import { sql } from "drizzle-orm";
import type { IdentityTransaction } from "../supabase/identity";
import { resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import type { ProductKind, CommercePayment } from "../admin/commerce-contracts";
import { entitlements } from "./entitlements";
import { requirePricing } from "./storage";
import { type PlanId } from "./config";
export type PlanSelection = { planId?: PlanId; interval?: "month" | "year" };
export async function commercialQuote(
  tx: IdentityTransaction,
  user: string,
  kind: ProductKind,
  selection: PlanSelection,
) {
  await requirePricing(tx);
  const e = await entitlements(tx, user),
    r = e.active;
  if (!r || process.env.AIBEAN_PRICING_APPROVED_SHA256 !== r.config_sha256)
    throw new AdminWorkflowError(
      "Proposed prices are preview only. Separate owner approval and verified sandbox activation are required.",
    );
  if (kind.endsWith("_subscription")) {
    const planId =
      kind === "creator_subscription" ? "creator_pro" : "vendor_pro";
    if (
      selection.planId !== planId ||
      !["month", "year"].includes(selection.interval || "")
    )
      throw new AdminWorkflowError(
        "Choose the matching Pro plan and billing interval.",
      );
    const p = r.config.plans.find((p) => p.id === planId)!;
    return {
      release: r,
      base: selection.interval === "year" ? p.annual : p.monthly,
      discount: 0,
      amount: selection.interval === "year" ? p.annual : p.monthly,
      plans: [planId],
      planId,
      interval: selection.interval!,
      priceId: r.provider_prices[planId + "_" + selection.interval],
    };
  }
  const base = r.config.fees[kind as "submission" | "edit" | "verification"],
    bps = e.discounts[kind as "submission" | "edit" | "verification"],
    discount = Math.floor((base * bps) / 10000);
  return {
    release: r,
    base,
    discount,
    amount: base - discount,
    plans: e.plans.map((p) => p.id),
    planId: null,
    interval: null,
    priceId: null,
  };
}
export async function persistQuote(
  tx: IdentityTransaction,
  payment: string,
  user: string,
  q: Awaited<ReturnType<typeof commercialQuote>>,
) {
  await tx.execute(
    sql`INSERT INTO public.pricing_quotes(payment_id,user_id,release_id,plan_id,interval,base,discount,amount,beneficiary_plans,config_sha256) VALUES(${payment},${user},${q.release.id},${q.planId},${q.interval},${q.base},${q.discount},${q.amount},${JSON.stringify(q.plans)}::jsonb,${q.release.config_sha256})`,
  );
}
export async function bindMembership(
  tx: IdentityTransaction,
  payment: CommercePayment,
  subscriptionId: string,
) {
  if (process.env.AIBEAN_PRICING_WORKFLOWS !== "true") return;
  await requirePricing(tx);
  const [q] = resultRows<{
    release_id: string;
    plan_id: PlanId;
    interval: "month" | "year";
    provider_prices: Record<string, string>;
    user_id: string;
  }>(
    await tx.execute(
      sql`SELECT q.*,r.provider_prices FROM public.pricing_quotes q JOIN public.pricing_releases r ON r.id=q.release_id WHERE q.payment_id=${payment.id}`,
    ),
  );
  if (!q || !q.plan_id || q.user_id !== payment.user_id)
    throw new AdminWorkflowError(
      "A pinned owned membership quote is required.",
    );
  const [s] = resultRows<{ id: string }>(
    await tx.execute(
      sql`SELECT id FROM public.commerce_subscriptions WHERE stripe_subscription_id=${subscriptionId} AND user_id=${payment.user_id}`,
    ),
  );
  if (!s)
    throw new AdminWorkflowError("Subscription reconciliation is missing.");
  await tx.execute(
    sql`INSERT INTO public.membership_bindings(subscription_id,user_id,release_id,payment_id,plan_id,interval,price_id) VALUES(${s.id},${payment.user_id},${q.release_id},${payment.id},${q.plan_id},${q.interval},${q.provider_prices[q.plan_id + "_" + q.interval]}) ON CONFLICT DO NOTHING`,
  );
}
