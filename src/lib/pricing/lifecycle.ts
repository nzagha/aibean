import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { resultRows, audit, checkAdmin } from "../admin/tool-workflows";
import { AdminWorkflowError, recordId, reasonInput } from "../admin/contracts";
import { requirePricing, entitlementLock } from "./storage";
import { currentPricing } from "./releases";
export const paidInvoiceSchema = z
  .object({
    eventId: recordId,
    invoiceId: recordId,
    subscriptionId: recordId,
    created: z.number().int().nonnegative(),
    livemode: z.literal(false),
    paid: z.literal(true),
    currency: z.literal("usd"),
    amount: z.number().int().positive(),
    priceId: recordId,
    periodStart: z.number().int().nonnegative(),
    periodEnd: z.number().int().positive(),
  })
  .strict();
export async function recordPaidMembershipInvoice(
  database: IdentityDatabase,
  value: unknown,
) {
  const e = paidInvoiceSchema.parse(value);
  if (e.periodEnd <= e.periodStart)
    throw new AdminWorkflowError("Invalid paid billing period.");
  if (e.periodStart > Math.floor(Date.now() / 1000) + 300)
    throw new AdminWorkflowError(
      "Future renewal cannot replace current paid benefits before its billing boundary.",
    );
  await database.transaction(async (tx) => {
    await requirePricing(tx);
    if (
      resultRows(
        await tx.execute(
          sql`SELECT id FROM public.billing_webhook_receipts WHERE id=${e.eventId}`,
        ),
      ).length
    )
      return;
    const [u] = resultRows<{ user_id: string }>(
      await tx.execute(
        sql`SELECT user_id FROM public.commerce_subscriptions WHERE stripe_subscription_id=${e.subscriptionId}`,
      ),
    );
    if (!u)
      throw new AdminWorkflowError(
        "Paid checkout must be reconciled before its invoice.",
      );
    await entitlementLock(tx, u.user_id);
    const [m] = resultRows<{
      subscription_id: string;
      user_id: string;
      plan_id: string;
      interval: string;
      release_id: string;
      price_id: string;
      config: import("./config").PricingConfig;
      paid_from: string | null;
      paid_through: string | null;
      provider_event_at: number | string;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT b.*,r.config,s.status,b.paid_from::text,b.paid_through::text FROM public.membership_bindings b JOIN public.commerce_subscriptions s ON s.id=b.subscription_id JOIN public.pricing_releases r ON r.id=b.release_id WHERE s.stripe_subscription_id=${e.subscriptionId} FOR UPDATE OF b,s`,
      ),
    );
    if (!m || ["canceled", "incomplete_expired"].includes(m.status))
      throw new AdminWorkflowError(
        "An ended or unbound subscription cannot receive benefits.",
      );
    const [change] = resultRows<{
      id: string;
      release_id: string;
      plan_id: string;
      interval: string;
      price_id: string;
      config: import("./config").PricingConfig;
      effective_at: string;
    }>(
      await tx.execute(
        sql`SELECT c.*,r.config,c.effective_at::text FROM public.membership_changes c JOIN public.pricing_releases r ON r.id=c.release_id WHERE c.subscription_id=${m.subscription_id} AND c.status='scheduled' FOR UPDATE OF c`,
      ),
    );
    const apply =
      change && e.periodStart * 1000 >= new Date(change.effective_at).getTime();
    const next = apply ? change : m,
      plan = next.config.plans.find((p) => p.id === next.plan_id)!;
    const duration = e.periodEnd - e.periodStart;
    if (
      duration < (next.interval === "year" ? 364 : 27) * 86400 ||
      duration > (next.interval === "year" ? 367 : 32) * 86400
    )
      throw new AdminWorkflowError(
        "Paid invoice period does not match the approved monthly/annual contract.",
      );
    if (
      e.priceId !== next.price_id ||
      e.amount !== (next.interval === "year" ? plan.annual : plan.monthly)
    )
      throw new AdminWorkflowError(
        "Paid invoice does not match the pinned plan price and interval.",
      );
    if (
      (m.paid_through &&
        e.periodEnd * 1000 < new Date(m.paid_through).getTime()) ||
      Number(m.provider_event_at) > e.created
    )
      return;
    const receipt = resultRows(
      await tx.execute(
        sql`INSERT INTO public.billing_webhook_receipts(id) VALUES(${e.eventId}) ON CONFLICT DO NOTHING RETURNING id`,
      ),
    );
    if (!receipt.length) return;
    const existing = resultRows(
      await tx.execute(
        sql`SELECT subscription_id FROM public.membership_bindings WHERE last_invoice_id=${e.invoiceId}`,
      ),
    );
    if (existing.length) return;
    await tx.execute(
      sql`UPDATE public.membership_bindings SET release_id=${next.release_id},plan_id=${next.plan_id},interval=${next.interval},price_id=${next.price_id},paid_from=${new Date(e.periodStart * 1000).toISOString()}::timestamptz,paid_through=${new Date(e.periodEnd * 1000).toISOString()}::timestamptz,last_invoice_id=${e.invoiceId},provider_event_at=${e.created},revision=revision+1 WHERE subscription_id=${m.subscription_id}`,
    );
    if (apply)
      await tx.execute(
        sql`UPDATE public.membership_changes SET status='applied' WHERE id=${change.id}`,
      );
    await audit(
      tx,
      "stripe-webhook",
      "membership.paid-period-confirmed",
      m.subscription_id,
      {
        invoice: e.invoiceId,
        plan: next.plan_id,
        interval: next.interval,
        through: e.periodEnd,
        capabilities: false,
      },
    );
  });
}
export type MembershipProvider = {
  schedule: (input: {
    subscriptionId: string;
    currentPrice: string;
    nextPrice: string;
    effectiveAt: number;
    idempotencyKey: string;
  }) => Promise<{
    id: string;
    livemode: boolean;
    subscriptionId: string;
    priceId: string;
    effectiveAt: number;
  }>;
};
const changeInput = z.object({
  id: recordId,
  revision: z.coerce.number().int().positive(),
  interval: z.enum(["month", "year"]),
});
export async function requestMembershipInterval(
  database: IdentityDatabase,
  user: string,
  value: unknown,
  provider: MembershipProvider,
) {
  const i = changeInput.parse(value);
  const intent = await database.transaction(async (tx) => {
    await requirePricing(tx);
    await entitlementLock(tx, user);
    const [m] = resultRows<{
      subscription_id: string;
      stripe_subscription_id: string;
      user_id: string;
      plan_id: string;
      interval: string;
      revision: number;
      price_id: string;
      ends_at: string;
    }>(
      await tx.execute(
        sql`SELECT b.*,s.stripe_subscription_id,s.ends_at::text FROM public.membership_bindings b JOIN public.commerce_subscriptions s ON s.id=b.subscription_id WHERE b.subscription_id=${i.id} AND b.user_id=${user} AND s.user_id=${user} AND s.status='active' AND s.ends_at>now() AND b.paid_through>now() AND NOT s.cancel_at_period_end FOR UPDATE OF b,s`,
      ),
    );
    if (!m || m.revision !== i.revision || m.interval === i.interval)
      throw new AdminWorkflowError(
        "Choose an unchanged owned active membership with a different interval.",
      );
    const r = await currentPricing(tx);
    if (!r || process.env.AIBEAN_PRICING_APPROVED_SHA256 !== r.config_sha256)
      throw new AdminWorkflowError(
        "The new plan configuration is not independently approved.",
      );
    const [old] = resultRows<{
      id: string;
      status: string;
      expected_revision: number;
      interval: string;
      release_id: string;
      price_id: string;
      effective_at: string;
    }>(
      await tx.execute(
        sql`SELECT *,effective_at::text FROM public.membership_changes WHERE subscription_id=${m.subscription_id} AND status<>'applied' FOR UPDATE`,
      ),
    );
    if (
      old &&
      (old.expected_revision !== i.revision ||
        old.interval !== i.interval ||
        old.release_id !== r.id)
    )
      throw new AdminWorkflowError(
        "Another membership change is already pending.",
      );
    if (old?.status === "scheduled") return { done: true as const };
    const id = old?.id || randomUUID(),
      priceId =
        old?.price_id || r.provider_prices[m.plan_id + "_" + i.interval],
      effective = old?.effective_at || m.ends_at;
    if (!old)
      await tx.execute(
        sql`INSERT INTO public.membership_changes(id,subscription_id,user_id,release_id,plan_id,interval,price_id,expected_revision,effective_at) VALUES(${id},${m.subscription_id},${user},${r.id},${m.plan_id},${i.interval},${priceId},${i.revision},${effective}::timestamptz)`,
      );
    await audit(tx, user, "membership.change-prepared", id, {
      interval: i.interval,
      effectiveAt: effective,
      proration: false,
    });
    return {
      done: false as const,
      id,
      subscriptionId: m.stripe_subscription_id,
      currentPrice: m.price_id,
      nextPrice: priceId,
      effectiveAt: Math.floor(new Date(effective).getTime() / 1000),
      idempotencyKey: "aibean-plan-" + id,
    };
  });
  if (intent.done) return;
  const result = await provider.schedule(intent);
  if (
    result.livemode ||
    result.subscriptionId !== intent.subscriptionId ||
    result.priceId !== intent.nextPrice ||
    result.effectiveAt !== intent.effectiveAt ||
    !result.id
  )
    throw new AdminWorkflowError(
      "Sandbox schedule did not match the unchanged owned subscription.",
    );
  await database.transaction(async (tx) => {
    await requirePricing(tx);
    await entitlementLock(tx, user);
    const changed = resultRows(
      await tx.execute(
        sql`UPDATE public.membership_changes SET status='scheduled',provider_schedule_id=${result.id} WHERE id=${intent.id} AND user_id=${user} AND status='prepared' RETURNING id`,
      ),
    );
    if (changed.length)
      await audit(tx, user, "membership.change-scheduled", intent.id, {
        interval: i.interval,
        effectiveAt: intent.effectiveAt,
        capabilities: false,
      });
  });
}
const refundInput = z.object({ paymentId: recordId, reason: reasonInput });
export async function requestCommercialRefund(
  database: IdentityDatabase,
  user: string,
  value: unknown,
) {
  const i = refundInput.parse(value);
  return database.transaction(async (tx) => {
    await requirePricing(tx);
    await entitlementLock(tx, user);
    const [p] = resultRows<{ amount: number }>(
      await tx.execute(
        sql`SELECT p.amount FROM public.billing_transactions p JOIN public.pricing_quotes q ON q.payment_id=p.id JOIN public.pricing_releases r ON r.id=q.release_id WHERE p.id=${i.paymentId} AND p.user_id=${user} AND p.status='paid' AND p.stripe_session_id IS NOT NULL AND p.amount>0 AND p.created_at>=now()-interval '7 days' FOR UPDATE OF p`,
      ),
    );
    if (!p)
      throw new AdminWorkflowError(
        "Choose your paid membership/request transaction within seven days. Refund requests require independent Admin review.",
      );
    const [old] = resultRows<{ id: string }>(
      await tx.execute(
        sql`SELECT id FROM public.pricing_refunds WHERE payment_id=${i.paymentId}`,
      ),
    );
    if (old) return old.id;
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO public.pricing_refunds(id,payment_id,user_id,amount,reason) VALUES(${id},${i.paymentId},${user},${p.amount},${i.reason})`,
    );
    await audit(tx, user, "commerce.refund-requested", id, {
      payment: i.paymentId,
      automaticRefund: false,
    });
    return id;
  });
}
export async function reviewCommercialRefund(
  database: IdentityDatabase,
  admin: string,
  value: unknown,
) {
  const i = z
    .object({
      id: recordId,
      revision: z.coerce.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
      reason: reasonInput,
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, admin);
    await requirePricing(tx);
    const [r] = resultRows<{ revision: number; status: string }>(
      await tx.execute(
        sql`SELECT * FROM public.pricing_refunds WHERE id=${i.id} FOR UPDATE`,
      ),
    );
    if (!r || r.status !== "requested" || r.revision !== i.revision)
      throw new AdminWorkflowError("Refund changed or was already reviewed.");
    if (i.decision === "approved") {
      const [payment] = resultRows<{ kind: string; subject_id: string }>(
        await tx.execute(
          sql`SELECT p.kind,p.subject_id FROM public.billing_transactions p JOIN public.pricing_refunds f ON f.payment_id=p.id WHERE f.id=${i.id}`,
        ),
      );
      const table =
        payment?.kind === "submission"
          ? "tool_submissions"
          : payment?.kind === "edit"
            ? "vendor_edit_requests"
            : payment?.kind === "verification"
              ? "verification_requests"
              : null;
      if (
        table &&
        resultRows(
          await tx.execute(
            sql`SELECT id FROM public.${sql.identifier(table)} WHERE id=${payment.subject_id} AND status='approved'`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "Completed approved review services are not refundable through this workflow.",
        );
    }
    await tx.execute(
      sql`UPDATE public.pricing_refunds SET status=${i.decision},reviewer_id=${admin},review_reason=${i.reason},revision=revision+1 WHERE id=${i.id}`,
    );
    await audit(tx, admin, "commerce.refund-" + i.decision, i.id, {
      reason: i.reason,
      providerRefund: false,
    });
  });
}
export type RefundProvider = {
  refund: (input: {
    sessionId: string;
    amount: number;
    idempotencyKey: string;
  }) => Promise<{
    id: string;
    livemode: boolean;
    amount: number;
    sessionId: string;
    status: string;
  }>;
};
export async function executeApprovedSandboxRefund(
  database: IdentityDatabase,
  admin: string,
  id: string,
  provider: RefundProvider,
) {
  recordId.parse(id);
  const r = await database.transaction(async (tx) => {
    await checkAdmin(tx, admin);
    await requirePricing(tx);
    const [item] = resultRows<{
      id: string;
      user_id: string;
      amount: number;
      stripe_session_id: string;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT f.*,p.stripe_session_id FROM public.pricing_refunds f JOIN public.billing_transactions p ON p.id=f.payment_id WHERE f.id=${id} AND f.status IN ('approved','refunded')`,
      ),
    );
    if (!item) throw new AdminWorkflowError("An approved refund is required.");
    const [membership] = resultRows<{
      cancel_at_period_end: boolean;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT s.cancel_at_period_end,s.status FROM public.membership_bindings b JOIN public.pricing_refunds f ON f.payment_id=b.payment_id JOIN public.commerce_subscriptions s ON s.id=b.subscription_id WHERE f.id=${id}`,
      ),
    );
    if (
      membership &&
      !membership.cancel_at_period_end &&
      !["canceled", "incomplete_expired"].includes(membership.status)
    )
      throw new AdminWorkflowError(
        "Confirm provider cancellation before refunding a membership, so it cannot renew unexpectedly.",
      );
    return item;
  });
  if (r.status === "refunded") return;
  const p = await provider.refund({
    sessionId: r.stripe_session_id,
    amount: r.amount,
    idempotencyKey: "aibean-refund-" + r.id,
  });
  if (
    p.livemode ||
    p.sessionId !== r.stripe_session_id ||
    p.amount !== r.amount ||
    p.status !== "succeeded" ||
    !p.id
  )
    throw new AdminWorkflowError(
      "A matching completed sandbox refund is required.",
    );
  await database.transaction(async (tx) => {
    await checkAdmin(tx, admin);
    await requirePricing(tx);
    await entitlementLock(tx, r.user_id);
    const changed = resultRows(
      await tx.execute(
        sql`UPDATE public.pricing_refunds SET status='refunded',provider_refund_id=${p.id},revision=revision+1 WHERE id=${id} AND status='approved' RETURNING id`,
      ),
    );
    if (changed.length)
      await audit(tx, admin, "commerce.sandbox-refunded", id, {
        amount: r.amount,
        providerRefund: p.id,
        capabilities: false,
        editorialHistory: "preserved",
      });
  });
}
