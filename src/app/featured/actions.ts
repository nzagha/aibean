"use server";
import { randomUUID } from "node:crypto";
import { and, eq, or, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredPlacements, tools, auditLogs } from "@/lib/db/schema";
import { rateLimit } from "@/lib/security";
import { featuredBillingConfigured, stripeClient } from "@/lib/billing";
import { FEATURED_PLAN, validFeaturedPrice } from "@/lib/featured/plan";
import type { ActionState } from "@/components/action-form";

const requestInput = z.object({
  toolId: z.string().min(1).max(100),
  sponsorName: z.string().trim().min(2).max(100),
  note: z.string().trim().min(10).max(1200),
  consent: z.literal("on"),
});
export async function requestFeatured(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/featured/manage");
  const input = requestInput.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error:
        "Choose a tool, add your sponsor name and a short note, and accept the placement terms.",
    };
  await rateLimit(user.id, "featured-request", 5, 86400);
  const result = await db().transaction(async (tx) => {
    // Serializes all applications for the same tool, including different sponsors.
    const [tool] = await tx
      .select()
      .from(tools)
      .where(eq(tools.id, input.data.toolId))
      .for("update");
    if (!tool || tool.status !== "published" || tool.data.demo)
      return "Choose a published tool from the directory. Example tools cannot be promoted.";
    const [existing] = await tx
      .select()
      .from(featuredPlacements)
      .where(
        and(
          eq(featuredPlacements.toolId, tool.id),
          or(
            inArray(featuredPlacements.status, ["pending_review", "approved"]),
            and(
              inArray(featuredPlacements.status, ["active", "suspended"]),
              gt(featuredPlacements.endsAt, new Date()),
            ),
          ),
        ),
      );
    if (existing)
      return "This tool already has an open request or an unexpired placement. Try again when it is complete.";
    const id = randomUUID();
    await tx
      .insert(featuredPlacements)
      .values({
        id,
        userId: user.id,
        toolId: tool.id,
        sponsorName: input.data.sponsorName,
        note: input.data.note,
      });
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: user.id,
        entityId: id,
        action: "featured.requested",
        detail: "Homepage sponsorship requested; approval and payment required",
      });
    return null;
  });
  if (result) return { error: result };
  revalidatePath("/featured/manage");
  revalidatePath("/admin");
  return {
    message:
      "Request submitted. Your placement will be reviewed before you pay.",
  };
}

export async function moderateFeatured(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const input = z
    .object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected", "suspended"]),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error: "Choose a decision and add a reason of at least five characters.",
    };
  const error = await db().transaction(async (tx) => {
    const [placement] = await tx
      .select()
      .from(featuredPlacements)
      .where(eq(featuredPlacements.id, input.data.id))
      .for("update");
    if (!placement) return "Placement not found.";
    const expected =
      input.data.decision === "suspended" ? "active" : "pending_review";
    if (placement.status !== expected)
      return "This request has changed. Refresh before reviewing it.";
    await tx
      .update(featuredPlacements)
      .set({ status: input.data.decision, reviewReason: input.data.reason })
      .where(eq(featuredPlacements.id, placement.id));
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: user.id,
        entityId: placement.id,
        action: `featured.${input.data.decision}`,
        detail: input.data.reason,
      });
    return null;
  });
  if (error) return { error };
  revalidatePath("/admin");
  revalidatePath("/featured/manage");
  revalidatePath("/");
  return { message: "Placement updated." };
}

export async function checkoutFeatured(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/featured/manage");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid placement." };
  if (!featuredBillingConfigured())
    return {
      error:
        "Payments are not available yet. Your approval is saved; you have not been charged.",
    };
  await rateLimit(user.id, "featured-checkout", 10, 3600);
  const stripe = stripeClient();
  let destination: string;
  try {
    destination = await db().transaction(async (tx) => {
      const [placement] = await tx
        .select()
        .from(featuredPlacements)
        .where(
          and(
            eq(featuredPlacements.id, id.data),
            eq(featuredPlacements.userId, user.id),
          ),
        )
        .for("update");
      if (!placement || placement.status !== "approved" || placement.paidAt)
        throw new Error("Unavailable");
      const [tool] = await tx
        .select()
        .from(tools)
        .where(eq(tools.id, placement.toolId));
      if (!tool || tool.status !== "published" || tool.data.demo)
        throw new Error("Unavailable");
      if (placement.stripeSessionId) {
        const previous = await stripe.checkout.sessions.retrieve(
          placement.stripeSessionId,
        );
        if (previous.status === "open" && previous.url) return previous.url;
        if (previous.status !== "expired")
          throw new Error("Payment processing");
      }
      const price = await stripe.prices.retrieve(
        process.env.STRIPE_FEATURED_PRICE_ID!,
      );
      if (!validFeaturedPrice(price))
        throw new Error("Price configuration mismatch");
      const attempt = placement.checkoutAttempt + 1;
      const origin = new URL(
        process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
      ).origin;
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [{ price: price.id, quantity: 1 }],
          client_reference_id: placement.id,
          metadata: { kind: "featured", placementId: placement.id },
          success_url: `${origin}/featured/manage?checkout=processing`,
          cancel_url: `${origin}/featured/manage?checkout=canceled`,
        },
        { idempotencyKey: `featured-${placement.id}-${attempt}` },
      );
      if (!session.url) throw new Error("Missing checkout URL");
      await tx
        .update(featuredPlacements)
        .set({
          amount: FEATURED_PLAN.amount,
          currency: FEATURED_PLAN.currency,
          durationDays: FEATURED_PLAN.days,
          stripePriceId: price.id,
          stripeSessionId: session.id,
          checkoutAttempt: attempt,
        })
        .where(eq(featuredPlacements.id, placement.id));
      return session.url;
    });
  } catch {
    return {
      error:
        "Checkout is not ready. If you have already paid, wait for confirmation and refresh. Otherwise, try again later; no extra checkout is created for an open payment.",
    };
  }
  redirect(destination);
}
