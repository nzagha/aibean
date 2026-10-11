import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import {
  AdminWorkflowError,
  adminToolInput,
  initialTool,
  recordId,
} from "./contracts";
import {
  productInput,
  submissionDecision,
  type ProductKind,
  type CommerceProduct,
  type CommercePayment,
  type SandboxSettlement,
} from "./commerce-contracts";
import { requireCommerceStorage } from "./commerce-storage";
import {
  audit,
  assertCategory,
  checkAdmin,
  lockedTool,
  resultRows,
} from "./tool-workflows";

async function ordinary(tx: IdentityTransaction, id: string) {
  if (
    !resultRows(
      await tx.execute(sql`SELECT id FROM public.users WHERE id=${id}`),
    ).length
  )
    throw new AdminWorkflowError("A registered account is required.");
}
export async function toolSubmissionEligible(
  tx: IdentityTransaction,
  id: string,
) {
  const [user] = resultRows<{ is_admin: boolean; is_creator: boolean }>(
    await tx.execute(
      sql`SELECT is_admin,is_creator FROM public.users WHERE id=${id}`,
    ),
  );
  if (!user) return false;
  if (user.is_admin) return true;
  const { creatorPublishingAllowed } = await import("./review-storage");
  if (await creatorPublishingAllowed(tx, id, user.is_creator)) return true;
  return (
    resultRows(
      await tx.execute(
        sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${id} LIMIT 1`,
      ),
    ).length > 0
  );
}
export async function saveProduct(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = productInput.parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireCommerceStorage(tx);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"product:" + input.kind},0))`,
    );
    const [old] = resultRows<CommerceProduct>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.billing_products WHERE id=${input.kind} FOR UPDATE`,
      ),
    );
    if (old ? old.revision !== input.revision : Boolean(input.revision))
      throw new AdminWorkflowError("Pricing changed. Refresh before saving.");
    await tx.execute(
      sql`INSERT INTO public.billing_products(id,name,amount,active,updated_by) VALUES(${input.kind},${input.name},${input.amount},${input.active},${actor}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,amount=excluded.amount,active=excluded.active,updated_by=excluded.updated_by,updated_at=GREATEST(clock_timestamp(),billing_products.updated_at+interval '1 microsecond')`,
    );
    await audit(tx, actor, "commerce.product-configured", input.kind, {
      reason: input.reason,
      before: old || null,
      after: { name: input.name, amount: input.amount, active: input.active },
      sandboxOnly: true,
    });
  });
}
export async function submitToolProposal(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
) {
  const proposed = adminToolInput.parse(value);
  const id = randomUUID();
  await database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    await ordinary(tx, userId);
    if (!(await toolSubmissionEligible(tx, userId)))
      throw new AdminWorkflowError(
        "Approved Creator, Vendor or Admin capability is required to submit Tools.",
      );
    await assertCategory(tx, proposed.categoryId);
    await tx.execute(
      sql`INSERT INTO public.tool_submissions(id,user_id,proposed) VALUES(${id},${userId},${JSON.stringify(proposed)}::jsonb)`,
    );
    await audit(tx, userId, "tool.submission-created", id, {
      status: "pending",
      automaticPublication: false,
    });
  });
  return id;
}
export async function reviewToolSubmission(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = submissionDecision.parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireCommerceStorage(tx);
    const [row] = resultRows<{
      user_id: string;
      proposed: unknown;
      status: string;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.tool_submissions WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!row || row.status !== "pending" || row.revision !== input.revision)
      throw new AdminWorkflowError(
        "Only an unchanged pending submission can be reviewed.",
      );
    let toolId: string | null = null;
    if (input.decision === "approved") {
      if (!(await toolSubmissionEligible(tx, row.user_id)))
        throw new AdminWorkflowError(
          "The submitter is no longer eligible. Review the account before approving.",
        );
      await requireSettledRequest(tx, "submission", input.id, row.user_id);
      const proposed = adminToolInput.parse(row.proposed);
      await assertCategory(tx, proposed.categoryId);
      toolId = randomUUID();
      await tx.execute(
        sql`INSERT INTO public.tools(id,name,slug,category_id,status,data) VALUES(${toolId},${proposed.name},${proposed.slug},${proposed.categoryId},'draft',${JSON.stringify(initialTool(toolId, proposed))}::jsonb)`,
      );
    }
    await tx.execute(
      sql`UPDATE public.tool_submissions SET status=${input.decision},tool_id=${toolId},reviewer_id=${actor},review_reason=${input.reason},reviewed_at=now(),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await audit(tx, actor, "tool.submission-" + input.decision, input.id, {
      reason: input.reason,
      toolId,
      publication: "independent-admin-review",
      ownership: "not-granted",
    });
    return toolId;
  });
}
export async function requireSettledRequest(
  tx: IdentityTransaction,
  kind: "submission" | "edit" | "verification",
  subject: string,
  user: string,
) {
  await requireCommerceStorage(tx);
  const [payment] = resultRows<CommercePayment>(
    await tx.execute(
      sql`SELECT * FROM public.billing_transactions WHERE kind=${kind} AND subject_id=${subject} AND user_id=${user} AND status='paid' AND (amount>0 AND stripe_session_id IS NOT NULL OR kind='verification' AND amount=0) FOR UPDATE`,
    ),
  );
  if (!payment)
    throw new AdminWorkflowError(
      "Verified sandbox payment is required before approval.",
    );
}
export async function preparePayment(
  database: IdentityDatabase,
  user: string,
  kind: ProductKind,
  subject: string,
) {
  recordId.parse(subject);
  return database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    await ordinary(tx, user);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"payment:" + kind + ":" + subject},0))`,
    );
    if (kind === "edit" || kind === "verification") {
      const table = sql.identifier(
        kind === "edit" ? "vendor_edit_requests" : "verification_requests",
      );
      const [request] = resultRows<{ tool_id: string }>(
        await tx.execute(
          sql`SELECT tool_id FROM public.${table} WHERE id=${subject} AND user_id=${user} AND status='pending'`,
        ),
      );
      if (!request)
        throw new AdminWorkflowError("An owned pending request is required.");
      await lockedTool(tx, request.tool_id);
      if (
        !resultRows(
          await tx.execute(
            sql`SELECT tool_id FROM public.vendor_access WHERE tool_id=${request.tool_id} AND user_id=${user}`,
          ),
        ).length
      )
        throw new AdminWorkflowError("Tool ownership is required.");
    } else if (kind === "submission") {
      if (!(await toolSubmissionEligible(tx, user)))
        throw new AdminWorkflowError(
          "Approved submission capability is required.",
        );
      if (
        !resultRows(
          await tx.execute(
            sql`SELECT id FROM public.tool_submissions WHERE id=${subject} AND user_id=${user} AND status='pending'`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "An owned pending submission is required.",
        );
    } else {
      if (subject !== user)
        throw new AdminWorkflowError("Subscription ownership does not match.");
      if (
        kind === "vendor_subscription" &&
        !resultRows(
          await tx.execute(
            sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${user} LIMIT 1`,
          ),
        ).length
      )
        throw new AdminWorkflowError("An approved Tool owner is required.");
      if (kind === "creator_subscription") {
        const { creatorPublishingAllowed } = await import("./review-storage");
        const [u] = resultRows<{ is_creator: boolean }>(
          await tx.execute(
            sql`SELECT is_creator FROM public.users WHERE id=${user}`,
          ),
        );
        if (!u || !(await creatorPublishingAllowed(tx, user, u.is_creator)))
          throw new AdminWorkflowError("Approved Creator access is required.");
      }
      if (
        resultRows(
          await tx.execute(
            sql`SELECT id FROM public.commerce_subscriptions WHERE user_id=${user} AND product_id=${kind} AND status IN ('active','trialing','past_due','unpaid','incomplete','paused')`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "An existing subscription must be managed before starting another.",
        );
    }
    const subscription = kind.endsWith("_subscription");
    const [old] = resultRows<CommercePayment>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.billing_transactions WHERE kind=${kind} AND ${subscription ? sql`user_id=${user} AND status='created'` : sql`subject_id=${subject}`} ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      ),
    );
    if (old) {
      if (old.user_id !== user)
        throw new AdminWorkflowError("Payment owner does not match.");
      return old;
    }
    const [product] = resultRows<CommerceProduct>(
      await tx.execute(
        sql`SELECT * FROM public.billing_products WHERE id=${kind} AND active=true FOR SHARE`,
      ),
    );
    if (!product)
      throw new AdminWorkflowError(
        "This product does not have an active configured price.",
      );
    const id = randomUUID();
    const storedSubject = subscription ? user + ":" + id : subject;
    const status = product.amount === 0 ? "paid" : "created";
    await tx.execute(
      sql`INSERT INTO public.billing_transactions(id,user_id,product_id,kind,subject_id,amount,currency,status) VALUES(${id},${user},${kind},${kind},${storedSubject},${product.amount},${product.currency},${status})`,
    );
    await audit(tx, user, "commerce.payment-prepared", id, {
      kind,
      subject,
      amount: product.amount,
      currency: product.currency,
      status,
    });
    return {
      id,
      user_id: user,
      kind,
      subject_id: storedSubject,
      amount: product.amount,
      currency: product.currency,
      status,
      stripe_session_id: null,
      revision: "",
      created_at: "",
    } satisfies CommercePayment;
  });
}
export async function bindCheckout(
  database: IdentityDatabase,
  user: string,
  paymentId: string,
  session: {
    id: string;
    livemode: boolean;
    amount_total: number | null;
    currency: string | null;
    client_reference_id: string | null;
  },
) {
  await database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    const [payment] = resultRows<CommercePayment>(
      await tx.execute(
        sql`SELECT * FROM public.billing_transactions WHERE id=${paymentId} AND user_id=${user} FOR UPDATE`,
      ),
    );
    if (
      !payment ||
      session.livemode ||
      session.client_reference_id !== payment.id ||
      session.amount_total !== payment.amount ||
      session.currency !== payment.currency ||
      (payment.stripe_session_id && payment.stripe_session_id !== session.id)
    )
      throw new AdminWorkflowError("Sandbox checkout reconciliation failed.");
    await tx.execute(
      sql`UPDATE public.billing_transactions SET stripe_session_id=${session.id} WHERE id=${paymentId}`,
    );
  });
}
export async function settleSandboxPayment(
  database: IdentityDatabase,
  event: SandboxSettlement,
) {
  if (event.livemode || event.paymentStatus !== "paid")
    throw new AdminWorkflowError(
      "Only verified paid sandbox sessions can settle.",
    );
  await database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    const [payment] = resultRows<CommercePayment>(
      await tx.execute(
        sql`SELECT * FROM public.billing_transactions WHERE id=${event.paymentId} FOR UPDATE`,
      ),
    );
    if (
      !payment ||
      !payment.stripe_session_id ||
      payment.stripe_session_id !== event.sessionId ||
      event.clientReferenceId !== payment.id ||
      payment.amount !== event.amount ||
      payment.currency !== event.currency ||
      payment.status === "expired"
    )
      throw new AdminWorkflowError("Payment reconciliation failed.");
    const isSubscription = payment.kind.endsWith("_subscription");
    if (isSubscription && !event.subscriptionId)
      throw new AdminWorkflowError("Subscription identity is missing.");
    const receipt = resultRows(
      await tx.execute(
        sql`INSERT INTO public.billing_webhook_receipts(id) VALUES(${event.eventId}) ON CONFLICT DO NOTHING RETURNING id`,
      ),
    );
    if (!receipt.length || payment.status === "paid") return;
    await tx.execute(
      sql`UPDATE public.billing_transactions SET status='paid',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${payment.id}`,
    );
    // Checkout confirmation is not a subscription lifecycle assertion. The
    // separately reconciled provider subscription event establishes status.
    if (isSubscription)
      await tx.execute(
        sql`INSERT INTO public.commerce_subscriptions(id,user_id,product_id,stripe_subscription_id,status) VALUES(${randomUUID()},${payment.user_id},${payment.kind},${event.subscriptionId!},'incomplete')`,
      );
    await audit(
      tx,
      "stripe-webhook",
      "commerce.sandbox-payment-confirmed",
      payment.id,
      {
        kind: payment.kind,
        subject: payment.subject_id,
        editorialApproval: false,
        capabilitiesGranted: false,
      },
    );
  });
}
export async function reconcileSubscription(
  database: IdentityDatabase,
  event: {
    id: string;
    created: number;
    livemode: boolean;
    subscriptionId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    endsAt: number | null;
  },
) {
  if (
    event.livemode ||
    ![
      "active",
      "trialing",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ].includes(event.status) ||
    !Number.isSafeInteger(event.created) ||
    event.created < 0 ||
    (event.endsAt !== null &&
      (!Number.isSafeInteger(event.endsAt) || event.endsAt < 0))
  )
    throw new AdminWorkflowError("Invalid sandbox subscription state.");
  await database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    const [item] = resultRows<{
      id: string;
      provider_event_at: string | number;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT * FROM public.commerce_subscriptions WHERE stripe_subscription_id=${event.subscriptionId} FOR UPDATE`,
      ),
    );
    if (!item)
      throw new AdminWorkflowError(
        "Subscription has not been reconciled with its paid checkout yet.",
      );
    const receipt = resultRows(
      await tx.execute(
        sql`INSERT INTO public.billing_webhook_receipts(id) VALUES(${event.id}) ON CONFLICT DO NOTHING RETURNING id`,
      ),
    );
    if (!receipt.length || Number(item.provider_event_at) > event.created)
      return;
    if (
      ["canceled", "incomplete_expired"].includes(item.status) &&
      event.status !== item.status
    )
      throw new AdminWorkflowError(
        "An ended provider subscription cannot be reactivated.",
      );
    await tx.execute(
      sql`UPDATE public.commerce_subscriptions SET status=${event.status},cancel_at_period_end=${event.cancelAtPeriodEnd},ends_at=${event.endsAt === null ? null : new Date(event.endsAt * 1000).toISOString()}::timestamptz,provider_event_at=${event.created},updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${item.id}`,
    );
    await audit(
      tx,
      "stripe-webhook",
      "commerce.subscription-reconciled",
      item.id,
      {
        status: event.status,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        entitlements: "no-editorial-or-capability-bypass",
      },
    );
  });
}
