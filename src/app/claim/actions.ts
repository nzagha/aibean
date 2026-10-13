"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSensitiveUser as requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tools, claims, orders, vendorAccess } from "@/lib/db/schema";
import { claimInput } from "@/lib/validation";
import { stripeClient } from "@/lib/billing";
import { rateLimit } from "@/lib/security";
import { assertQuota } from "@/lib/pricing/entitlements";
import { requirePricing, entitlementLock } from "@/lib/pricing/storage";
import { currentPricing } from "@/lib/pricing/releases";
export async function startClaim(form: FormData) {
  const user = await requireUser();
  await rateLimit(user.id, "claim", 3, 86400);
  const input = claimInput.parse(Object.fromEntries(form));
  const offer =
    process.env.AIBEAN_PRICING_WORKFLOWS === "true"
      ? await db().transaction(async (tx) => {
          await requirePricing(tx);
          const r = await currentPricing(tx);
          if (
            !r ||
            process.env.AIBEAN_PRICING_APPROVED_SHA256 !== r.config_sha256
          )
            throw new Error(
              "Claim pricing remains proposed; approved sandbox activation is required.",
            );
          return { amount: r.config.fees.claim, release: r.id };
        })
      : null;
  const [tool] = await db()
    .select()
    .from(tools)
    .where(eq(tools.id, input.toolId));
  const [owner] = await db()
    .select()
    .from(vendorAccess)
    .where(eq(vendorAccess.toolId, input.toolId));
  if (!tool || tool.status !== "published" || tool.data.demo || owner)
    throw new Error("This tool is not available for a claim.");
  const stripe = stripeClient();
  const price = await stripe.prices.retrieve(
    process.env.STRIPE_CLAIM_PRICE_ID!,
  );
  if (
    price.livemode ||
    !price.active ||
    price.type !== "one_time" ||
    !price.unit_amount ||
    price.unit_amount <= 0 ||
    (offer && (price.unit_amount !== offer.amount || price.currency !== "usd"))
  )
    throw new Error("Configure a fixed, one-time test price.");
  const claimId = randomUUID();
  const orderId = randomUUID();
  await db().transaction(async (tx) => {
    await entitlementLock(tx, user.id);
    await assertQuota(tx, user.id, "claimsMonthly");
    await tx.insert(claims).values({ id: claimId, userId: user.id, ...input });
    await tx.insert(orders).values({
      id: orderId,
      userId: user.id,
      claimId,
      amount: price.unit_amount!,
      currency: price.currency,
    });
  });
  const origin = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
  ).origin;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: orderId,
      metadata: { orderId },
      success_url: `${origin}/account?payment=processing#claims`,
      cancel_url: `${origin}/account?payment=canceled#claims`,
    },
    { idempotencyKey: orderId },
  );
  await db()
    .update(orders)
    .set({ stripeSessionId: session.id })
    .where(eq(orders.id, orderId));
  if (!session.url) throw new Error("Checkout did not return a destination.");
  redirect(session.url);
}
