import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { stripeClient, stripeConfigured } from "@/lib/billing";
import { revalidatePath } from "next/cache";
import { paymentMatches, placementWindow } from "@/lib/featured/rules";
import { db } from "@/lib/db";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import {
  settleSandboxPayment,
  reconcileSubscription,
} from "@/lib/admin/commerce-workflows";
import {
  orders,
  claims,
  webhookReceipts,
  auditLogs,
  featuredPlacements,
  tools,
} from "@/lib/db/schema";
export async function POST(request: Request) {
  if (!stripeConfigured())
    return new Response("Billing not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode) return new Response("Test billing only", { status: 400 });
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.created"
  ) {
    if (event.data.object.metadata.kind !== "commerce")
      return Response.json({ received: true });
    if (!(await commerceAvailable(db())))
      return new Response("Commerce unavailable", { status: 503 });
    try {
      const current = await stripeClient().subscriptions.retrieve(
        event.data.object.id,
      );
      await reconcileSubscription(db(), {
        id: event.id,
        created: Math.floor(Date.now() / 1000),
        livemode: current.livemode,
        subscriptionId: current.id,
        status: current.status,
        cancelAtPeriodEnd: current.cancel_at_period_end,
        endsAt: current.items.data[0]?.current_period_end ?? null,
      });
      revalidatePath("/account/billing");
      revalidatePath("/admin/commerce/subscriptions");
      return Response.json({ received: true });
    } catch {
      return new Response("Subscription reconciliation requires retry", {
        status: 500,
      });
    }
  }
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return Response.json({ received: true });
  const session = event.data.object;
  if (session.payment_status !== "paid")
    return Response.json({ received: true });
  if (session.metadata?.kind === "commerce") {
    if (!(await commerceAvailable(db())))
      return new Response("Commerce unavailable", { status: 503 });
    try {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      await settleSandboxPayment(db(), {
        eventId: event.id,
        livemode: event.livemode,
        sessionId: session.id,
        paymentId: session.metadata.paymentId || "",
        clientReferenceId: session.client_reference_id,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        subscriptionId,
      });
      if (subscriptionId) {
        const current =
          await stripeClient().subscriptions.retrieve(subscriptionId);
        await reconcileSubscription(db(), {
          id: event.id + ".subscription",
          created: Math.floor(Date.now() / 1000),
          livemode: current.livemode,
          subscriptionId: current.id,
          status: current.status,
          cancelAtPeriodEnd: current.cancel_at_period_end,
          endsAt: current.items.data[0]?.current_period_end ?? null,
        });
      }
      revalidatePath("/account/billing");
      revalidatePath("/admin", "layout");
      revalidatePath("/vendor", "layout");
      return Response.json({ received: true });
    } catch {
      return new Response("Payment reconciliation requires retry", {
        status: 500,
      });
    }
  }
  if (session.metadata?.kind === "featured") {
    const placementId = session.metadata.placementId;
    if (!placementId) return new Response("Missing placement", { status: 400 });
    await db().transaction(async (tx) => {
      const [receipt] = await tx
        .insert(webhookReceipts)
        .values({ id: event.id })
        .onConflictDoNothing()
        .returning();
      if (!receipt) return;
      const [placement] = await tx
        .select()
        .from(featuredPlacements)
        .where(eq(featuredPlacements.id, placementId))
        .for("update");
      if (
        !placement ||
        !paymentMatches(placement, session) ||
        !placement.durationDays
      )
        throw new Error("Featured payment reconciliation failed.");
      if (placement.paidAt) return; // Multiple Stripe events must never extend a placement.
      if (placement.status !== "approved")
        throw new Error("Featured placement was not approved.");
      const [tool] = await tx
        .select()
        .from(tools)
        .where(eq(tools.id, placement.toolId));
      const publishable = tool?.status === "published" && !tool.data.demo;
      const now = new Date();
      await tx
        .update(featuredPlacements)
        .set({
          status: publishable ? "active" : "suspended",
          paidAt: now,
          ...placementWindow(placement.durationDays, now),
          ...(publishable
            ? {}
            : {
                reviewReason:
                  "Payment received but tool is no longer eligible. Admin payment resolution required.",
              }),
        })
        .where(eq(featuredPlacements.id, placement.id));
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorId: "stripe-webhook",
        entityId: placement.id,
        action: publishable
          ? "featured.activated"
          : "featured.payment_requires_resolution",
        detail:
          "Verified test payment; placement dates set once. Organic rank and trust unchanged.",
      });
    });
    revalidatePath("/");
    revalidatePath("/featured/manage");
    revalidatePath("/admin");
    return Response.json({ received: true });
  }
  const orderId = session.metadata?.orderId;
  if (!orderId) return new Response("Missing order", { status: 400 });
  await db().transaction(async (tx) => {
    const [receipt] = await tx
      .insert(webhookReceipts)
      .values({ id: event.id })
      .onConflictDoNothing()
      .returning();
    if (!receipt) return;
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (
      !order ||
      order.amount !== session.amount_total ||
      order.currency !== session.currency ||
      session.client_reference_id !== order.id ||
      (order.stripeSessionId && order.stripeSessionId !== session.id)
    )
      throw new Error("Payment reconciliation failed.");
    if (order.status === "paid") return;
    await tx
      .update(orders)
      .set({ status: "paid", stripeSessionId: session.id })
      .where(eq(orders.id, order.id));
    await tx
      .update(claims)
      .set({ status: "pending_review" })
      .where(eq(claims.id, order.claimId));
    await tx.insert(auditLogs).values({
      id: randomUUID(),
      actorId: "stripe-webhook",
      action: "claim.payment_confirmed",
      entityId: order.claimId,
      detail: "Verified test checkout; ownership still requires admin approval",
    });
  });
  return Response.json({ received: true });
}
